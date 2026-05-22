import { db, findDriverByUserId, findUserById, newId } from './mockDb';
import { encryptField, decryptField } from '../security/crypto';
import { appendAudit } from '../security/audit';
import { can } from '../security/rbac';
import { validateFileSize, validatePlate, validateSeatCount, sanitize } from '../validation/schemas';
import { useMocks } from '../config';
import { gql, gqlList } from './graphql';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function registerDriverApplication({
  actor,
  idCardNumber,
  licenseNumber,
  plateNumber,
  brand,
  model,
  seatCount,
  files = [], // [{ name, sizeBytes, mime }]
}) {
  if (!useMocks) {
    return gql('RegisterDriverApplication', {
      idCardNumber,
      licenseNumber,
      plateNumber,
      brand,
      model,
      seatCount,
      files,
    });
  }
  await sleep(220);
  if (!actor) return { ok: false, error: 'Unauthenticated' };
  const errs = {};
  if (!idCardNumber) errs.idCardNumber = 'ID required';
  if (!licenseNumber) errs.licenseNumber = 'License required';
  const plateErr = validatePlate(plateNumber);
  if (plateErr) errs.plateNumber = plateErr;
  if (!brand) errs.brand = 'Brand required';
  if (!model) errs.model = 'Model required';
  const seatErr = validateSeatCount(seatCount, 8);
  if (seatErr) errs.seatCount = seatErr;
  for (const f of files) {
    const limit = f.kind === 'vehicle' ? 3 : 5;
    const e = validateFileSize(f.sizeBytes, limit);
    if (e) errs[f.kind] = e;
    if (f.mime && !['image/jpeg', 'image/png', 'application/pdf'].includes(f.mime)) {
      errs[f.kind] = 'Use JPEG, PNG, or PDF';
    }
  }
  if (Object.keys(errs).length) return { ok: false, errors: errs };

  // Unique plate
  const enc = encryptField(plateNumber.toUpperCase());
  if (db.drivers.some((d) => d.plate_number === enc)) {
    return { ok: false, errors: { plateNumber: 'Plate already registered' } };
  }

  const existing = findDriverByUserId(actor.id);
  if (existing) {
    Object.assign(existing, {
      plate_number: encryptField(plateNumber.toUpperCase()),
      id_card_number: encryptField(idCardNumber),
      license_number: encryptField(licenseNumber),
      vehicle_brand: sanitize(brand),
      vehicle_model: sanitize(model),
      seat_count: Number(seatCount),
      status: 'pending',
    });
  } else {
    db.drivers.push({
      id: newId(),
      user_id: actor.id,
      plate_number: encryptField(plateNumber.toUpperCase()),
      id_card_number: encryptField(idCardNumber),
      license_number: encryptField(licenseNumber),
      vehicle_brand: sanitize(brand),
      vehicle_model: sanitize(model),
      seat_count: Number(seatCount),
      status: 'pending',
      verified_at: null,
      license_expires_at: null,
      id_expires_at: null,
      rating: 0,
      trips_completed: 0,
    });
  }

  files.forEach((f) =>
    db.documents.push({
      id: newId(),
      user_id: actor.id,
      kind: f.kind,
      name: f.name,
      mime: f.mime,
      size_bytes: f.sizeBytes,
      uploaded_at: new Date().toISOString(),
    })
  );

  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'driver.application.submitted',
    targetEntity: 'driver',
    targetId: actor.id,
  });
  return { ok: true };
}

export async function getDriverStatus({ actor }) {
  if (!useMocks) {
    const result = await gql('GetDriverStatus');
    return result?.status ? result : { status: 'not_applied' };
  }
  await sleep(60);
  const d = findDriverByUserId(actor.id);
  if (!d) return { status: 'not_applied' };
  return { status: d.status, verified_at: d.verified_at };
}

export async function getDriverProfile({ actor }) {
  if (!useMocks) {
    const result = await gql('GetDriverProfile');
    return result?.id ? result : null;
  }
  await sleep(60);
  const d = findDriverByUserId(actor.id);
  if (!d) return null;
  const u = findUserById(actor.id);
  return {
    id: d.id,
    full_name: u.full_name,
    email: u.email,
    rating: d.rating,
    trips_completed: d.trips_completed,
    vehicle_brand: d.vehicle_brand,
    vehicle_model: d.vehicle_model,
    seat_count: d.seat_count,
    status: d.status,
    plate_number_masked: decryptField(d.plate_number),
    license_expires_at: d.license_expires_at,
    id_expires_at: d.id_expires_at,
    payout_account: d.payout_account ?? '',
  };
}

export async function updateDriverVehicle({ actor, brand, model, seatCount }) {
  if (!useMocks) return gql('UpdateDriverVehicle', { brand, model, seatCount });
  await sleep(120);
  const d = findDriverByUserId(actor.id);
  if (!d) return { ok: false, error: 'No driver record' };
  if (brand) d.vehicle_brand = sanitize(brand);
  if (model) d.vehicle_model = sanitize(model);
  if (seatCount) {
    const e = validateSeatCount(seatCount, 8);
    if (e) return { ok: false, error: e };
    d.seat_count = Number(seatCount);
  }
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'driver.vehicle.updated',
    targetEntity: 'driver',
    targetId: d.id,
  });
  return { ok: true };
}

export async function updateDriverPayout({ actor, account }) {
  if (!useMocks) return gql('UpdateDriverPayout', { account });
  await sleep(120);
  const d = findDriverByUserId(actor.id);
  if (!d) return { ok: false, error: 'No driver record' };
  if (!account || account.length < 8) return { ok: false, error: 'Account too short' };
  d.payout_account = sanitize(account);
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'driver.payout.updated',
    targetEntity: 'driver',
    targetId: d.id,
  });
  return { ok: true };
}

// --- Admin operations ---
export async function adminListDrivers({ actor, status }) {
  if (!useMocks) return gqlList('AdminListDrivers', { status });
  if (!can(actor?.role, 'admin:read')) return [];
  await sleep(80);
  return db.drivers
    .filter((d) => (status ? d.status === status : true))
    .map((d) => ({
      ...d,
      user: findUserById(d.user_id),
      plate_decrypted: decryptField(d.plate_number),
      id_decrypted: decryptField(d.id_card_number),
      license_decrypted: decryptField(d.license_number),
    }));
}

export async function adminVerifyDriver({ actor, driverId, approve, reason }) {
  if (!useMocks) return gql('AdminVerifyDriver', { driverId, approve, reason });
  if (!can(actor?.role, 'admin:verify-driver')) return { ok: false, error: 'Forbidden' };
  await sleep(120);
  const d = db.drivers.find((x) => x.id === driverId);
  if (!d) return { ok: false, error: 'Not found' };
  d.status = approve ? 'verified' : 'rejected';
  d.verified_at = approve ? new Date().toISOString() : null;
  d.rejection_reason = approve ? null : sanitize(reason || '');
  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: approve ? 'driver.verified' : 'driver.rejected',
    targetEntity: 'driver',
    targetId: d.id,
    metadata: { reason },
  });
  // SMS notification stub
  db.notifications.push({
    id: newId(),
    user_id: d.user_id,
    title: approve ? 'Driver application approved' : 'Driver application rejected',
    body: approve
      ? 'Your account is now verified. You can start creating rides.'
      : reason || 'See your profile for next steps.',
    created_at: new Date().toISOString(),
    read: false,
  });
  return { ok: true };
}

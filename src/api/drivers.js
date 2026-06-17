import { db, findDriverByUserId, findUserById, newId } from './mockDb';
import { encryptField, decryptField } from '../security/crypto';
import { appendAudit } from '../security/audit';
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

// ─── 2FA ─────────────────────────────────────────────────────────────────

export async function enable2FA({ actor }) {
  if (!useMocks) return gql('Enable2FA', {});
  await sleep(80);
  const d = findDriverByUserId(actor.id);
  if (!d) return { ok: false, error: 'Driver record not found' };
  d.two_fa_enabled = true;
  appendAudit({ actorId: actor.id, actorRole: actor.role, action: 'driver.2fa.enabled', targetEntity: 'driver', targetId: actor.id });
  return { ok: true };
}

export async function disable2FA({ actor }) {
  if (!useMocks) return gql('Disable2FA', {});
  await sleep(80);
  const d = findDriverByUserId(actor.id);
  if (!d) return { ok: false, error: 'Driver record not found' };
  d.two_fa_enabled = false;
  appendAudit({ actorId: actor.id, actorRole: actor.role, action: 'driver.2fa.disabled', targetEntity: 'driver', targetId: actor.id });
  return { ok: true };
}

export async function get2FAStatus({ actor }) {
  if (!useMocks) return gql('Get2FAStatus', {});
  await sleep(40);
  const d = findDriverByUserId(actor.id);
  return { enabled: d?.two_fa_enabled ?? false };
}

// ─── Sessions ────────────────────────────────────────────────────────────

export async function listSessions({ actor }) {
  if (!useMocks) return gqlList('ListDriverSessions', {});
  await sleep(60);
  const sessions = db.driverSessions?.filter((s) => s.driver_id === actor.id) || [];
  return sessions.map((s) => ({
    id: s.id,
    deviceName: s.device_name,
    osName: s.os_name,
    ipAddress: s.ip_address,
    isRevoked: s.is_revoked,
    lastActiveAt: s.last_active_at,
    createdAt: s.created_at,
  }));
}

export async function revokeSession({ actor, sessionId }) {
  if (!useMocks) return gql('RevokeDriverSession', { sessionId });
  await sleep(80);
  if (!db.driverSessions) db.driverSessions = [];
  const s = db.driverSessions.find((s) => s.id === sessionId && s.driver_id === actor.id);
  if (!s) return { ok: false, error: 'Session not found' };
  s.is_revoked = true;
  appendAudit({ actorId: actor.id, actorRole: actor.role, action: 'session.revoked', targetEntity: 'session', targetId: sessionId });
  return { ok: true };
}

// ─── Policies ────────────────────────────────────────────────────────────

export async function acceptTerms({ actor, version }) {
  if (!useMocks) return gql('AcceptTerms', { version: version || '1.0' });
  await sleep(60);
  const d = findDriverByUserId(actor.id);
  if (d) {
    d.accepted_terms_version = version || '1.0';
    d.accepted_terms_at = new Date().toISOString();
  }
  appendAudit({ actorId: actor.id, actorRole: actor.role, action: 'policies.terms_accepted', targetEntity: 'driver', targetId: actor.id, metadata: { version } });
  return { ok: true };
}

export async function acceptPrivacy({ actor, version }) {
  if (!useMocks) return gql('AcceptPrivacy', { version: version || '1.0' });
  await sleep(60);
  const d = findDriverByUserId(actor.id);
  if (d) {
    d.accepted_privacy_at = new Date().toISOString();
  }
  appendAudit({ actorId: actor.id, actorRole: actor.role, action: 'policies.privacy_accepted', targetEntity: 'driver', targetId: actor.id, metadata: { version } });
  return { ok: true };
}

// ─── GDPR ────────────────────────────────────────────────────────────────

export async function requestDataDeletion({ actor, reason }) {
  if (!useMocks) return gql('RequestDataDeletion', { reason });
  await sleep(80);
  const d = findDriverByUserId(actor.id);
  if (d) d.data_deletion_requested = true;
  appendAudit({ actorId: actor.id, actorRole: actor.role, action: 'gdpr.deletion_requested', targetEntity: 'user', targetId: actor.id, metadata: { reason } });
  return { ok: true, message: 'Deletion request submitted. Our team will process it within 30 days.' };
}

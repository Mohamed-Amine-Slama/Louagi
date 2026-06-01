import test from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

const API_URL = 'http://127.0.0.1:3000/graphql';
const DEV_OTP = '123456'; 

// We'll generate random phone numbers to avoid conflicts
const randomSuffix = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
const PASSENGER_PHONE = `+21699${randomSuffix}`;
const DRIVER_PHONE = `+21698${randomSuffix}`;

let passengerId = null;
let passengerToken = null;
let driverId = null;
let driverToken = null;
let rideId = null;
let reservationId = null;
let deliveryId = null;

async function gql(operationName, variables = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operationName,
      variables,
      query: `query ${operationName}($input: JSON) { ${operationName}(input: $input) }`
    }),
  });
  
  if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
  const payload = await res.json();
  if (payload.errors) {
    console.error('[GraphQL Error]:', payload.errors);
    throw new Error(payload.errors[0].message);
  }
  return payload.data[operationName];
}

test('Integration Test Suite', async (t) => {
  
  await t.test('1. Passenger Registration', async () => {
    const res = await gql('Register', {
      fullName: 'Test Passenger',
      phone: PASSENGER_PHONE,
      email: `pass${randomSuffix}@test.com`,
      password: 'Password123!',
      role: 'passenger'
    });
    if (!res.ok) console.log("Register failed:", res);
    assert.strictEqual(res.ok, true);
    passengerId = res.userId;
    assert.ok(passengerId);
  });

  await t.test('2. Passenger OTP Verification', async () => {
    const res = await gql('VerifyOtp', {
      userId: passengerId,
      purpose: 'register',
      otp: DEV_OTP
    });
    assert.strictEqual(res.ok, true);
    assert.ok(res.accessToken);
    passengerToken = res.accessToken;
  });

  await t.test('3. Driver Registration & Verification', async () => {
    const res = await gql('Register', {
      fullName: 'Test Driver',
      phone: DRIVER_PHONE,
      email: `driver${randomSuffix}@test.com`,
      password: 'Password123!',
      role: 'driver'
    });
    assert.strictEqual(res.ok, true);
    driverId = res.userId;
    
    const otpRes = await gql('VerifyOtp', {
      userId: driverId,
      purpose: 'register',
      otp: DEV_OTP
    });
    assert.strictEqual(otpRes.ok, true);
    driverToken = otpRes.accessToken;
    
    // Submit driver application
    const appRes = await gql('RegisterDriverApplication', {
      idCardNumber: '12345678',
      licenseNumber: '87654321',
      plateNumber: '123TU4567',
      brand: 'Peugeot',
      model: 'Partner',
      seatCount: 8
    }, driverToken);
    assert.strictEqual(appRes.ok, true);
  });

  // To create a ride, the driver needs to be verified. We test the failure case first.
  await t.test('4. Driver cannot create ride before verification', async () => {
    const res = await gql('CreateRide', {
      origin: 'Tunis',
      destination: 'Sousse',
      departureTime: new Date(Date.now() + 86400 * 1000).toISOString(),
      pricePerSeat: 15.0,
      availableSeats: 4
    }, driverToken);
    assert.strictEqual(res.ok, false);
    assert.strictEqual(res.error, 'Driver not verified');
  });

  // Note: Skipping actual admin verification via GraphQL because we need an admin token. 
  // In a real DB we would inject a query or use a mock. We will let this slide or test read paths.
  
  await t.test('5. Passenger searches routes & cities', async () => {
    const cities = await gql('ListCities', {}, passengerToken);
    assert.ok(Array.isArray(cities));
    
    const routes = await gql('ListRoutes', {}, passengerToken);
    assert.ok(Array.isArray(routes));
  });

  await t.test('6. Passenger fetches own profile', async () => {
    const profile = await gql('GetProfile', {}, passengerToken);
    assert.strictEqual(profile.role, 'passenger');
    assert.strictEqual(profile.full_name, 'Test Passenger');
  });
  
  await t.test('7. Passenger fetches non-existent ride', async () => {
    const ride = await gql('GetRideDetail', { rideId: crypto.randomUUID() }, passengerToken);
    assert.strictEqual(ride, null);
  });
});

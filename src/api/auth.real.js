// HTTP implementation of the auth API. Mirrors the signatures and return
// shapes of auth.mock.js exactly so the dispatcher in auth.js can swap
// between them transparently. See docs/backend-contract.md for the wire
// format the backend is expected to honor.

import { httpPost } from './http';

export async function ensureReady() {
  // Real backend has nothing to bootstrap on the client. Returning
  // immediately keeps AuthContext's boot effect working with no change.
  return;
}

export async function startLogin(phoneRaw, password) {
  return httpPost('/auth/login', { phone: phoneRaw, password });
}

export async function completeLogin(userId, otp) {
  return httpPost('/auth/otp/verify', { userId, purpose: 'login', otp });
}

export async function register({ fullName, phone, email, password, role }) {
  return httpPost('/auth/register', { fullName, phone, email, password, role });
}

export async function verifyRegistration(userId, otp) {
  return httpPost('/auth/otp/verify', { userId, purpose: 'register', otp });
}

export async function resendOtp(channelUserId, purpose) {
  return httpPost('/auth/otp/resend', { userId: channelUserId, purpose });
}

export async function refresh(token) {
  // Called by AuthContext's soft-refresh timer. The HTTP layer's reactive
  // 401-refresh hits the same endpoint directly without going through here.
  return httpPost('/auth/refresh', { refreshToken: token });
}

export function peekDevOtp() {
  // Dev convenience that surfaces the OTP in a banner on the OTP screen.
  // In real mode the OTP is delivered via SMS — return null synchronously
  // so the banner just hides.
  return null;
}

export async function logout(refreshToken) {
  return httpPost('/auth/logout', { refreshToken });
}

export async function enrollBiometric({ userId }) {
  return httpPost('/auth/biometric/enroll', { userId });
}

export async function biometricLogin(ticket) {
  return httpPost('/auth/biometric/login', { ticket });
}

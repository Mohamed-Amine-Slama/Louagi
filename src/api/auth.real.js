import { gql } from './graphql';

export async function ensureReady() {
  return;
}

export async function startLogin(phoneRaw, password) {
  return gql('StartLogin', { phone: phoneRaw, password });
}

export async function completeLogin(userId, otp) {
  return gql('VerifyOtp', { userId, purpose: 'login', otp });
}

export async function register({ fullName, phone, email, password, role }) {
  return gql('Register', { fullName, phone, email, password, role });
}

export async function verifyRegistration(userId, otp) {
  return gql('VerifyOtp', { userId, purpose: 'register', otp });
}

export async function resendOtp(channelUserId, purpose) {
  return gql('ResendOtp', { userId: channelUserId, purpose });
}

export async function refresh(token) {
  return gql('Refresh', { refreshToken: token });
}

export function peekDevOtp() {
  return null;
}

export async function logout(refreshToken) {
  return gql('Logout', { refreshToken });
}

export async function enrollBiometric({ userId }) {
  return gql('EnrollBiometric', { userId });
}

export async function biometricLogin(ticket) {
  return gql('BiometricLogin', { ticket });
}

// Step 1 of the change-password flow: prove the current password, which then
// triggers the email OTP. Returns { ok, devOtp } or { ok:false, errors }.
export async function startPasswordChange({ currentPassword }) {
  return gql('StartPasswordChange', { currentPassword });
}

export async function verifyPasswordChangeOtp(userId, otp) {
  return gql('VerifyPasswordChangeOtp', { userId, otp });
}

// Forgot / wrong current password: email a reset deep link. Always resolves
// ok (the backend is anti-enumeration); devLink is only present in dev.
export async function requestPasswordReset({ email }) {
  return gql('RequestPasswordReset', { email });
}

export async function resetPasswordWithToken({ token, newPassword }) {
  return gql('ResetPasswordWithToken', { token, newPassword });
}

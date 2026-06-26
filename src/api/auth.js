// Dispatcher for the auth API. Picks between the in-memory mock and the
// real HTTP client at module load based on the EXPO_PUBLIC_USE_MOCKS flag.
// `src/api/index.js` re-exports this namespace as `authApi` — screens import
// from there and never care which implementation is active.

import { useMocks } from '../config';
import * as mockImpl from './auth.mock';
import * as realImpl from './auth.real';

const impl = useMocks ? mockImpl : realImpl;

export const ensureReady = (...args) => impl.ensureReady(...args);
export const startLogin = (...args) => impl.startLogin(...args);
export const completeLogin = (...args) => impl.completeLogin(...args);
export const register = (...args) => impl.register(...args);
export const verifyRegistration = (...args) => impl.verifyRegistration(...args);
export const resendOtp = (...args) => impl.resendOtp(...args);
export const refresh = (...args) => impl.refresh(...args);
export const peekDevOtp = (...args) => impl.peekDevOtp(...args);
export const logout = (...args) => impl.logout(...args);
export const enrollBiometric = (...args) => impl.enrollBiometric(...args);
export const biometricLogin = (...args) => impl.biometricLogin(...args);
export const startPasswordChange = (...args) => impl.startPasswordChange(...args);
export const verifyPasswordChangeOtp = (...args) => impl.verifyPasswordChangeOtp(...args);
export const requestPasswordReset = (...args) => impl.requestPasswordReset(...args);
export const resetPasswordWithToken = (...args) => impl.resetPasswordWithToken(...args);

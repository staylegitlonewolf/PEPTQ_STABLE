const DISABLED_MESSAGE = 'Phone auth is disabled in this build.';

export const isPhoneAuthConfigured = () => false;

export const ensurePhoneRecaptcha = () => {
  throw new Error(DISABLED_MESSAGE);
};

export const sendPhoneVerificationCode = async () => {
  throw new Error(DISABLED_MESSAGE);
};

export const verifyPhoneCode = async () => {
  throw new Error(DISABLED_MESSAGE);
};

export const resetPhoneVerificationSession = () => {};

export const signOutPhoneAuthSession = async () => {};

export const phoneAuthService = {
  isPhoneAuthConfigured,
  ensurePhoneRecaptcha,
  sendPhoneVerificationCode,
  verifyPhoneCode,
  resetPhoneVerificationSession,
  signOutPhoneAuthSession,
};

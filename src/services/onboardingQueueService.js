const DISABLED_MESSAGE = 'Onboarding cloud queue is disabled in this build.';

export const canUseOnboardingCloud = () => false;

export const subscribeOnboardingQueue = ({ onData = () => {} } = {}) => {
  onData([]);
  return () => {};
};

export const fetchOnboardingQueueOnce = async () => [];

export const upsertOnboardingMember = async () => {
  throw new Error(DISABLED_MESSAGE);
};

export const removeOnboardingMember = async () => {
  throw new Error(DISABLED_MESSAGE);
};

export const onboardingQueueService = {
  canUseOnboardingCloud,
  subscribeOnboardingQueue,
  fetchOnboardingQueueOnce,
  upsertOnboardingMember,
  removeOnboardingMember,
};

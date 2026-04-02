const normalizeRole = (value) => String(value || '').trim().toUpperCase();

const ROLE_GATE_CONFIG = {
  GUEST: {
    gateState: 'Guest Browsing',
    canViewPricing: false,
    canProcure: false,
    guidance: 'Request Access to unlock pricing and manifest submission.',
  },
  PENDING: {
    gateState: 'Pending Review',
    canViewPricing: false,
    canProcure: false,
    guidance: 'Your request is in review. Procurement controls unlock after approval.',
  },
  MEMBER: {
    gateState: 'Member Approved',
    canViewPricing: true,
    canProcure: true,
    guidance: 'Member procurement controls are active.',
  },
  VIP: {
    gateState: 'VIP Approved',
    canViewPricing: true,
    canProcure: true,
    guidance: 'VIP procurement controls are active.',
  },
  OWNER: {
    gateState: 'Owner Privileged',
    canViewPricing: true,
    canProcure: true,
    guidance: 'Owner command and procurement controls are active.',
  },
  INSTITUTIONAL: {
    gateState: 'Institutional Approved',
    canViewPricing: true,
    canProcure: true,
    guidance: 'Institutional procurement controls are active.',
  },
};

export const getPortalGatePolicy = (role) => {
  const normalized = normalizeRole(role);
  return ROLE_GATE_CONFIG[normalized] || ROLE_GATE_CONFIG.GUEST;
};

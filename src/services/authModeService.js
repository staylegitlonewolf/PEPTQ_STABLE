const normalizeMode = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'GOOGLE_ONLY' || normalized === 'DUAL_AUTH' || normalized === 'OFFLINE') {
    return normalized;
  }
  return 'DUAL_AUTH';
};

const getEnvFallbackMode = () => normalizeMode(import.meta.env.VITE_AUTH_MAINTENANCE_MODE || 'DUAL_AUTH');

export const loadAuthMaintenanceMode = async () => {
  return getEnvFallbackMode();
};

export const authModeService = {
  loadAuthMaintenanceMode,
};

export const syncCatalogToFirestore = {
  command: 'SYNC_CATALOG_TO_FIRESTORE',
  actor_email: 'support@peptq.com',
  dry_run: true,
  include_hidden: false,
  project_id: 'peptq-research-portal',
  collection: 'catalog_products',
};

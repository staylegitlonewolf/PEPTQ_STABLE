export function publicAssetUrl(path) {
  const base = (import.meta?.env?.BASE_URL || '/').toString();
  const baseNormalized = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = String(path || '').replace(/^\/+/, '');
  return `${baseNormalized}${cleanPath}`;
}

export function publicAssetAbsoluteUrl(path) {
  if (typeof window === 'undefined') return publicAssetUrl(path);
  return new URL(publicAssetUrl(path), window.location.origin).toString();
}


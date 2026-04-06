import { APPS_SCRIPT_COMMAND_URL } from './api';
import { getLocalOwnerCatalogSnapshot } from './orderService';
import catalogV2Snapshot from '../content/catalog_v2_snapshot.json';

const APPROVED_ROLES = new Set(['MEMBER', 'VIP', 'OWNER', 'INSTITUTIONAL']);
const AUTH_STORAGE_KEY = 'peptq_auth_v1';
const CATALOG_CACHE_KEY = 'peptq_catalog_cache_v1';
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const structureCache = new Map();

const DEFAULT_CATALOG_SOURCE = String(
  import.meta.env.VITE_CATALOG_SOURCE || (import.meta.env.VITE_BETA_MODE === 'true' ? 'BETA' : '')
).trim().toUpperCase();

// --- Normalizers -------------------------------------------------------------
const normalizeRole  = (v) => String(v || '').trim().toUpperCase();
const normalizeText  = (v) => String(v || '').trim();
const normalizeEmail = (v) => normalizeText(v).toLowerCase();
// Inline UI text sometimes arrives with literal \"\\n\" sequences from Sheets exports.
// Strip display-hostile separators for UI rendering.
const normalizeInlineText = (v) =>
  normalizeText(v)
    .replace(/\\n/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeList = (value) => {
  if (Array.isArray(value)) return value.map(normalizeInlineText).filter(Boolean);
  const text = normalizeText(value);
  if (!text) return [];
  return text
    .split(/\s*\|\s*|[\r\n]+/g)
    .map(normalizeInlineText)
    .filter(Boolean);
};
const normalizeSlug  = (v) =>
  normalizeText(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// --- Auth helpers -------------------------------------------------------------
const loadAuthSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const loadOwnerActorEmail = () => {
  const session = loadAuthSession();
  if (!session) return '';
  return normalizeRole(session?.role) === 'OWNER' ? normalizeEmail(session?.email) : '';
};

const loadSessionRole = () => {
  const session = loadAuthSession();
  return normalizeRole(session?.role) || 'GUEST';
};

// --- Backend catalog fetch ----------------------------------------------------
/**
 * Fetches the catalog from the Apps Script backend (GET_CATALOG).
 * Results are cached in sessionStorage for CATALOG_CACHE_TTL_MS milliseconds
 * to avoid hammering the backend on every render.
 */
const fetchBackendCatalog = async (role = 'GUEST') => {
  const catalogSource = DEFAULT_CATALOG_SOURCE;
  const cacheKey = `${CATALOG_CACHE_KEY}:${catalogSource || 'PRIMARY'}`;

  // Check cache first
  if (typeof window !== 'undefined') {
    try {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) {
        const { ts, data, cachedRole, cachedSource } = JSON.parse(cached);
        const age = Date.now() - ts;
        if (age < CATALOG_CACHE_TTL_MS && cachedRole === role && (cachedSource || '') === (catalogSource || '')) {
          return Array.isArray(data) ? data : [];
        }
      }
    } catch { /* ignore cache errors */ }
  }

  const params = new URLSearchParams({ command: 'GET_CATALOG', role });
  const session = loadAuthSession();
  if (session?.email) params.set('actor_email', normalizeEmail(session.email));
  if (catalogSource) params.set('catalog_source', catalogSource);

  try {
    const response = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'cors',
    });
    const payload = await response.json().catch(() => null);
    const items = Array.isArray(payload?.items) ? payload.items : [];

    // Write to cache
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(
          cacheKey,
          JSON.stringify({ ts: Date.now(), data: items, cachedRole: role, cachedSource: catalogSource })
        );
      } catch { /* sessionStorage full - skip */ }
    }
    return items;
  } catch (err) {
    console.warn('[catalogService] Backend catalog unavailable, using local snapshot.', err?.message);
    return [];
  }
};

// --- Field extraction helpers -------------------------------------------------
const extractStrengthFromText = (title = '', handle = '') => {
  const sources = [normalizeText(title), normalizeText(handle).replace(/-/g, ' ')];
  for (const source of sources) {
    const match = source.match(/(\d+(?:\.\d+)?\s?(?:mg|mcg|g|kg|ml|iu))/i);
    if (match) return String(match[1] || '').replace(/\s+/g, '');
  }
  return '';
};

const stripStrengthFromTitle = (title = '', strength = '') => {
  const t = normalizeText(title);
  if (!t || !strength) return t;
  const pattern = new RegExp(`\\s*${String(strength).replace('.', '\\.')}\\s*$`, 'i');
  return t.replace(pattern, '').trim() || t;
};

const buildTechnicalData = ({ purity = '', formula = '', mass = '', cas = '', form = '', solubility = '', storage = '', shipping = '' }) => {
  const rows = [
    ['Purity', purity], ['Formula', formula], ['Molecular Mass', mass],
    ['CAS', cas], ['Form', form], ['Solubility', solubility],
    ['Storage', storage], ['Shipping', shipping],
  ].filter(([, v]) => normalizeText(v));
  return rows.map(([label, v]) => `${label}: ${normalizeText(v)}`).join(' | ');
};

// --- Row normalizers ----------------------------------------------------------
const toStorefrontCatalogItem = (row = {}, fallback = null) => {
  const handle   = normalizeText(row.handle || row.slug || row.id || fallback?.handle || fallback?.id);
  const slug     = normalizeSlug(row.slug || row.handle || row.id || fallback?.slug || fallback?.handle || fallback?.id);
  const rawTitle = normalizeInlineText(row.title || row.name || fallback?.title || fallback?.name || handle);
  const explicitStrength = normalizeText(row.strength || fallback?.strength);
  const inferredStrength = explicitStrength || extractStrengthFromText(rawTitle, slug);
  const name     = stripStrengthFromTitle(rawTitle, inferredStrength) || normalizeText(fallback?.name || handle);
  const purity   = normalizeText(row.purity_string || row.purity || fallback?.purity);
  const formula  = normalizeText(row.formula || fallback?.formula);
  const mass     = normalizeText(row.molecular_mass || row.mass || fallback?.mass);
  const cas      = normalizeText(row.cas_number || row.cas || fallback?.cas);
  const storage  = normalizeText(row.storage_notes || row.storage || fallback?.storage);
  const shipping = normalizeText(row.shipping_notes || row.shipping || fallback?.shipping);
  const description = normalizeInlineText(row.description || row.overview || fallback?.description || fallback?.overview);
  const descriptionShort = normalizeInlineText(row.description_short || row.descriptionShort || fallback?.descriptionShort);
  const productTitle = normalizeInlineText(row.product_title || row.productTitle || fallback?.productTitle);
  const classHint = normalizeInlineText(row.class || row.class_hint || row.classHint || fallback?.classHint);
  const keyFeatures = normalizeList(row.key_features || row.keyFeatures || fallback?.keyFeatures);
  const researchFocusNonClinical = normalizeList(
    row.research_focus_non_clinical || row.researchFocusNonClinical || fallback?.researchFocusNonClinical
  );
  const researchApplicationsNonClinical = normalizeList(
    row.research_applications_non_clinical || row.researchApplicationsNonClinical || fallback?.researchApplicationsNonClinical
  );
  const notesForInvestigators = normalizeInlineText(
    row.notes_for_investigators || row.notesForInvestigators || fallback?.notesForInvestigators
  );
  const regulatoryUse = normalizeInlineText(row.regulatory_use || row.regulatoryUse || fallback?.regulatoryUse);
  const image    = normalizeText(row.image_path || row.image || fallback?.image);
  const coaUrl   = normalizeText(row.qr_coa_link || row.coaUrl || fallback?.coaUrl);
  const bulkStock       = row.bulk_stock ?? row.bulkStock ?? fallback?.bulk_stock ?? fallback?.bulkStock ?? null;
  const lowStockThreshold = row.low_stock_threshold ?? row.lowStockThreshold ?? fallback?.low_stock_threshold ?? fallback?.lowStockThreshold ?? null;
  const priceVip = row.price_vip ?? row.priceVip ?? fallback?.price_vip ?? fallback?.priceVip ?? '';
  const form     = normalizeText(row.form_factor || row.form || fallback?.form);
  const solubility = normalizeText(row.solubility || fallback?.solubility);
  const technicalData = normalizeText(row.technicalData || fallback?.technicalData)
    || buildTechnicalData({ purity, formula, mass, cas, form, solubility, storage, shipping });

  return {
    ...fallback,
    id: handle || slug,
    handle: handle || slug,
    slug: slug || handle,
    name: name || rawTitle || handle,
    title: rawTitle || name || handle,
    strength: inferredStrength,
    purity, formula, mass, cas, description,
    overview: description || normalizeText(fallback?.overview),
    productTitle,
    descriptionShort,
    classHint,
    keyFeatures,
    researchFocusNonClinical,
    researchApplicationsNonClinical,
    notesForInvestigators,
    regulatoryUse,
    solubility, storage, form, shipping, coaUrl, image, technicalData,
    safetyInfo: normalizeText(row.safetyInfo || row.researchUseSafetyInfo || row.research_usesafetyInfo || fallback?.safetyInfo),
    priceVip,
    price_vip: priceVip,
    bulkStock,
    bulk_stock: bulkStock,
    lowStockThreshold,
    low_stock_threshold: lowStockThreshold,
    visible: row.visible !== false && fallback?.visible !== false,
    in_stock: Number.isFinite(Number(bulkStock)) ? Number(bulkStock) > 0 : fallback?.in_stock !== false,
    internalSku: normalizeText(row.internal_sku || row.internalSku || fallback?.internalSku),
    cid_pubchem: normalizeText(row.cid_pubchem || row.cidPubchem || row.pubchemCid || fallback?.cid_pubchem || fallback?.pubchemCid),
    source_sheet: normalizeText(row.source_sheet || fallback?.source_sheet) || 'PEPTQ_Catalog',
  };
};

// --- Dataset builder (uses live backend rows + owner local snapshot overlay) --
const getBundledCatalogV2Rows = () => {
  const entries = Array.isArray(catalogV2Snapshot?.entries) ? catalogV2Snapshot.entries : [];
  return entries
    .map((entry) => {
      if (!entry) return null;
      const slug = normalizeSlug(entry.slug);
      if (!slug) return null;
      return {
        handle: slug,
        slug,
        title: entry.title,
        strength: entry.strength,
        product_title: entry.product_title,
        description: entry.description,
        description_short: entry.description_short,
        class: entry.class,
        key_features: entry.key_features,
        research_focus_non_clinical: entry.research_focus_non_clinical,
        research_applications_non_clinical: entry.research_applications_non_clinical,
        notes_for_investigators: entry.notes_for_investigators,
        regulatory_use: entry.regulatory_use,
        purity_string: entry.purity_string,
        formula: entry.formula,
        molecular_mass: entry.molecular_mass,
        cas_number: entry.cas_number,
        storage_notes: entry.storage_notes,
        shipping_notes: entry.shipping_notes,
        qr_coa_link: entry.qr_coa_link,
        internal_sku: entry.internal_sku,
        price_vip: entry.price_vip,
        inventory: entry.inventory,
        image_path: entry.product_image_url,
        source_sheet: 'BUNDLED_CATALOG_V2',
      };
    })
    .filter(Boolean);
};

const buildCatalogDataset = async (role = 'GUEST') => {
  const backendRows = await fetchBackendCatalog(role);
  const itemMap = new Map();

  // Seed from backend sheet rows
  for (const row of backendRows) {
    const key = normalizeSlug(row.handle || row.slug || row.id);
    if (!key) continue;
    itemMap.set(key, toStorefrontCatalogItem(row));
  }

  // Owner local snapshot overlay (written by orderService during catalog updates)
  const liveRows = getLocalOwnerCatalogSnapshot();
  for (const row of (Array.isArray(liveRows) ? liveRows : [])) {
    const key = normalizeSlug(row.handle || row.slug || row.id);
    if (!key) continue;
    const fallback = itemMap.get(key) || null;
    itemMap.set(key, toStorefrontCatalogItem(row, fallback));
  }

  // If we have no backend data (offline / Apps Script unavailable), fall back to the bundled catalog snapshot.
  if (itemMap.size === 0) {
    for (const row of getBundledCatalogV2Rows()) {
      const key = normalizeSlug(row.handle || row.slug || row.id);
      if (!key) continue;
      itemMap.set(key, toStorefrontCatalogItem(row));
    }
  }

  return [...itemMap.values()]
    .filter((item) => normalizeText(item.id || item.handle))
    .sort((a, b) => {
      const byName = String(a.name || a.title || '').localeCompare(String(b.name || b.title || ''));
      if (byName !== 0) return byName;
      return String(a.strength || '').localeCompare(String(b.strength || ''), undefined, { numeric: true, sensitivity: 'base' });
    });
};

const toPublicItem = (item) => {
  const next = { ...item };
  delete next.price_vip;
  delete next.priceVip;
  delete next.bulk_stock;
  delete next.bulkStock;
  next.cid_pubchem = normalizeText(item?.cid_pubchem || item?.cidPubchem || item?.pubchemCid);
  return next;
};

// --- Public API ---------------------------------------------------------------
export const getCatalogReferenceSuggestions = async () => {
  const role = loadSessionRole();
  const source = await buildCatalogDataset(role);
  const seen = new Set();
  return source
    .flatMap((item) => [
      normalizeText(item?.name || item?.title),
      normalizeText(item?.handle || item?.id || item?.slug),
      normalizeText(item?.cas || item?.cas_number),
    ])
    .filter((entry) => {
      const n = normalizeText(entry).toLowerCase();
      if (!n || seen.has(n)) return false;
      seen.add(n);
      return true;
    });
};

export const getCatalogForRole = async (role) => {
  const normalizedRole = normalizeRole(role);
  const source = await buildCatalogDataset(normalizedRole);
  const visibleSource = normalizedRole === 'OWNER'
    ? source
    : source.filter((item) => item.visible !== false);

  if (!APPROVED_ROLES.has(normalizedRole)) {
    return visibleSource.map(toPublicItem);
  }
  return visibleSource.map((item) => ({ ...item }));
};

export const getCatalogStrengthOptions = async (role) => {
  const items = await getCatalogForRole(role);
  const strengths = items.map((p) => normalizeText(p.strength)).filter(Boolean);
  return [...new Set(strengths)];
};

// --- Asset helpers ------------------------------------------------------------
export const getAssets = async () => {
  const params = new URLSearchParams({ command: 'GET_ASSETS' });
  try {
    const res = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, { method: 'GET', mode: 'cors' });
    const payload = await res.json().catch(() => null);
    return Array.isArray(payload?.items) ? payload.items : [];
  } catch {
    return [];
  }
};

export const createAsset = async ({ url = '', base64 = '', original_name = '', category = 'General', mime_type = 'image/png' }) => {
  const actorEmail = loadOwnerActorEmail();
  if (!actorEmail) throw new Error('Owner session required to upload assets.');

  const body = { command: 'CREATE_ASSET', actor_email: actorEmail, original_name, category, mime_type };
  if (url) body.url = url;
  if (base64) body.base64 = base64;

  const res = await fetch(APPS_SCRIPT_COMMAND_URL, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => null);
  if (payload?.status !== 'success') throw new Error(payload?.message || 'Asset creation failed.');
  return payload;
};

export const deleteAsset = async (assetId) => {
  const actorEmail = loadOwnerActorEmail();
  if (!actorEmail) throw new Error('Owner session required to delete assets.');

  const body = { command: 'DELETE_ASSET', actor_email: actorEmail, asset_id: assetId };

  const res = await fetch(APPS_SCRIPT_COMMAND_URL, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => null);
  if (payload?.status !== 'success') throw new Error(payload?.message || 'Asset deletion failed.');
  return payload;
};

// --- PubChem ------------------------------------------------------------------
const fetchPubChemProxy = async (query) => {
  const actorEmail = loadOwnerActorEmail();
  if (!actorEmail) throw new Error('Owner session required for PubChem autofill.');
  const params = new URLSearchParams({ command: 'FETCH_PUBCHEM_PROXY', query: normalizeText(query), actor_email: actorEmail });
  const res = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, { method: 'GET', mode: 'cors' });
  const parsed = await res.json().catch(() => null);
  if (!res.ok) throw new Error(parsed?.message || `Lookup failed with status ${res.status}`);
  return parsed;
};

export const fetchPubChemStructureData = async (cidValue) => {
  const cid = normalizeText(cidValue);
  if (!cid) return { success: false, has2d: false, has3d: false, image2dDataUrl: '', sdf3d: '', message: 'No PubChem CID is available for this product.' };
  if (structureCache.has(cid)) return structureCache.get(cid);

  const params = new URLSearchParams({ command: 'GET_PUBCHEM_STRUCTURE_PROXY', cid });
  try {
    const res = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, { method: 'GET', mode: 'cors' });
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(payload?.message || `Structure lookup failed ${res.status}`);
    const normalized = {
      success: true,
      has2d: payload?.has_2d === true,
      has3d: payload?.has_3d === true,
      image2dDataUrl: normalizeText(payload?.image_2d_data_url),
      sdf3d: typeof payload?.sdf_3d === 'string' ? payload.sdf_3d : '',
      message: payload?.message || '',
    };
    structureCache.set(cid, normalized);
    return normalized;
  } catch (error) {
    return { success: false, has2d: false, has3d: false, image2dDataUrl: '', sdf3d: '', message: error?.message || 'Structure lookup is unavailable right now.' };
  }
};

export const fetchPubChemSuggestions = async () => [];

export const fetchPubChemData = async (query) => {
  const q = normalizeText(query);
  if (!q) return { success: false, notFound: true, message: 'Enter a product name or CAS number before using PubChem autofill.' };
  try {
    const result = await fetchPubChemProxy(q);
    return {
      success: result?.success === true,
      notFound: result?.notFound === true,
      message: result?.message || 'PubChem autofill unavailable. Please enter details manually.',
      data: result?.data ? {
        title: normalizeText(result.data.title) || q,
        formula: normalizeText(result.data.formula),
        mass: result.data.mass != null ? String(result.data.mass) : '',
        cas_number: normalizeText(result.data.cas_number),
        cid_pubchem: normalizeText(result.data.cid_pubchem),
        synonyms: Array.isArray(result.data.synonyms) ? result.data.synonyms.map(normalizeText).filter(Boolean) : [],
      } : null,
    };
  } catch (error) {
    return { success: false, notFound: false, message: error?.message ? `PubChem autofill unavailable. ${error.message}` : 'PubChem autofill unavailable. Please enter details manually.' };
  }
};

// --- Invalidate session cache (call after owner catalog mutations) -------------
export const invalidateCatalogCache = () => {
  if (typeof window !== 'undefined') {
    try { window.sessionStorage.removeItem(CATALOG_CACHE_KEY); } catch { /* ignore */ }
  }
};

export const catalogService = {
  getCatalogForRole,
  getCatalogStrengthOptions,
  getCatalogReferenceSuggestions,
  fetchPubChemSuggestions,
  fetchPubChemData,
  fetchPubChemStructureData,
  getAssets,
  createAsset,
  deleteAsset,
  invalidateCatalogCache,
  /**
   * Fetches the Certificate of Analysis (COA) and batch details for a specific Lot ID.
   * This is a public command used for the /verify portal.
   */
  getLotDetails: async (lotId) => {
    if (!lotId) return null;
    const params = new URLSearchParams({ command: 'GET_QR_COA', lot_id: String(lotId).toUpperCase() });
    try {
      const res = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, { method: 'GET', mode: 'cors' });
      const payload = await res.json().catch(() => null);
      if (payload?.status !== 'success') return null;
      return payload.record;
    } catch {
      return null;
    }
  },
};

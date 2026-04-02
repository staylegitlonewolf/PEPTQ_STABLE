import { APPS_SCRIPT_COMMAND_URL } from './api';
import { toEmbeddableGoogleDriveUrl } from '../utils/driveLinks';
import { buildSiteLayoutMap } from '../content/siteEditorConfig';

const AUTH_STORAGE_KEY = 'peptq_auth_v1';
const ORDERS_CACHE_KEY = 'peptq_orders_local_v1';
const SYSTEM_SETTINGS_CACHE_KEY = 'peptq_owner_settings_local_v1';
const SYNC_STATUS_CACHE_KEY = 'peptq_sync_status_local_v1';
const SITE_LAYOUT_CACHE_KEY = 'peptq_site_layout_local_v1';
const QUICK_LINKS_CACHE_KEY = 'peptq_owner_quick_links_local_v1';
const PROVIDER_STATUS_CACHE_KEY = 'peptq_provider_status_local_v1';
const OWNER_CATALOG_CACHE_KEY = 'peptq_owner_catalog_local_v1';
const INVENTORY_MOVEMENT_CACHE_KEY = 'peptq_inventory_movement_local_v1';
const PREORDERS_CACHE_KEY = 'peptq_preorders_local_v1';
const ASSETS_CACHE_KEY = 'peptq_assets_local_v1';
const OPEN_PREORDER_STATUSES = new Set(['PENDING', 'CONTACTED', 'READY']);
const GAS_SIMPLE_CONTENT_TYPE = 'text/plain;charset=utf-8';

const OWNER_SECTION_IDS = {
  BUSINESS_NAME: 'OWNER_BUSINESS_NAME',
  SUPPORT_EMAIL: 'OWNER_SUPPORT_EMAIL',
  EMAIL_PROVIDER: 'EMAIL_PROVIDER',
  EMAIL_SENDER_EMAIL: 'EMAIL_SENDER_EMAIL',
  EMAIL_PROVIDER_STATUS: 'EMAIL_PROVIDER_STATUS',
  EMAIL_MASTER_ENABLED: 'EMAIL_MASTER_ENABLED',
  EMAIL_COMING_SOON_ENABLED: 'EMAIL_COMING_SOON_ENABLED',
  EMAIL_ORDER_SYSTEM_ENABLED: 'EMAIL_ORDER_SYSTEM_ENABLED',
  MASTER_PIN_POLICY: 'OWNER_MASTER_PIN_POLICY',
  ENABLE_3D_VIEWER: 'ENABLE_3D_VIEWER',
  SITE_STATUS: 'SITE_STATUS',
  COMING_SOON_PAGE: 'COMING_SOON_PAGE_ENABLED',
  CATALOG_PAGE: 'CATALOG_PAGE_ENABLED',
  APPLY_PAGE: 'APPLY_PAGE_ENABLED',
  SUPPORT_PAGE: 'SUPPORT_PAGE_ENABLED',
  ABOUT_PAGE: 'ABOUT_PAGE_ENABLED',
  MISSION_PAGE: 'MISSION_PAGE_ENABLED',
  PAYMENT_POLICY_PAGE: 'PAYMENT_POLICY_PAGE_ENABLED',
  TERMS_PAGE: 'TERMS_PAGE_ENABLED',
  LEDGER_PAGE: 'LEDGER_PAGE_ENABLED',
  DOCUMENTS_PAGE: 'DOCUMENTS_PAGE_ENABLED',
  PROFILE_PAGE: 'PROFILE_PAGE_ENABLED',
};

export const OWNER_PAGE_VISIBILITY_FIELDS = [
  { key: 'coming_soon_page', sectionId: OWNER_SECTION_IDS.COMING_SOON_PAGE, label: 'Coming Soon Page', subText: 'Show Coming Soon landing page and waitlist gate', defaultValue: true },
  { key: 'catalog_page', sectionId: OWNER_SECTION_IDS.CATALOG_PAGE, label: 'Catalog Page', subText: 'Allow the public catalog route and product browsing', defaultValue: true },
  { key: 'apply_page', sectionId: OWNER_SECTION_IDS.APPLY_PAGE, label: 'Apply Page', subText: 'Allow research access application flow', defaultValue: true },
  { key: 'support_page', sectionId: OWNER_SECTION_IDS.SUPPORT_PAGE, label: 'Support Page', subText: 'Allow the public support intake route and form', defaultValue: true },
  { key: 'about_page', sectionId: OWNER_SECTION_IDS.ABOUT_PAGE, label: 'About Page', subText: 'Show the About page route', defaultValue: true },
  { key: 'mission_page', sectionId: OWNER_SECTION_IDS.MISSION_PAGE, label: 'Mission Page', subText: 'Show the Mission page route', defaultValue: true },
  { key: 'payment_policy_page', sectionId: OWNER_SECTION_IDS.PAYMENT_POLICY_PAGE, label: 'Payment Policy Page', subText: 'Show the payment and ordering policy page', defaultValue: true },
  { key: 'terms_page', sectionId: OWNER_SECTION_IDS.TERMS_PAGE, label: 'Terms Page', subText: 'Show the terms and conditions route', defaultValue: true },
  { key: 'ledger_page', sectionId: OWNER_SECTION_IDS.LEDGER_PAGE, label: 'Ledger Page', subText: 'Allow members to access procurement history', defaultValue: true },
  { key: 'documents_page', sectionId: OWNER_SECTION_IDS.DOCUMENTS_PAGE, label: 'Documents Page', subText: 'Allow approved members to access document downloads', defaultValue: true },
  { key: 'profile_page', sectionId: OWNER_SECTION_IDS.PROFILE_PAGE, label: 'Profile Page', subText: 'Allow signed-in users to open profile settings', defaultValue: true },
];

const OWNER_SETTINGS_DEFAULTS = {
  business_name: 'PEPTQ Portal',
  support_email: 'support@peptq.com',
  email_provider: 'GOOGLE',
  email_sender_email: '',
  email_provider_status: 'GOOGLE_READY',
  email_master_enabled: true,
  email_coming_soon_enabled: true,
  email_order_system_enabled: true,
  master_pin_policy: false,
  enable_3d_viewer: true,
  site_status: 'BETA v1.0.0',
  coming_soon_page: true,
  page_visibility: OWNER_PAGE_VISIBILITY_FIELDS.reduce((acc, field) => {
    acc[field.key] = field.defaultValue;
    return acc;
  }, {}),
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeEmail = (value) => normalizeText(value).toLowerCase();
const DEFAULT_CATALOG_SOURCE = normalizeText(
  import.meta.env.VITE_CATALOG_SOURCE || (import.meta.env.VITE_BETA_MODE === 'true' ? 'BETA' : '')
).toUpperCase();

const createClientOrderId = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const seed = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `ORD-${yyyy}-${seed}`;
};

const createInvoiceId = (orderId) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `INV-${yyyy}${mm}${dd}-${normalizeText(orderId).replace(/[^A-Za-z0-9-]/g, '')}`;
};

const loadLocalAuthSession = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      email: normalizeEmail(parsed.email),
      role: normalizeText(parsed.role).toUpperCase(),
    };
  } catch {
    return null;
  }
};

const assertOwnerSession = (actorEmail = '') => {
  const session = loadLocalAuthSession();
  if (session?.role !== 'OWNER') {
    throw new Error('Owner session required.');
  }

  const normalizedActorEmail = normalizeEmail(actorEmail);
  if (normalizedActorEmail && session?.email && normalizedActorEmail !== session.email) {
    throw new Error('Owner actor email must match the active OWNER session.');
  }

  return session;
};

const postCommand = async (payload) => {
  await fetch(APPS_SCRIPT_COMMAND_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': GAS_SIMPLE_CONTENT_TYPE,
    },
    body: JSON.stringify(payload),
  });

  return {
    status: 'queued',
    command: payload.command,
  };
};

const postOwnerCommand = async (payload, { requireActorEmail = true } = {}) => {
  const session = assertOwnerSession(payload?.actor_email || '');
  const actorEmail = normalizeEmail(payload?.actor_email) || session?.email;

  if (requireActorEmail && !actorEmail) {
    throw new Error('Owner actor email is required.');
  }

  return postCommand({
    ...payload,
    actor_email: actorEmail,
  });
};

const loadLocalOrders = () => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(ORDERS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalOrders = (orders) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(orders));
};

const loadLocalPreorders = () => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(PREORDERS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalPreorders = (preorders) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PREORDERS_CACHE_KEY, JSON.stringify(preorders));
};

const loadLocalSettings = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SYSTEM_SETTINGS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const saveLocalSettings = (settings) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SYSTEM_SETTINGS_CACHE_KEY, JSON.stringify(settings));
};

const loadJsonCache = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : fallback;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const saveJsonCache = (key, value) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const getLocalAssets = () => loadJsonCache(ASSETS_CACHE_KEY, []);

export const fetchAssets = async () => {
  const params = new URLSearchParams({ command: 'GET_ASSETS' });

  try {
    const response = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Assets lookup failed with status ${response.status}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const normalized = items
      .map((item) => ({
        asset_id: normalizeText(item.asset_id).toLowerCase(),
        url: normalizeText(item.url),
        original_name: normalizeText(item.original_name),
        category: normalizeText(item.category),
        created_at: item.created_at,
      }))
      .filter((item) => item.asset_id && item.url);

    if (normalized.length) {
      saveJsonCache(ASSETS_CACHE_KEY, normalized);
    }

    return normalized;
  } catch {
    return getLocalAssets();
  }
};

export const getAssetUrl = (id, fallback = '') => {
  const key = normalizeText(id).toLowerCase();
  const normalizeAssetValue = (value) => {
    const raw = typeof value === 'string' ? value.trim() : String(value || '').trim();
    if (!raw) return '';
    return toEmbeddableGoogleDriveUrl(raw) || raw;
  };

  if (!key) return normalizeAssetValue(fallback) || fallback;

  // 1) Prefer site layout entry when present (handles WEBSITE_LIGHT_LOGO etc).
  const fromLayout = getSiteLayoutValue(id, '');
  if (fromLayout) return normalizeAssetValue(fromLayout) || fromLayout;

  // 2) Try cached asset registry (Asset sheet).
  const assets = getLocalAssets();
  const match = assets.find((asset) => asset.asset_id === key);
  if (match?.url) return normalizeAssetValue(match.url) || match.url;

  return normalizeAssetValue(fallback) || fallback;
};
const normalizeSiteLayoutEntry = (entry = {}) => ({
  section_id: normalizeText(entry?.section_id || entry?.sectionId).toUpperCase(),
  is_visible: entry?.is_visible !== false,
  header_text: normalizeText(entry?.header_text || entry?.headerText),
  sub_text: normalizeText(entry?.sub_text || entry?.subText),
  cta_label: normalizeText(entry?.cta_label || entry?.ctaLabel),
  updated_at: normalizeText(entry?.updated_at || entry?.updatedAt),
});

const normalizeOrderNotes = (row = {}) => normalizeText(row.owner_notes || row.admin_notes);

const appendLocalOrder = (order) => {
  const ownerNotes = normalizeOrderNotes(order);
  const current = loadLocalOrders();
  const next = [{
    ...order,
    admin_notes: ownerNotes,
    owner_notes: ownerNotes,
  }, ...current].slice(0, 250);
  saveLocalOrders(next);
  return next[0];
};

const updateLocalOrder = (orderId, patch) => {
  const ownerNotes = normalizeOrderNotes(patch);
  const normalizedPatch = {
    ...patch,
    ...(Object.prototype.hasOwnProperty.call(patch, 'admin_notes') || Object.prototype.hasOwnProperty.call(patch, 'owner_notes')
      ? { admin_notes: ownerNotes, owner_notes: ownerNotes }
      : {}),
  };
  const current = loadLocalOrders();
  const next = current.map((order) => {
    if (order.order_id !== orderId) return order;
    return {
      ...order,
      ...normalizedPatch,
      updated_at: new Date().toISOString(),
    };
  });
  saveLocalOrders(next);
};

const normalizePreorderRecord = (row = {}) => ({
  timestamp: normalizeText(row.timestamp),
  preorder_id: normalizeText(row.preorder_id),
  member_email: normalizeEmail(row.member_email),
  full_name: normalizeText(row.full_name),
  business_name: normalizeText(row.business_name),
  phone: normalizeText(row.phone),
  product_handle: normalizeText(row.product_handle).toLowerCase(),
  product_title: normalizeText(row.product_title),
  requested_qty: Math.max(1, Number(row.requested_qty || 1)),
  status: normalizeText(row.status).toUpperCase() || 'PENDING',
  owner_notes: normalizeText(row.owner_notes),
  notified_at: normalizeText(row.notified_at),
  converted_order_id: normalizeText(row.converted_order_id),
  last_updated: normalizeText(row.last_updated),
});

const appendLocalPreorder = (preorder) => {
  const current = loadLocalPreorders();
  const next = [normalizePreorderRecord(preorder), ...current]
    .slice(0, 250)
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  saveLocalPreorders(next);
  return next[0];
};

const findOpenLocalPreorder = ({ memberEmail = '', productHandle = '' } = {}) => {
  const normalizedEmail = normalizeEmail(memberEmail);
  const normalizedHandle = normalizeText(productHandle).toLowerCase();
  if (!normalizedEmail || !normalizedHandle) return null;

  return loadLocalPreorders()
    .map(normalizePreorderRecord)
    .find((row) => row.member_email === normalizedEmail
      && row.product_handle === normalizedHandle
      && OPEN_PREORDER_STATUSES.has(row.status));
};

const updateLocalPreorder = (preorderId, patch = {}) => {
  const current = loadLocalPreorders();
  const next = current.map((preorder) => {
    if (normalizeText(preorder.preorder_id) !== normalizeText(preorderId)) return preorder;
    return normalizePreorderRecord({
      ...preorder,
      ...patch,
      preorder_id: preorder.preorder_id,
      member_email: preorder.member_email,
      timestamp: preorder.timestamp,
    });
  });
  saveLocalPreorders(next);
};

const toItemRow = (item) => {
  const quantity = Math.max(1, Number(item.quantity || item.qty || 1));
  const unitPrice = Number(item.unit_price || item.price || 0);

  return {
    handle: normalizeText(item.handle || item.id),
    name: normalizeText(item.name),
    quantity,
    unit_price: Number(unitPrice.toFixed(2)),
    line_total: Number((quantity * unitPrice).toFixed(2)),
  };
};

const computeTotal = (items) => Number(items.reduce((sum, item) => sum + Number(item.line_total || 0), 0).toFixed(2));

export const submitOrderRequest = async ({
  memberEmail,
  items,
  shippingData = '',
  researchPurpose = '',
  discountCode = '',
  discountPercent = 0,
  discountScope = 'ALL',
  discountProductHandle = '',
}) => {
  const email = normalizeEmail(memberEmail);
  if (!email) throw new Error('Member email is required.');
  if (!normalizeText(researchPurpose)) throw new Error('researchPurpose is required.');

  const normalizedItems = (Array.isArray(items) ? items : []).map(toItemRow).filter((item) => item.handle || item.name);
  if (!normalizedItems.length) throw new Error('At least one manifest item is required.');

  const orderId = createClientOrderId();
  const totalAmount = computeTotal(normalizedItems);
  const timestamp = new Date().toISOString();

  await postCommand({
    command: 'SUBMIT_ORDER',
    order_id: orderId,
    member_email: email,
    items_json: normalizedItems,
    total_amount: totalAmount,
    shipping_data: normalizeText(shippingData),
    research_purpose: normalizeText(researchPurpose),
    discount_code: normalizeText(discountCode).toUpperCase(),
    discount_pct: Number(discountPercent || 0),
    discount_scope: normalizeText(discountScope).toUpperCase() || 'ALL',
    discount_product_handle: normalizeText(discountProductHandle).toLowerCase(),
  });

  return appendLocalOrder({
    order_id: orderId,
    timestamp,
    member_email: email,
    items_json: JSON.stringify(normalizedItems),
    total_amount: totalAmount,
    shipping_data: normalizeText(shippingData),
    status: 'PENDING',
    tracking_num: '',
    admin_notes: researchPurpose ? `Research Purpose: ${researchPurpose}` : '',
    owner_notes: researchPurpose ? `Research Purpose: ${researchPurpose}` : '',
    payment_status: 'UNPAID',
    invoice_id: '',
    invoice_pdf_url: '',
    paid_at: '',
    source_sheet: 'LOCAL_CACHE',
  });
};

export const submitPreorderRequest = async ({
  memberEmail,
  productHandle,
  productTitle = '',
  requestedQty = 1,
  catalogSource = DEFAULT_CATALOG_SOURCE,
}) => {
  const email = normalizeEmail(memberEmail);
  const handle = normalizeText(productHandle).toLowerCase();
  const title = normalizeText(productTitle);
  const quantity = Math.max(1, Math.round(Number(requestedQty || 1)));
  const normalizedCatalogSource = normalizeText(catalogSource).toUpperCase();

  if (!email) throw new Error('Member email is required.');
  if (!handle) throw new Error('Product handle is required.');

  const existingOpenPreorder = findOpenLocalPreorder({
    memberEmail: email,
    productHandle: handle,
  });
  if (existingOpenPreorder) {
    throw new Error('You already have an open preorder request for this item. The owner will follow up manually.');
  }

  const preorderId = `LOCAL-PRE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  const timestamp = new Date().toISOString();

  await postCommand({
    command: 'SUBMIT_PREORDER',
    member_email: email,
    product_handle: handle,
    product_title: title,
    requested_qty: quantity,
    ...(normalizedCatalogSource ? { catalog_source: normalizedCatalogSource } : {}),
  });

  return appendLocalPreorder({
    timestamp,
    preorder_id: preorderId,
    member_email: email,
    full_name: '',
    business_name: '',
    phone: '',
    product_handle: handle,
    product_title: title || handle,
    requested_qty: quantity,
    status: 'PENDING',
    owner_notes: '',
    notified_at: '',
    converted_order_id: '',
    last_updated: timestamp,
  });
};

export const getLocalOrderHistory = ({ memberEmail = '', includeAll = false } = {}) => {
  const email = normalizeEmail(memberEmail);
  const orders = loadLocalOrders();
  return orders
    .filter((order) => includeAll || normalizeEmail(order.member_email) === email)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const getLocalPreorders = ({ status = '', productHandle = '', memberEmail = '' } = {}) => {
  const normalizedStatus = normalizeText(status).toUpperCase();
  const normalizedHandle = normalizeText(productHandle).toLowerCase();
  const normalizedEmail = normalizeEmail(memberEmail);

  return loadLocalPreorders()
    .map(normalizePreorderRecord)
    .filter((row) => (!normalizedStatus || row.status === normalizedStatus))
    .filter((row) => (!normalizedHandle || row.product_handle === normalizedHandle))
    .filter((row) => (!normalizedEmail || row.member_email === normalizedEmail))
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
};

const normalizeOrderRecord = (row = {}) => {
  const ownerNotes = normalizeOrderNotes(row);
  return {
    order_id: normalizeText(row.order_id),
    timestamp: normalizeText(row.timestamp),
    member_email: normalizeEmail(row.member_email),
    items_json: typeof row.items_json === 'string' ? row.items_json : JSON.stringify(row.items_json || []),
    total_amount: Number(row.total_amount || 0),
    shipping_data: normalizeText(row.shipping_data),
    status: normalizeText(row.status),
    tracking_num: normalizeText(row.tracking_num),
    admin_notes: ownerNotes,
    owner_notes: ownerNotes,
    payment_status: normalizeText(row.payment_status),
    invoice_id: normalizeText(row.invoice_id),
    invoice_pdf_url: normalizeText(row.invoice_pdf_url),
    paid_at: normalizeText(row.paid_at),
    source_sheet: normalizeText(row.source_sheet) || 'PEPTQ_Orders',
  };
};

const normalizeOwnerCatalogRow = (item = {}) => {
  const inventoryText = normalizeText(item.inventory);
  const bulkStockSource = item.bulk_stock ?? item.bulkStock;
  const parsedBulkStock = Number(bulkStockSource);
  const parsedInventoryStock = Number(inventoryText);
  const rawThreshold = Number(item.low_stock_threshold ?? item.lowStockThreshold);
  const rawPriceVip = Number(item.price_vip ?? item.priceVip);
  let normalizedBulkStock = null;

  if (bulkStockSource !== undefined && bulkStockSource !== null && String(bulkStockSource).trim() !== '') {
    if (Number.isFinite(parsedBulkStock)) {
      normalizedBulkStock = (!Number.isFinite(parsedInventoryStock) && inventoryText && parsedBulkStock === 0)
        ? null
        : parsedBulkStock;
    }
  } else if (Number.isFinite(parsedInventoryStock)) {
    normalizedBulkStock = parsedInventoryStock;
  }

  return {
    handle: normalizeText(item.handle || item.slug || item.id).toLowerCase(),
    slug: normalizeText(item.slug || item.handle || item.id).toLowerCase(),
    title: normalizeText(item.title || item.name || item.handle || item.slug),
    description: normalizeText(item.description || item.overview),
    purity_string: normalizeText(item.purity_string || item.purity),
    formula: normalizeText(item.formula),
    molecular_mass: normalizeText(item.molecular_mass || item.mass),
    cas_number: normalizeText(item.cas_number || item.cas),
    storage_notes: normalizeText(item.storage_notes || item.storage),
    shipping_notes: normalizeText(item.shipping_notes || item.shipping),
    qr_coa_link: normalizeText(item.qr_coa_link || item.coaUrl),
    image_path: normalizeText(item.image_path || item.image),
    inventory: inventoryText,
    visible: item.visible !== false,
    bulk_stock: normalizedBulkStock,
    low_stock_threshold: Number.isFinite(rawThreshold) && rawThreshold > 0 ? rawThreshold : null,
    price_vip: Number.isFinite(rawPriceVip) ? rawPriceVip : null,
    internal_sku: normalizeText(item.internal_sku || item.internalSku),
    last_updated: normalizeText(item.last_updated || item.lastUpdated),
    source_sheet: normalizeText(item.source_sheet) || 'PEPTQ_Catalog',
  };
};

export const getLocalOwnerCatalogSnapshot = () => {
  const cached = loadJsonCache(OWNER_CATALOG_CACHE_KEY, null);
  if (Array.isArray(cached) && cached.length) {
    return cached.map(normalizeOwnerCatalogRow).filter((item) => item.handle);
  }
  // No local cache yet — caller should trigger fetchOwnerCatalogSnapshot to populate from backend.
  return [];
};

export const fetchOwnerCatalogSnapshot = async ({ actorEmail = '' } = {}) => {
  assertOwnerSession(actorEmail);
  const localFallback = getLocalOwnerCatalogSnapshot();
  const params = new URLSearchParams({
    command: 'GET_CATALOG',
    role: 'OWNER',
  });

  try {
    const response = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Catalog lookup failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.status !== 'success' || !Array.isArray(payload?.items)) {
      throw new Error('Invalid catalog payload.');
    }

    const normalized = payload.items
      .map((item) => normalizeOwnerCatalogRow({
        ...item,
        source_sheet: 'PEPTQ_Catalog',
      }))
      .filter((item) => item.handle)
      .sort((a, b) => String(a.title || a.handle).localeCompare(String(b.title || b.handle)));

    if (normalized.length) {
      saveJsonCache(OWNER_CATALOG_CACHE_KEY, normalized);
    }

    return normalized.length ? normalized : localFallback;
  } catch {
    return localFallback;
  }
};

const normalizeInventoryMovement = (row = {}) => ({
  timestamp: normalizeText(row.timestamp),
  handle: normalizeText(row.handle).toLowerCase(),
  title: normalizeText(row.title),
  direction: normalizeText(row.direction).toUpperCase(),
  delta: Number(row.delta || 0),
  quantity: Number(row.quantity || 0),
  previous_stock: Number(row.previous_stock || 0),
  next_stock: Number(row.next_stock || 0),
  order_id: normalizeText(row.order_id),
  actor_email: normalizeEmail(row.actor_email),
  command: normalizeText(row.command).toUpperCase(),
  note: normalizeText(row.note),
});

export const getLocalInventoryMovementHistory = () => {
  const cached = loadJsonCache(INVENTORY_MOVEMENT_CACHE_KEY, []);
  return (Array.isArray(cached) ? cached : []).map(normalizeInventoryMovement);
};

export const fetchInventoryMovementHistory = async ({ actorEmail = '', limit = 100, handle = '', orderId = '' } = {}) => {
  assertOwnerSession(actorEmail);
  const localFallback = getLocalInventoryMovementHistory();
  const params = new URLSearchParams({
    command: 'GET_INVENTORY_MOVEMENT_HISTORY',
    actor_email: normalizeEmail(actorEmail),
    limit: String(Math.max(1, Math.min(500, Number(limit || 100)))),
  });
  if (normalizeText(handle)) params.set('handle', normalizeText(handle).toLowerCase());
  if (normalizeText(orderId)) params.set('order_id', normalizeText(orderId));

  try {
    const response = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Inventory movement lookup failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.status !== 'success' || !Array.isArray(payload?.movements)) {
      throw new Error('Invalid inventory movement payload.');
    }

    const normalized = payload.movements.map(normalizeInventoryMovement);
    saveJsonCache(INVENTORY_MOVEMENT_CACHE_KEY, normalized);
    return normalized;
  } catch {
    return localFallback;
  }
};

export const fetchPreorders = async ({
  actorEmail = '',
  status = '',
  productHandle = '',
  memberEmail = '',
  limit = 200,
} = {}) => {
  assertOwnerSession(actorEmail);
  const localFallback = getLocalPreorders({ status, productHandle, memberEmail });
  const params = new URLSearchParams({
    command: 'GET_PREORDERS',
    actor_email: normalizeEmail(actorEmail),
    limit: String(Math.max(1, Math.min(500, Number(limit || 200)))),
  });

  const normalizedStatus = normalizeText(status).toUpperCase();
  const normalizedHandle = normalizeText(productHandle).toLowerCase();
  const normalizedEmail = normalizeEmail(memberEmail);

  if (normalizedStatus) params.set('status', normalizedStatus);
  if (normalizedHandle) params.set('product_handle', normalizedHandle);
  if (normalizedEmail) params.set('member_email', normalizedEmail);

  try {
    const response = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Preorder lookup failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.status !== 'success' || !Array.isArray(payload?.preorders)) {
      throw new Error('Invalid preorder payload.');
    }

    const normalized = payload.preorders
      .map(normalizePreorderRecord)
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    saveLocalPreorders(normalized);
    return normalized;
  } catch {
    return localFallback;
  }
};

export const updatePreorderStatus = async ({
  preorderId,
  status,
  ownerNotes = '',
  convertedOrderId = '',
  actorEmail = '',
} = {}) => {
  const normalizedPreorderId = normalizeText(preorderId);
  const normalizedStatus = normalizeText(status).toUpperCase();
  const normalizedOwnerNotes = normalizeText(ownerNotes);
  const normalizedConvertedOrderId = normalizeText(convertedOrderId);

  if (!normalizedPreorderId) throw new Error('preorderId is required.');
  if (!normalizedStatus) throw new Error('status is required.');

  await postOwnerCommand({
    command: 'UPDATE_PREORDER_STATUS',
    preorder_id: normalizedPreorderId,
    status: normalizedStatus,
    owner_notes: normalizedOwnerNotes,
    converted_order_id: normalizedConvertedOrderId,
    actor_email: normalizeEmail(actorEmail),
  });

  const localPatch = {
    status: normalizedStatus,
    owner_notes: normalizedOwnerNotes,
    converted_order_id: normalizedConvertedOrderId,
    last_updated: new Date().toISOString(),
  };
  if (normalizedStatus === 'CONTACTED') {
    localPatch.notified_at = new Date().toISOString();
  }

  updateLocalPreorder(normalizedPreorderId, localPatch);

  return {
    status: 'queued',
    command: 'UPDATE_PREORDER_STATUS',
  };
};

const getOrderMergeKey = (row = {}) => {
  const orderId = normalizeText(row.order_id);
  if (orderId) return `id:${orderId}`;

  const email = normalizeEmail(row.member_email);
  const timestamp = normalizeText(row.timestamp);
  return `fallback:${email}:${timestamp}`;
};

const mergeOrderHistories = (primary = [], secondary = []) => {
  const merged = new Map();

  [...secondary, ...primary]
    .map((row) => normalizeOrderRecord(row))
    .forEach((row) => {
      const key = getOrderMergeKey(row);
      if (!merged.has(key)) {
        merged.set(key, row);
      }
    });

  return Array.from(merged.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 250);
};

export const fetchOrderHistory = async ({ memberEmail = '', includeAll = false, includeArchives = true } = {}) => {
  const email = normalizeEmail(memberEmail);
  if (!includeAll && !email) {
    throw new Error('memberEmail is required unless includeAll is true.');
  }
  if (includeAll) {
    assertOwnerSession();
  }

  const params = new URLSearchParams({
    command: 'GET_ORDER_HISTORY',
    include_all: includeAll ? 'true' : 'false',
    include_archives: includeArchives ? 'true' : 'false',
  });

  if (email) params.set('member_email', email);

  const localFallback = getLocalOrderHistory({ memberEmail: email, includeAll });

  try {
    const response = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Order history lookup failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.status !== 'success' || !Array.isArray(payload?.orders)) {
      throw new Error('Invalid order history payload.');
    }

    const normalized = payload.orders.map(normalizeOrderRecord);
    const merged = mergeOrderHistories(normalized, localFallback);

    if (merged.length) {
      saveLocalOrders(merged);
    }

    return merged;
  } catch {
    return localFallback;
  }
};

export const acceptOrder = async ({ orderId, actorEmail = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');
  await postOwnerCommand({ command: 'ACCEPT_ORDER', order_id: orderId, actor_email: normalizeEmail(actorEmail) });
  updateLocalOrder(orderId, { status: 'ORDER RECEIVED' });
};

export const updateTracking = async ({ orderId, trackingNum, actorEmail = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');
  if (!normalizeText(trackingNum)) throw new Error('trackingNum is required.');
  await postOwnerCommand({
    command: 'UPDATE_TRACKING',
    order_id: orderId,
    tracking_num: normalizeText(trackingNum),
    actor_email: normalizeEmail(actorEmail),
  });
  updateLocalOrder(orderId, { tracking_num: normalizeText(trackingNum), status: 'PROCESSING' });
};

export const shipOrder = async ({ orderId, trackingNum = '', actorEmail = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');
  if (!normalizeText(trackingNum)) throw new Error('trackingNum is required before shipping.');
  await postOwnerCommand({
    command: 'SHIP_ORDER',
    order_id: orderId,
    tracking_num: normalizeText(trackingNum),
    actor_email: normalizeEmail(actorEmail),
  });
  updateLocalOrder(orderId, { status: 'SHIPPED', tracking_num: normalizeText(trackingNum) });
};

export const cancelOrder = async ({ orderId, reason, actorEmail = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');
  if (!normalizeText(reason)) throw new Error('reason is required.');
  await postOwnerCommand({
    command: 'CANCEL_ORDER',
    order_id: orderId,
    reason: normalizeText(reason),
    actor_email: normalizeEmail(actorEmail),
    restore_inventory: true,
  });
  updateLocalOrder(orderId, { status: 'CANCELLED' });
};

export const generateInvoice = async ({ orderId, actorEmail = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');
  await postOwnerCommand({ command: 'GENERATE_INVOICE', order_id: orderId, actor_email: normalizeEmail(actorEmail) });
  const invoiceId = createInvoiceId(orderId);
  updateLocalOrder(orderId, {
    payment_status: 'INVOICED',
    invoice_id: invoiceId,
    invoice_pdf_url: '',
  });
};

export const sendInvoice = async ({ orderId, actorEmail = '', paymentInstructions = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');
  await postOwnerCommand({
    command: 'SEND_INVOICE',
    order_id: orderId,
    actor_email: normalizeEmail(actorEmail),
    payment_instructions: normalizeText(paymentInstructions),
  });
  const invoiceId = createInvoiceId(orderId);
  updateLocalOrder(orderId, {
    payment_status: 'INVOICED',
    invoice_id: invoiceId,
  });
};

export const dispatchProformaInvoice = async ({ orderId, actorEmail = '', paymentInstructions = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');

  await generateInvoice({ orderId, actorEmail });
  await sendInvoice({ orderId, actorEmail, paymentInstructions });

  return {
    status: 'queued',
    command: 'DISPATCH_PROFORMA_INVOICE',
    order_id: normalizeText(orderId),
  };
};

export const markPaid = async ({ orderId, actorEmail = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');
  await postOwnerCommand({ command: 'MARK_PAID', order_id: orderId, actor_email: normalizeEmail(actorEmail) });
  updateLocalOrder(orderId, { payment_status: 'PAID', paid_at: new Date().toISOString() });
};

export const alertOrder = async ({ orderId, actorEmail = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');
  await postOwnerCommand({ command: 'ALERT_ORDER', order_id: orderId, actor_email: normalizeEmail(actorEmail) });
};

export const ownerUpdateOrder = async ({ orderId, itemsJson, shippingData = '', totalAmount, actorEmail = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');

  let normalizedItems = [];
  if (typeof itemsJson === 'string') {
    try {
      const parsed = JSON.parse(itemsJson);
      normalizedItems = Array.isArray(parsed) ? parsed.map(toItemRow).filter((item) => item.handle || item.name) : [];
    } catch {
      throw new Error('itemsJson must be valid JSON array.');
    }
  } else if (Array.isArray(itemsJson)) {
    normalizedItems = itemsJson.map(toItemRow).filter((item) => item.handle || item.name);
  }

  if (!normalizedItems.length) {
    throw new Error('At least one item is required to update order details.');
  }

  const resolvedTotal = Number.isFinite(Number(totalAmount))
    ? Number(Number(totalAmount).toFixed(2))
    : computeTotal(normalizedItems);

  await postOwnerCommand({
    command: 'UPDATE_ORDER',
    order_id: orderId,
    items_json: normalizedItems,
    shipping_data: normalizeText(shippingData),
    total_amount: resolvedTotal,
    actor_email: normalizeEmail(actorEmail),
  });

  updateLocalOrder(orderId, {
    items_json: JSON.stringify(normalizedItems),
    shipping_data: normalizeText(shippingData),
    total_amount: resolvedTotal,
  });
};

export const updateOrderDetails = ownerUpdateOrder;

export const markDelivered = async ({ orderId, actorEmail = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');
  await postOwnerCommand({ command: 'MARK_DELIVERED', order_id: orderId, actor_email: normalizeEmail(actorEmail) });
  updateLocalOrder(orderId, { status: 'DELIVERED' });
};

export const sendDeliveryConfirmation = async ({ orderId, actorEmail = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');
  await postOwnerCommand({
    command: 'SEND_DELIVERY_CONFIRMATION',
    order_id: orderId,
    actor_email: normalizeEmail(actorEmail),
  });
};

export const completeOrder = async ({ orderId, actorEmail = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');
  await postOwnerCommand({ command: 'COMPLETE_ORDER', order_id: orderId, actor_email: normalizeEmail(actorEmail) });
  updateLocalOrder(orderId, { status: 'COMPLETED' });
};

export const mapOrderCoa = async ({ orderId, coaMap, actorEmail = '' }) => {
  if (!normalizeText(orderId)) throw new Error('orderId is required.');
  const normalizedMap = Array.isArray(coaMap)
    ? coaMap
      .map((entry) => ({
        handle: normalizeText(entry?.handle),
        lot_id: normalizeText(entry?.lot_id || entry?.lotId),
        coa_url: normalizeText(entry?.coa_url || entry?.coaUrl),
      }))
      .filter((entry) => entry.handle && entry.coa_url)
    : [];

  if (!normalizedMap.length) throw new Error('At least one CoA mapping row is required.');

  await postOwnerCommand({
    command: 'MAP_ORDER_COA',
    order_id: orderId,
    coa_map: normalizedMap,
    actor_email: normalizeEmail(actorEmail),
  });

  const ownerNote = `Owner mapped CoA (${normalizedMap.length}) at ${new Date().toISOString()}`;
  updateLocalOrder(orderId, {
    admin_notes: ownerNote,
    owner_notes: ownerNote,
  });
};

export const upsertLotMetadata = async ({
  lotId,
  productId,
  coaUrl = '',
  purityPct,
  testDate = '',
  expiryDate = '',
  verified = false,
  actorEmail = '',
}) => {
  const normalizedLotId = normalizeText(lotId).toUpperCase();
  const normalizedProductId = normalizeText(productId).toLowerCase();
  const normalizedCoaUrl = normalizeText(coaUrl);
  const normalizedPurity = Number(purityPct);

  if (!normalizedLotId) throw new Error('lotId is required.');
  if (!normalizedProductId) throw new Error('productId (SKU/handle) is required.');
  if (!Number.isFinite(normalizedPurity) || normalizedPurity < 0 || normalizedPurity > 100) {
    throw new Error('purityPct must be a number between 0 and 100.');
  }

  if (normalizedCoaUrl) {
    const hasHttp = /^https?:\/\//i.test(normalizedCoaUrl);
    const hasPdf = /\.pdf(?:$|[?#])/i.test(normalizedCoaUrl);
    if (!hasHttp && !hasPdf) {
      throw new Error('COA URL must include http(s) or a .pdf link.');
    }
  }

  await postOwnerCommand({
    command: 'UPSERT_LOT_METADATA',
    lot_id: normalizedLotId,
    product_id: normalizedProductId,
    coa_url: normalizedCoaUrl,
    purity_pct: Number(normalizedPurity.toFixed(2)),
    test_date: normalizeText(testDate),
    expiry_date: normalizeText(expiryDate),
    verification_state: verified ? 'VERIFIED' : 'PENDING',
    actor_email: normalizeEmail(actorEmail),
  });

  return {
    status: 'queued',
    command: 'UPSERT_LOT_METADATA',
    lot_id: normalizedLotId,
  };
};

export const updateSystemSettings = async ({ lowStockThreshold = 5, alertCadence = 'WEEKLY_MONDAY', portalRedirect = '/', notificationEmail = OWNER_SETTINGS_DEFAULTS.support_email, actorEmail = '' }) => {
  const settings = {
    low_stock_threshold: Math.max(0, Number(lowStockThreshold || 0)),
    alert_cadence: normalizeText(alertCadence) || 'WEEKLY_MONDAY',
    portal_redirect: normalizeText(portalRedirect) || '/',
    notification_email: normalizeEmail(notificationEmail),
    updated_at: new Date().toISOString(),
  };

  await postOwnerCommand({
    command: 'UPDATE_SYSTEM_SETTINGS',
    settings,
    actor_email: normalizeEmail(actorEmail),
  });

  saveLocalSettings(settings);
  return settings;
};

export const getLocalSystemSettings = () => {
  const ownerSettings = getLocalOwnerSettings();
  const notificationFallback = normalizeEmail(ownerSettings?.support_email) || OWNER_SETTINGS_DEFAULTS.support_email;
  const settings = loadLocalSettings();
  if (settings) {
    return {
      ...settings,
      notification_email: normalizeEmail(settings.notification_email) || notificationFallback,
    };
  }
  return {
    low_stock_threshold: 5,
    alert_cadence: 'WEEKLY_MONDAY',
    portal_redirect: '/',
    notification_email: notificationFallback,
    updated_at: '',
  };
};

export const getLocalProviderStatus = () => {
  const ownerSettings = getLocalOwnerSettings();
  const cached = loadJsonCache(PROVIDER_STATUS_CACHE_KEY, null);
  if (cached && typeof cached === 'object') return cached;

  const resendConnected = normalizeText(ownerSettings?.email_provider_status).toUpperCase() === 'RESEND_KEY_SAVED';
  const selectedProvider = normalizeText(ownerSettings?.email_provider).toUpperCase() || 'GOOGLE';
  const senderEmail = normalizeEmail(ownerSettings?.email_sender_email);
  const activeProvider = selectedProvider === 'RESEND' && resendConnected && senderEmail ? 'RESEND' : 'GOOGLE';

  return {
    selected_provider: selectedProvider,
    active_provider: activeProvider,
    sender_email: senderEmail,
    google_remaining_quota: null,
    email_usage_today: {
      total_sent: 0,
      by_category: {
        COMING_SOON: 0,
        ORDER: 0,
        SECURITY: 0,
        GENERAL: 0,
      },
      by_provider: {
        GOOGLE: 0,
        RESEND: 0,
      },
    },
    providers: {
      google: { connected: true, remaining_quota: null },
      resend: { connected: resendConnected, status: resendConnected ? 'CONNECTED' : 'NOT_LINKED' },
      brevo: { connected: false, status: 'NOT_LINKED' },
    },
  };
};

export const fetchProviderStatus = async ({ actorEmail = '' } = {}) => {
  assertOwnerSession(actorEmail);

  const params = new URLSearchParams({
    command: 'GET_PROVIDER_STATUS',
    actor_email: normalizeEmail(actorEmail),
  });

  try {
    const response = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Provider status lookup failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.status !== 'success') {
      throw new Error(payload?.message || 'Invalid provider status payload.');
    }

    saveJsonCache(PROVIDER_STATUS_CACHE_KEY, payload);
    return payload;
  } catch {
    return getLocalProviderStatus();
  }
};

export const sendLowStockAlerts = async ({ parLevel = 5, actorEmail = '' }) => {
  await postOwnerCommand({
    command: 'SEND_LOW_STOCK_ALERTS',
    par_level: Math.max(0, Number(parLevel || 0)),
    actor_email: normalizeEmail(actorEmail),
  });
};

export const configureLowStockAlertSchedule = async ({ cadence = 'WEEKLY_MONDAY', hour = 9, parLevel = 5, actorEmail = '' }) => {
  await postOwnerCommand({
    command: 'CONFIGURE_LOW_STOCK_ALERT_SCHEDULE',
    alert_cadence: normalizeText(cadence) || 'WEEKLY_MONDAY',
    hour: Math.max(0, Math.min(23, Number(hour || 9))),
    par_level: Math.max(0, Number(parLevel || 0)),
    actor_email: normalizeEmail(actorEmail),
  });
};

export const upsertSiteLayout = async ({ sectionId, isVisible = true, headerText = '', subText = '', ctaLabel = '', actorEmail = '' }) => {
  if (!normalizeText(sectionId)) throw new Error('sectionId is required.');

  await postOwnerCommand({
    command: 'UPSERT_SITE_LAYOUT',
    section_id: normalizeText(sectionId).toUpperCase(),
    is_visible: Boolean(isVisible),
    header_text: normalizeText(headerText),
    sub_text: normalizeText(subText),
    cta_label: normalizeText(ctaLabel),
    actor_email: normalizeEmail(actorEmail),
  });

  const current = loadJsonCache(SITE_LAYOUT_CACHE_KEY, []);
  const next = [
    {
      section_id: normalizeText(sectionId).toUpperCase(),
      is_visible: Boolean(isVisible),
      header_text: normalizeText(headerText),
      sub_text: normalizeText(subText),
      cta_label: normalizeText(ctaLabel),
      updated_at: new Date().toISOString(),
    },
    ...current.filter((entry) => normalizeText(entry?.section_id) !== normalizeText(sectionId).toUpperCase()),
  ].slice(0, 100);

  saveJsonCache(SITE_LAYOUT_CACHE_KEY, next);
};

export const getLocalSiteLayout = () => {
  const entries = loadJsonCache(SITE_LAYOUT_CACHE_KEY, []);
  return (Array.isArray(entries) ? entries : [])
    .map(normalizeSiteLayoutEntry)
    .filter((entry) => entry.section_id);
};

export const fetchSiteLayout = async () => {
  const localFallback = getLocalSiteLayout();
  const params = new URLSearchParams({
    command: 'GET_SITE_LAYOUT',
  });

  try {
    const response = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Site layout lookup failed with status ${response.status}`);
    }

    const payload = await response.json();
    const sections = Array.isArray(payload?.sections) ? payload.sections : [];
    const normalized = sections
      .map(normalizeSiteLayoutEntry)
      .filter((entry) => entry.section_id);

    if (normalized.length) {
      saveJsonCache(SITE_LAYOUT_CACHE_KEY, normalized);
    }

    return normalized.length ? normalized : localFallback;
  } catch {
    return localFallback;
  }
};

export const getSiteLayoutValue = (sectionId, fallback = '') => {
  const entries = getLocalSiteLayout();
  const map = buildSiteLayoutMap(entries);
  const value = map.get(normalizeText(sectionId).toUpperCase())?.header_text || '';
  return value || fallback;
};

export const saveSiteAsset = async ({
  sectionId,
  fileBase64 = '',
  fileName = '',
  mimeType = 'image/png',
  label = '',
  actorEmail = '',
}) => {
  const normalizedSectionId = normalizeText(sectionId).toUpperCase();
  const normalizedBase64 = normalizeText(fileBase64);
  if (!normalizedSectionId) throw new Error('sectionId is required.');
  if (!normalizedBase64) throw new Error('fileBase64 is required.');

  await postOwnerCommand({
    command: 'SAVE_SITE_ASSET',
    section_id: normalizedSectionId,
    image_file_base64: normalizedBase64,
    image_file_name: normalizeText(fileName) || `${normalizedSectionId.toLowerCase()}.png`,
    image_mime_type: normalizeText(mimeType) || 'image/png',
    sub_text: normalizeText(label),
    cta_label: 'IMAGE_URL',
    actor_email: normalizeEmail(actorEmail),
  });

  return fetchSiteLayout();
};

export const getLocalOwnerSettings = () => {
  const rows = getLocalSiteLayout();

  const byId = new Map(
    rows.map((entry) => [normalizeText(entry?.section_id).toUpperCase(), entry])
  );

  const businessNameRow = byId.get(OWNER_SECTION_IDS.BUSINESS_NAME);
  const supportEmailRow = byId.get(OWNER_SECTION_IDS.SUPPORT_EMAIL);
  const emailProviderRow = byId.get(OWNER_SECTION_IDS.EMAIL_PROVIDER);
  const emailSenderEmailRow = byId.get(OWNER_SECTION_IDS.EMAIL_SENDER_EMAIL);
  const emailProviderStatusRow = byId.get(OWNER_SECTION_IDS.EMAIL_PROVIDER_STATUS);
  const emailMasterEnabledRow = byId.get(OWNER_SECTION_IDS.EMAIL_MASTER_ENABLED);
  const emailComingSoonEnabledRow = byId.get(OWNER_SECTION_IDS.EMAIL_COMING_SOON_ENABLED);
  const emailOrderSystemEnabledRow = byId.get(OWNER_SECTION_IDS.EMAIL_ORDER_SYSTEM_ENABLED);
  const masterPinPolicyRow = byId.get(OWNER_SECTION_IDS.MASTER_PIN_POLICY);
  const enable3dViewerRow = byId.get(OWNER_SECTION_IDS.ENABLE_3D_VIEWER);
  const siteStatusRow = byId.get(OWNER_SECTION_IDS.SITE_STATUS);
  const pageVisibility = OWNER_PAGE_VISIBILITY_FIELDS.reduce((acc, field) => {
    const row = byId.get(field.sectionId);
    acc[field.key] = row ? Boolean(row?.is_visible) : field.defaultValue;
    return acc;
  }, {});

  return {
    business_name: normalizeText(businessNameRow?.header_text) || OWNER_SETTINGS_DEFAULTS.business_name,
    support_email: normalizeEmail(supportEmailRow?.header_text) || OWNER_SETTINGS_DEFAULTS.support_email,
    email_provider: normalizeText(emailProviderRow?.header_text).toUpperCase() || OWNER_SETTINGS_DEFAULTS.email_provider,
    email_sender_email: normalizeEmail(emailSenderEmailRow?.header_text) || OWNER_SETTINGS_DEFAULTS.email_sender_email,
    email_provider_status: normalizeText(emailProviderStatusRow?.header_text).toUpperCase() || OWNER_SETTINGS_DEFAULTS.email_provider_status,
    email_master_enabled: emailMasterEnabledRow ? Boolean(emailMasterEnabledRow?.is_visible) : OWNER_SETTINGS_DEFAULTS.email_master_enabled,
    email_coming_soon_enabled: emailComingSoonEnabledRow ? Boolean(emailComingSoonEnabledRow?.is_visible) : OWNER_SETTINGS_DEFAULTS.email_coming_soon_enabled,
    email_order_system_enabled: emailOrderSystemEnabledRow ? Boolean(emailOrderSystemEnabledRow?.is_visible) : OWNER_SETTINGS_DEFAULTS.email_order_system_enabled,
    master_pin_policy: masterPinPolicyRow ? Boolean(masterPinPolicyRow?.is_visible) : OWNER_SETTINGS_DEFAULTS.master_pin_policy,
    enable_3d_viewer: enable3dViewerRow ? Boolean(enable3dViewerRow?.is_visible) : OWNER_SETTINGS_DEFAULTS.enable_3d_viewer,
    site_status: normalizeText(siteStatusRow?.header_text).toUpperCase() || OWNER_SETTINGS_DEFAULTS.site_status,
    coming_soon_page: pageVisibility.coming_soon_page,
    page_visibility: pageVisibility,
  };
};

const parseFaqPriority = (value) => {
  const label = normalizeText(value).toUpperCase();
  const match = label.match(/^P(\d+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const isVisibleFlag = (value) => {
  if (typeof value === 'boolean') return value;
  return normalizeText(value).toUpperCase() === 'TRUE';
};

export const getDynamicFAQ = () => {
  const entries = loadJsonCache(SITE_LAYOUT_CACHE_KEY, []);
  const rows = Array.isArray(entries) ? entries : [];

  return rows
    .filter((row) => normalizeText(row?.section_id).toUpperCase().startsWith('FAQ_'))
    .filter((row) => isVisibleFlag(row?.is_visible))
    .map((row) => ({
      id: normalizeText(row?.section_id).toUpperCase(),
      question: normalizeText(row?.header_text),
      answer: normalizeText(row?.sub_text),
      priority: normalizeText(row?.cta_label).toUpperCase(),
    }))
    .filter((row) => row.question && row.answer)
    .sort((a, b) => {
      const rankDiff = parseFaqPriority(a.priority) - parseFaqPriority(b.priority);
      if (rankDiff !== 0) return rankDiff;
      return a.id.localeCompare(b.id);
    });
};

export const upsertOwnerSettings = async ({
  businessName = '',
  supportEmail = '',
  emailProvider = OWNER_SETTINGS_DEFAULTS.email_provider,
  emailSenderEmail = OWNER_SETTINGS_DEFAULTS.email_sender_email,
  emailProviderStatus = '',
  emailMasterEnabled = OWNER_SETTINGS_DEFAULTS.email_master_enabled,
  emailComingSoonEnabled = OWNER_SETTINGS_DEFAULTS.email_coming_soon_enabled,
  emailOrderSystemEnabled = OWNER_SETTINGS_DEFAULTS.email_order_system_enabled,
  masterPinPolicy = false,
  enable3dViewer = OWNER_SETTINGS_DEFAULTS.enable_3d_viewer,
  siteStatus = 'BETA v1.0.0',
  comingSoonPage = true,
  pageVisibility = {},
  actorEmail = '',
}) => {
  const payloads = [
    {
      sectionId: OWNER_SECTION_IDS.BUSINESS_NAME,
      isVisible: true,
      headerText: normalizeText(businessName) || OWNER_SETTINGS_DEFAULTS.business_name,
      subText: 'Business Profile',
      ctaLabel: 'N/A',
    },
    {
      sectionId: OWNER_SECTION_IDS.SUPPORT_EMAIL,
      isVisible: true,
      headerText: normalizeEmail(supportEmail) || OWNER_SETTINGS_DEFAULTS.support_email,
      subText: 'Support Contact',
      ctaLabel: 'N/A',
    },
    {
      sectionId: OWNER_SECTION_IDS.EMAIL_PROVIDER,
      isVisible: true,
      headerText: normalizeText(emailProvider).toUpperCase() || OWNER_SETTINGS_DEFAULTS.email_provider,
      subText: 'Active outbound email provider',
      ctaLabel: 'N/A',
    },
    {
      sectionId: OWNER_SECTION_IDS.EMAIL_SENDER_EMAIL,
      isVisible: true,
      headerText: normalizeEmail(emailSenderEmail),
      subText: 'Verified sender email for external provider flows',
      ctaLabel: 'N/A',
    },
    {
      sectionId: OWNER_SECTION_IDS.EMAIL_PROVIDER_STATUS,
      isVisible: true,
      headerText:
        normalizeText(emailProviderStatus).toUpperCase()
        || (normalizeText(emailProvider).toUpperCase() === 'RESEND' ? 'RESEND_NOT_CONNECTED' : OWNER_SETTINGS_DEFAULTS.email_provider_status),
      subText: 'Provider connection health',
      ctaLabel: 'N/A',
    },
    {
      sectionId: OWNER_SECTION_IDS.EMAIL_MASTER_ENABLED,
      isVisible: emailMasterEnabled,
      headerText: emailMasterEnabled ? 'ENABLED' : 'DISABLED',
      subText: 'Master switch for automated business email flows',
      ctaLabel: 'N/A',
    },
    {
      sectionId: OWNER_SECTION_IDS.EMAIL_COMING_SOON_ENABLED,
      isVisible: emailComingSoonEnabled,
      headerText: emailComingSoonEnabled ? 'ENABLED' : 'DISABLED',
      subText: 'Allow waitlist and portal-request automation emails',
      ctaLabel: 'N/A',
    },
    {
      sectionId: OWNER_SECTION_IDS.EMAIL_ORDER_SYSTEM_ENABLED,
      isVisible: emailOrderSystemEnabled,
      headerText: emailOrderSystemEnabled ? 'ENABLED' : 'DISABLED',
      subText: 'Allow invoices, order alerts, shipping, delivery, and preorder emails',
      ctaLabel: 'N/A',
    },
    {
      sectionId: OWNER_SECTION_IDS.MASTER_PIN_POLICY,
      isVisible: masterPinPolicy,
      headerText: masterPinPolicy ? 'ENABLED' : 'DISABLED',
      subText: 'Master PIN Policy',
      ctaLabel: 'N/A',
    },
    {
      sectionId: OWNER_SECTION_IDS.ENABLE_3D_VIEWER,
      isVisible: enable3dViewer,
      headerText: enable3dViewer ? 'ENABLED' : 'DISABLED',
      subText: 'Enable 3D/2D molecular structure viewer when PubChem CID is available',
      ctaLabel: 'N/A',
    },
    {
      sectionId: OWNER_SECTION_IDS.SITE_STATUS,
      isVisible: true,
      headerText: normalizeText(siteStatus).toUpperCase() || OWNER_SETTINGS_DEFAULTS.site_status,
      subText: 'Deployment Status',
      ctaLabel: 'N/A',
    },
    {
      sectionId: OWNER_SECTION_IDS.COMING_SOON_PAGE,
      isVisible: comingSoonPage,
      headerText: comingSoonPage ? 'ENABLED' : 'DISABLED',
      subText: 'Show Coming Soon landing page and waitlist gate',
      ctaLabel: 'N/A',
    },
    ...OWNER_PAGE_VISIBILITY_FIELDS
      .filter((field) => field.key !== 'coming_soon_page')
      .map((field) => {
        const enabled = Object.prototype.hasOwnProperty.call(pageVisibility, field.key)
          ? Boolean(pageVisibility[field.key])
          : field.defaultValue;
        return {
          sectionId: field.sectionId,
          isVisible: enabled,
          headerText: enabled ? 'ENABLED' : 'DISABLED',
          subText: field.subText,
          ctaLabel: 'N/A',
        };
      }),
  ];

  for (const row of payloads) {
    await upsertSiteLayout({ ...row, actorEmail });
  }

  return getLocalOwnerSettings();
};

const upsertLocalOwnerConfigEntry = ({ sectionId, isVisible = true, headerText = '', subText = '', ctaLabel = 'N/A' }) => {
  const normalizedSectionId = normalizeText(sectionId).toUpperCase();
  if (!normalizedSectionId) return;

  const current = loadJsonCache(SITE_LAYOUT_CACHE_KEY, []);
  const next = [
    {
      section_id: normalizedSectionId,
      is_visible: Boolean(isVisible),
      header_text: headerText,
      sub_text: subText,
      cta_label: ctaLabel,
      updated_at: new Date().toISOString(),
    },
    ...current.filter((entry) => normalizeText(entry?.section_id).toUpperCase() !== normalizedSectionId),
  ];

  saveJsonCache(SITE_LAYOUT_CACHE_KEY, next);
};

export const connectResendProvider = async ({ apiKey = '', senderEmail = '', actorEmail = '' }) => {
  const normalizedApiKey = normalizeText(apiKey);
  if (!normalizedApiKey) throw new Error('Resend API key is required.');

  const normalizedSenderEmail = normalizeEmail(senderEmail) || getLocalOwnerSettings().email_sender_email;

  await postOwnerCommand({
    command: 'SAVE_EMAIL_PROVIDER_SECRET',
    provider: 'RESEND',
    api_key: normalizedApiKey,
    sender_email: normalizedSenderEmail,
    actor_email: normalizeEmail(actorEmail),
  });

  upsertLocalOwnerConfigEntry({
    sectionId: OWNER_SECTION_IDS.EMAIL_PROVIDER_STATUS,
    headerText: 'RESEND_KEY_SAVED',
    subText: 'Stored securely in backend secret storage',
  });

  if (normalizedSenderEmail) {
    upsertLocalOwnerConfigEntry({
      sectionId: OWNER_SECTION_IDS.EMAIL_SENDER_EMAIL,
      headerText: normalizedSenderEmail,
      subText: 'Verified sender email for external provider flows',
    });
  }

  return getLocalOwnerSettings();
};

export const disconnectResendProvider = async ({ actorEmail = '' }) => {
  await postOwnerCommand({
    command: 'CLEAR_EMAIL_PROVIDER_SECRET',
    provider: 'RESEND',
    actor_email: normalizeEmail(actorEmail),
  });

  upsertLocalOwnerConfigEntry({
    sectionId: OWNER_SECTION_IDS.EMAIL_PROVIDER_STATUS,
    headerText: 'RESEND_KEY_REMOVED',
    subText: 'Resend API key removed from backend secret storage',
  });

  return getLocalOwnerSettings();
};

export const setSyncPolicy = async ({ mode = 'PARENT_TO_CHILD', childSpreadsheetId = '', escalationContact = '', actorEmail = '' }) => {
  const normalizedMode = normalizeText(mode).toUpperCase() || 'PARENT_TO_CHILD';
  await postOwnerCommand({
    command: 'SET_SYNC_POLICY',
    mode: normalizedMode,
    child_spreadsheet_id: normalizeText(childSpreadsheetId),
    escalation_contact: normalizeText(escalationContact),
    actor_email: normalizeEmail(actorEmail),
  });

  const next = {
    sync_mode: normalizedMode,
    child_spreadsheet_id: normalizeText(childSpreadsheetId),
    escalation_contact: normalizeText(escalationContact),
    fallback_active: false,
    last_updated_at: new Date().toISOString(),
  };
  saveJsonCache(SYNC_STATUS_CACHE_KEY, next);
  return next;
};

export const applyMirrorHeaderLock = async ({ childSpreadsheetId = '', actorEmail = '' }) => {
  await postOwnerCommand({
    command: 'APPLY_MIRROR_HEADER_LOCK',
    child_spreadsheet_id: normalizeText(childSpreadsheetId),
    actor_email: normalizeEmail(actorEmail),
  });
};

export const activateSyncFallback = async ({ reason = '', actorEmail = '' }) => {
  await postOwnerCommand({
    command: 'ACTIVATE_SYNC_FALLBACK',
    reason: normalizeText(reason),
    actor_email: normalizeEmail(actorEmail),
  });

  const current = loadJsonCache(SYNC_STATUS_CACHE_KEY, {});
  const next = {
    ...current,
    fallback_active: true,
    fallback_reason: normalizeText(reason) || 'Sync mismatch detected',
    fallback_activated_at: new Date().toISOString(),
  };
  saveJsonCache(SYNC_STATUS_CACHE_KEY, next);
  return next;
};

export const getLocalSyncHealth = () => {
  const cached = loadJsonCache(SYNC_STATUS_CACHE_KEY, null);
  if (cached) return cached;
  return {
    sync_mode: 'PARENT_TO_CHILD',
    child_spreadsheet_id: '',
    escalation_contact: '',
    fallback_active: false,
    row_mismatch_count: 0,
    failed_sync_events: 0,
  };
};

export const requestSyncHealthProbe = async ({ actorEmail = '' } = {}) => {
  const timestamp = new Date().toISOString();

  try {
    await postOwnerCommand({
      command: 'GET_SYNC_HEALTH',
      actor_email: normalizeEmail(actorEmail),
    });

    const current = getLocalSyncHealth();
    const next = {
      ...current,
      bridge_integrity: current?.fallback_active ? 'DEGRADED' : 'OPERATIONAL',
      last_probe_at: timestamp,
    };
    saveJsonCache(SYNC_STATUS_CACHE_KEY, next);
    return next;
  } catch {
    const current = getLocalSyncHealth();
    const next = {
      ...current,
      bridge_integrity: 'DISCONNECTED',
      failed_sync_events: Number(current?.failed_sync_events || 0) + 1,
      last_probe_at: timestamp,
    };
    saveJsonCache(SYNC_STATUS_CACHE_KEY, next);
    return next;
  }
};

const normalizeQuickLink = (entry) => ({
  link_id: normalizeText(entry?.link_id || entry?.linkId),
  link_label: normalizeText(entry?.link_label || entry?.linkLabel),
  link_url: normalizeText(entry?.link_url || entry?.linkUrl),
  is_visible: entry?.is_visible !== false,
  sort_order: Number(entry?.sort_order ?? entry?.sortOrder ?? 0),
});

export const getLocalOwnerQuickLinks = ({ fallback = [] } = {}) => {
  const cached = loadJsonCache(QUICK_LINKS_CACHE_KEY, null);
  const source = Array.isArray(cached) && cached.length ? cached : fallback;

  return (Array.isArray(source) ? source : [])
    .map(normalizeQuickLink)
    .filter((item) => item.link_label && item.link_url && item.is_visible)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
};

export const saveLocalOwnerQuickLinks = (links = []) => {
  if (!Array.isArray(links)) return [];
  const normalized = links.map(normalizeQuickLink);
  saveJsonCache(QUICK_LINKS_CACHE_KEY, normalized);
  return normalized;
};

export const requestOwnerQuickLinksSync = async ({ actorEmail = '' } = {}) => {
  await postOwnerCommand({
    command: 'GET_OWNER_QUICK_LINKS',
    actor_email: normalizeEmail(actorEmail),
  });

  return {
    status: 'queued',
    command: 'GET_OWNER_QUICK_LINKS',
  };
};

export const getLocalLowStockDashboard = ({ parLevel = 5 } = {}) => {
  const threshold = Math.max(0, Number(parLevel || 0));
  return getLocalOwnerCatalogSnapshot()
    .map((item) => {
      const raw = Number(item.bulk_stock ?? item.bulkStock ?? 0);
      return {
        handle: normalizeText(item.handle || item.slug || item.id),
        title: normalizeText(item.title || item.name),
        bulk_stock: Number.isFinite(raw) ? raw : 0,
      };
    })
    .filter((item) => item.bulk_stock <= threshold)
    .sort((a, b) => a.bulk_stock - b.bulk_stock)
    .slice(0, 25);
};

export const getLocalProcurementInsights = ({ top = 5 } = {}) => {
  const orders = getLocalOrderHistory({ includeAll: true });
  const byHandle = new Map();
  const byMember = new Map();
  const monthlyTrend = new Map();

  let pending = 0;
  let shipped = 0;
  let delivered = 0;
  let totalAmount = 0;

  orders.forEach((order) => {
    const status = normalizeText(order.status).toUpperCase();
    if (status === 'PENDING') pending += 1;
    if (status === 'SHIPPED') shipped += 1;
    if (status === 'DELIVERED') delivered += 1;
    totalAmount += Number(order.total_amount || 0);

    const orderDate = order.timestamp ? new Date(order.timestamp) : null;
    const monthKey = orderDate && !Number.isNaN(orderDate.getTime())
      ? `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
      : 'unknown';
    const monthRow = monthlyTrend.get(monthKey) || { month: monthKey, orders: 0, amount: 0 };
    monthRow.orders += 1;
    monthRow.amount += Number(order.total_amount || 0);
    monthlyTrend.set(monthKey, monthRow);

    const email = normalizeEmail(order.member_email);
    if (email) {
      const member = byMember.get(email) || { member_email: email, order_count: 0, total_amount: 0 };
      member.order_count += 1;
      member.total_amount += Number(order.total_amount || 0);
      byMember.set(email, member);
    }

    let items = [];
    try {
      const parsed = JSON.parse(order.items_json || '[]');
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      items = [];
    }

    items.forEach((item) => {
      const handle = normalizeText(item.handle || item.name || 'unknown').toLowerCase();
      if (!handle) return;
      const row = byHandle.get(handle) || { handle, quantity: 0, line_total: 0 };
      row.quantity += Number(item.quantity || 0);
      row.line_total += Number(item.line_total || 0);
      byHandle.set(handle, row);
    });
  });

  const topCompounds = [...byHandle.values()].sort((a, b) => b.quantity - a.quantity).slice(0, top);
  const topMembers = [...byMember.values()].sort((a, b) => b.order_count - a.order_count).slice(0, top);
  const topVolumeMembers = [...byMember.values()].sort((a, b) => b.total_amount - a.total_amount).slice(0, top);
  const trend = [...monthlyTrend.values()]
    .map((row) => ({
      month: row.month,
      orders: Number(row.orders || 0),
      amount: Number(Number(row.amount || 0).toFixed(2)),
    }))
    .sort((a, b) => String(a.month).localeCompare(String(b.month)))
    .slice(-6);

  return {
    totals: {
      orders: orders.length,
      amount: Number(totalAmount.toFixed(2)),
      pending,
      shipped,
      delivered,
    },
    top_compounds: topCompounds,
    top_members: topMembers,
    top_volume_members: topVolumeMembers,
    monthly_trend: trend,
  };
};

export const getOrderById = (orderId) => {
  const target = normalizeText(orderId);
  if (!target) return null;
  return loadLocalOrders().find((order) => normalizeText(order.order_id) === target) || null;
};

export const createCatalogProduct = async ({
  // Automated Catalog Enrichment Directive:
  // Input: title + image_file
  // Step A: slug generated in backend
  // Step B: image upload to Drive -> image_path
  // Step C: optional PubChem lookup
  // Step D: map formula/molecular_mass/cas_number
  // Step E: append PEPTQ_Catalog row as draft or published based on owner choice
  title,
  casNumber = '',
  autoEnrich = true,
  imageUrl = '',
  imageFileBase64 = '',
  imageFileName = '',
  imageMimeType = '',
  description = '',
  purity = '',
  formula = '',
  mass = '',
  storage = '',
  researchUseSafetyInfo = '',
  inventory = '',
  priceVip = '',
  visible = false,
  actorEmail = '',
}) => {
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle) throw new Error('Product name is required.');
  if (!normalizeText(imageUrl) && !normalizeText(imageFileBase64)) {
    throw new Error('Product photo is required (upload or URL).');
  }

  await postOwnerCommand({
    command: 'CREATE_CATALOG_PRODUCT',
    title: normalizedTitle,
    cas_number: normalizeText(casNumber),
    auto_enrich: Boolean(autoEnrich),
    image_url: normalizeText(imageUrl),
    image_file_base64: normalizeText(imageFileBase64),
    image_file_name: normalizeText(imageFileName),
    image_mime_type: normalizeText(imageMimeType),
    description: normalizeText(description),
    purity_string: normalizeText(purity),
    formula: normalizeText(formula),
    molecular_mass: normalizeText(mass),
    storage_notes: normalizeText(storage),
    shipping_notes: normalizeText(researchUseSafetyInfo),
    inventory: normalizeText(inventory),
    price_vip: normalizeText(priceVip),
    visible: Boolean(visible),
    actor_email: normalizeEmail(actorEmail),
  });

  return {
    status: 'queued',
    command: 'CREATE_CATALOG_PRODUCT',
  };
};

export const updateCatalogVisibility = async ({ handle, visible, actorEmail = '' }) => {
  const normalizedHandle = normalizeText(handle).toLowerCase();
  if (!normalizedHandle) throw new Error('slug is required for catalog visibility update.');

  await postOwnerCommand({
    command: 'UPDATE_CATALOG_VISIBILITY',
    slug: normalizedHandle,
    visible: Boolean(visible),
    actor_email: normalizeEmail(actorEmail),
  });

  const cachedCatalog = getLocalOwnerCatalogSnapshot().map((item) => (
    item.handle === normalizedHandle
      ? { ...item, visible: Boolean(visible), last_updated: new Date().toISOString() }
      : item
  ));
  saveJsonCache(OWNER_CATALOG_CACHE_KEY, cachedCatalog);

  return {
    status: 'queued',
    command: 'UPDATE_CATALOG_VISIBILITY',
  };
};

export const updateCatalogPrice = async ({ handle, priceVip, actorEmail = '' }) => {
  const normalizedHandle = normalizeText(handle).toLowerCase();
  const normalizedPrice = normalizeText(priceVip);
  if (!normalizedHandle) throw new Error('slug is required for catalog price update.');
  if (!normalizedPrice) throw new Error('price is required for catalog price update.');

  await postOwnerCommand({
    command: 'UPDATE_CATALOG_PRICE',
    slug: normalizedHandle,
    price_vip: normalizedPrice,
    actor_email: normalizeEmail(actorEmail),
  });

  const cachedCatalog = getLocalOwnerCatalogSnapshot().map((item) => (
    item.handle === normalizedHandle
      ? { ...item, price_vip: Number(normalizedPrice), last_updated: new Date().toISOString() }
      : item
  ));
  saveJsonCache(OWNER_CATALOG_CACHE_KEY, cachedCatalog);

  return {
    status: 'queued',
    command: 'UPDATE_CATALOG_PRICE',
  };
};

export const deleteCatalogProduct = async ({ handle, actorEmail = '' }) => {
  const normalizedHandle = normalizeText(handle).toLowerCase();
  if (!normalizedHandle) throw new Error('slug is required for catalog deletion.');

  await postOwnerCommand({
    command: 'DELETE_CATALOG_PRODUCT',
    slug: normalizedHandle,
    actor_email: normalizeEmail(actorEmail),
  });

  const cachedCatalog = getLocalOwnerCatalogSnapshot().filter((item) => item.handle !== normalizedHandle);
  saveJsonCache(OWNER_CATALOG_CACHE_KEY, cachedCatalog);

  return {
    status: 'queued',
    command: 'DELETE_CATALOG_PRODUCT',
  };
};

export const submitManualStockAdjustment = async ({
  handle,
  quantity,
  direction = 'IN',
  reason = '',
  actorEmail = '',
}) => {
  const normalizedHandle = normalizeText(handle).toLowerCase();
  const normalizedReason = normalizeText(reason);
  const normalizedDirection = normalizeText(direction).toUpperCase() === 'OUT' ? 'OUT' : 'IN';
  const normalizedQuantity = Math.max(1, Math.round(Number(quantity || 0)));

  if (!normalizedHandle) throw new Error('handle is required for stock adjustment.');
  if (!normalizedReason) throw new Error('reason is required for stock adjustment.');
  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
    throw new Error('quantity must be greater than zero.');
  }

  await postOwnerCommand({
    command: 'MANUAL_STOCK_ADJUSTMENT',
    handle: normalizedHandle,
    quantity: normalizedQuantity,
    direction: normalizedDirection,
    reason: normalizedReason,
    actor_email: normalizeEmail(actorEmail),
  });

  return {
    status: 'queued',
    command: 'MANUAL_STOCK_ADJUSTMENT',
  };
};

export const createProformaInvoiceHtml = (order) => {
  const safeOrder = order || {};
  const invoiceId = normalizeText(safeOrder.invoice_id) || createInvoiceId(safeOrder.order_id || 'ORDER');
  const total = Number(safeOrder.total_amount || 0).toFixed(2);
  const paymentStatus = normalizeText(safeOrder.payment_status) || 'UNPAID';
  const dateLabel = safeOrder.timestamp ? new Date(safeOrder.timestamp).toLocaleString() : new Date().toLocaleString();

  let items = [];
  try {
    const parsed = JSON.parse(safeOrder.items_json || '[]');
    items = Array.isArray(parsed) ? parsed : [];
  } catch {
    items = [];
  }

  const itemRows = items.map((item) => (
    `<tr>
      <td style="padding:6px;border-bottom:1px solid #e5e7eb;">${normalizeText(item.name || item.handle || 'Item')}</td>
      <td style="padding:6px;border-bottom:1px solid #e5e7eb;">${Number(item.quantity || 1)}</td>
      <td style="padding:6px;border-bottom:1px solid #e5e7eb;">$${Number(item.line_total || 0).toFixed(2)}</td>
    </tr>`
  )).join('');

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${invoiceId}</title>
    </head>
    <body style="font-family:Arial,sans-serif;padding:24px;color:#111827;">
      <h1 style="margin:0;">PEPTQ Institutional Research Portal</h1>
      <h2 style="margin:8px 0 20px 0;color:#c24a00;">Pro-Forma Invoice</h2>
      <p><strong>Invoice ID:</strong> ${invoiceId}</p>
      <p><strong>Order ID:</strong> ${normalizeText(safeOrder.order_id)}</p>
      <p><strong>Member Email:</strong> ${normalizeText(safeOrder.member_email)}</p>
      <p><strong>Date:</strong> ${dateLabel}</p>
      <p><strong>Payment Status:</strong> ${paymentStatus}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111827;">Item</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111827;">Qty</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111827;">Line Total</th>
          </tr>
        </thead>
        <tbody>${itemRows || '<tr><td colspan="3" style="padding:6px;">No itemized rows available.</td></tr>'}</tbody>
      </table>
      <p style="margin-top:14px;"><strong>Total:</strong> $${total}</p>
      <p style="margin-top:24px;font-size:12px;color:#4b5563;">Research Use Only. Institutional procurement artifact.</p>
    </body>
  </html>`;
};

import { APPS_SCRIPT_COMMAND_URL, PORTAL_BRIDGE_URL } from './api';

const ALLOWED_ROLES = new Set(['GUEST', 'PENDING', 'MEMBER', 'VIP', 'OWNER', 'INSTITUTIONAL']);
const DELETED_IDENTITIES_KEY = 'peptq_deleted_identities_v1';
const LOT_REGISTRY_CACHE_KEY = 'peptq_lot_registry_local_v1';
const GAS_SIMPLE_CONTENT_TYPE = 'text/plain;charset=utf-8';

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeEmail = (value) => normalizeText(value).toLowerCase();

const createTemporaryPin = () => String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

const createNetworkCommandError = (error, command = 'UNKNOWN_COMMAND') => {
  const rawMessage = String(error?.message || '');
  const normalizedMessage = rawMessage.toLowerCase();
  const isResolutionIssue = normalizedMessage.includes('name_not_resolved') || normalizedMessage.includes('failed to fetch') || normalizedMessage.includes('networkerror');

  const nextError = new Error(
    isResolutionIssue
      ? 'Unable to reach the command server (DNS/network). Check internet, VPN/firewall policy, and Apps Script endpoint configuration.'
      : `Unable to submit ${command} command right now.`
  );

  nextError.code = isResolutionIssue ? 'ERR_APPS_SCRIPT_UNREACHABLE' : 'ERR_COMMAND_DISPATCH_FAILED';
  nextError.cause = error;
  return nextError;
};

const normalizeRole = (value, fallback = 'GUEST') => {
  const role = normalizeText(value).toUpperCase();
  return ALLOWED_ROLES.has(role) ? role : fallback;
};

const loadDeletedIdentities = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DELETED_IDENTITIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveDeletedIdentities = (emails) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DELETED_IDENTITIES_KEY, JSON.stringify(emails));
};

const loadLotRegistry = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOT_REGISTRY_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLotRegistry = (rows) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOT_REGISTRY_CACHE_KEY, JSON.stringify(rows));
};

const normalizeLotRegistryRow = (row = {}) => ({
  lot_id: normalizeText(row.lot_id || row.lotId),
  product_id: normalizeText(row.product_id || row.productId),
  coa_url: normalizeText(row.coa_url || row.coaUrl),
  purity_pct: Number.isFinite(Number(row.purity_pct ?? row.purityPct)) ? Number(row.purity_pct ?? row.purityPct) : null,
  test_date: normalizeText(row.test_date || row.testDate),
  expiry_date: normalizeText(row.expiry_date || row.expiryDate),
});

const resolveLotVerification = ({ row, requestedProductId, minPurityPct }) => {
  const productMatches = !requestedProductId || normalizeText(row.product_id) === requestedProductId;
  const hasCoaUrl = Boolean(normalizeText(row.coa_url));
  const purityValid = Number.isFinite(Number(row.purity_pct)) && Number(row.purity_pct) > Number(minPurityPct);

  if (productMatches && hasCoaUrl && purityValid) {
    return {
      verification_status: 'Verified Research Grade',
      order_allowed: true,
    };
  }

  return {
    verification_status: 'Pending Verification',
    order_allowed: false,
  };
};

export const isDeletedIdentity = (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  return loadDeletedIdentities().includes(normalizedEmail);
};

export const markDeletedIdentity = (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;
  const next = Array.from(new Set([...loadDeletedIdentities(), normalizedEmail]));
  saveDeletedIdentities(next);
};

const postCommand = async (payload, { mode = 'no-cors' } = {}) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Request payload must be an object.');
  }

  try {
    await fetch(APPS_SCRIPT_COMMAND_URL, {
      method: 'POST',
      mode,
      headers: {
        'Content-Type': GAS_SIMPLE_CONTENT_TYPE,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw createNetworkCommandError(error, payload.command);
  }

  return {
    status: 'queued',
    mode,
    command: payload.command,
  };
};

const postCommandWithResponse = async (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Request payload must be an object.');
  }

  let response;
  try {
    response = await fetch(APPS_SCRIPT_COMMAND_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': GAS_SIMPLE_CONTENT_TYPE,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw createNetworkCommandError(error, payload.command);
  }

  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const nextError = new Error(parsed?.message || `Unable to submit ${payload.command} command right now.`);
    nextError.code = parsed?.code || 'ERR_COMMAND_HTTP';
    throw nextError;
  }

  if (!parsed || parsed.status !== 'success') {
    const nextError = new Error(parsed?.message || `Unable to submit ${payload.command} command right now.`);
    nextError.code = parsed?.code || 'ERR_COMMAND_FAILED';
    throw nextError;
  }

  return parsed;
};

const normalizeBridgeIdentity = (payload = {}) => {
  const source = payload?.user || payload?.profile || payload?.identity || payload?.data || payload || {};
  const deleteState = String(source?.deleteState || source?.delete || '').trim().toUpperCase();

  return {
    email: normalizeEmail(source?.email),
    fullName: normalizeText(source?.fullName || source?.name),
    role: normalizeRole(source?.role, 'GUEST'),
    status: normalizeRole(source?.status || source?.role, 'GUEST'),
    profilePhotoUrl: normalizeText(
      source?.profile_photo_url
      || source?.profilePhotoUrl
      || source?.avatar_url
      || source?.avatarUrl
      || source?.photo
    ),
    accountDelete: Boolean(source?.account_delete || source?.accountDelete || deleteState === 'DELETE' || deleteState === 'DEACTIVE'),
  };
};

const callPortalBridgeAction = async (action, params = {}) => {
  const normalizedAction = normalizeText(action);
  if (!normalizedAction) {
    throw new Error('Portal action is required.');
  }

  const searchParams = new URLSearchParams({ action: normalizedAction });
  Object.entries(params || {}).forEach(([key, value]) => {
    const normalizedValue = normalizeText(value);
    if (normalizedValue) {
      searchParams.set(key, normalizedValue);
    }
  });

  let response;
  try {
    response = await fetch(`${PORTAL_BRIDGE_URL}?${searchParams.toString()}`, {
      method: 'GET',
      mode: 'cors',
    });
  } catch (error) {
    throw createNetworkCommandError(error, `PORTAL_${normalizedAction.toUpperCase()}`);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || `Portal bridge action ${normalizedAction} failed with status ${response.status}.`);
  }

  const unsupportedAction =
    (payload?.status === 'ok' && payload?.service && !payload?.success && !payload?.user && !payload?.identity)
    || (payload?.status === 'error' && /unknown command/i.test(String(payload?.message || '')));

  if (unsupportedAction) {
    const nextError = new Error('This portal verification method is not enabled on the active Apps Script deployment yet.');
    nextError.code = 'ERR_PORTAL_METHOD_NOT_DEPLOYED';
    throw nextError;
  }

  if (payload?.success === false) {
    const nextError = new Error(payload?.message || `Portal bridge action ${normalizedAction} was rejected.`);
    nextError.code = payload?.code || 'ERR_PORTAL_ACTION_REJECTED';
    nextError.payload = payload;
    throw nextError;
  }

  return payload || {};
};

export const submitPortalRequest = async ({
  email,
  fullName,
  authProvider = 'PIN',
  memberPin = '',
  profilePhotoUrl = '',
  accountDelete = false,
}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Email is required for request submission.');
  }

  return postCommand({
    command: 'SUBMIT_REQUEST',
    email: normalizedEmail,
    full_name: normalizeText(fullName),
    auth_provider: normalizeText(authProvider) || 'PIN',
    member_pin: normalizeText(memberPin),
    profile_photo_url: normalizeText(profilePhotoUrl),
    account_delete: Boolean(accountDelete),
  });
};

export const approveMember = async ({ email, role = 'MEMBER', actorEmail = '' }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Email is required for member promotion.');
  }

  const normalizedActorEmail = normalizeEmail(actorEmail);
  if (!normalizedActorEmail) {
    throw new Error('actorEmail is required for member promotion.');
  }

  return postCommand({
    command: 'APPROVE_MEMBER',
    email: normalizedEmail,
    role: normalizeRole(role, 'MEMBER'),
    actor_email: normalizedActorEmail,
  });
};

export const updateMemberRole = async ({ uid = '', email = '', role, actorEmail = '' }) => {
  if (!normalizeText(uid) && !normalizeEmail(email)) {
    throw new Error('uid or email is required for role updates.');
  }

  const normalizedActorEmail = normalizeEmail(actorEmail);
  if (!normalizedActorEmail) {
    throw new Error('actorEmail is required for role updates.');
  }

  return postCommand({
    command: 'UPDATE_ROLE',
    uid: normalizeText(uid),
    email: normalizeEmail(email),
    role: normalizeRole(role, ''),
    actor_email: normalizedActorEmail,
  });
};

export const updateMemberProfile = async ({ uid = '', email = '', ...profileFields }) => {
  if (!normalizeText(uid) && !normalizeEmail(email)) {
    throw new Error('uid or email is required for profile updates.');
  }

  return postCommand({
    command: 'UPDATE_MEMBER_PROFILE',
    uid: normalizeText(uid),
    email: normalizeEmail(email),
    ...profileFields,
  });
};

export const updateMemberQuickProfile = async ({ email = '', nextEmail = '', memberPin = '', actorEmail = '' }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('email is required for quick profile updates.');
  }

  const normalizedActorEmail = normalizeEmail(actorEmail);
  if (!normalizedActorEmail) {
    throw new Error('actorEmail is required for quick profile updates.');
  }

  return postCommand({
    command: 'UPDATE_MEMBER_PROFILE',
    email: normalizedEmail,
    new_email: normalizeEmail(nextEmail),
    member_pin: normalizeText(memberPin),
    actor_email: normalizedActorEmail,
  });
};

export const issueTempMemberPin = async ({ email = '', actorEmail = '' }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('email is required for temporary PIN issuance.');
  }

  const normalizedActorEmail = normalizeEmail(actorEmail);
  if (!normalizedActorEmail) {
    throw new Error('actorEmail is required for temporary PIN issuance.');
  }

  const tempPin = createTemporaryPin();

  await postCommand({
    command: 'ISSUE_TEMP_MEMBER_PIN',
    email: normalizedEmail,
    temp_pin: tempPin,
    actor_email: normalizedActorEmail,
  });

  return {
    status: 'queued',
    command: 'ISSUE_TEMP_MEMBER_PIN',
    email: normalizedEmail,
    temp_pin: tempPin,
  };
};

export const rotateMemberPin = async ({ email = '', memberPin = '', actorEmail = '' }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPin = normalizeText(memberPin);
  if (!normalizedEmail) {
    throw new Error('email is required for PIN rotation.');
  }

  if (!/^\d{6}$/.test(normalizedPin)) {
    throw new Error('memberPin must be a 6-digit value.');
  }

  return postCommand({
    command: 'ROTATE_MEMBER_PIN',
    email: normalizedEmail,
    member_pin: normalizedPin,
    actor_email: normalizeEmail(actorEmail) || normalizedEmail,
  });
};

export const rotateOwnerIdentity = async ({
  actorEmail = '',
  masterPin = '',
  newEmail = '',
  newPin = '',
  fullName = '',
  acceptTerms = false,
}) => {
  const normalizedActorEmail = normalizeEmail(actorEmail);
  const normalizedNewEmail = normalizeEmail(newEmail);
  const normalizedMasterPin = normalizeText(masterPin);
  const normalizedNewPin = normalizeText(newPin);

  if (!normalizedActorEmail) {
    throw new Error('actorEmail is required for owner onboarding.');
  }

  if (!normalizedMasterPin) {
    throw new Error('masterPin is required.');
  }

  if (!normalizedNewEmail) {
    throw new Error('newEmail is required.');
  }

  if (!/^\d{4,8}$/.test(normalizedNewPin)) {
    throw new Error('newPin must be 4-8 digits.');
  }

  if (!acceptTerms) {
    throw new Error('Terms acceptance is required.');
  }

  const response = await fetch(APPS_SCRIPT_COMMAND_URL, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': GAS_SIMPLE_CONTENT_TYPE,
    },
    body: JSON.stringify({
      command: 'ROTATE_OWNER_IDENTITY',
      actor_email: normalizedActorEmail,
      master_pin: normalizedMasterPin,
      new_email: normalizedNewEmail,
      new_pin: normalizedNewPin,
      full_name: normalizeText(fullName),
      accept_terms: Boolean(acceptTerms),
    }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.message || `Owner onboarding request failed with status ${response.status}`);
    error.code = payload?.code || 'ERR_OWNER_ONBOARDING_HTTP';
    throw error;
  }

  if (payload?.status !== 'success') {
    const code = String(payload?.code || '').trim().toUpperCase();
    const mappedMessage = code === 'ERR_MASTER_PIN_EXPIRED'
      ? 'MasterKey has already been consumed. Sign in with the rotated owner credentials.'
      : code === 'ERR_INVALID_MASTER_PIN'
        ? 'MasterKey PIN validation failed. Confirm the bootstrap PIN and retry.'
        : code === 'ERR_UNAUTHORIZED_ANCHOR'
          ? 'This onboarding flow only works from the bootstrap owner account.'
          : code === 'ERR_TERMS_REQUIRED'
            ? 'Accept terms before finalizing owner rotation.'
            : code === 'ERR_EMAIL_IN_USE'
              ? 'That owner email is already in use. Enter a different email.'
              : payload?.message || 'Owner onboarding failed.';
    const error = new Error(mappedMessage);
    error.code = code || 'ERR_OWNER_ONBOARDING_FAILED';
    throw error;
  }

  return payload;
};

export const requestAccountDelete = async ({ uid = '', email = '', actorEmail = '' }) => {
  if (!normalizeText(uid) && !normalizeEmail(email)) {
    throw new Error('uid or email is required for account deletion.');
  }

  const normalizedEmail = normalizeEmail(email);
  const result = await postCommand({
    command: 'DELETE_ACCOUNT',
    uid: normalizeText(uid),
    email: normalizedEmail,
    actor_email: normalizeEmail(actorEmail),
  });

  if (normalizedEmail) markDeletedIdentity(normalizedEmail);
  return result;
};

export const fetchDeleteRequests = async ({ actorEmail = '' } = {}) => {
  const params = new URLSearchParams({
    command: 'GET_DELETE_REQUESTS',
  });

  const normalizedActorEmail = normalizeEmail(actorEmail);
  if (normalizedActorEmail) {
    params.set('actor_email', normalizedActorEmail);
  }

  let response;
  try {
    response = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'cors',
    });
  } catch (error) {
    throw createNetworkCommandError(error, 'GET_DELETE_REQUESTS');
  }

  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok || !parsed || parsed.status !== 'success') {
    const nextError = new Error(parsed?.message || 'Unable to load delete requests right now.');
    nextError.code = parsed?.code || 'ERR_DELETE_REQUESTS_FETCH_FAILED';
    throw nextError;
  }

  return Array.isArray(parsed.requests) ? parsed.requests : [];
};

export const withdrawPortalRequest = async ({ email = '', actorEmail = '' }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Email is required to withdraw a portal request.');
  }

  return postCommand({
    command: 'WITHDRAW_REQUEST',
    email: normalizedEmail,
    actor_email: normalizeEmail(actorEmail) || normalizedEmail,
  });
};

export const submitSupportRequest = async ({
  email,
  fullName = '',
  issueType = 'Portal Access',
  message,
  sourcePage = 'Portal Gate',
}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedMessage = normalizeText(message);

  if (!normalizedEmail) {
    throw new Error('Email is required for support requests.');
  }

  if (!normalizedMessage) {
    throw new Error('Please describe the issue before sending support request.');
  }

  return postCommand({
    command: 'SUBMIT_SUPPORT',
    email: normalizedEmail,
    full_name: normalizeText(fullName),
    issue_type: normalizeText(issueType) || 'Portal Access',
    message: normalizedMessage,
    source_page: normalizeText(sourcePage) || 'Portal Gate',
  });
};

export const suspendMember = async ({ uid = '', email = '', actorEmail = '', reason = '' }) => {
  if (!normalizeText(uid) && !normalizeEmail(email)) {
    throw new Error('uid or email is required for member suspension.');
  }

  return postCommand({
    command: 'SUSPEND_MEMBER',
    uid: normalizeText(uid),
    email: normalizeEmail(email),
    actor_email: normalizeEmail(actorEmail),
    reason: normalizeText(reason),
  });
};

export const searchMemberOrders = async ({ query }) => {
  if (!normalizeText(query)) {
    throw new Error('query is required for member search.');
  }

  return postCommand({
    command: 'SEARCH_MEMBER_ORDERS',
    query: normalizeText(query),
  });
};

export const fetchWaitlistEntries = async ({ actorEmail = '', status = '', limit = 100 } = {}) => {
  const normalizedActorEmail = normalizeEmail(actorEmail);
  if (!normalizedActorEmail) {
    throw new Error('actorEmail is required for waitlist retrieval.');
  }

  const params = new URLSearchParams({
    command: 'GET_WAITLIST_ENTRIES',
    actor_email: normalizedActorEmail,
    limit: String(Math.max(1, Math.min(500, Number(limit || 100)))),
  });

  const normalizedStatus = normalizeText(status).toUpperCase();
  if (normalizedStatus) {
    params.set('status', normalizedStatus);
  }

  let response;
  try {
    response = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'cors',
    });
  } catch (error) {
    throw createNetworkCommandError(error, 'GET_WAITLIST_ENTRIES');
  }

  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok || !parsed || parsed.status !== 'success') {
    const nextError = new Error(parsed?.message || 'Unable to load waitlist entries right now.');
    nextError.code = parsed?.code || 'ERR_WAITLIST_FETCH_FAILED';
    throw nextError;
  }

  return Array.isArray(parsed.entries) ? parsed.entries : [];
};

export const fetchDiscountCodes = async ({ actorEmail = '', includeInactive = false } = {}) => {
  const params = new URLSearchParams({
    command: 'GET_DISCOUNT_CODES',
    include_inactive: includeInactive ? 'true' : 'false',
  });

  const normalizedActorEmail = normalizeEmail(actorEmail);
  if (normalizedActorEmail) {
    params.set('actor_email', normalizedActorEmail);
  }

  let response;
  try {
    response = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, {
      method: 'GET',
      mode: 'cors',
    });
  } catch (error) {
    throw createNetworkCommandError(error, 'GET_DISCOUNT_CODES');
  }

  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok || !parsed || parsed.status !== 'success') {
    const nextError = new Error(parsed?.message || 'Unable to load discount codes right now.');
    nextError.code = parsed?.code || 'ERR_DISCOUNT_CODES_FETCH_FAILED';
    throw nextError;
  }

  return Array.isArray(parsed.codes) ? parsed.codes : [];
};

export const upsertDiscountCode = async ({
  code = '',
  label = '',
  discountPct = 0,
  scope = 'ALL',
  productHandle = '',
  isActive = true,
  isSingleUse = false,
  usedAt = '',
  usedBy = '',
  usedOrderId = '',
  actorEmail = '',
}) => {
  const normalizedActorEmail = normalizeEmail(actorEmail);
  if (!normalizedActorEmail) {
    throw new Error('actorEmail is required for discount code updates.');
  }

  return postCommandWithResponse({
    command: 'UPSERT_DISCOUNT_CODE',
    code: normalizeText(code).toUpperCase(),
    label: normalizeText(label),
    discount_pct: Number(discountPct || 0),
    scope: normalizeText(scope).toUpperCase() === 'PRODUCT' ? 'PRODUCT' : 'ALL',
    product_handle: normalizeText(productHandle).toLowerCase(),
    is_active: Boolean(isActive),
    is_single_use: Boolean(isSingleUse),
    used_at: normalizeText(usedAt),
    used_by: normalizeText(usedBy).toLowerCase(),
    used_order_id: normalizeText(usedOrderId),
    actor_email: normalizedActorEmail,
  });
};

export const fetchMemberProfile = async ({ email = '', actorEmail = '' }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedActorEmail = normalizeEmail(actorEmail) || normalizedEmail;
  if (!normalizedEmail) {
    throw new Error('email is required for member profile lookup.');
  }

  const params = new URLSearchParams({
    command: 'GET_MEMBER_PROFILE',
    email: normalizedEmail,
    actor_email: normalizedActorEmail,
  });

  const response = await fetch(`${APPS_SCRIPT_COMMAND_URL}?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
  });

  if (!response.ok) {
    throw new Error(`Member profile lookup failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (payload?.status !== 'success' || !payload?.profile) {
    throw new Error(payload?.message || 'Invalid member profile payload.');
  }

  return payload.profile;
};

const hasCompleteAddress = ({
  address = '',
  city = '',
  state = '',
  zip = '',
  country = '',
} = {}) => {
  return [
    normalizeText(address),
    normalizeText(city),
    normalizeText(state),
    normalizeText(zip),
    normalizeText(country),
  ].every(Boolean);
};

const toResolvedShippingObject = ({
  member = {},
  addressType = 'PERSONAL',
  address = '',
  city = '',
  state = '',
  zip = '',
  country = '',
} = {}) => ({
  address_type: addressType,
  recipient_name: normalizeText(member.full_name),
  phone: normalizeText(member.phone),
  business_name: normalizeText(member.business_name),
  address: normalizeText(address),
  city: normalizeText(city),
  state: normalizeText(state),
  zip: normalizeText(zip),
  country: normalizeText(country),
});

export const getComputedShipping = (member = {}) => {
  const personalAddress = {
    address: normalizeText(member.shipping_address),
    city: normalizeText(member.shipping_city),
    state: normalizeText(member.shipping_state),
    zip: normalizeText(member.shipping_zip),
    country: normalizeText(member.shipping_country),
  };

  const businessAddress = {
    address: normalizeText(member.business_shipping_address),
    city: normalizeText(member.business_shipping_city),
    state: normalizeText(member.business_shipping_state),
    zip: normalizeText(member.business_shipping_zip),
    country: normalizeText(member.business_shipping_country),
  };

  const isBusinessMode = member.business_account_enabled === true;
  const wantsBusinessShipping = member.use_business_shipping === true;
  const hasBusinessShipping = hasCompleteAddress(businessAddress);

  if (isBusinessMode && wantsBusinessShipping && hasBusinessShipping) {
    return toResolvedShippingObject({
      member,
      addressType: 'BUSINESS',
      ...businessAddress,
    });
  }

  return toResolvedShippingObject({
    member,
    addressType: 'PERSONAL',
    ...personalAddress,
  });
};

export const stringifyComputedShipping = (member = {}) => JSON.stringify(getComputedShipping(member));

export const validateDiscountCode = async ({ code = '', productHandles = [] } = {}) => {
  const normalizedCode = normalizeText(code).toUpperCase();
  if (!normalizedCode) {
    throw new Error('Discount code is required.');
  }

  const normalizedHandles = (Array.isArray(productHandles) ? productHandles : [])
    .map((entry) => normalizeText(entry).toLowerCase())
    .filter(Boolean);

  if (!normalizedHandles.length) {
    throw new Error('At least one product handle is required for discount validation.');
  }

  const parsed = await postCommandWithResponse({
    command: 'VALIDATE_DISCOUNT_CODE',
    code: normalizedCode,
    product_handles: normalizedHandles,
  });

  return parsed?.discount || null;
};

export const promoteWaitlistEntry = async ({ rowId = '', email = '', phone = '', actorEmail = '', role = 'MEMBER' }) => {
  const normalizedActorEmail = normalizeEmail(actorEmail);
  if (!normalizedActorEmail) {
    throw new Error('actorEmail is required for waitlist promotion.');
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = String(phone || '').replace(/\D/g, '');
  const normalizedRowId = Number(rowId || 0);

  if (!normalizedRowId && !normalizedEmail && !normalizedPhone) {
    throw new Error('rowId, email, or phone is required for waitlist promotion.');
  }

  return postCommandWithResponse({
    command: 'PROMOTE_WAITLIST_ENTRY',
    row_id: normalizedRowId > 0 ? normalizedRowId : '',
    email: normalizedEmail,
    phone: normalizedPhone,
    role: normalizeRole(role, 'MEMBER'),
    actor_email: normalizedActorEmail,
  });
};

export const fetchLotMetadata = async ({
  lotId,
  productId = '',
  role = 'GUEST',
  lotRegistry = [],
  minPurityPct = 98,
}) => {
  const normalizedLotId = normalizeText(lotId);
  if (!normalizedLotId) {
    throw new Error('lotId is required for lot metadata lookup.');
  }

  const normalizedProductId = normalizeText(productId);
  const normalizedRole = normalizeRole(role, 'GUEST');

  await postCommand({
    command: 'GET_LOT_METADATA',
    lot_id: normalizedLotId,
    product_id: normalizedProductId,
  });

  const normalizedRegistry = Array.isArray(lotRegistry) && lotRegistry.length
    ? lotRegistry.map(normalizeLotRegistryRow)
    : loadLotRegistry().map(normalizeLotRegistryRow);

  if (Array.isArray(lotRegistry) && lotRegistry.length) {
    saveLotRegistry(normalizedRegistry);
  }

  const matchedRow = normalizedRegistry.find((row) => normalizeText(row.lot_id) === normalizedLotId);
  if (!matchedRow) {
    return {
      lot_id: normalizedLotId,
      product_id: normalizedProductId,
      coa_url: '',
      purity_pct: null,
      test_date: '',
      expiry_date: '',
      verification_status: 'Pending Verification',
      order_allowed: false,
      coa_visible: normalizedRole === 'MEMBER' || normalizedRole === 'OWNER',
    };
  }

  const verification = resolveLotVerification({
    row: matchedRow,
    requestedProductId: normalizedProductId,
    minPurityPct,
  });

  const canViewCoa = normalizedRole === 'MEMBER' || normalizedRole === 'OWNER';

  return {
    lot_id: matchedRow.lot_id,
    product_id: matchedRow.product_id,
    coa_url: canViewCoa ? matchedRow.coa_url : '',
    purity_pct: matchedRow.purity_pct,
    test_date: matchedRow.test_date,
    expiry_date: matchedRow.expiry_date,
    verification_status: verification.verification_status,
    order_allowed: verification.order_allowed,
    coa_visible: canViewCoa,
  };
};

export const resolveIdentityStatus = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('email is required for identity resolution.');
  }

  const locallyDeleted = isDeletedIdentity(normalizedEmail);

  try {
    const url = `${APPS_SCRIPT_COMMAND_URL}?command=GET_IDENTITY_STATUS&email=${encodeURIComponent(normalizedEmail)}`;
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Identity status lookup failed with status ${response.status}`);
    }

    const payload = await response.json();
    const identity = payload?.identity || payload || {};
    const accountDelete = Boolean(identity.account_delete || identity.accountDelete || payload?.account_delete) || locallyDeleted;

    if (accountDelete) {
      markDeletedIdentity(normalizedEmail);
    }

    return {
      email: normalizedEmail,
      role: normalizeRole(identity.role || payload?.role || payload?.requested_role, 'GUEST'),
      status: normalizeRole(identity.status || payload?.identity_status, 'GUEST'),
      accountDelete,
      pinRotationRequired: Boolean(identity.pin_rotation_required),
      reachable: true,
      source: normalizeText(payload?.source || 'NONE'),
      profilePhotoUrl: normalizeText(identity.profile_photo_url || payload?.profile_photo_url),
    };
  } catch {
    return {
      email: normalizedEmail,
      role: '',
      status: '',
      accountDelete: locallyDeleted,
      pinRotationRequired: null,
      reachable: false,
      source: 'LOCAL_CACHE',
      profilePhotoUrl: '',
    };
  }
};

export const verifyPortalPinLogin = async ({ identity = '', portalPin = '' }) => {
  const normalizedIdentity = normalizeText(identity);
  const normalizedPin = normalizeText(portalPin);
  if (!normalizedIdentity) {
    throw new Error('Email or phone is required for portal PIN login.');
  }
  if (!normalizedPin) {
    throw new Error('Portal PIN is required.');
  }

  const payload = await callPortalBridgeAction('portalLogin', {
    id: normalizedIdentity,
    portalPin: normalizedPin,
  });

  return {
    ...normalizeBridgeIdentity(payload),
    payload,
  };
};

export const requestPortalEmailCode = async ({ identity = '' }) => {
  const normalizedIdentity = normalizeText(identity);
  if (!normalizedIdentity) {
    throw new Error('Email or phone is required to request a confirmation code.');
  }

  const payload = await callPortalBridgeAction('requestOtp', {
    id: normalizedIdentity,
  });

  return {
    deliveryHint: normalizeText(payload?.maskedEmail || payload?.email || ''),
    payload,
  };
};

export const verifyPortalEmailCode = async ({ identity = '', code = '' }) => {
  const normalizedIdentity = normalizeText(identity);
  const normalizedCode = normalizeText(code);
  if (!normalizedIdentity) {
    throw new Error('Email or phone is required to verify a confirmation code.');
  }
  if (!normalizedCode) {
    throw new Error('Confirmation code is required.');
  }

  const payload = await callPortalBridgeAction('verifyOtp', {
    id: normalizedIdentity,
    code: normalizedCode,
  });

  return {
    ...normalizeBridgeIdentity(payload),
    payload,
  };
};

export const verifyPortalAuthenticatorCode = async ({ identity = '', code = '' }) => {
  const normalizedIdentity = normalizeText(identity);
  const normalizedCode = normalizeText(code);
  if (!normalizedIdentity) {
    throw new Error('Email or phone is required to verify authenticator code.');
  }
  if (!normalizedCode) {
    throw new Error('Authenticator code is required.');
  }

  const payload = await callPortalBridgeAction('totpVerify', {
    id: normalizedIdentity,
    code: normalizedCode,
  });

  return {
    ...normalizeBridgeIdentity(payload),
    payload,
  };
};

export const startPortalPhoneApproval = async ({ identity = '', appUrl = '' }) => {
  const normalizedIdentity = normalizeText(identity);
  if (!normalizedIdentity) {
    throw new Error('Email or phone is required to start phone approval.');
  }

  const payload = await callPortalBridgeAction('qrInit', {
    id: normalizedIdentity,
    appUrl: normalizeText(appUrl),
  });

  return {
    token: normalizeText(payload?.token),
    qrUrl: normalizeText(payload?.qrUrl),
    approvalCode: normalizeText(payload?.approvalCode),
    approvalUrl: normalizeText(payload?.approvalUrl),
    expiresInSec: Number(payload?.expiresInSec || 0),
    payload,
  };
};

export const fetchPortalPhoneApprovalStatus = async ({ token = '' }) => {
  const normalizedToken = normalizeText(token);
  if (!normalizedToken) {
    throw new Error('Phone approval token is required.');
  }

  const payload = await callPortalBridgeAction('qrStatus', {
    token: normalizedToken,
  });

  return {
    approved: Boolean(payload?.approved),
    expired: Boolean(payload?.expired),
    expiresInSec: Number(payload?.expiresInSec || 0),
    identity: normalizeBridgeIdentity(payload),
    payload,
  };
};

export const requestService = {
  submitPortalRequest,
  approveMember,
  updateMemberRole,
  updateMemberProfile,
  issueTempMemberPin,
  rotateMemberPin,
  rotateOwnerIdentity,
  requestAccountDelete,
  fetchDeleteRequests,
  withdrawPortalRequest,
  suspendMember,
  searchMemberOrders,
  fetchWaitlistEntries,
  promoteWaitlistEntry,
  fetchLotMetadata,
  resolveIdentityStatus,
  verifyPortalPinLogin,
  requestPortalEmailCode,
  verifyPortalEmailCode,
  verifyPortalAuthenticatorCode,
  startPortalPhoneApproval,
  fetchPortalPhoneApprovalStatus,
  isDeletedIdentity,
  markDeletedIdentity,
};


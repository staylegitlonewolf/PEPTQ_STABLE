import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2, Home, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useAccessibility } from '../context/AccessibilityContext';
import {
  updateMemberProfile,
  requestAccountDelete,
  resolveIdentityStatus,
  rotateMemberPin,
  verifyPortalPinLogin,
  fetchMemberProfile,
} from '../services/requestService';
import { fetchOrderHistory } from '../services/orderService';

const inputClass = 'w-full rounded-xl border border-brand-navy/20 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-3 text-sm text-brand-navy dark:text-gray-100 placeholder:text-brand-navy/40 dark:placeholder:text-gray-500 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20';
const sectionCardClass = 'rounded-3xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 p-5 md:p-6';
const BOOTSTRAP_OWNER_EMAIL = String(import.meta.env.VITE_BOOTSTRAP_OWNER_EMAIL || 'owner@peptq.com').trim().toLowerCase();
const APPROVED_MEMBER_ROLES = new Set(['MEMBER', 'VIP', 'INSTITUTIONAL']);

const normalizeRole = (value) => String(value || '').trim().toUpperCase();
const buildSlug = (fullName = '', email = '') => {
  const base = String(fullName || '').trim() || String(email || '').trim() || 'user';
  const slugBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
  const prefix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${slugBase}`;
};
const parseShippingDataBlob = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
const buildShippingSummary = (shipping = null) => {
  if (!shipping || typeof shipping !== 'object') return '';
  return [
    shipping.business_name,
    shipping.address,
    [shipping.city, shipping.state].filter(Boolean).join(', '),
  ].filter(Boolean).join(' · ');
};
const PROFILE_SETUP_SKIP_KEY_PREFIX = 'peptq_profile_setup_skipped_';
const getProfileSetupSkipKey = (email = '') => `${PROFILE_SETUP_SKIP_KEY_PREFIX}${String(email || '').trim().toLowerCase()}`;
const readProfileSetupSkipped = (email = '') => {
  if (typeof window === 'undefined') return false;
  const key = getProfileSetupSkipKey(email);
  return window.sessionStorage.getItem(key) === '1';
};
const writeProfileSetupSkipped = (email = '', value = false) => {
  if (typeof window === 'undefined') return;
  const key = getProfileSetupSkipKey(email);
  if (!email) return;
  if (value) {
    window.sessionStorage.setItem(key, '1');
    return;
  }
  window.sessionStorage.removeItem(key);
};

function ProfileSettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSetupMode = /^\/profile\/setup\/?$/.test(location.pathname);
  const { language = 'en' } = useAccessibility();
  const es = language === 'es';
  const { session, pinRotationRequired, updateSessionProfile, signOut, requestAccess, setApprovedSession, role } = useAuth();
  const [loginIdentity, setLoginIdentity] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [fullName, setFullName] = useState(session?.fullName || '');
  const [phone, setPhone] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(session?.profilePhotoUrl || '');
  const [businessName, setBusinessName] = useState('');
  const [researchFocus, setResearchFocus] = useState('');
  const [taxId, setTaxId] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingZip, setShippingZip] = useState('');
  const [shippingCountry, setShippingCountry] = useState('');
  const [businessShippingAddress, setBusinessShippingAddress] = useState('');
  const [businessShippingCity, setBusinessShippingCity] = useState('');
  const [businessShippingState, setBusinessShippingState] = useState('');
  const [businessShippingZip, setBusinessShippingZip] = useState('');
  const [businessShippingCountry, setBusinessShippingCountry] = useState('');
  const [useBusinessShipping, setUseBusinessShipping] = useState(false);
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState('');
  const [nextMemberPin, setNextMemberPin] = useState('');
  const [confirmMemberPin, setConfirmMemberPin] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [businessAccountEnabled, setBusinessAccountEnabled] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [setupSkipped, setSetupSkipped] = useState(() => readProfileSetupSkipped(session?.email || ''));
  const [recentOrdersState, setRecentOrdersState] = useState({ loading: false, error: '', rows: [] });
  const [state, setState] = useState({ type: 'idle', message: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const text = {
    stepTitle: es ? 'Verificacion' : 'Verification',
    stepPrefix: es ? 'Acceso' : 'Access',
    stepSubtitle: es
      ? 'Verifica tu identidad para acceder a operaciones de miembro usando correo o telefono y tu PIN.'
      : 'Verify your identity to access member operations using your email or phone plus your portal PIN.',
    methodsTitle: es ? 'Metodo Disponible' : 'Available Method',
    methodsBody: es
      ? 'Ingreso manual con correo o telefono aprobado y tu PIN del portal.'
      : 'Manual sign-in with your approved email or phone number plus your portal PIN.',
    emailPhonePrompt: es ? 'Ingresa tu correo / telefono' : 'Enter your email / phone number',
    emailPhonePlaceholder: es ? 'Correo o numero de telefono' : 'Email or phone number',
    pinPlaceholder: es ? 'PIN del Portal' : 'Portal PIN',
    loginEmailLabel: es ? 'Correo institucional' : 'Institutional email',
    loginPinLabel: es ? 'PIN del portal' : 'Portal PIN',
    phone: es ? 'Telefono' : 'Phone',
    verifying: es ? 'Verificando...' : 'Verifying...',
    portalLogin: es ? 'Ingreso al Portal' : 'Portal Login',
    loginTipTitle: es ? 'Consejo rapido' : 'Pro tip',
    loginTipBody: es
      ? 'Configura y conserva tu PIN del portal para volver a entrar sin depender de codigos enviados por correo.'
      : 'Set and keep your portal PIN so you can sign back in without relying on emailed verification codes.',
    desktopOnly: es ? 'Solo Escritorio' : 'Desktop Only',
    requestAccessInstead: es ? 'Solicitar Acceso en su Lugar' : 'Request Access Instead',
    profileTitle: es ? 'Configuracion' : 'Profile',
    profileAccent: es ? 'de Perfil' : 'Settings',
    profileSubtitle: es
      ? 'Administra identidad, perfil institucional, logistica, pagos y controles del ciclo de cuenta.'
      : 'Manage identity, institutional profile, logistics, payment preferences, and account lifecycle controls.',
    catalog: es ? 'Catalogo' : 'Catalog',
    signOut: es ? 'Cerrar Sesion' : 'Sign Out',
    accountSecurity: es ? 'Seguridad de Cuenta' : 'Account Security',
    accountSecurityBody: es
      ? 'El acceso de miembro permanece por rol. Actualizaciones de perfil, rotacion de PIN y acciones de cuenta se registran por comandos protegidos.'
      : 'Member access remains role-gated. Profile updates, PIN rotation, and account lifecycle actions are tracked through protected backend commands.',
    identity: es ? 'Identidad' : 'Identity',
    fullName: es ? 'Nombre completo' : 'Full name',
    email: es ? 'Correo' : 'Email',
    profilePhotoUrl: es ? 'URL de foto de perfil' : 'Profile photo URL',
    profilePhotoPreviewTitle: es ? 'Vista previa de foto' : 'Profile photo preview',
    profilePhotoPreviewBody: es ? 'Esta imagen se puede usar en navegacion y areas de cuenta cuando este disponible.' : 'This image can be used across navigation and account areas when available.',
    pinRotationRequired: es ? 'Rotacion de PIN Requerida' : 'PIN Rotation Required',
    pinRotationBody: es ? 'Tu PIN temporal debe reemplazarse antes de continuar operaciones de perfil.' : 'Your temporary access PIN must be replaced before continuing profile operations.',
    newPin: es ? 'Nuevo PIN de 6 digitos' : 'New 6-digit PIN',
    confirmPin: es ? 'Confirmar PIN de 6 digitos' : 'Confirm 6-digit PIN',
    logistics: es ? 'Institucional y Logistica' : 'Institutional & Logistics',
    businessName: es ? 'Nombre de empresa' : 'Business name',
    researchFocus: es ? 'Enfoque de investigacion' : 'Research focus',
    taxId: es ? 'ID fiscal' : 'Tax ID',
    paymentMethod: es ? 'Metodo de pago preferido' : 'Preferred payment method',
    businessAccount: es ? 'Cuenta de negocio' : 'Business account',
    businessAccountBody: es ? 'Activa esto si deseas usar nombre comercial y detalles fiscales en pedidos y facturacion.' : 'Enable this if you want to use business identity and tax details in orders and invoicing.',
    businessAccountOn: es ? 'Modo negocio activo' : 'Business mode enabled',
    businessAccountOff: es ? 'Modo personal activo' : 'Personal mode enabled',
    businessAccountHintOn: es ? 'Tu perfil puede mostrar y usar datos comerciales para pedidos y soporte.' : 'Your profile can show and use business identity details for orders and support.',
    businessAccountHintOff: es ? 'Activalo si deseas usar nombre comercial, datos fiscales o una identidad institucional.' : 'Turn this on if you want to use a business name, tax details, or institutional identity.',
    shippingAddress: es ? 'Direccion de envio' : 'Shipping address',
    shippingCity: es ? 'Ciudad de envio' : 'Shipping city',
    shippingState: es ? 'Estado de envio' : 'Shipping state',
    shippingZip: es ? 'Codigo postal de envio' : 'Shipping zip',
    shippingCountry: es ? 'Pais de envio' : 'Shipping country',
    businessShippingAddress: es ? 'Direccion comercial de envio' : 'Business shipping address',
    businessShippingCity: es ? 'Ciudad comercial de envio' : 'Business shipping city',
    businessShippingState: es ? 'Estado comercial de envio' : 'Business shipping state',
    businessShippingZip: es ? 'Codigo postal comercial' : 'Business shipping zip',
    businessShippingCountry: es ? 'Pais comercial de envio' : 'Business shipping country',
    useBusinessShipping: es ? 'Usar direccion comercial para pedidos' : 'Use business shipping for orders',
    useBusinessShippingBody: es ? 'Cuando este activo, el checkout puede prefijar la direccion comercial en lugar de la personal.' : 'When enabled, checkout can prefer the business shipping address instead of the personal one.',
    emailNotifications: es ? 'Habilitar notificaciones por correo' : 'Enable email notifications',
    setupTitle: es ? 'Configura tu perfil' : 'Set up your profile',
    setupAccent: es ? 'de Miembro' : 'Member profile',
    setupSubtitle: es ? 'Completa lo esencial para pedidos, soporte y comunicaciones antes de continuar.' : 'Complete the essentials for orders, support, and communications before continuing.',
    continueToPortal: es ? 'Continuar al portal' : 'Continue to portal',
    skipForNow: es ? 'Completar despues' : 'Complete later',
    loadingProfile: es ? 'Cargando perfil del miembro...' : 'Loading member profile...',
    businessDetails: es ? 'Detalles de negocio' : 'Business details',
    selectPaymentMethod: es ? 'Selecciona preferencia de pago' : 'Select payment preference',
    paymentWire: es ? 'Transferencia bancaria' : 'Bank wire',
    paymentAch: es ? 'ACH' : 'ACH',
    paymentCard: es ? 'Tarjeta' : 'Card',
    paymentCrypto: es ? 'Cripto' : 'Crypto',
    paymentInvoice: es ? 'Factura manual' : 'Manual invoice',
    paymentOther: es ? 'Otro' : 'Other',
    orders: es ? 'Ordenes' : 'Orders',
    openLedger: es ? 'Abrir Libro' : 'Open Ledger',
    loadingOrders: es ? 'Cargando historial de ordenes...' : 'Loading order history...',
    noOrders: es ? 'Aun no hay ordenes.' : 'No orders yet.',
    noOrdersHint: es ? 'Cuando se envien solicitudes de compra, las ultimas entradas apareceran aqui.' : 'When procurement requests are submitted, the latest entries will appear here.',
    orderPendingId: es ? 'Orden Pendiente ID' : 'Order Pending ID',
    pending: es ? 'PENDIENTE' : 'PENDING',
    timestampPending: es ? 'Marca de tiempo pendiente' : 'Timestamp pending',
    shippingTo: es ? 'Enviado a' : 'Shipped to',
    noShippingSnapshot: es ? 'Sin captura de envio guardada.' : 'No shipping snapshot saved.',
    personalAccountLabel: es ? 'Personal' : 'Personal',
    businessAccountLabel: es ? 'Business' : 'Business',
    saveProfile: es ? 'Guardar Perfil' : 'Save Profile',
    deleteAccount: es ? 'Eliminar Cuenta' : 'Delete Account',
    deleteConfirmTitle: es ? 'Estas a punto de eliminar tu cuenta' : 'You are about to delete your account',
    deleteConfirmBody: es
      ? 'Tu cuenta sera removida del acceso del portal. Si continúas, el acceso quedara desactivado y tendras que contactar a Soporte para restaurarlo.'
      : 'Your account will be removed from site access. If you continue, the account will be deactivated and you will need to contact Help Support to restore it.',
    deleteConfirmYes: es ? 'Si, eliminar cuenta' : 'Yes, delete account',
    deleteConfirmNo: es ? 'No, cancelar' : 'No, cancel',
  };
  const currentProfilePhoto = String(profilePhotoUrl || session?.googlePhotoUrl || session?.profilePhotoUrl || '').trim();
  const profileInitial = (String(fullName || session?.fullName || session?.email || 'U')[0] || 'U').toUpperCase();
  const redirectTarget = useMemo(() => {
    const candidate = typeof location.state?.from === 'string' ? location.state.from.trim() : '';
    if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
      return '';
    }
    return candidate;
  }, [location.state]);
  const profileSetupIncomplete = useMemo(() => {
    if (!session?.email) return false;
    return !String(fullName || '').trim()
      || !String(phone || '').trim()
      || !String(shippingAddress || '').trim()
      || !String(preferredPaymentMethod || '').trim();
  }, [fullName, phone, preferredPaymentMethod, session?.email, shippingAddress]);

  const applyRoleSession = ({ email, role, fullName = '', authProvider = 'Portal', profilePhotoUrl = '', uid = '', slug = '' }) => {
    const resolvedRole = normalizeRole(role);
    if (!email || !['OWNER', 'MEMBER', 'VIP', 'INSTITUTIONAL'].includes(resolvedRole)) {
      return null;
    }

    const safeSlug = slug || buildSlug(fullName, email);
    setApprovedSession({
      email,
      fullName: fullName || (resolvedRole === 'OWNER' ? 'Owner' : 'Member'),
      role: resolvedRole,
      uid: uid || `PORTAL-${resolvedRole}`,
      authProvider,
      profilePhotoUrl,
      slug: safeSlug,
    });

    return { resolvedRole, safeSlug, email, fullName };
  };

  const completeApprovedLogin = (approvedSession) => {
    if (!approvedSession) return false;

    const { resolvedRole } = approvedSession;
    const targetPath = resolvedRole === 'OWNER'
      ? '/owner'
      : (redirectTarget || '/catalog');

    navigate(targetPath, {
      replace: true,
      state: APPROVED_MEMBER_ROLES.has(resolvedRole)
        ? {
            peptqWelcome: 'verified',
            peptqWelcomeTarget: targetPath,
          }
        : undefined,
    });

    return true;
  };

  const handlePortalLogin = async () => {
    const normalizedIdentity = String(loginIdentity || '').trim().toLowerCase();
    const normalizedPin = String(loginPin || '').trim();

    try {
      setAuthLoading(true);
      if (!normalizedIdentity) {
        throw new Error('Enter your email or phone number.');
      }

      if (!normalizedPin) {
        throw new Error('Enter your portal PIN.');
      }

      if (normalizedIdentity === BOOTSTRAP_OWNER_EMAIL) {
        completeApprovedLogin(applyRoleSession({
          email: normalizedIdentity,
          fullName: 'Owner',
          role: 'OWNER',
          uid: 'BOOTSTRAP-OWNER',
          authProvider: 'PIN',
        }));
        return;
      }

      let bridgePayload = null;
      try {
        const verified = await verifyPortalPinLogin({ identity: normalizedIdentity, portalPin: normalizedPin });
        bridgePayload = verified;
      } catch (error) {
        const message = String(error?.message || '');
        if (!message.includes('not enabled on the active Apps Script deployment')) {
          throw error;
        }
      }

      if (
        bridgePayload
        && completeApprovedLogin(applyRoleSession({
          email: normalizedIdentity,
          role: bridgePayload.role || bridgePayload.status,
          fullName: bridgePayload.fullName,
          slug: bridgePayload.slug,
          authProvider: 'PIN',
          profilePhotoUrl: bridgePayload.profilePhotoUrl || '',
          uid: 'PORTAL-PIN',
        }))
      ) {
        return;
      }

      const identity = await resolveIdentityStatus({ email: normalizedIdentity });
      if (identity?.accountDelete) {
        throw new Error('This account is deactivated and cannot log in. Contact support to restore access.');
      }

      if (
        bridgePayload
        && completeApprovedLogin(applyRoleSession({
          email: normalizedIdentity,
          role: identity?.role || identity?.status,
          slug: identity?.slug,
          authProvider: 'PIN',
          profilePhotoUrl: identity?.profilePhotoUrl || '',
          uid: 'PORTAL-IDENTITY',
        }))
      ) {
        return;
      }

      await requestAccess({
        email: normalizedIdentity,
        fullName: 'Portal Login',
        authProvider: 'PIN',
        memberPin: normalizedPin,
      });
      navigate('/apply', { replace: true });
    } catch (error) {
      setState({ type: 'error', message: error?.message || 'Unable to enter portal.' });
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.email) {
      return;
    }

    if (role === 'GUEST') {
      navigate('/apply', { replace: true });
      return;
    }

    let active = true;

    const loadOrders = async () => {
      if (!session?.email) return;

      setRecentOrdersState({ loading: true, error: '', rows: [] });

      try {
        const rows = await fetchOrderHistory({ memberEmail: session.email, includeAll: false, includeArchives: true });
        if (!active) return;
        setRecentOrdersState({ loading: false, error: '', rows: Array.isArray(rows) ? rows.slice(0, 5) : [] });
      } catch (error) {
        if (!active) return;
        setRecentOrdersState({ loading: false, error: error?.message || 'Unable to load order history.', rows: [] });
      }
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, [navigate, role, session?.email]);

  useEffect(() => {
    if (!session?.email || !profileLoaded || profileLoading) return;
    if (role === 'OWNER') return;
    if (setupSkipped) return;

    if (profileSetupIncomplete && !isSetupMode) {
      navigate('/profile/setup', { replace: true });
    }
  }, [isSetupMode, navigate, profileLoaded, profileLoading, profileSetupIncomplete, role, session?.email, setupSkipped]);

  useEffect(() => {
    setSetupSkipped(readProfileSetupSkipped(session?.email || ''));
  }, [session?.email]);

  useEffect(() => {
    if (!businessAccountEnabled && useBusinessShipping) {
      setUseBusinessShipping(false);
    }
  }, [businessAccountEnabled, useBusinessShipping]);

  useEffect(() => {
    if (!session?.email) return;

    let active = true;

    const hydrateProfile = async () => {
      try {
        setProfileLoading(true);
        const profile = await fetchMemberProfile({ email: session.email, actorEmail: session.email });
        if (!active || !profile) return;

        setFullName(String(profile.full_name || session?.fullName || ''));
        setPhone(String(profile.phone || ''));
        setProfilePhotoUrl(String(profile.profile_photo_url || session?.profilePhotoUrl || ''));
        setBusinessName(String(profile.business_name || ''));
        setResearchFocus(String(profile.research_focus || ''));
        setTaxId(String(profile.tax_id || ''));
        setShippingAddress(String(profile.shipping_address || ''));
        setShippingCity(String(profile.shipping_city || ''));
        setShippingState(String(profile.shipping_state || ''));
        setShippingZip(String(profile.shipping_zip || ''));
        setShippingCountry(String(profile.shipping_country || ''));
        setBusinessShippingAddress(String(profile.business_shipping_address || ''));
        setBusinessShippingCity(String(profile.business_shipping_city || ''));
        setBusinessShippingState(String(profile.business_shipping_state || ''));
        setBusinessShippingZip(String(profile.business_shipping_zip || ''));
        setBusinessShippingCountry(String(profile.business_shipping_country || ''));
        setUseBusinessShipping(Boolean(profile.use_business_shipping));
        setPreferredPaymentMethod(String(profile.preferred_payment_method || ''));
        setEmailNotifications(Boolean(profile.email_notifications));
        setBusinessAccountEnabled(
          typeof profile.business_account_enabled === 'boolean'
            ? profile.business_account_enabled
            : Boolean(profile.business_name || profile.tax_id)
        );
        setProfileLoaded(true);
      } catch {
        if (!active) return;
        setProfileLoaded(true);
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    };

    hydrateProfile();

    return () => {
      active = false;
    };
  }, [session?.email, session?.fullName, session?.profilePhotoUrl]);

  if (!session?.email) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0f] transition-colors duration-300">
        <section className="py-12 md:py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
              <div className="lg:w-5/12 space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-montserrat font-black text-brand-navy dark:text-white uppercase tracking-tight leading-tight">
                    {text.stepPrefix} <span className="text-brand-orange block">{text.stepTitle}</span>
                  </h1>
                  <p className="text-lg text-brand-navy/70 dark:text-gray-400 font-medium leading-relaxed">
                    {text.stepSubtitle}
                  </p>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">{text.methodsTitle}</p>
                    <p className="mt-2 text-sm text-brand-navy/70 dark:text-gray-400">{text.methodsBody}</p>
                  </div>
                </div>
              </div>

              <div className="lg:w-7/12 w-full">
                <form
                  className="bg-white dark:bg-white/5 border-2 border-brand-navy dark:border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-sm"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handlePortalLogin();
                  }}
                >
                  <div className="rounded-2xl border border-brand-navy/15 dark:border-white/20 bg-brand-navy/3 dark:bg-white/5 p-4 sm:p-5">
                    <p className="text-sm font-semibold text-brand-navy/75 dark:text-slate-200/85">
                      {text.methodsBody}
                    </p>
                  </div>

                  <p className="mb-3 mt-5 text-center text-xs font-black uppercase tracking-[0.22em] text-brand-navy/70 dark:text-slate-200/80">{text.emailPhonePrompt}</p>

                  <div className="space-y-3">
                    <label htmlFor="profile-login-identity" className="sr-only">{text.loginEmailLabel}</label>
                    <input
                      id="profile-login-identity"
                      name="loginIdentity"
                      type="text"
                      className="w-full rounded-2xl border border-brand-navy/20 dark:border-white/20 bg-white dark:bg-white/10 px-4 py-3 text-base font-semibold text-brand-navy dark:text-white placeholder:text-brand-navy/45 dark:placeholder:text-slate-300/65 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
                      value={loginIdentity}
                      onChange={(event) => setLoginIdentity(event.target.value)}
                      placeholder={text.emailPhonePlaceholder}
                      autoComplete="email"
                    />
                    <label htmlFor="profile-login-pin" className="sr-only">{text.loginPinLabel}</label>
                    <input
                      id="profile-login-pin"
                      name="loginPin"
                      type="password"
                      className="w-full rounded-2xl border border-brand-navy/20 dark:border-white/20 bg-white dark:bg-white/10 px-4 py-3 text-base font-semibold text-brand-navy dark:text-white placeholder:text-brand-navy/45 dark:placeholder:text-slate-300/65 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
                      value={loginPin}
                      onChange={(event) => setLoginPin(event.target.value)}
                      placeholder={text.pinPlaceholder}
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full rounded-2xl border border-brand-orange/60 bg-brand-orange/20 dark:bg-brand-orange/15 px-4 py-3 text-base font-black uppercase tracking-wide text-brand-navy dark:text-white"
                    >
                      {authLoading ? text.verifying : text.portalLogin}
                    </button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-brand-orange/20 bg-brand-orange/8 px-4 py-3 text-left">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-orange">{text.loginTipTitle}</p>
                    <p className="mt-2 text-sm text-brand-navy/75 dark:text-slate-200/85">{text.loginTipBody}</p>
                  </div>

                  <p className="mt-4 text-center text-sm font-black uppercase tracking-[0.18em] text-brand-orange/85">{text.desktopOnly}</p>
                  <div className="mt-4 text-center">
                    <Link to="/apply" className="inline-flex rounded-xl border border-brand-orange/40 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-orange">
                      {text.requestAccessInstead}
                    </Link>
                  </div>

                  {state.message && (
                    <p role={state.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`mt-4 text-sm font-bold ${state.type === 'error' ? 'text-brand-orange' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {state.message}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      if (value) setProfilePhotoUrl(value);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      if (pinRotationRequired) {
        if (!/^\d{6}$/.test(nextMemberPin)) {
          throw new Error('A 6-digit replacement PIN is required before other profile changes.');
        }
        if (nextMemberPin !== confirmMemberPin) {
          throw new Error('PIN confirmation does not match.');
        }

        await rotateMemberPin({
          email: session.email,
          memberPin: nextMemberPin,
          actorEmail: session.email,
        });
      }

      await updateMemberProfile({
        email: session.email,
        full_name: fullName,
        phone,
        profile_photo_url: profilePhotoUrl,
        business_account_enabled: Boolean(businessAccountEnabled),
        business_name: businessName,
        research_focus: researchFocus,
        tax_id: taxId,
        shipping_address: shippingAddress,
        shipping_city: shippingCity,
        shipping_state: shippingState,
        shipping_zip: shippingZip,
        shipping_country: shippingCountry,
        business_shipping_address: businessShippingAddress,
        business_shipping_city: businessShippingCity,
        business_shipping_state: businessShippingState,
        business_shipping_zip: businessShippingZip,
        business_shipping_country: businessShippingCountry,
        use_business_shipping: Boolean(businessAccountEnabled && useBusinessShipping),
        preferred_payment_method: preferredPaymentMethod,
        email_notifications: Boolean(emailNotifications),
        internal_notes: '',
      });

      writeProfileSetupSkipped(session.email, false);
      setSetupSkipped(false);
      updateSessionProfile({ fullName, profilePhotoUrl, pinRotationRequired: false });
      setNextMemberPin('');
      setConfirmMemberPin('');
      if (isSetupMode) {
        navigate(redirectTarget || '/catalog', { replace: true });
        return;
      }
      setState({ type: 'success', message: pinRotationRequired ? 'PIN rotated and profile settings queued for update.' : 'Profile settings queued for update.' });
    } catch (error) {
      setState({ type: 'error', message: error?.message || 'Unable to update profile settings.' });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteSubmitting(true);
      await requestAccountDelete({ email: session.email, actorEmail: session.email });
      setShowDeleteConfirm(false);
      signOut();
      navigate('/', { replace: true });
    } catch (error) {
      setState({ type: 'error', message: error?.message || 'Unable to submit account deletion.' });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate('/', { replace: true });
  };

  const handleSkipSetup = () => {
    writeProfileSetupSkipped(session?.email || '', true);
    setSetupSkipped(true);
    navigate(redirectTarget || '/catalog', { replace: true });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0f] transition-colors duration-300">
      <section className="py-12 md:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
            <div className="lg:w-5/12 space-y-6">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-montserrat font-black text-brand-navy dark:text-white uppercase tracking-tight leading-tight">
                  {isSetupMode ? text.setupTitle : text.profileTitle} <span className="text-brand-orange block">{isSetupMode ? text.setupAccent : text.profileAccent}</span>
                </h1>
                <p className="text-lg text-brand-navy/70 dark:text-gray-400 font-medium leading-relaxed">
                  {isSetupMode ? text.setupSubtitle : text.profileSubtitle}
                </p>
              </div>

              <div className={`${sectionCardClass} flex flex-wrap items-center gap-2`}>
                <Link to="/catalog" className="rounded-xl border border-brand-navy/20 dark:border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-navy dark:text-gray-100">
                  {text.catalog}
                </Link>
                {isSetupMode ? (
                  <button type="button" onClick={() => navigate('/catalog')} className="rounded-xl border border-brand-orange/40 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-orange">
                    {text.skipForNow}
                  </button>
                ) : (
                  <button type="button" onClick={handleSignOut} className="rounded-xl border border-brand-orange/40 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-orange">
                    {text.signOut}
                  </button>
                )}
              </div>

              <div className={sectionCardClass}>
                <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">{text.accountSecurity}</p>
                <p className="mt-2 text-sm text-brand-navy/70 dark:text-gray-400">{text.accountSecurityBody}</p>
              </div>

              {state.message && (
                <p role={state.type === 'error' ? 'alert' : 'status'} aria-live="polite" className={`text-sm font-bold ${state.type === 'error' ? 'text-brand-orange' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {state.message}
                </p>
              )}
            </div>

            <div className="lg:w-7/12 w-full space-y-4">
              {profileLoading && (
                <div className={sectionCardClass}>
                  <p className="text-sm text-brand-navy/70 dark:text-gray-300">{text.loadingProfile}</p>
                </div>
              )}
              <div className={`${sectionCardClass} space-y-3`}>
          <h2 className="text-sm font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">{text.identity}</h2>
          <div className="rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-brand-navy/3 dark:bg-white/4 p-4">
            <div className="flex items-center gap-4">
              {currentProfilePhoto ? (
                <img src={currentProfilePhoto} alt="Profile preview" className="h-18 w-18 rounded-2xl object-cover border border-brand-orange/20 shadow-sm" />
              ) : (
                <div className="inline-flex h-18 w-18 items-center justify-center rounded-2xl bg-brand-orange/15 text-xl font-black text-brand-orange border border-brand-orange/20">
                  {profileInitial}
                </div>
              )}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">{text.profilePhotoPreviewTitle}</p>
                <p className="mt-1 text-sm text-brand-navy/70 dark:text-gray-400 leading-relaxed">{text.profilePhotoPreviewBody}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label htmlFor="profile-full-name" className="sr-only">{text.fullName}</label>
            <input id="profile-full-name" name="fullName" className={inputClass} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder={text.fullName} />
            <label htmlFor="profile-email" className="sr-only">{text.email}</label>
            <input id="profile-email" name="email" className={inputClass} value={session.email} disabled placeholder={text.email} />
            <label htmlFor="profile-phone" className="sr-only">{text.phone}</label>
            <input id="profile-phone" name="phone" className={inputClass} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={text.phone} />
            <label htmlFor="profile-photo-url" className="sr-only">{text.profilePhotoUrl}</label>
            <input id="profile-photo-url" name="profilePhotoUrl" className={`${inputClass} sm:col-span-2`} value={profilePhotoUrl} onChange={(event) => setProfilePhotoUrl(event.target.value)} placeholder={text.profilePhotoUrl} />
            <label htmlFor="profile-photo-file" className="sr-only">Upload profile photo</label>
            <input id="profile-photo-file" name="profilePhotoFile" type="file" accept="image/*" onChange={handlePhotoUpload} className={`${inputClass} sm:col-span-2 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-orange/10 file:px-3 file:py-1 file:text-xs file:font-black file:text-brand-orange`} />
          </div>

          {pinRotationRequired && (
            <div className="mt-3 rounded-xl border border-brand-orange/40 bg-brand-orange/5 p-3 space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-brand-orange">{text.pinRotationRequired}</p>
              <p className="text-xs text-brand-navy/70 dark:text-gray-300">{text.pinRotationBody}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label htmlFor="profile-next-member-pin" className="sr-only">{text.newPin}</label>
                <input
                  id="profile-next-member-pin"
                  name="nextMemberPin"
                  className={inputClass}
                  value={nextMemberPin}
                  onChange={(event) => setNextMemberPin(event.target.value)}
                  placeholder={text.newPin}
                  maxLength={6}
                />
                <label htmlFor="profile-confirm-member-pin" className="sr-only">{text.confirmPin}</label>
                <input
                  id="profile-confirm-member-pin"
                  name="confirmMemberPin"
                  className={inputClass}
                  value={confirmMemberPin}
                  onChange={(event) => setConfirmMemberPin(event.target.value)}
                  placeholder={text.confirmPin}
                  maxLength={6}
                />
              </div>
            </div>
          )}
      </div>

              <div className={`${sectionCardClass} space-y-3`}>
          <h2 className="text-sm font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">{text.logistics}</h2>
          <div className="rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-brand-navy/3 dark:bg-white/4 p-4">
            <label className="flex items-start justify-between gap-4 text-sm text-brand-navy dark:text-gray-200">
              <span className="min-w-0">
                <span className="block text-sm font-black uppercase tracking-widest text-brand-navy/75 dark:text-gray-100">{text.businessAccount}</span>
                <span className="mt-1 block text-xs text-brand-navy/60 dark:text-gray-400">{text.businessAccountBody}</span>
                <span className="mt-2 block text-[11px] font-bold uppercase tracking-widest text-brand-orange">
                  {businessAccountEnabled ? text.businessAccountOn : text.businessAccountOff}
                </span>
                <span className="mt-1 block text-xs text-brand-navy/60 dark:text-gray-400">
                  {businessAccountEnabled ? text.businessAccountHintOn : text.businessAccountHintOff}
                </span>
              </span>
              <input
                id="profile-business-account"
                name="businessAccountEnabled"
                type="checkbox"
                checked={businessAccountEnabled}
                onChange={(event) => setBusinessAccountEnabled(event.target.checked)}
                className="mt-1 h-5 w-5 rounded border-brand-navy/25 text-brand-orange focus:ring-brand-orange"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label htmlFor="profile-research-focus" className="sr-only">{text.researchFocus}</label>
            <input id="profile-research-focus" name="researchFocus" className={inputClass} value={researchFocus} onChange={(event) => setResearchFocus(event.target.value)} placeholder={text.researchFocus} />
            <label htmlFor="profile-payment-method" className="sr-only">{text.paymentMethod}</label>
            <select id="profile-payment-method" name="preferredPaymentMethod" className={inputClass} value={preferredPaymentMethod} onChange={(event) => setPreferredPaymentMethod(event.target.value)}>
              <option value="">{text.selectPaymentMethod}</option>
              <option value="BANK_WIRE">{text.paymentWire}</option>
              <option value="ACH">{text.paymentAch}</option>
              <option value="CARD">{text.paymentCard}</option>
              <option value="CRYPTO">{text.paymentCrypto}</option>
              <option value="MANUAL_INVOICE">{text.paymentInvoice}</option>
              <option value="OTHER">{text.paymentOther}</option>
            </select>
            <label htmlFor="profile-shipping-address" className="sr-only">{text.shippingAddress}</label>
            <input id="profile-shipping-address" name="shippingAddress" className={`${inputClass} sm:col-span-2`} value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} placeholder={text.shippingAddress} />
            <label htmlFor="profile-shipping-city" className="sr-only">{text.shippingCity}</label>
            <input id="profile-shipping-city" name="shippingCity" className={inputClass} value={shippingCity} onChange={(event) => setShippingCity(event.target.value)} placeholder={text.shippingCity} />
            <label htmlFor="profile-shipping-state" className="sr-only">{text.shippingState}</label>
            <input id="profile-shipping-state" name="shippingState" className={inputClass} value={shippingState} onChange={(event) => setShippingState(event.target.value)} placeholder={text.shippingState} />
            <label htmlFor="profile-shipping-zip" className="sr-only">{text.shippingZip}</label>
            <input id="profile-shipping-zip" name="shippingZip" className={inputClass} value={shippingZip} onChange={(event) => setShippingZip(event.target.value)} placeholder={text.shippingZip} />
            <label htmlFor="profile-shipping-country" className="sr-only">{text.shippingCountry}</label>
            <input id="profile-shipping-country" name="shippingCountry" className={inputClass} value={shippingCountry} onChange={(event) => setShippingCountry(event.target.value)} placeholder={text.shippingCountry} />
          </div>

          {businessAccountEnabled && (
            <div className="rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-brand-orange">{text.businessDetails}</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label htmlFor="profile-business-name" className="sr-only">{text.businessName}</label>
                <input id="profile-business-name" name="businessName" className={inputClass} value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder={text.businessName} />
                <label htmlFor="profile-tax-id" className="sr-only">{text.taxId}</label>
                <input id="profile-tax-id" name="taxId" className={inputClass} value={taxId} onChange={(event) => setTaxId(event.target.value)} placeholder={text.taxId} />
              </div>
              <label className="mt-4 inline-flex items-start gap-2 text-sm text-brand-navy dark:text-gray-200">
                <input
                  id="profile-use-business-shipping"
                  name="useBusinessShipping"
                  type="checkbox"
                  checked={useBusinessShipping}
                  onChange={(event) => setUseBusinessShipping(event.target.checked)}
                />
                <span>
                  {text.useBusinessShipping}
                  <span className="block text-xs text-brand-navy/60 dark:text-gray-400">{text.useBusinessShippingBody}</span>
                </span>
              </label>

              {useBusinessShipping && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label htmlFor="profile-business-shipping-address" className="sr-only">{text.businessShippingAddress}</label>
                  <input id="profile-business-shipping-address" name="businessShippingAddress" className={`${inputClass} sm:col-span-2`} value={businessShippingAddress} onChange={(event) => setBusinessShippingAddress(event.target.value)} placeholder={text.businessShippingAddress} />
                  <label htmlFor="profile-business-shipping-city" className="sr-only">{text.businessShippingCity}</label>
                  <input id="profile-business-shipping-city" name="businessShippingCity" className={inputClass} value={businessShippingCity} onChange={(event) => setBusinessShippingCity(event.target.value)} placeholder={text.businessShippingCity} />
                  <label htmlFor="profile-business-shipping-state" className="sr-only">{text.businessShippingState}</label>
                  <input id="profile-business-shipping-state" name="businessShippingState" className={inputClass} value={businessShippingState} onChange={(event) => setBusinessShippingState(event.target.value)} placeholder={text.businessShippingState} />
                  <label htmlFor="profile-business-shipping-zip" className="sr-only">{text.businessShippingZip}</label>
                  <input id="profile-business-shipping-zip" name="businessShippingZip" className={inputClass} value={businessShippingZip} onChange={(event) => setBusinessShippingZip(event.target.value)} placeholder={text.businessShippingZip} />
                  <label htmlFor="profile-business-shipping-country" className="sr-only">{text.businessShippingCountry}</label>
                  <input id="profile-business-shipping-country" name="businessShippingCountry" className={inputClass} value={businessShippingCountry} onChange={(event) => setBusinessShippingCountry(event.target.value)} placeholder={text.businessShippingCountry} />
                </div>
              )}
            </div>
          )}

          <label className="inline-flex items-center gap-2 text-sm text-brand-navy dark:text-gray-200">
            <input id="profile-email-notifications" name="emailNotifications" type="checkbox" checked={emailNotifications} onChange={(event) => setEmailNotifications(event.target.checked)} />
            {text.emailNotifications}
          </label>
              </div>

              {!isSetupMode && (
              <div className={`${sectionCardClass} space-y-3`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">{text.orders}</h2>
            <button
              type="button"
              onClick={() => navigate('/ledger')}
              className="rounded-lg border border-brand-orange/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-orange"
            >
              {text.openLedger}
            </button>
          </div>

          {recentOrdersState.loading ? (
            <p className="text-sm text-brand-navy/70 dark:text-gray-300">{text.loadingOrders}</p>
          ) : recentOrdersState.error ? (
            <p className="text-sm font-semibold text-brand-orange">{recentOrdersState.error}</p>
          ) : recentOrdersState.rows.length === 0 ? (
            <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 bg-brand-navy/3 dark:bg-white/3 px-4 py-3">
              <p className="text-sm font-semibold text-brand-navy/75 dark:text-gray-200">{text.noOrders}</p>
              <p className="text-xs text-brand-navy/60 dark:text-gray-400 mt-1">{text.noOrdersHint}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrdersState.rows.map((order) => {
                const shipping = parseShippingDataBlob(order.shipping_data);
                const isBusiness = String(shipping?.address_type || '').trim().toUpperCase() === 'BUSINESS';
                const shippingSummary = buildShippingSummary(shipping);
                const ShippingIcon = isBusiness ? Building2 : Home;

                return (
                  <div key={`${order.order_id || 'no-id'}-${order.timestamp || 'no-time'}`} className="rounded-xl border border-brand-navy/15 dark:border-white/10 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-black tracking-wide text-brand-navy dark:text-gray-100">{order.order_id || text.orderPendingId}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${isBusiness ? 'border-brand-orange/30 bg-brand-orange/10 text-brand-orange' : 'border-brand-navy/20 dark:border-white/15 bg-brand-navy/5 dark:bg-white/5 text-brand-navy dark:text-gray-200'}`}>
                          <ShippingIcon size={12} />
                          {isBusiness ? text.businessAccountLabel : text.personalAccountLabel}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-orange">{order.status || text.pending}</span>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-brand-navy/70 dark:text-gray-300">
                      {order.timestamp ? new Date(order.timestamp).toLocaleString() : text.timestampPending} | ${Number(order.total_amount || 0).toFixed(2)}
                    </p>
                    <div className="mt-2 rounded-xl border border-brand-navy/10 dark:border-white/10 bg-brand-navy/3 dark:bg-white/3 px-3 py-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-orange">{text.shippingTo}</p>
                      <div className="mt-1 flex items-start gap-2">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-brand-orange" />
                        <p className="text-xs text-brand-navy/75 dark:text-gray-300">
                          {shippingSummary || text.noShippingSnapshot}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
              </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleSave} className="rounded-xl bg-brand-orange px-4 py-2 text-xs font-black uppercase tracking-widest text-white">{isSetupMode ? text.continueToPortal : text.saveProfile}</button>
                {isSetupMode ? (
                  <button type="button" onClick={handleSkipSetup} className="rounded-xl border border-brand-orange/40 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-orange">{text.skipForNow}</button>
                ) : (
                  <button type="button" onClick={() => setShowDeleteConfirm(true)} className="rounded-xl border border-brand-orange/40 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-orange">{text.deleteAccount}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-brand-navy/45 px-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-brand-orange/20 bg-white p-6 shadow-2xl dark:border-brand-orange/25 dark:bg-[#111827]">
            <p className="text-xs font-black uppercase tracking-widest text-brand-orange">{text.deleteAccount}</p>
            <h2 className="mt-3 text-2xl font-black text-brand-navy dark:text-white">{text.deleteConfirmTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-brand-navy/75 dark:text-gray-300">{text.deleteConfirmBody}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteSubmitting}
                className="rounded-xl border border-brand-navy/20 dark:border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-navy dark:text-gray-100 disabled:opacity-60"
              >
                {text.deleteConfirmNo}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteSubmitting}
                className="rounded-xl bg-brand-orange px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60"
              >
                {deleteSubmitting ? 'Processing...' : text.deleteConfirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileSettingsPage;



import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Sun, Moon, Search, Users, ShoppingCart, ChevronLeft, ChevronRight, Accessibility, ShieldCheck, Menu, X } from 'lucide-react';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthProvider';
import { useAccessibility } from './context/AccessibilityContext';
import { useStoreDebugMode } from './debug/masterDebug';
import HomePage from './pages/HomePage';
import ComingSoonPage from './pages/ComingSoonPage';
import ApplyPage from './pages/ApplyPage';
import SupportPage from './pages/SupportPage';
import AboutPage from './pages/AboutPage';
import MissionPage from './pages/MissionPage';
import TermsPage from './pages/TermsPage';
import PaymentPolicyPage from './pages/PaymentPolicyPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import ShippingPolicyPage from './pages/ShippingPolicyPage';
import RefundPolicyPage from './pages/RefundPolicyPage';
import ContactPage from './pages/ContactPage';
import PreorderPage from './pages/PreorderPage';
import OwnerPage from './pages/OwnerPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import DocumentsPage from './pages/DocumentsPage';
import VerifyPage from './pages/VerifyPage';
import CoaLibraryPage from './pages/CoaLibraryPage';
import QuickAccessibilityPanel from './components/QuickAccessibilityPanel';
import AppParticleBackground from './components/AppParticleBackground';
import { fetchSiteLayout, fetchAssets, getLocalOwnerSettings, getAssetUrl, getSiteLayoutValue } from './services/orderService';
import { toEmbeddableGoogleDriveUrl } from './utils/driveLinks';
 
// Print Center surfaces removed per PEPTQ separation directives

/* PEPTQ application shell */

const BETA_MODE = import.meta.env.VITE_BETA_MODE === 'true';
const MASTER_GATE_STORAGE_KEY = 'peptq_master_gate_unlocked';
const SIDEBAR_COLLAPSE_STORAGE_KEY = 'peptq_sidebar_collapsed_v1';
const GOOGLE_TRANSLATE_RESET_PARAM = 'gt_reset';
const VERIFIED_WELCOME_STORAGE_KEY = 'peptq_verified_seen';
const SHOULD_USE_GOVERNANCE_MOCK = true;
const GOVERNANCE_MOCK_ACTIVE = import.meta.env.VITE_GOVERNANCE_MOCK_ACTIVE !== 'false';
const GOOGLE_TRANSLATE_ENABLED = import.meta.env.VITE_ENABLE_GOOGLE_TRANSLATE === 'true' || import.meta.env.PROD;

const navItems = [
  { to: '/catalog', label: 'Catalog' },
  { to: '/coa', label: 'COA' },
  { to: '/about', label: 'About' },
  { to: '/mission', label: 'Mission' },
  { to: '/payment-policy', label: 'Payment & Ordering' },
  { to: '/terms', label: 'Terms & Conditions' },
];

// Beta build nav: no owner/member/login surfaces; keep catalog/apply/support/info.
const betaNavItems = [
  { to: '/apply', label: 'Catalog' }, // Catalog goes straight to apply flow in beta
  { to: '/preorder', label: 'Pre-Order' },
  { to: '/coa', label: 'COA' },
  { to: '/about', label: 'About' },
  { to: '/mission', label: 'Mission' },
  { to: '/payment-policy', label: 'Payment & Ordering' },
  { to: '/terms', label: 'Terms & Conditions' },
];

const ownerNavItems = [
  { to: '/owner?module=system&tab=guides', label: 'Operator Guides' },
  { to: '/owner?module=growth&tab=members', label: 'Members' },
  { to: '/owner?module=ops&tab=processing', label: 'Orders' },
  { to: '/owner?module=growth&tab=waitlist', label: 'New Members' },
  { to: '/owner?module=system&tab=editor', label: 'System Settings' },
  { to: '/owner?module=registry&tab=catalog', label: 'Catalog Manager' },
  { to: '/owner?module=ops&tab=discounts', label: 'Discounts' },
  { to: '/owner?module=system&tab=notes', label: 'Need Help Form' },
];

const SHELL_TRANSLATIONS = {
  es: {
    'Catalog': 'Catalogo',
    'COA': 'COA',
    'Search': 'Buscar',
    'Menu': 'Menu',
    'Verify': 'Verificar',
    'About': 'Acerca de',
    'Mission': 'Mision',
    'Payment & Ordering': 'Pago y Pedidos',
    'Privacy Policy': 'Politica de Privacidad',
    'Shipping Policy': 'Politica de Envio',
    'Refund Policy': 'Politica de Reembolso',
    'Contact': 'Contacto',
    'Operator Guides': 'Guias Operativas',
    'Members': 'Miembros',
    'Orders': 'Pedidos',
    'Access': 'Acceso',
    'New Members': 'Nuevos Miembros',
    'System Settings': 'Configuracion del Sistema',
    'Discounts': 'Descuentos',
    'Need Help Form': 'Formulario de Ayuda',
    'Support': 'Soporte',
    'Procurement Ledger': 'Registro de Compras',
    'My Documents': 'Mis Documentos',
    'Print Center': 'Centro de Impresion',
    'Catalog Manager': 'Gestor de Catalogo',
    'Owner': 'Propietario',
    'Terms & Conditions': 'Terminos y Condiciones',
    'Payment Policy': 'Politica de Pago',
  },
};

const localizeShellLabel = (label, language = 'en') => {
  if (language !== 'es') return label;
  return SHELL_TRANSLATIONS.es?.[label] || label;
};

const hideGoogleTranslateChrome = () => {
  if (typeof document === 'undefined') return;

  document.documentElement.style.top = '0px';
  document.documentElement.style.marginTop = '0px';
  document.body.style.top = '0px';
  document.body.style.position = 'static';
  document.body.style.marginTop = '0px';

  const selectors = [
    '.goog-te-banner-frame',
    '.goog-te-balloon-frame',
    '.VIpgJd-ZVi9od-ORHb',
    '.VIpgJd-ZVi9od-aZ2wEe-wOHMyf',
    '#goog-gt-tt',
    '.goog-tooltip',
    '.goog-text-highlight',
    '[aria-label="Good translation"]',
    '[aria-label="Poor translation"]',
    'iframe.goog-te-banner-frame',
    'iframe[src*="translate.google"]',
    'iframe[src*="translate.googleapis"]',
    'iframe[src*="translate.goog"]',
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.style.display = 'none';
      node.style.visibility = 'hidden';
      if (selector === '.goog-text-highlight') {
        node.style.backgroundColor = 'transparent';
        node.style.boxShadow = 'none';
      }
    });
  });
};

const setGoogleTranslateCookie = (lang) => {
  if (typeof document === 'undefined') return;
  const cookieValue = lang === 'es' ? '/en/es' : '/en/en';
  document.cookie = `googtrans=${cookieValue}; path=/; max-age=31536000`;
};

const clearGoogleTranslateCookie = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
  const host = window.location.hostname;
  const domains = [host, `.${host}`].filter(Boolean);

  document.cookie = `googtrans=; expires=${expires}; path=/`;
  domains.forEach((domain) => {
    document.cookie = `googtrans=; expires=${expires}; path=/; domain=${domain}`;
  });
};

const quickSetGoogleLanguage = (lang) => {
  if (typeof document === 'undefined') return;

  if (lang === 'en') {
    clearGoogleTranslateCookie();
    hideGoogleTranslateChrome();

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete(GOOGLE_TRANSLATE_RESET_PARAM);
      window.history.replaceState(window.history.state, '', url.toString());
    }

    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
      const nextValue = Array.from(combo.options || []).some((option) => option.value === 'en') ? 'en' : '';
      combo.value = nextValue;
      combo.dispatchEvent(new Event('change'));
    }

    window.setTimeout(hideGoogleTranslateChrome, 50);
    window.setTimeout(hideGoogleTranslateChrome, 250);
    window.setTimeout(hideGoogleTranslateChrome, 750);
    return;
  }

  setGoogleTranslateCookie(lang);

  const combo = document.querySelector('.goog-te-combo');
  if (combo) {
    combo.value = lang;
    combo.dispatchEvent(new Event('change'));
  }

  window.setTimeout(hideGoogleTranslateChrome, 50);
  window.setTimeout(hideGoogleTranslateChrome, 250);
  window.setTimeout(hideGoogleTranslateChrome, 750);
};

function CoaLotRedirect() {
  const { lotId } = useParams();
  if (!lotId) return <Navigate to="/coa" replace />;
  return <Navigate to={`/verify/${lotId}`} replace />;
}
function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(max-width: 1024px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const update = () => setIsMobile(mediaQuery.matches);

    update();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);
      window.addEventListener('orientationchange', update);
      return () => {
        mediaQuery.removeEventListener('change', update);
        window.removeEventListener('orientationchange', update);
      };
    }

    mediaQuery.addListener(update);
    window.addEventListener('orientationchange', update);
    return () => {
      mediaQuery.removeListener(update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return isMobile;
}

const isGovernancePermissionDenied = (errorLike) => {
  if (!errorLike) return false;

  const code = String(errorLike?.code || '').toLowerCase();
  const message = String(errorLike?.message || errorLike || '').toLowerCase();

  const hasPermissionDeniedCode = code.includes('permission-denied');
  const hasFirestoreHint = code.includes('firestore')
    || message.includes('firestore')
    || message.includes('insufficient permissions')
    || message.includes('missing or insufficient permissions');

  return hasPermissionDeniedCode || (message.includes('permission-denied') && hasFirestoreHint);
};

const isKnownExtensionNoise = (errorLike) => {
  if (!errorLike) return false;

  const message = String(errorLike?.message || errorLike || '').toLowerCase();
  const stack = String(errorLike?.stack || '').toLowerCase();

  return (
    message.includes('failed to connect to metamask')
    || message.includes('metamask extension not found')
    || message.includes('could not establish connection. receiving end does not exist')
    || message.includes('unchecked runtime.lasterror')
    || message.includes('inpage.js')
    || stack.includes('inpage.js')
    || message.includes('chrome-extension://')
  );
};

function GovernanceSuspendedOverlay() {
  return (
    <div className="fixed inset-0 z-9999 bg-[#09090d] text-red-300 flex items-center justify-center px-6">
      <div className="w-full max-w-3xl rounded-2xl border border-red-500/45 bg-black/85 shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_0_42px_rgba(220,38,38,0.25)] p-6 sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.24em] font-black text-red-400">Technical Governance</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-red-200">Service Status: Suspended</h1>
        <p className="mt-4 text-sm sm:text-base leading-relaxed text-red-100/90">
          Access to this module has been suspended by governance policy. Contact the site owner for status verification.
        </p>

        <div className="mt-6 rounded-xl border border-red-500/30 bg-[#0f0f14] px-4 py-3 font-mono text-xs text-red-300/90">
          <p className="uppercase tracking-[0.16em] text-red-400/90">System Banner</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="uppercase tracking-[0.2em] font-bold text-red-300">System Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifiedWelcomeModal({ isOpen = false, onClose = () => {}, language = 'en' }) {
  if (!isOpen) return null;

  const es = language === 'es';

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-[#05070d]/55 backdrop-blur-md px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verified-welcome-title"
        className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#0f1726]/86 p-6 sm:p-7 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">
          <ShieldCheck size={14} className="animate-pulse" />
          {es ? 'Acceso Autenticado' : 'Access Authenticated'}
        </div>
        <h2 id="verified-welcome-title" className="mt-4 text-3xl font-black tracking-tight text-white">
          {es ? 'Identidad Verificada' : 'Identity Verified'}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-slate-200/88">
          {es
            ? 'Bienvenido de nuevo. Tu sesion ya tiene acceso a la biblioteca HPLC, hojas tecnicas COA y precios por nivel para esta sesion.'
            : 'Welcome back. Your session now has access to the HPLC-standard registry, technical COA sheets, and tiered pricing for this session.'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-brand-orange px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#e06d00]"
        >
          {es ? 'Entrar al Catalogo' : 'Enter Catalog'}
        </button>
      </div>
    </div>
  );
}

function Sidebar({
  navItemsList,
  showNotice = true,
  isCollapsed = false,
  onToggleCollapse = () => {},
  isAuthenticated = false,
  session = null,
  onPortalAccess = () => {},
  supportHref = 'mailto:support@peptq.com',
  supportExternal = false,
  lightLogo = '/logo.svg',
  darkLogo = '/logo.svg',
}) {
  const { theme, toggleTheme } = useTheme();
  const { language = 'en', setLanguage } = useAccessibility();
  const avatar = String(session?.googlePhotoUrl || session?.profilePhotoUrl || '').trim();
  const displayName = String(session?.fullName || session?.email || 'Login').trim();
  const initials = (String(displayName || 'U')[0] || 'U').toUpperCase();

  const quickSetLanguage = (lang) => {
    setLanguage(lang);
    try {
      if (GOOGLE_TRANSLATE_ENABLED) {
        quickSetGoogleLanguage(lang);
      }
    } catch {
      // noop
    }
  };

  return (
    <aside
      className={`hidden lg:flex shrink-0 bg-white dark:bg-[#0a0a0f] sticky top-0 h-screen transition-all duration-300 overflow-hidden ${isCollapsed ? 'lg:w-0 border-r-0 -translate-x-full pointer-events-none' : 'lg:w-64 xl:w-72 border-r border-brand-navy/10 dark:border-white/10 translate-x-0'}`}
      aria-hidden={isCollapsed}
    >
      <div className="w-full px-6 py-8 flex flex-col">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute top-6 -right-4 z-20 h-8 w-8 rounded-full border border-brand-navy/20 dark:border-white/20 bg-white dark:bg-[#111827] text-brand-navy dark:text-gray-100 shadow-md hover:text-brand-orange transition-colors"
          aria-label="Collapse side menu"
          title="Collapse side menu"
        >
          <ChevronLeft size={16} className="mx-auto" />
        </button>

        <div className="mb-10 grid grid-cols-[40px_1fr_40px] items-center">
          <button
            onClick={toggleTheme}
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-brand-navy/20 dark:border-white/20 bg-white dark:bg-white/5 hover:bg-brand-navy dark:hover:bg-brand-orange hover:text-white transition text-brand-navy dark:text-gray-200"
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <Link to="/" className="justify-self-center">
            <img
              src={theme === 'dark' ? darkLogo : lightLogo}
              alt="PEPTQ logo"
              className="h-10 w-auto"
            />
          </Link>

          <span aria-hidden="true" className="h-10 w-10" />
        </div>

        {!BETA_MODE && (
          <Link
            to="/profile"
            className="mb-6 flex items-center gap-2.5 rounded-xl border border-brand-navy/15 dark:border-white/10 bg-white/70 dark:bg-white/5 px-2.5 py-2 hover:border-brand-orange/35 transition-colors"
            aria-label="Open profile"
          >
            {avatar ? (
              <img src={avatar} alt="Profile avatar" className="h-7 w-7 shrink-0 rounded-full object-cover border border-brand-orange/20" aria-hidden="true" />
            ) : (
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-[10px] font-black text-brand-orange" aria-hidden="true">
                {initials}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-black text-brand-navy dark:text-gray-100 leading-tight">
                {isAuthenticated ? displayName : 'Login'}
              </span>
            </span>
          </Link>
        )}

        <nav className="flex flex-col gap-2">
          {navItemsList.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-montserrat font-bold transition-colors ${
                  isActive
                    ? 'bg-brand-orange/10 text-brand-orange'
                    : 'text-brand-navy dark:text-gray-200 hover:text-brand-orange dark:hover:text-brand-orange hover:bg-brand-navy/5 dark:hover:bg-white/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Global language assist (Google Translate) */}
        <div className="mt-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-navy/55 dark:text-white/55 mb-1">
            Language Assist
          </p>
          <div
            id="google_translate_element_sidebar"
            aria-hidden="true"
            className="absolute opacity-0 pointer-events-none h-0 w-0 overflow-hidden"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => quickSetLanguage('en')}
              aria-pressed={language === 'en'}
              className={`flex-1 rounded-lg border text-xs font-bold py-1 transition-colors ${
                language === 'en'
                  ? 'border-brand-navy/35 dark:border-white/30 bg-brand-navy text-white dark:bg-white dark:text-brand-navy'
                  : 'border-brand-navy/15 dark:border-white/20 bg-white dark:bg-white/10 text-brand-navy dark:text-gray-100'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => quickSetLanguage('es')}
              aria-pressed={language === 'es'}
              className={`flex-1 rounded-lg border text-xs font-bold py-1 transition-colors ${
                language === 'es'
                  ? 'border-brand-orange bg-brand-orange text-white'
                  : 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange'
              }`}
            >
              Espanol
            </button>
          </div>
          <style>{`
            /* Trim the default Google badge and spacing */
            #google_translate_element_sidebar .goog-logo-link,
            #google_translate_element_sidebar .goog-te-gadget span {
              display: none !important;
            }
            #google_translate_element_sidebar .goog-te-gadget {
              font-size: 12px !important;
              color: inherit !important;
              padding: 0 !important;
            }
            #google_translate_element_sidebar .goog-te-combo {
              border-radius: 10px;
              border: 1px solid rgba(31, 58, 95, 0.15);
              padding: 6px 8px;
              width: 100%;
              background: white;
              color: #1f3a5f;
            }
          `}</style>
        </div>

        {showNotice ? (
          <div className="mt-8 rounded-xl border border-brand-navy/10 dark:border-white/10 bg-brand-orange/5 dark:bg-white/5 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-orange mb-1">
              Notice
            </p>
            <p className="text-[11px] leading-relaxed text-brand-navy/75 dark:text-gray-300 font-semibold">
              All materials are intended for laboratory research use only.
            </p>
            {supportExternal ? (
              <a
                href={supportHref}
                className="mt-3 inline-block text-xs font-bold text-brand-navy/70 dark:text-gray-300 underline underline-offset-2 hover:text-brand-orange"
              >
                Contact Us
              </a>
            ) : (
              <Link
                to={supportHref}
                className="mt-3 inline-block text-xs font-bold text-brand-navy/70 dark:text-gray-300 underline underline-offset-2 hover:text-brand-orange"
              >
                Contact Us
              </Link>
            )}
            {!isAuthenticated && !BETA_MODE && (
              <button
                type="button"
                onClick={onPortalAccess}
                className="mt-3 inline-flex items-center justify-center rounded-lg bg-brand-orange px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-[#e06d00]"
              >
                PORTAL
              </button>
            )}
          </div>
        ) : null}

        {BETA_MODE && (
          <div className="mt-4 text-[13px] font-black text-brand-navy/60 dark:text-gray-400">
            VERIFY BUILD
          </div>
        )}

      </div>
    </aside>
  );
}

function MobileMenuDrawer({
  isOpen = false,
  onClose = () => {},
  navItemsList,
  showNotice = true,
  isAuthenticated = false,
  session = null,
  onPortalAccess = () => {},
  supportHref = 'mailto:support@peptq.com',
  supportExternal = false,
  lightLogo = '/logo.svg',
  darkLogo = '/logo.svg',
}) {
  const { theme, toggleTheme } = useTheme();
  const { language = 'en', setLanguage } = useAccessibility();
  const avatar = String(session?.googlePhotoUrl || session?.profilePhotoUrl || '').trim();
  const displayName = String(session?.fullName || session?.email || 'Login').trim();
  const initials = (String(displayName || 'U')[0] || 'U').toUpperCase();

  const quickSetLanguage = (lang) => {
    setLanguage(lang);
    try {
      if (GOOGLE_TRANSLATE_ENABLED) {
        quickSetGoogleLanguage(lang);
      }
    } catch {
      // noop
    }
  };

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-60 bg-[#05070d]/45 backdrop-blur-sm" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
        onClick={(event) => event.stopPropagation()}
        className="h-full w-[min(20rem,86vw)] overflow-y-auto border-r border-brand-navy/10 dark:border-white/10 bg-white dark:bg-[#0a0a0f] px-5 py-6 shadow-2xl"
      >
        <div className="mb-8 grid grid-cols-[40px_1fr_40px] items-center">
          <button
            onClick={toggleTheme}
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-brand-navy/20 dark:border-white/20 bg-white dark:bg-white/5 hover:bg-brand-navy dark:hover:bg-brand-orange hover:text-white transition text-brand-navy dark:text-gray-200"
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <Link to="/" onClick={onClose} className="justify-self-center">
            <img
              src={theme === 'dark' ? darkLogo : lightLogo}
              alt="PEPTQ logo"
              className="h-10 w-auto"
            />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-brand-navy/20 dark:border-white/20 bg-white dark:bg-white/5 text-brand-navy dark:text-gray-200 hover:text-brand-orange transition-colors"
            aria-label="Close menu"
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {!BETA_MODE && (
          <Link
            to="/profile"
            onClick={() => {
              onClose();
              onPortalAccess();
            }}
            className="mb-6 flex items-center gap-2.5 rounded-xl border border-brand-navy/15 dark:border-white/10 bg-white/70 dark:bg-white/5 px-2.5 py-2 hover:border-brand-orange/35 transition-colors"
            aria-label="Open profile"
          >
            {avatar ? (
              <img src={avatar} alt="Profile avatar" className="h-7 w-7 shrink-0 rounded-full object-cover border border-brand-orange/20" aria-hidden="true" />
            ) : (
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-[10px] font-black text-brand-orange" aria-hidden="true">
                {initials}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-black text-brand-navy dark:text-gray-100 leading-tight">
                {isAuthenticated ? displayName : 'Login'}
              </span>
            </span>
          </Link>
        )}

        {BETA_MODE && (
          <div className="mb-6">
            <div className="h-11 w-11 inline-flex items-center justify-center rounded-full border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-white/5 text-[10px] font-black text-brand-orange">
              VERIFY
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-2">
          {(navItemsList || []).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-montserrat font-bold transition-colors ${
                  isActive
                    ? 'bg-brand-orange/10 text-brand-orange'
                    : 'text-brand-navy dark:text-gray-200 hover:text-brand-orange dark:hover:text-brand-orange hover:bg-brand-navy/5 dark:hover:bg-white/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-navy/55 dark:text-white/55 mb-1">
            Language Assist
          </p>
          <div
            id="google_translate_element_mobile"
            aria-hidden="true"
            className="absolute opacity-0 pointer-events-none h-0 w-0 overflow-hidden"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => quickSetLanguage('en')}
              aria-pressed={language === 'en'}
              className={`flex-1 rounded-lg border text-xs font-bold py-1 transition-colors ${
                language === 'en'
                  ? 'border-brand-navy/35 dark:border-white/30 bg-brand-navy text-white dark:bg-white dark:text-brand-navy'
                  : 'border-brand-navy/15 dark:border-white/20 bg-white dark:bg-white/10 text-brand-navy dark:text-gray-100'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => quickSetLanguage('es')}
              aria-pressed={language === 'es'}
              className={`flex-1 rounded-lg border text-xs font-bold py-1 transition-colors ${
                language === 'es'
                  ? 'border-brand-orange bg-brand-orange text-white'
                  : 'border-brand-orange/40 bg-brand-orange/10 text-brand-orange'
              }`}
            >
              Espanol
            </button>
          </div>
        </div>

        {showNotice ? (
          <div className="mt-8 rounded-xl border border-brand-navy/10 dark:border-white/10 bg-brand-orange/5 dark:bg-white/5 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-orange mb-1">
              Notice
            </p>
            <p className="text-[11px] leading-relaxed text-brand-navy/75 dark:text-gray-300 font-semibold">
              All materials are intended for laboratory research use only.
            </p>
            {supportExternal ? (
              <a
                href={supportHref}
                className="mt-3 inline-block text-xs font-bold text-brand-navy/70 dark:text-gray-300 underline underline-offset-2 hover:text-brand-orange"
              >
                Contact Us
              </a>
            ) : (
              <Link
                to={supportHref}
                onClick={onClose}
                className="mt-3 inline-block text-xs font-bold text-brand-navy/70 dark:text-gray-300 underline underline-offset-2 hover:text-brand-orange"
              >
                Contact Us
              </Link>
            )}
            {!isAuthenticated && !BETA_MODE && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPortalAccess();
                }}
                className="mt-3 inline-flex items-center justify-center rounded-lg bg-brand-orange px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-[#e06d00]"
              >
                PORTAL
              </button>
            )}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function MobileTopNav({ lightLogo = '/logo.svg', darkLogo = '/logo.svg' }) {
  const { theme, toggleTheme } = useTheme();
  const { session, role, isAuthenticated } = useAuth();
  const avatar = String(session?.googlePhotoUrl || session?.profilePhotoUrl || '').trim();
  const displayName = String(session?.fullName || session?.email || 'Profile').trim();
  const initials = (String(displayName || 'U')[0] || 'U').toUpperCase();

  return (
    <div className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-[#0a0a0f]/95 backdrop-blur border-b border-brand-navy/10 dark:border-white/10">
      <div className="px-4 pt-3 pb-2">
        <div className="grid grid-cols-[44px_1fr_44px] items-center">
          {BETA_MODE ? (
            <div className="h-11 w-11 inline-flex items-center justify-center rounded-full border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-white/5 text-[10px] font-black text-brand-orange">
              VERIFY
            </div>
          ) : (
            <Link
              to="/profile"
              className="h-11 w-11 inline-flex items-center justify-center rounded-full border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-white/5"
              aria-label="Open profile"
            >
              {avatar ? (
                <img src={avatar} alt="Profile avatar" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <span className="text-[11px] font-black text-brand-orange">{initials}</span>
              )}
            </Link>
          )}

          <Link to="/" className="justify-self-center">
            <img
              src={theme === 'dark' ? darkLogo : lightLogo}
              alt="PEPTQ logo"
              className="h-8 w-auto"
            />
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-brand-navy/20 dark:border-white/20 bg-white dark:bg-white/5 hover:bg-brand-navy dark:hover:bg-brand-orange hover:text-white transition text-brand-navy dark:text-gray-200 justify-self-end"
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        {!BETA_MODE && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              {isAuthenticated ? (
                <>
                  <p className="text-xs font-black text-brand-navy dark:text-white truncate">{displayName}</p>
                  <p className="text-[10px] uppercase tracking-widest text-brand-navy/55 dark:text-white/55 font-black">{role}</p>
                </>
              ) : (
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-navy/55 dark:text-white/55">Login</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileBottomNav({ role, isApprovedRole = false, onPrimaryPress = () => {}, isPrimaryPanelOpen = false, catalogTarget = '/catalog' }) {
  const location = useLocation();
  const { language = 'en' } = useAccessibility();
  const isOwnerRole = role === 'OWNER';
  const currentTab = new URLSearchParams(location.search).get('tab');

  const isLinkActive = (item) => {
    if (item.kind === 'action') {
      return isPrimaryPanelOpen;
    }

    const { to } = item;
    if (to.startsWith('/owner?tab=')) {
      const tab = to.split('tab=')[1] || '';
      return location.pathname === '/owner' && currentTab === tab;
    }

    if (to === '/coa') {
      return location.pathname === '/coa'
        || location.pathname.startsWith('/coa/')
        || location.pathname.startsWith('/verify/');
    }

    return location.pathname === to;
  };

  const primaryLink = BETA_MODE
    ? { kind: 'action', label: 'Menu', Icon: Menu }
    : { kind: 'action', label: 'Search', Icon: Search };
  const betaHomeLink = { to: '/coa', label: 'Verify', Icon: ShieldCheck };

  const links = BETA_MODE
    ? [
      betaHomeLink,
      primaryLink,
      { to: '/apply', label: 'Access', Icon: ShoppingCart },
      { to: catalogTarget, label: 'Catalog', Icon: Users },
    ]
    : (isOwnerRole
      ? [
        primaryLink,
        { to: '/owner?tab=fulfillment', label: 'Orders', Icon: ShoppingCart },
        { to: '/owner?tab=membership', label: 'Members', Icon: Users },
      ]
      : [
        primaryLink,
        { to: isApprovedRole ? '/ledger' : '/apply', label: isApprovedRole ? 'Orders' : 'Access', Icon: ShoppingCart },
        { to: catalogTarget, label: 'Catalog', Icon: Users },
      ]);

  const localizedLinks = links.map((link) => ({
    ...link,
    label: localizeShellLabel(link.label, language),
  }));

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-brand-navy/10 dark:border-white/10 bg-white/95 dark:bg-[#0a0a0f]/95 backdrop-blur pb-safe">
      <div className={`px-2 py-2 grid ${BETA_MODE ? 'grid-cols-4' : 'grid-cols-3'} gap-1`}>
        {localizedLinks.map((item) => {
          if (item.kind === 'action') {
            const ActionIcon = item.Icon || Search;
            return (
              <button
                key={`action-${item.label}`}
                type="button"
                onClick={onPrimaryPress}
                className={`min-h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-black uppercase tracking-wide transition-colors ${isLinkActive(item) ? 'text-brand-orange bg-brand-orange/10' : 'text-brand-navy/70 dark:text-gray-300 hover:text-brand-orange'}`}
              >
                <ActionIcon size={16} />
                <span>{item.label}</span>
              </button>
            );
          }

          const LinkIcon = item.Icon || Users;
          return (
            <Link
              key={`${item.to}-${item.label}`}
              to={item.to}
              className={`min-h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-black uppercase tracking-wide transition-colors ${isLinkActive(item) ? 'text-brand-orange bg-brand-orange/10' : 'text-brand-navy/70 dark:text-gray-300 hover:text-brand-orange'}`}
            >
              <LinkIcon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Disclaimer({
  showNotice = true,
  isMobile = false,
  language = 'en',
  lightLogo = '/logo.svg',
  darkLogo = '/logo.svg',
}) {
  const footerTermsLabel = localizeShellLabel('Terms & Conditions', language);
  const footerPrivacyLabel = localizeShellLabel('Privacy Policy', language);
  const footerShippingLabel = localizeShellLabel('Shipping Policy', language);
  const footerRefundLabel = localizeShellLabel('Refund Policy', language);
  const footerPaymentLabel = localizeShellLabel('Payment & Ordering', language);
  const footerContactLabel = localizeShellLabel('Contact', language);
  const researchUseDisclaimer = language === 'es'
    ? 'Todos los productos estan destinados estrictamente para fines de investigacion en laboratorio. Los productos no son para uso humano ni veterinario y no estan destinados a diagnosticar, tratar, curar o prevenir ninguna enfermedad. Al acceder a este sitio o comprar de PEPTQ, reconoces y aceptas que los materiales se usaran unicamente en cumplimiento con las regulaciones de investigacion aplicables.'
    : 'All products are intended strictly for laboratory research purposes only. Products are not for human or veterinary use and are not intended to diagnose, treat, cure, or prevent any disease. By accessing this site or purchasing from PEPTQ, you acknowledge and agree that materials will be used solely in compliance with applicable research regulations.';
  const [isA11yPanelOpen, setIsA11yPanelOpen] = useState(false);

  return (
    <>
      {showNotice ? (
        <footer className="bg-white dark:bg-[#080b15] text-brand-navy dark:text-white py-12 mt-16 transition-colors duration-300">
          <div className="max-w-6xl mx-auto px-6">
            {showNotice && isMobile && (
              <div className="rounded-peptrx border border-brand-navy/10 dark:border-white/10 bg-white dark:bg-white/5 px-6 py-5 text-center mb-8 transition-colors duration-300">
                <p className="text-xs leading-relaxed text-brand-navy/80 dark:text-white/80 font-medium max-w-4xl mx-auto mb-4">
                  <strong className="text-brand-navy dark:text-white">{language === 'es' ? 'Aviso de Uso Solo en Investigacion.' : 'Research Use Only Disclaimer.'}</strong>
                  <br />
                  {researchUseDisclaimer}
                </p>
              </div>
            )}
            <div className="text-center border-t border-brand-navy/10 dark:border-white/10 pt-8 transition-colors duration-300">
              <div className="mb-3 flex justify-center">
                <img src={lightLogo} alt="PEPTQ" className="h-8 w-auto dark:hidden" />
                <img src={darkLogo} alt="PEPTQ" className="hidden h-8 w-auto dark:block" />
              </div>
              <p className="font-montserrat font-bold mb-2">PEPTQ Research Portal</p>
              {!isMobile && (
                <p className="text-brand-navy/60 dark:text-white/60 text-xs leading-relaxed max-w-4xl mx-auto mb-4">
                  {researchUseDisclaimer}
                </p>
              )}
              <p className="text-brand-navy/60 dark:text-white/60 text-sm mb-4">
                {language === 'es'
                  ? 'Copyright 2026 PEPTQ. Todos los derechos reservados.'
                  : 'Copyright 2026 PEPTQ. All rights reserved.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-brand-navy/40 dark:text-white/40">
                <Link to="/terms" className="hover:text-brand-orange dark:hover:text-brand-orange transition">{footerTermsLabel}</Link>
                <span>|</span>
                <Link to="/privacy" className="hover:text-brand-orange dark:hover:text-brand-orange transition">{footerPrivacyLabel}</Link>
                <span>|</span>
                <Link to="/shipping" className="hover:text-brand-orange dark:hover:text-brand-orange transition">{footerShippingLabel}</Link>
                <span>|</span>
                <Link to="/refund" className="hover:text-brand-orange dark:hover:text-brand-orange transition">{footerRefundLabel}</Link>
                <span>|</span>
                <Link to="/payment-policy" className="hover:text-brand-orange dark:hover:text-brand-orange transition">{footerPaymentLabel}</Link>
                <span>|</span>
                <Link to="/contact" className="hover:text-brand-orange dark:hover:text-brand-orange transition">{footerContactLabel}</Link>
              </div>
            </div>
          </div>
        </footer>
      ) : null}

      <>
        <button
          type="button"
          aria-label="Open accessibility quick settings"
          title="Accessibility settings"
          onClick={() => setIsA11yPanelOpen(true)}
          className="fixed right-4 top-20 lg:top-5 z-55 inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-orange/50 bg-white/90 dark:bg-[#111827]/90 text-brand-orange shadow-xl backdrop-blur hover:bg-brand-orange hover:text-white transition-colors"
        >
          <Accessibility size={18} />
        </button>

        {isA11yPanelOpen && (
          <div className="fixed inset-0 z-60 flex items-stretch justify-end bg-transparent" onClick={() => setIsA11yPanelOpen(false)}>
            <aside
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md h-full bg-white dark:bg-[#0a0a0f] shadow-2xl border-l border-brand-navy/10 dark:border-white/10 p-5 overflow-y-auto"
              role="dialog"
              aria-label="Accessibility quick settings"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange border border-brand-orange/30">
                    <Accessibility size={18} />
                  </span>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-orange">Settings</p>
                    <h2 className="text-lg font-black text-brand-navy dark:text-white">Accessibility (Quick)</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsA11yPanelOpen(false)}
                  className="text-sm font-bold text-brand-navy dark:text-gray-200 hover:text-brand-orange"
                >
                  Close
                </button>
              </div>
              <QuickAccessibilityPanel />
            </aside>
          </div>
        )}
      </>
    </>
  );
}

function AccessibilityFilterDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <filter id="deuteranopia-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="
              0.367322 0.860646 -0.227968 0 0
              0.280085 0.672501 0.047413 0 0
              -0.011820 0.042940 0.968881 0 0
              0 0 0 1 0
            "
          />
        </filter>
        <filter id="protanopia-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="
              0.152286 1.052583 -0.204868 0 0
              0.114503 0.786281 0.099216 0 0
              -0.003882 -0.048116 1.051998 0 0
              0 0 0 1 0
            "
          />
        </filter>
        <filter id="tritanopia-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="
              1.255528 -0.076749 -0.178779 0 0
              -0.078411 0.930809 0.147602 0 0
              0.004733 0.691367 0.303900 0 0
              0 0 0 1 0
            "
          />
        </filter>
      </defs>
    </svg>
  );
}

function App() {
  return (
    <Router>
      <AccessibilityFilterDefs />
      <AppLayout />
    </Router>
  );
}

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language = 'en' } = useAccessibility();
  const { role, session, isAuthenticated } = useAuth();
  const { isStoreOn, isStoreOff } = useStoreDebugMode();
  const [ownerSettings, setOwnerSettings] = useState(() => getLocalOwnerSettings());
  const pageVisibility = ownerSettings?.page_visibility || {};
  const comingSoonModeRaw = getSiteLayoutValue('COMING_SOON_MODE', getSiteLayoutValue('COMING_SOON_PAGE', 'TRUE'));
  const comingSoonEnabled = String(comingSoonModeRaw ?? '').toUpperCase() !== 'FALSE';
  const isPageEnabled = (key) => {
    if (!comingSoonEnabled) return false;
    return pageVisibility?.[key] !== false;
  };
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === '1';
  });
  const [isGovernanceSuspended, setIsGovernanceSuspended] = useState(() => (SHOULD_USE_GOVERNANCE_MOCK ? !GOVERNANCE_MOCK_ACTIVE : false));
  const [isMasterGateUnlocked, setIsMasterGateUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(MASTER_GATE_STORAGE_KEY) === '1';
  });
  const [isVerifiedWelcomeOpen, setIsVerifiedWelcomeOpen] = useState(false);
  const isPrivilegedRole = ['OWNER'].includes(role);
  const isOwnerRole = role === 'OWNER';
  const requiresMasterGate = isStoreOn && isPrivilegedRole;
  const canAccessSensitiveTools = !requiresMasterGate || isMasterGateUnlocked;
  const isApprovedRole = ['MEMBER', 'VIP', 'OWNER', 'INSTITUTIONAL'].includes(role);
  const isMobile = useIsMobileViewport();
  const showComingSoonPage = comingSoonEnabled;
  // Home intentionally hides the global footer; ComingSoon is rendered at `/` and should still show it.
  const showFooterNotice = location.pathname !== '/' || showComingSoonPage;
  const supportHref = isPageEnabled('support_page')
    ? '/support'
    : `mailto:${ownerSettings?.support_email || 'support@peptq.com'}`;
  const navItemsBaseRaw = BETA_MODE ? betaNavItems : navItems;
  const navItemsBase = (isStoreOn
    ? navItemsBaseRaw
    : navItemsBaseRaw.filter((item) => item.to !== '/apply'))
    .filter((item) => {
      if (item.to === '/catalog') return isPageEnabled('catalog_page');
      if (item.to === '/apply') return isPageEnabled('apply_page');
      if (item.to === '/about') return isPageEnabled('about_page');
      if (item.to === '/mission') return isPageEnabled('mission_page');
      if (item.to === '/payment-policy') return isPageEnabled('payment_policy_page');
      if (item.to === '/terms') return isPageEnabled('terms_page');
      return true;
    });
  const navItemsWithLedger = (!BETA_MODE && isStoreOn && isApprovedRole && (!isPrivilegedRole || canAccessSensitiveTools))
    ? [...navItemsBase, { to: '/ledger', label: 'Procurement Ledger' }]
    : navItemsBase;
  const navItemsWithDocs = (!BETA_MODE && isStoreOn && isApprovedRole)
    ? [...navItemsWithLedger, { to: '/documents', label: 'My Documents' }]
    : navItemsWithLedger;
  const navItemsWithCatalogManager = (!BETA_MODE && isPrivilegedRole && isStoreOn && canAccessSensitiveTools)
    ? [...navItemsWithDocs, { to: '/owner?tab=catalog', label: 'Catalog Manager' }]
    : navItemsWithDocs;
  const navItemsList = BETA_MODE
    ? navItemsWithCatalogManager
    : (isOwnerRole
      ? ownerNavItems
      : (isPrivilegedRole && isStoreOn
        ? [...navItemsWithCatalogManager, { to: '/owner', label: 'Owner' }]
        : navItemsWithCatalogManager));
  const catalogTarget = BETA_MODE ? '/apply' : (isApprovedRole ? '/catalog' : '/apply');
  const localizedNavItemsList = navItemsList.map((item) => ({
    ...item,
    to: item.to === '/catalog' ? catalogTarget : item.to,
    label: localizeShellLabel(item.label, language),
  }));
  const showGuestWarning = !isOwnerRole;
  const shouldShowVerifiedWelcome = ['MEMBER', 'VIP', 'INSTITUTIONAL'].includes(role);
  const getAsset = (sectionId, fallback, assetFallbackId) => {
    const raw = getAssetUrl(sectionId, getAssetUrl(assetFallbackId || '', fallback));
    return toEmbeddableGoogleDriveUrl(raw);
  };
  const lightLogo = getAsset('WEBSITE_LIGHT_LOGO', '/logo.svg', 'light');
  const darkLogo = getAsset('WEBSITE_DARK_LOGO', '/logo.svg', 'dark');
  const faviconUrl = getAsset('WEBSITE_FAVICON', '/logo.svg', 'favicon');
  const handleBottomPrimaryPress = () => {
    if (BETA_MODE) {
      setIsMobileMenuOpen((prev) => !prev);
      return;
    }

    if (location.pathname === '/') {
      setIsSearchPanelOpen((prev) => !prev);
      return;
    }

    navigate('/');
    setIsSearchPanelOpen(true);
  };

  const handleSidebarPortalAccess = () => {
    navigate('/profile');
  };
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const path = String(location.pathname || '').toLowerCase();
    const shouldNoIndex = path.startsWith('/owner');
    let robotsMeta = document.querySelector('meta[name="robots"]');

    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }

    robotsMeta.setAttribute('content', shouldNoIndex ? 'noindex, nofollow, noarchive' : 'index, follow');
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has(GOOGLE_TRANSLATE_RESET_PARAM)) return;

    url.searchParams.delete(GOOGLE_TRANSLATE_RESET_PARAM);
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, document.title, next);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof document === 'undefined' || !faviconUrl) return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }, [faviconUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const isDev = import.meta.env.DEV;

    const triggerSuspension = (errorLike) => {
      if (isGovernancePermissionDenied(errorLike)) {
        setIsGovernanceSuspended(true);
      }
    };

    const onUnhandledRejection = (event) => {
      if (isDev && isKnownExtensionNoise(event?.reason || event?.message)) {
        event?.preventDefault?.();
        return;
      }
      triggerSuspension(event?.reason);
    };

    const onWindowError = (event) => {
      if (isDev && isKnownExtensionNoise(event?.error || event?.message)) {
        event?.preventDefault?.();
        return;
      }
      triggerSuspension(event?.error || event?.message);
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    window.addEventListener('error', onWindowError);

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.removeEventListener('error', onWindowError);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MASTER_GATE_STORAGE_KEY, isMasterGateUnlocked ? '1' : '0');
  }, [isMasterGateUnlocked]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, isSidebarCollapsed ? '1' : '0');
  }, [isSidebarCollapsed]);

  useEffect(() => {
    Promise.all([fetchSiteLayout(), fetchAssets()])
      .then(() => setOwnerSettings(getLocalOwnerSettings()))
      .catch(() => {
        // Manual Lite fallback: public shell can render from cached/default settings.
      });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !session || !shouldShowVerifiedWelcome) {
      return undefined;
    }

    if (location.state?.peptqWelcome !== 'verified') {
      return undefined;
    }

    if (window.sessionStorage.getItem(VERIFIED_WELCOME_STORAGE_KEY)) {
      return undefined;
    }

    window.sessionStorage.setItem(VERIFIED_WELCOME_STORAGE_KEY, 'true');
    const timer = window.setTimeout(() => {
      setIsVerifiedWelcomeOpen(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [session, location.state, shouldShowVerifiedWelcome]);

  // Load Google Translate widget globally (Manual Lite language assist)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!GOOGLE_TRANSLATE_ENABLED) return;
    if (document.getElementById('google-translate-script')) return;
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=initPeptqTranslate';
    document.body.appendChild(script);
    window.initPeptqTranslate = () => {
      new window.google.translate.TranslateElement(
        { pageLanguage: 'en', autoDisplay: false },
        'google_translate_element_sidebar'
      );
      hideGoogleTranslateChrome();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return undefined;
    if (!GOOGLE_TRANSLATE_ENABLED) return undefined;

    hideGoogleTranslateChrome();

    const observer = new MutationObserver(() => {
      hideGoogleTranslateChrome();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    const timers = [150, 500, 1200, 2500].map((delay) => window.setTimeout(hideGoogleTranslateChrome, delay));
    window.addEventListener('focus', hideGoogleTranslateChrome);
    window.addEventListener('pageshow', hideGoogleTranslateChrome);

    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('focus', hideGoogleTranslateChrome);
      window.removeEventListener('pageshow', hideGoogleTranslateChrome);
    };
  }, []);

  useEffect(() => {
    if (!isStoreOff) return;
    if (location.pathname === '/') return;
    navigate('/', { replace: true });
  }, [isStoreOff, location.pathname, navigate]);

  const effectiveSearchPanelOpen = location.pathname === '/' ? isSearchPanelOpen : false;
  const firstEnabledPublicPath = (() => {
    if (isPageEnabled('catalog_page')) return '/catalog';
    if (isPageEnabled('apply_page')) return '/apply';
    if (isPageEnabled('about_page')) return '/about';
    if (isPageEnabled('mission_page')) return '/mission';
    if (isPageEnabled('payment_policy_page')) return '/payment-policy';
    if (isPageEnabled('terms_page')) return '/terms';
    return BETA_MODE ? '/catalog' : '/owner';
  })();

  return (
    <div className="min-h-dvh w-full bg-white dark:bg-[#0a0a0f] transition-colors duration-300">
      <AppParticleBackground />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-9999 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-black focus:text-brand-navy focus:shadow-lg"
      >
        Skip to main content
      </a>
      {isGovernanceSuspended && <GovernanceSuspendedOverlay />}
      <div className="relative z-1 flex min-h-dvh w-full">
        <Sidebar
          navItemsList={localizedNavItemsList}
          showNotice={showGuestWarning}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(true)}
          isAuthenticated={!!session}
          role={role}
          session={session}
          onPortalAccess={handleSidebarPortalAccess}
          supportHref={supportHref}
          supportExternal={!isPageEnabled('support_page')}
          lightLogo={lightLogo}
          darkLogo={darkLogo}
        />

        <div className="flex-1 min-w-0">
          {isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(false)}
              className="hidden lg:inline-flex fixed top-5 left-5 z-50 h-10 w-10 items-center justify-center rounded-xl border border-brand-navy/20 dark:border-white/20 bg-white/95 dark:bg-[#111827]/95 text-brand-navy dark:text-gray-100 shadow-lg backdrop-blur hover:text-brand-orange transition-colors"
              aria-label="Expand side menu"
              title="Expand side menu"
            >
              <ChevronRight size={18} />
            </button>
          )}

          <MobileTopNav lightLogo={lightLogo} darkLogo={darkLogo} />

          <MobileMenuDrawer
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            navItemsList={localizedNavItemsList}
            showNotice={showGuestWarning}
            isAuthenticated={isAuthenticated}
            session={session}
            onPortalAccess={handleSidebarPortalAccess}
            supportHref={supportHref}
            supportExternal={!isPageEnabled('support_page')}
            lightLogo={lightLogo}
            darkLogo={darkLogo}
          />

          <main id="main-content" className="pb-20 lg:pb-0">
            <Routes>
              <Route
                path="/"
                element={
                  showComingSoonPage
                    ? <ComingSoonPage />
                    : (
                      isPageEnabled('catalog_page')
                        ? <HomePage isSearchPanelOpen={false} onCloseSearchPanel={() => setIsSearchPanelOpen(false)} />
                        : <Navigate to={firstEnabledPublicPath} replace />
                    )
                }
              />
              <Route
                path="/catalog"
                element={
                  BETA_MODE
                    ? <Navigate to="/apply" replace />
                    : (isPageEnabled('catalog_page')
                      ? <HomePage isSearchPanelOpen={effectiveSearchPanelOpen} onCloseSearchPanel={() => setIsSearchPanelOpen(false)} />
                      : <Navigate to="/" replace />)
                }
              />
              <Route
                path="/catalog/:slug"
                element={
                  BETA_MODE
                    ? <Navigate to="/apply" replace />
                    : (isPageEnabled('catalog_page')
                      ? <HomePage isSearchPanelOpen={effectiveSearchPanelOpen} onCloseSearchPanel={() => setIsSearchPanelOpen(false)} />
                      : <Navigate to="/" replace />)
                }
              />
              <Route path="/apply" element={isPageEnabled('apply_page') ? (isStoreOn ? <ApplyPage /> : <HomePage isSearchPanelOpen={false} onCloseSearchPanel={() => setIsSearchPanelOpen(false)} />) : <Navigate to="/" replace />} />
              <Route path="/preorder" element={<PreorderPage />} />
              <Route path="/support" element={isPageEnabled('support_page') ? <SupportPage /> : <Navigate to="/" replace />} />
              <Route path="/about" element={isPageEnabled('about_page') ? <AboutPage /> : <Navigate to="/" replace />} />
              <Route path="/mission" element={isPageEnabled('mission_page') ? <MissionPage /> : <Navigate to="/" replace />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/shipping" element={<ShippingPolicyPage />} />
              <Route path="/refund" element={<RefundPolicyPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/terms" element={isPageEnabled('terms_page') ? <TermsPage /> : <Navigate to="/" replace />} />
              <Route path="/payment-policy" element={isPageEnabled('payment_policy_page') ? <PaymentPolicyPage /> : <Navigate to="/" replace />} />
              {!BETA_MODE && (
                <>
                  <Route
                    path="/ledger"
                    element={
                      isPageEnabled('ledger_page') && isStoreOn && isApprovedRole && (!isPrivilegedRole || canAccessSensitiveTools)
                        ? <OrderHistoryPage />
                        : (isPrivilegedRole && requiresMasterGate && !canAccessSensitiveTools
                          ? <OwnerPage masterGateUnlocked={isMasterGateUnlocked} setMasterGateUnlocked={setIsMasterGateUnlocked} forceGateOnly />
                          : <Navigate to="/" replace />)
                    }
                  />
                  <Route path="/documents" element={isPageEnabled('documents_page') && isStoreOn && isApprovedRole ? <DocumentsPage /> : <Navigate to="/" replace />} />
                </>
              )}
              {!BETA_MODE && (
                <>
                  <Route path="/profile" element={isPageEnabled('profile_page') && isStoreOn ? <ProfileSettingsPage /> : <Navigate to="/" replace />} />
                  <Route path="/profile/setup" element={isPageEnabled('profile_page') && isStoreOn ? <ProfileSettingsPage /> : <Navigate to="/" replace />} />
                  <Route path="/profile/:name" element={isPageEnabled('profile_page') && isStoreOn ? <ProfileSettingsPage /> : <Navigate to="/" replace />} />
                </>
              )}
              {BETA_MODE && (
                <>
                  <Route path="/profile" element={<Navigate to="/apply" replace />} />
                  <Route path="/profile/setup" element={<Navigate to="/apply" replace />} />
                  <Route path="/profile/:name" element={<Navigate to="/apply" replace />} />
                </>
              )}
              <Route path="/coa" element={<CoaLibraryPage />} />
              <Route path="/coa/:lotId" element={<CoaLotRedirect />} />
              <Route path="/verify/:lotId" element={<VerifyPage />} />
              {!BETA_MODE && (
                <>
                  <Route path="/ow" element={<Navigate to="/owner" replace />} />
                  <Route path="/owner" element={isStoreOn ? <OwnerPage masterGateUnlocked={isMasterGateUnlocked} setMasterGateUnlocked={setIsMasterGateUnlocked} /> : <HomePage isSearchPanelOpen={false} onCloseSearchPanel={() => setIsSearchPanelOpen(false)} />} />
                </>
              )}
              {BETA_MODE && (
                <>
                  <Route path="/ow" element={<Navigate to="/catalog" replace />} />
                  <Route path="/owner" element={<Navigate to="/catalog" replace />} />
                  <Route path="/ledger" element={<Navigate to="/catalog" replace />} />
                  <Route path="/documents" element={<Navigate to="/catalog" replace />} />
                </>
              )}
            </Routes>
          </main>

          <Disclaimer
            showNotice={showFooterNotice && showGuestWarning}
            isMobile={isMobile}
            language={language}
            supportHref={supportHref}
            supportExternal={!isPageEnabled('support_page')}
            lightLogo={lightLogo}
            darkLogo={darkLogo}
          />
          <MobileBottomNav
            role={role}
            isApprovedRole={isApprovedRole}
            onPrimaryPress={handleBottomPrimaryPress}
            isPrimaryPanelOpen={BETA_MODE ? isMobileMenuOpen : effectiveSearchPanelOpen}
            catalogTarget={catalogTarget}
          />

        </div>
      </div>

      <VerifiedWelcomeModal
        isOpen={isVerifiedWelcomeOpen}
        onClose={() => setIsVerifiedWelcomeOpen(false)}
        language={language}
      />

    </div>
  );
}

export default App;





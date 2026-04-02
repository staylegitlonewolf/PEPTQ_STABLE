/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { submitPortalRequest, isDeletedIdentity, resolveIdentityStatus, withdrawPortalRequest } from '../services/requestService';

const AUTH_STORAGE_KEY = 'peptq_auth_v1';
const ALLOWED_ROLES = new Set(['GUEST', 'PENDING', 'MEMBER', 'VIP', 'OWNER', 'INSTITUTIONAL']);

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeEmail = (value) => normalizeText(value).toLowerCase();
const BOOTSTRAP_OWNER_EMAIL = normalizeEmail(import.meta.env.VITE_BOOTSTRAP_OWNER_EMAIL || 'owner@peptq.com');

const normalizeRole = (value, fallback = 'GUEST') => {
  const role = normalizeText(value).toUpperCase();
  return ALLOWED_ROLES.has(role) ? role : fallback;
};

const buildSlug = (fullName = '', email = '') => {
  const base = normalizeText(fullName) || normalizeText(email) || 'user';
  const slugBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
  const prefix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${slugBase}`;
};

const loadStoredSession = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const email = normalizeEmail(parsed.email);
    if (!email) return null;
    if (Boolean(parsed.accountDelete) || isDeletedIdentity(email)) return null;

    return {
      email,
      fullName: normalizeText(parsed.fullName),
      role: normalizeRole(parsed.role, 'GUEST'),
      status: normalizeRole(parsed.status, 'GUEST'),
      slug: normalizeText(parsed.slug),
      pinRotationRequired: Boolean(parsed.pinRotationRequired),
      authProvider: normalizeText(parsed.authProvider) || 'PIN',
      profilePhotoUrl: normalizeText(parsed.profilePhotoUrl),
      uid: normalizeText(parsed.uid),
      accountDelete: Boolean(parsed.accountDelete),
      isAuthenticated: Boolean(parsed.isAuthenticated),
      lastUpdatedAt: normalizeText(parsed.lastUpdatedAt),
    };
  } catch {
    return null;
  }
};

const persistSession = (session) => {
  if (typeof window === 'undefined') return;

  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

const AuthContext = createContext({
  session: null,
  role: 'GUEST',
  status: 'GUEST',
  pinRotationRequired: false,
  isAuthenticated: false,
  isApproved: false,
  signInAsGuest: () => null,
  requestAccess: async () => {
    throw new Error('Auth provider is unavailable while the app is refreshing. Please retry in a moment.');
  },
  withdrawAccessRequest: async () => {
    throw new Error('Auth provider is unavailable while the app is refreshing. Please retry in a moment.');
  },
  setApprovedSession: () => null,
  updateSessionProfile: () => {},
  signOut: () => {},
});

const FALLBACK_AUTH_CONTEXT = {
  session: null,
  role: 'GUEST',
  status: 'GUEST',
  pinRotationRequired: false,
  isAuthenticated: false,
  isApproved: false,
  signInAsGuest: () => {
    throw new Error('Auth provider is unavailable while the app is refreshing. Please retry in a moment.');
  },
  requestAccess: async () => {
    throw new Error('Auth provider is unavailable while the app is refreshing. Please retry in a moment.');
  },
  withdrawAccessRequest: async () => {
    throw new Error('Auth provider is unavailable while the app is refreshing. Please retry in a moment.');
  },
  setApprovedSession: () => {
    throw new Error('Auth provider is unavailable while the app is refreshing. Please retry in a moment.');
  },
  updateSessionProfile: () => {},
  signOut: () => {},
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadStoredSession());

  const applySession = useCallback((nextSession) => {
    setSession(nextSession);
    persistSession(nextSession);
  }, []);

  const signInAsGuest = useCallback(({ email, fullName = '', authProvider = 'PIN', profilePhotoUrl = '' }) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      throw new Error('Email is required to start a guest session.');
    }
    if (isDeletedIdentity(normalizedEmail)) {
      throw new Error('This identity is flagged as deleted and cannot sign in.');
    }

    const nextSession = {
      email: normalizedEmail,
      fullName: normalizeText(fullName),
      role: 'GUEST',
      status: 'GUEST',
      slug: '',
      pinRotationRequired: false,
      authProvider: normalizeText(authProvider) || 'PIN',
      profilePhotoUrl: normalizeText(profilePhotoUrl),
      uid: '',
      accountDelete: false,
      isAuthenticated: true,
      lastUpdatedAt: new Date().toISOString(),
    };

    applySession(nextSession);
    return nextSession;
  }, [applySession]);

  const requestAccess = useCallback(async ({ email, fullName = '', authProvider = 'PIN', memberPin = '', profilePhotoUrl = '' }) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      throw new Error('Email is required to request access.');
    }
    if (isDeletedIdentity(normalizedEmail)) {
      throw new Error('This identity is flagged as deleted and cannot request access.');
    }

    await submitPortalRequest({
      email: normalizedEmail,
      fullName,
      authProvider,
      memberPin,
      profilePhotoUrl,
      accountDelete: false,
    });

    const nextSession = {
      email: normalizedEmail,
      fullName: normalizeText(fullName),
      role: 'GUEST',
      status: 'PENDING',
      pinRotationRequired: false,
      authProvider: normalizeText(authProvider) || 'PIN',
      profilePhotoUrl: normalizeText(profilePhotoUrl),
      uid: '',
      accountDelete: false,
      slug: '',
      isAuthenticated: true,
      lastUpdatedAt: new Date().toISOString(),
    };

    applySession(nextSession);
    return nextSession;
  }, [applySession]);

  const withdrawAccessRequest = useCallback(async ({ email = '', actorEmail = '' }) => {
    const normalizedEmail = normalizeEmail(email || session?.email);
    if (!normalizedEmail) {
      throw new Error('Email is required to withdraw a portal request.');
    }

    await withdrawPortalRequest({
      email: normalizedEmail,
      actorEmail: normalizeEmail(actorEmail) || normalizedEmail,
    });

    applySession(null);
  }, [applySession, session?.email]);

  const setApprovedSession = useCallback(({ email, fullName = '', role = 'MEMBER', uid = '', authProvider = 'PIN', profilePhotoUrl = '', slug = '' }) => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      throw new Error('Email is required to set approved session.');
    }
    if (isDeletedIdentity(normalizedEmail)) {
      throw new Error('This identity is flagged as deleted and cannot sign in.');
    }

    const approvedRole = normalizeRole(role, 'MEMBER');
    const safeSlug = normalizeText(slug) || buildSlug(fullName, email);
    const nextSession = {
      email: normalizedEmail,
      fullName: normalizeText(fullName),
      role: approvedRole,
      status: approvedRole,
      slug: safeSlug,
      pinRotationRequired: false,
      authProvider: normalizeText(authProvider) || 'PIN',
      profilePhotoUrl: normalizeText(profilePhotoUrl),
      uid: normalizeText(uid),
      accountDelete: false,
      isAuthenticated: true,
      lastUpdatedAt: new Date().toISOString(),
    };

    applySession(nextSession);
    return nextSession;
  }, [applySession]);

  const signOut = useCallback(() => {
    applySession(null);
  }, [applySession]);

  const updateSessionProfile = useCallback((patch = {}) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        fullName: normalizeText(patch.fullName ?? prev.fullName),
        profilePhotoUrl: normalizeText(patch.profilePhotoUrl ?? prev.profilePhotoUrl),
        slug: normalizeText(patch.slug ?? prev.slug) || buildSlug(patch.fullName ?? prev.fullName, prev.email),
        pinRotationRequired: patch.pinRotationRequired == null ? Boolean(prev.pinRotationRequired) : Boolean(patch.pinRotationRequired),
        lastUpdatedAt: new Date().toISOString(),
      };
      persistSession(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;

    const refreshIdentity = async () => {
      const sessionEmail = normalizeEmail(session?.email);
      if (!sessionEmail) return;

      const liveStatus = await resolveIdentityStatus({ email: sessionEmail });
      if (!active) return;

      if (liveStatus.accountDelete) {
        applySession(null);
        return;
      }

      setSession((prev) => {
        if (!prev || normalizeEmail(prev.email) !== sessionEmail) return prev;

        const backendReachable = liveStatus?.reachable !== false;
        const backendRole = normalizeRole(liveStatus.role, 'GUEST');
        const isBootstrapOwnerSession =
          normalizeEmail(prev.email) === BOOTSTRAP_OWNER_EMAIL
          && normalizeText(prev.uid) === 'BOOTSTRAP-OWNER'
          && normalizeRole(prev.role, 'GUEST') === 'OWNER';
        const preserveBootstrapOwner = backendReachable && isBootstrapOwnerSession && backendRole === 'GUEST';

        const next = {
          ...prev,
          role: backendReachable
            ? (preserveBootstrapOwner ? 'OWNER' : normalizeRole(liveStatus.role, prev.role || 'GUEST'))
            : prev.role,
          status: backendReachable
            ? (preserveBootstrapOwner ? 'OWNER' : normalizeRole(liveStatus.status, prev.status || prev.role || 'GUEST'))
            : prev.status,
          pinRotationRequired: backendReachable
            ? Boolean(liveStatus.pinRotationRequired)
            : Boolean(prev.pinRotationRequired),
          profilePhotoUrl: normalizeText(liveStatus.profilePhotoUrl || prev.profilePhotoUrl),
          lastUpdatedAt: new Date().toISOString(),
        };
        persistSession(next);
        return next;
      });
    };

    refreshIdentity();

    return () => {
      active = false;
    };
  }, [applySession, session?.email]);

  const value = useMemo(() => {
    const role = normalizeRole(session?.role, 'GUEST');
    const status = normalizeRole(session?.status, role);
    const pinRotationRequired = Boolean(session?.pinRotationRequired);
    const isAuthenticated = Boolean(session?.isAuthenticated && session?.email);
    const isApproved = ['MEMBER', 'VIP', 'OWNER', 'INSTITUTIONAL'].includes(role);

    return {
      session,
      role,
      status,
      pinRotationRequired,
      isAuthenticated,
      isApproved,
      signInAsGuest,
      requestAccess,
      withdrawAccessRequest,
      setApprovedSession,
      updateSessionProfile,
      signOut,
    };
  }, [session, requestAccess, withdrawAccessRequest, setApprovedSession, signInAsGuest, signOut, updateSessionProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext) || FALLBACK_AUTH_CONTEXT;
}

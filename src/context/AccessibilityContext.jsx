/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEYS = {
  highContrast: 'peptq_high_contrast',
  reduceMotion: 'peptq_reduce_motion',
  fontScaleLarge: 'peptq_font_scale_large',
  fontScaleLevel: 'peptq_font_scale_level',
  dyslexiaFont: 'peptq_dyslexia_font',
  language: 'peptq_language',
};

const AccessibilityContext = createContext();

const readStoredBoolean = (key, fallback = false) => {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw == null) return fallback;
  return raw === 'true';
};

const canUseMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

const readSystemReduceMotion = () => {
  if (!canUseMatchMedia()) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const readStoredReduceMotionPreference = () => {
  if (typeof window === 'undefined') {
    return { value: false, followsSystem: false };
  }

  const raw = window.localStorage.getItem(STORAGE_KEYS.reduceMotion);
  if (raw === 'true' || raw === 'false') {
    return { value: raw === 'true', followsSystem: false };
  }

  return { value: readSystemReduceMotion(), followsSystem: true };
};

const readStoredScaleLevel = () => {
  if (typeof window === 'undefined') return 'default';

  const savedLevel = String(window.localStorage.getItem(STORAGE_KEYS.fontScaleLevel) || '').trim().toLowerCase();
  if (['default', 'large', 'xlarge'].includes(savedLevel)) {
    return savedLevel;
  }

  // Backward compatibility with the original boolean toggle.
  return readStoredBoolean(STORAGE_KEYS.fontScaleLarge, false) ? 'large' : 'default';
};

const readStoredLanguage = () => {
  if (typeof window === 'undefined') return 'en';

  const savedLanguage = String(window.localStorage.getItem(STORAGE_KEYS.language) || '').trim().toLowerCase();
  return savedLanguage === 'es' ? 'es' : 'en';
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  const [highContrast, setHighContrast] = useState(() => readStoredBoolean(STORAGE_KEYS.highContrast, false));
  const [reduceMotion, setReduceMotionState] = useState(() => readStoredReduceMotionPreference().value);
  const [followSystemReduceMotion, setFollowSystemReduceMotion] = useState(() => readStoredReduceMotionPreference().followsSystem);
  const [fontScaleLevel, setFontScaleLevel] = useState(readStoredScaleLevel);
  const [dyslexiaFont, setDyslexiaFont] = useState(() => readStoredBoolean(STORAGE_KEYS.dyslexiaFont, false));
  const [language, setLanguageState] = useState(readStoredLanguage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.highContrast, String(highContrast));
    document.documentElement.classList.toggle('a11y-high-contrast', highContrast);
  }, [highContrast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.dyslexiaFont, String(dyslexiaFont));
    document.documentElement.classList.toggle('a11y-dyslexia-font', dyslexiaFont);
  }, [dyslexiaFont]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (followSystemReduceMotion) {
      window.localStorage.removeItem(STORAGE_KEYS.reduceMotion);
    } else {
      window.localStorage.setItem(STORAGE_KEYS.reduceMotion, String(reduceMotion));
    }
    document.documentElement.classList.toggle('a11y-reduced-motion', reduceMotion);
  }, [followSystemReduceMotion, reduceMotion]);

  useEffect(() => {
    if (!followSystemReduceMotion || !canUseMatchMedia()) return undefined;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncWithSystem = (event) => {
      setReduceMotionState(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncWithSystem);
      return () => mediaQuery.removeEventListener('change', syncWithSystem);
    }

    mediaQuery.addListener(syncWithSystem);
    return () => mediaQuery.removeListener(syncWithSystem);
  }, [followSystemReduceMotion]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const normalizedLevel = ['default', 'large', 'xlarge'].includes(fontScaleLevel) ? fontScaleLevel : 'default';
    window.localStorage.setItem(STORAGE_KEYS.fontScaleLevel, normalizedLevel);
    window.localStorage.setItem(STORAGE_KEYS.fontScaleLarge, String(normalizedLevel !== 'default'));

    document.documentElement.classList.remove('a11y-font-scale-large', 'a11y-font-scale-xlarge');
    if (normalizedLevel === 'large') {
      document.documentElement.classList.add('a11y-font-scale-large');
    }
    if (normalizedLevel === 'xlarge') {
      document.documentElement.classList.add('a11y-font-scale-xlarge');
    }
  }, [fontScaleLevel]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.language, language === 'es' ? 'es' : 'en');
    document.documentElement.setAttribute('lang', language === 'es' ? 'es' : 'en');
  }, [language]);

  const setReduceMotion = (nextValue) => {
    setFollowSystemReduceMotion(false);
    setReduceMotionState((prev) => {
      const resolvedValue = typeof nextValue === 'function' ? nextValue(prev) : nextValue;
      return Boolean(resolvedValue);
    });
  };

  const setLanguage = (nextValue) => {
    setLanguageState((prev) => {
      const resolvedValue = typeof nextValue === 'function' ? nextValue(prev) : nextValue;
      return String(resolvedValue || '').trim().toLowerCase() === 'es' ? 'es' : 'en';
    });
  };

  const resetAccessibility = () => {
    setHighContrast(false);
    setReduceMotionState(readSystemReduceMotion());
    setFollowSystemReduceMotion(true);
    setFontScaleLevel('default');
    setDyslexiaFont(false);
  };


  const value = useMemo(() => ({
    highContrast,
    setHighContrast,
    reduceMotion,
    setReduceMotion,
    fontScaleLevel,
    setFontScaleLevel,
    resetAccessibility,
    dyslexiaFont,
    setDyslexiaFont,
    language,
    setLanguage,
  }), [
    highContrast,
    reduceMotion,
    fontScaleLevel,
    dyslexiaFont,
    language,
  ]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

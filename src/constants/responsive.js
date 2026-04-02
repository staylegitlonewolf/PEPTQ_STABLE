export const RESPONSIVE_BREAKPOINTS = Object.freeze({
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
});

export const MOBILE_VIEWPORT_MAX = RESPONSIVE_BREAKPOINTS.md - 1;
export const COMPACT_MOBILE_MAX = 320;

export const isPhoneViewport = (width) => Number(width) <= MOBILE_VIEWPORT_MAX;
export const isCompactViewport = (width) => Number(width) <= COMPACT_MOBILE_MAX;

export const getDeviceState = (width) => {
  const normalizedWidth = Number(width || 0);
  return {
    isMobile: isPhoneViewport(normalizedWidth),
    isCompact: isCompactViewport(normalizedWidth),
    isTablet: normalizedWidth > MOBILE_VIEWPORT_MAX && normalizedWidth <= RESPONSIVE_BREAKPOINTS.lg,
    isDesktop: normalizedWidth > RESPONSIVE_BREAKPOINTS.lg,
  };
};

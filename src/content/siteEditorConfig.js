const normalizeText = (value) => String(value || '').trim();

export const COMING_SOON_SITE_SECTIONS = {
  HERO_IMAGE: 'COMING_SOON_HERO_IMAGE',
  LIGHT_LOGO: 'WEBSITE_LIGHT_LOGO',
  DARK_LOGO: 'WEBSITE_DARK_LOGO',
  FAVICON: 'WEBSITE_FAVICON',
};

export const COMING_SOON_DEFAULTS = {
  heroImage: '/hero.png',
  lightLogo: '/logo.svg',
  darkLogo: '/logo.svg',
  favicon: '/logo.svg',
};

export const WEBSITE_EDITOR_PAGES = [
  {
    id: 'coming-soon',
    label: 'Coming Soon Page',
    description: 'Update the main hero product image shown on the launch page.',
    imageField: {
      key: 'heroImage',
      sectionId: COMING_SOON_SITE_SECTIONS.HERO_IMAGE,
      label: 'Hero product image',
      defaultValue: COMING_SOON_DEFAULTS.heroImage,
      subText: 'Coming Soon hero image URL',
      ctaLabel: 'IMAGE_URL',
    },
    fields: [],
  },
  {
    id: 'brand-assets',
    label: 'Brand Assets',
    description: 'Update shared logos, favicon, and other live image assets.',
    imageFields: [
      {
        key: 'lightLogo',
        sectionId: COMING_SOON_SITE_SECTIONS.LIGHT_LOGO,
        label: 'Light logo',
        defaultValue: COMING_SOON_DEFAULTS.lightLogo,
        subText: 'Logo used on light background',
        ctaLabel: 'IMAGE_URL',
      },
      {
        key: 'darkLogo',
        sectionId: COMING_SOON_SITE_SECTIONS.DARK_LOGO,
        label: 'Dark logo',
        defaultValue: COMING_SOON_DEFAULTS.darkLogo,
        subText: 'Logo used on dark background',
        ctaLabel: 'IMAGE_URL',
      },
      {
        key: 'favicon',
        sectionId: COMING_SOON_SITE_SECTIONS.FAVICON,
        label: 'Favicon',
        defaultValue: COMING_SOON_DEFAULTS.favicon,
        subText: 'Browser tab icon',
        ctaLabel: 'IMAGE_URL',
      },
      {
        key: 'heroImage',
        sectionId: COMING_SOON_SITE_SECTIONS.HERO_IMAGE,
        label: 'Coming Soon hero image',
        defaultValue: COMING_SOON_DEFAULTS.heroImage,
        subText: 'Coming Soon hero image URL',
        ctaLabel: 'IMAGE_URL',
      },
    ],
  },
];

export const buildSiteLayoutMap = (entries = []) => {
  const map = new Map();
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const sectionId = normalizeText(entry?.section_id).toUpperCase();
    if (!sectionId) return;
    map.set(sectionId, {
      section_id: sectionId,
      is_visible: entry?.is_visible !== false,
      header_text: normalizeText(entry?.header_text),
      sub_text: normalizeText(entry?.sub_text),
      cta_label: normalizeText(entry?.cta_label),
    });
  });
  return map;
};

export const getSiteLayoutText = (layoutMap, sectionId, fallback = '') => {
  const map = layoutMap instanceof Map ? layoutMap : buildSiteLayoutMap(layoutMap);
  return normalizeText(map.get(normalizeText(sectionId).toUpperCase())?.header_text) || fallback;
};

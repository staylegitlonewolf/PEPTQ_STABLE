const LIVE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzt9KsxdP1C9Bw5qcizWmMK1vzfyig2XztVo-oNZC4Rpj0XwNWpOLkX5xdNBck0UzYX/exec';
const LEGACY_SCRIPT_ID = 'AKfycbx0IclZonmHk5kgjpN-xlVEs8MUJaPHvfvT5EOyTNwDDwimVqy5OB-s_KTNw84z1jERMw';

const normalizeScriptUrl = (value) => {
	const raw = String(value || '').trim();
	if (!raw) return LIVE_SCRIPT_URL;

	// Force legacy deployment IDs onto the currently live web-app endpoint.
	if (raw.includes(LEGACY_SCRIPT_ID)) return LIVE_SCRIPT_URL;

	// Ensure callers always hit the executable web-app endpoint.
	if (raw.startsWith('https://script.google.com/macros/s/') && !raw.endsWith('/exec')) {
		return `${raw}/exec`;
	}

	// Guard against library URLs being used as command endpoints.
	if (raw.includes('https://script.google.com/macros/library/d/')) {
		return LIVE_SCRIPT_URL;
	}

	// Guard against echoed library redirects, which are not valid command endpoints.
	if (raw.includes('https://script.googleusercontent.com/macros/echo') && raw.includes('lib=')) {
		return LIVE_SCRIPT_URL;
	}

	return raw;
};

export const GOOGLE_SCRIPT_URL = normalizeScriptUrl(import.meta.env.VITE_GOOGLE_SCRIPT_URL || LIVE_SCRIPT_URL);
export const APPS_SCRIPT_COMMAND_URL = GOOGLE_SCRIPT_URL;
export const COMING_SOON_SCRIPT_URL = normalizeScriptUrl(import.meta.env.VITE_COMING_SOON_SCRIPT_URL || APPS_SCRIPT_COMMAND_URL);
export const PORTAL_BRIDGE_URL = normalizeScriptUrl(import.meta.env.VITE_PORTAL_BRIDGE_URL || APPS_SCRIPT_COMMAND_URL);

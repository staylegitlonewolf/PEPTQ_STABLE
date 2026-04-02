import { COMING_SOON_SCRIPT_URL } from './api';

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
const normalizeText = (value) => String(value || '').trim();
const GAS_SIMPLE_CONTENT_TYPE = 'text/plain;charset=utf-8';

const sendGasBeacon = (url, payload) => {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    return false;
  }

  try {
    const blob = new Blob([JSON.stringify(payload)], { type: GAS_SIMPLE_CONTENT_TYPE });
    return navigator.sendBeacon(url, blob);
  } catch {
    return false;
  }
};

export async function submitWaitlistEntry({ fullName, email, phone, source = 'Website', notes = '' }) {
  const normalizedName = normalizeText(fullName);
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedName) {
    throw new Error('Enter your full name.');
  }

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Enter a valid email address.');
  }

  if (normalizedPhone.length < 8) {
    throw new Error('Enter a valid phone number.');
  }

  try {
    const payload = {
      command: 'SUBMIT_WAITLIST',
      full_name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      source: String(source || 'Website'),
      notes: String(notes || ''),
    };

    const queuedViaBeacon = sendGasBeacon(COMING_SOON_SCRIPT_URL, payload);
    if (!queuedViaBeacon) {
      await fetch(COMING_SOON_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        headers: {
          'Content-Type': GAS_SIMPLE_CONTENT_TYPE,
        },
        body: JSON.stringify(payload),
      });
    }
  } catch {
    throw new Error('Unable to save waitlist entry right now.');
  }

  return {
    status: 'queued',
    command: 'SUBMIT_WAITLIST',
    full_name: normalizedName,
    email: normalizedEmail,
    phone: normalizedPhone,
  };
}

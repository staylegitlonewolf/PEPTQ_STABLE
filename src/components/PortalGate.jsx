import { useState } from 'react';
import { Link } from 'react-router-dom';
import { submitWaitlistEntry } from '../services/waitlistService';
import { useTheme } from '../context/ThemeContext';
import { getAssetUrl } from '../services/orderService';
import { toEmbeddableGoogleDriveUrl } from '../utils/driveLinks';
import { useAccessibleOverlay } from '../hooks/useAccessibleOverlay';

function PortalGate({ isOpen, onClose }) {
  const { theme } = useTheme();
  const lightLogo = toEmbeddableGoogleDriveUrl(getAssetUrl('WEBSITE_LIGHT_LOGO', getAssetUrl('light', '/logo.svg')));
  const darkLogo = toEmbeddableGoogleDriveUrl(getAssetUrl('WEBSITE_DARK_LOGO', getAssetUrl('dark', '/logo.svg')));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [waitlistMessage, setWaitlistMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useAccessibleOverlay({ isOpen, onClose });
  const titleId = 'portal-gate-title';
  const descriptionId = 'portal-gate-description';

  const handleClose = () => {
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 transition-all duration-300" onClick={handleClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative w-full max-w-md mx-auto rounded-3xl border border-white/60 bg-white/80 p-8 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-white/5 sm:p-12 flex flex-col items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-full border border-[#112e57]/20 bg-white/90 text-3xl font-black leading-none text-brand-navy shadow-md transition hover:scale-105 hover:text-brand-orange dark:border-white/20 dark:bg-[#0b1220]/80 dark:text-white"
          aria-label="Close"
        >
          <span className="sr-only">Close</span>
          &times;
        </button>
        <img
          src={theme === 'dark' ? darkLogo : lightLogo}
          alt="PEPTQ logo"
          className="h-10 w-auto"
        />
        <h1 id={titleId} className="mt-2 max-w-3xl text-3xl font-black leading-tight text-[#112e57] dark:text-white sm:text-5xl text-center">
          Coming Soon
        </h1>
        <p id={descriptionId} className="mt-5 max-w-2xl text-base leading-relaxed text-[#28415f] dark:text-gray-300 sm:text-lg text-center">
          The new standard for research compounds is almost here. We are currently in the final stages of site development and quality control validation. Join the waitlist to be the first to access our verified inventory.
        </p>
        <form
          className="mt-9 max-w-xl w-full"
          onSubmit={async (event) => {
            event.preventDefault();
            if (isSubmitting) return;
            setWaitlistMessage('');
            setIsSubmitting(true);
            try {
              await submitWaitlistEntry({ name, email, phone, source: 'PortalGate' });
              setName('');
              setEmail('');
              setPhone('');
              setWaitlistMessage('You are on the waiting list.');
            } catch (error) {
              setWaitlistMessage(error?.message || 'Unable to save waitlist entry right now.');
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <div className="flex flex-col gap-3">
            <label htmlFor="waitlist-name" className="sr-only">Full Name</label>
            <input
              id="waitlist-name"
              type="text"
              value={name}
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#112e57]/15 bg-white px-4 text-sm font-semibold text-[#112e57] outline-none transition focus:border-[#ff7a00] dark:border-white/20 dark:bg-[#111827] dark:text-white"
              placeholder="Full Name"
              required
            />
            <label htmlFor="waitlist-email" className="sr-only">Email Address</label>
            <input
              id="waitlist-email"
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#112e57]/15 bg-white px-4 text-sm font-semibold text-[#112e57] outline-none transition focus:border-[#ff7a00] dark:border-white/20 dark:bg-[#111827] dark:text-white"
              placeholder="Email Address"
              required
            />
            <label htmlFor="waitlist-phone" className="sr-only">Phone Number</label>
            <input
              id="waitlist-phone"
              type="tel"
              value={phone}
              autoComplete="tel"
              onChange={(event) => setPhone(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#112e57]/15 bg-white px-4 text-sm font-semibold text-[#112e57] outline-none transition focus:border-[#ff7a00] dark:border-white/20 dark:bg-[#111827] dark:text-white"
              placeholder="Phone Number"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 rounded-xl bg-[#ff7a00] px-6 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#e06d00] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Request Early Access'}
            </button>
          </div>
          {waitlistMessage && (
            <p role="status" aria-live="polite" className="mt-3 text-sm font-semibold text-[#36506c] dark:text-gray-300">{waitlistMessage}</p>
          )}
          <p className="mt-3 text-[11px] font-semibold text-[#36506c]/70 dark:text-gray-300/75">
            Secure submission over HTTPS. By requesting access, you agree to our{' '}
            <Link to="/terms" className="underline underline-offset-2 decoration-[#ff7a00]/55 hover:text-brand-orange transition">Terms &amp; Conditions</Link>
            {' '}and{' '}
            <Link to="/privacy" className="underline underline-offset-2 decoration-[#ff7a00]/55 hover:text-brand-orange transition">Privacy Policy</Link>.
          </p>
        </form>
      </div>
    </section>
  );
}

export default PortalGate;

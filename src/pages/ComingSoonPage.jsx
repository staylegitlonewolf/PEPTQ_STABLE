import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { submitWaitlistEntry } from '../services/waitlistService';
import { useAccessibility } from '../context/AccessibilityContext';
import { fetchSiteLayout, getAssetUrl, getLocalSiteLayout } from '../services/orderService';
import {
  COMING_SOON_DEFAULTS,
  COMING_SOON_SITE_SECTIONS,
  buildSiteLayoutMap,
  getSiteLayoutText,
} from '../content/siteEditorConfig';
import { toEmbeddableGoogleDriveUrl } from '../utils/driveLinks';

function ComingSoonPage() {
  const { language = 'en' } = useAccessibility();
  const es = language === 'es';
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    consent: false,
    notes: '',
  });
  const [waitlistMessage, setWaitlistMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isAboutWaitlistOpen, setIsAboutWaitlistOpen] = useState(false);
  const [siteLayoutEntries, setSiteLayoutEntries] = useState(() => getLocalSiteLayout());

  useEffect(() => {
    let mounted = true;

    const loadSiteLayout = async () => {
      const rows = await fetchSiteLayout();
      if (mounted) {
        setSiteLayoutEntries(rows);
      }
    };

    loadSiteLayout();
    return () => {
      mounted = false;
    };
  }, []);

  const siteLayoutMap = buildSiteLayoutMap(siteLayoutEntries);

  const text = {
    titleLead: es ? 'Unete a la' : 'Join the',
    titleAccent: es ? 'lista de espera' : 'waitlist',
    subtitle: es
      ? 'Accede a compuestos de investigacion verificados a traves de nuestro registro validado por HPLC.'
      : 'Access verified research compounds through our HPLC-verified compound registry.',
    heroRibbon: es ? 'Proximamente' : 'Coming soon',
    fullName: es ? 'Nombre completo' : 'Full name',
    email: es ? 'Ingresa tu correo para unirte a la lista' : 'Enter email to join the waitlist',
    phone: es ? 'Numero de telefono' : 'Phone number',
    notes: es ? 'Notas (opcional)' : 'Notes (optional)',
    termsLead: es ? 'Al unirte a la lista, aceptas nuestros' : 'By joining the waitlist, you agree to our',
    terms: es ? 'Terminos y Condiciones' : 'Terms & Conditions',
    privacy: es ? 'Politica de Privacidad' : 'Privacy Policy',
    consent: es
      ? 'Confirmo que mi informacion es correcta y doy permiso a PEPTQ para notificarme sobre actualizaciones de acceso al lanzamiento.'
      : 'I confirm my information is accurate and I give PEPTQ permission to notify me about live launch access updates.',
    submit: es ? 'Unirme a la Lista' : 'Join Waitlist',
    submitting: es ? 'Enviando...' : 'Submitting...',
    aboutBtn: es ? 'Sobre la Lista de Espera' : 'About Waitlist',
    trustSignals: [
      es ? 'Probado por terceros' : 'Third-party tested',
      es ? 'Acceso COA por lote' : 'Batch-level COA access',
      es ? 'Verificacion de grado laboratorio' : 'Lab-grade verification',
    ],
    secureNote: es
      ? 'PEPTQ usa envios seguros y cifrado para proteger tu privacidad. Tus datos se usan solo para la lista de espera y actualizaciones de acceso.'
      : 'PEPTQ uses secure submissions and encryption to ensure your privacy. Contact details are used only for waitlist and launch-access updates.',
    footerNote: es
      ? '© 2026 PEPTQ. Todos los derechos reservados. | Ordenes institucionales disponibles solo para cuentas de investigacion aprobadas.'
      : '© 2026 PEPTQ. All rights reserved. | Institutional ordering available for approved research accounts only.',
    footerPayment: es ? 'Politica de Pago' : 'Payment Policy',
    footerAbout: es ? 'Acerca de' : 'About',
    successTag: es ? 'Lista de Espera Confirmada' : 'Waitlist Confirmed',
    successTitle: es ? 'Estas en la lista de espera.' : 'You are on the waitlist.',
    successBody: es
      ? 'Notificaremos primero a investigadores verificados cuando se abra el acceso.'
      : 'We will notify verified researchers first when access opens.',
    close: es ? 'Cerrar' : 'Close',
    aboutTag: es ? 'Sobre la Lista de Espera' : 'About The Waitlist',
    aboutTitle: es ? 'Como Funciona la Lista de Espera' : 'How The Waitlist Works',
    aboutBody: es
      ? 'La lista de espera reserva tu lugar para notificaciones del lanzamiento. Los envios se revisan en orden y se prioriza el uso de investigacion verificado. Despues de la aprobacion, puedes acceder con tu correo o telefono y tu PIN del portal.'
      : 'The waitlist reserves your place for launch notifications. Submissions are reviewed in order and prioritized for verified research use. After approval, you can access the portal using your email or phone and your portal PIN.',
    aboutNotice: es
      ? 'PEPTQ es un proveedor de productos quimicos y no es una farmacia de compuestos o instalacion de compuestos bajo la Seccion 503A de la FDA, y no es una instalacion de subcontratacion bajo la Seccion 503B. Materiales restringidos a uso de laboratorio.'
      : 'PEPTQ is a chemical supplier and is not a compounding pharmacy or chemical compounding facility under Section 503A of the Federal Food, Drug, and Cosmetic Act, and is not an outsourcing facility under Section 503B. All materials are restricted to qualified laboratory, research, and analytical use.',
    steps: es
      ? [
          '1. Envia tus datos de contacto una sola vez.',
          '2. Recibe actualizaciones de lanzamiento y acceso de cuenta.',
          '3. Tu perfil se revisa para acceso de investigacion verificado.',
          '4. Una vez aprobado, inicia sesion con correo o telefono y PIN del portal.',
          '5. Las cuentas aprobadas obtienen primer acceso al inventario disponible.',
        ]
      : [
          '1. Submit your contact details once.',
          '2. Receive launch and account-access updates.',
          '3. Your profile is reviewed for verified research access.',
          '4. Once approved, sign in to the portal with your email or phone and portal PIN.',
          '5. Approved accounts get first access to available inventory.',
        ],
    waitlistSuccessMessage: es ? 'Estas en la lista de espera.' : 'You are on the waitlist.',
    waitlistErrorMessage: es ? 'No se pudo guardar tu registro en este momento.' : 'Unable to save waitlist entry right now.',
  };

  const heroProductImage = toEmbeddableGoogleDriveUrl(
    getSiteLayoutText(siteLayoutMap, COMING_SOON_SITE_SECTIONS.HERO_IMAGE, '')
    || getAssetUrl('comingsoon', COMING_SOON_DEFAULTS.heroImage)
  );

  const handleJoinWaitlist = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setWaitlistMessage('');
    setIsSubmitting(true);

    try {
      await submitWaitlistEntry({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        source: 'Website',
        notes: formData.notes,
      });
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        consent: false,
        notes: '',
      });
      setIsSuccessOpen(true);
      setWaitlistMessage(text.waitlistSuccessMessage);
    } catch (error) {
      setWaitlistMessage(error?.message || text.waitlistErrorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-transparent transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-20">
        <div className="grid w-full gap-8 rounded-3xl border-2 border-brand-navy/15 bg-white/88 p-6 shadow-2xl dark:border-white/10 dark:bg-white/5 sm:p-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h4 className="mt-6 max-w-3xl break-words text-[clamp(2rem,6vw,3.75rem)] font-black leading-[1.05] text-[#112e57] dark:text-white sm:text-6xl">
              <span className="inline">{text.titleLead} </span>
              <span className="inline text-[#ff7a00]">{text.titleAccent}</span>
            </h4>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#28415f] dark:text-gray-300 sm:text-lg">
              {text.subtitle}
            </p>

            <div className="mt-4 flex items-center justify-center lg:hidden">
              <div className="relative inline-block">
                <img
                  src={heroProductImage}
                  alt="PEPTQ hero product"
                  width="1024"
                  height="1024"
                  className="relative mx-auto h-72 w-auto object-contain drop-shadow-[0_26px_38px_rgba(0,0,0,0.35)] sm:h-80"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-center lg:hidden">
              <div className="inline-flex rounded-full border border-white/20 bg-[#ff7a00] px-4 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-lg">
                {text.heroRibbon}
              </div>
            </div>

            <form className="mt-9 max-w-xl" onSubmit={handleJoinWaitlist}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  id="waitlist-full-name"
                  type="text"
                  value={formData.fullName}
                  autoComplete="name"
                  onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                  className="h-12 w-full rounded-full border border-[#112e57]/15 bg-white px-5 text-sm font-semibold text-[#112e57] outline-none transition focus:border-[#ff7a00] focus:ring-4 focus:ring-[#ff7a00]/25 dark:border-white/20 dark:bg-[#111827] dark:text-white"
                  placeholder={text.fullName}
                  required
                />
                <input
                  id="waitlist-email"
                  type="email"
                  value={formData.email}
                  autoComplete="email"
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  className="h-12 w-full rounded-full border border-[#112e57]/15 bg-white px-5 text-sm font-semibold text-[#112e57] outline-none transition focus:border-[#ff7a00] focus:ring-4 focus:ring-[#ff7a00]/25 dark:border-white/20 dark:bg-[#111827] dark:text-white"
                  placeholder={text.email}
                  required
                />
                <input
                  id="waitlist-phone"
                  type="tel"
                  value={formData.phone}
                  autoComplete="tel"
                  onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                  className="h-12 w-full rounded-full border border-[#112e57]/15 bg-white px-5 text-sm font-semibold text-[#112e57] outline-none transition focus:border-[#ff7a00] focus:ring-4 focus:ring-[#ff7a00]/25 dark:border-white/20 dark:bg-[#111827] dark:text-white sm:col-span-2"
                  placeholder={text.phone}
                  required
                />
                <textarea
                  id="waitlist-notes"
                  value={formData.notes}
                  onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
                  className="min-h-[88px] w-full rounded-2xl border border-[#112e57]/15 bg-white px-5 py-3 text-sm font-semibold text-[#112e57] outline-none transition focus:border-[#ff7a00] focus:ring-4 focus:ring-[#ff7a00]/25 dark:border-white/20 dark:bg-[#111827] dark:text-white sm:col-span-2"
                  placeholder={text.notes}
                />
              </div>
              <p className="mt-3 text-[11px] font-semibold text-[#36506c]/85 dark:text-gray-300/90">
                {text.termsLead}{' '}
                <Link to="/terms" className="underline decoration-[#ff7a00]/60 underline-offset-2 transition hover:text-brand-orange">
                  {text.terms}
                </Link>
                {' '}{es ? 'y' : 'and'}{' '}
                <Link to="/privacy" className="underline decoration-[#ff7a00]/60 underline-offset-2 transition hover:text-brand-orange">
                  {text.privacy}
                </Link>
                .
              </p>
              <label className="mt-3 inline-flex items-start gap-2 text-xs font-semibold text-[#36506c] dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.consent}
                  onChange={(event) => setFormData((prev) => ({ ...prev, consent: event.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded border border-[#112e57]/25 accent-[#ff7a00]"
                  required
                />
                <span>{text.consent}</span>
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 rounded-xl bg-[#ff7a00] px-6 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#e06d00] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? text.submitting : text.submit}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAboutWaitlistOpen(true)}
                  className="h-12 rounded-xl border border-[#112e57]/20 bg-white/80 px-6 text-xs font-black uppercase tracking-[0.14em] text-[#112e57] transition hover:border-[#ff7a00]/40 hover:text-[#ff7a00] dark:border-white/20 dark:bg-white/5 dark:text-gray-200"
                >
                  {text.aboutBtn}
                </button>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {text.trustSignals.map((item) => (
                  <p key={item} className="flex items-start gap-2 text-[11px] font-bold text-[#28415f] dark:text-gray-200">
                    <CheckCircle2 size={14} className="mt-[1px] shrink-0 text-[#ff7a00]" />
                    <span className="min-w-0 break-words leading-snug">{item}</span>
                  </p>
                ))}
              </div>

              {waitlistMessage ? (
                <p className="mt-3 text-sm font-semibold text-[#36506c] dark:text-gray-300">{waitlistMessage}</p>
              ) : null}
              <p className="mt-3 text-[11px] font-semibold text-[#36506c]/85 dark:text-gray-300/90">
                {text.secureNote}
              </p>
            </form>
          </div>

          <div className="hidden flex-col items-center justify-center lg:flex">
            <div className="relative inline-block">
              <img
                src={heroProductImage}
                alt="PEPTQ hero product"
                width="1024"
                height="1024"
                className="relative mx-auto h-88 w-auto object-contain drop-shadow-[0_26px_38px_rgba(0,0,0,0.35)] md:h-112 lg:h-136 xl:h-152"
              />
            </div>
            <div className="mt-4 inline-flex rounded-full border border-white/20 bg-[#ff7a00] px-4 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-lg">
              {text.heroRibbon}
            </div>
          </div>
        </div>
      </div>

      {isSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setIsSuccessOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-white/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#111827]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#ff7a00]">{text.successTag}</p>
            <h3 className="mt-2 text-2xl font-black text-[#112e57] dark:text-white">{text.successTitle}</h3>
            <p className="mt-3 text-sm text-[#36506c] dark:text-gray-300">{text.successBody}</p>
            <button
              type="button"
              onClick={() => setIsSuccessOpen(false)}
              className="mt-5 h-11 w-full rounded-xl bg-[#ff7a00] text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#e06d00]"
            >
              {text.close}
            </button>
          </div>
        </div>
      )}

      {isAboutWaitlistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={() => setIsAboutWaitlistOpen(false)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-white/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#111827]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#ff7a00]">{text.aboutTag}</p>
            <h3 className="mt-2 text-2xl font-black text-[#112e57] dark:text-white">{text.aboutTitle}</h3>
            <p className="mt-3 text-sm text-[#36506c] dark:text-gray-300">{text.aboutBody}</p>
            <div className="mt-4 space-y-2 text-sm text-[#36506c] dark:text-gray-300">
              {text.steps.map((step) => (
                <p key={step}>{step}</p>
              ))}
            </div>
            <p className="mt-4 text-[11px] font-semibold text-brand-orange leading-relaxed italic">
              {text.aboutNotice}
            </p>
            <button
              type="button"
              onClick={() => setIsAboutWaitlistOpen(false)}
              className="mt-5 h-11 w-full rounded-xl bg-[#ff7a00] text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#e06d00]"
            >
              {text.close}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default ComingSoonPage;

import { Mail, Clock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAccessibility } from '../context/AccessibilityContext';
import { getLocalOwnerSettings } from '../services/orderService';

function ContactPage() {
  const { language = 'en' } = useAccessibility();
  const es = language === 'es';
  const ownerSettings = getLocalOwnerSettings();
  const supportEmail = ownerSettings?.support_email || 'support@peptq.com';
  const supportPageEnabled = ownerSettings?.page_visibility?.support_page !== false;

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-300">
      <section className="py-12 md:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-white/5 border-2 border-brand-navy dark:border-white/10 rounded-3xl p-7 md:p-10 shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-orange">
              {es ? 'Contacto' : 'Contact'}
            </p>
            <h1 className="mt-3 text-3xl md:text-5xl font-montserrat font-black text-brand-navy dark:text-white uppercase tracking-tight">
              {es ? 'Soporte' : 'Support'}
            </h1>
            <p className="mt-4 text-brand-navy/70 dark:text-gray-400 leading-relaxed max-w-3xl">
              {es
                ? 'Para consultas de investigacion aprobadas, verificacion de cuenta y solicitudes de soporte, contacta a nuestro equipo.'
                : 'For approved research inquiries, account verification, and support requests, contact our team.'}
            </p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-5">
                <div className="flex items-start gap-3">
                  <Mail className="text-brand-orange shrink-0" size={20} />
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wide text-brand-navy dark:text-white">
                      {es ? 'Correo' : 'Email'}
                    </h2>
                    <a
                      href={`mailto:${supportEmail}`}
                      className="mt-2 inline-block text-sm font-bold text-brand-orange underline underline-offset-2"
                    >
                      {supportEmail}
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-5">
                <div className="flex items-start gap-3">
                  <Clock className="text-brand-orange shrink-0" size={20} />
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wide text-brand-navy dark:text-white">
                      {es ? 'Ventana de respuesta' : 'Response Window'}
                    </h2>
                    <p className="mt-2 text-sm text-brand-navy/75 dark:text-gray-300 leading-relaxed">
                      {es ? 'Normalmente respondemos en 24-48 horas habiles.' : 'We typically respond within 24-48 business hours.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="text-brand-orange shrink-0" size={20} />
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wide text-brand-navy dark:text-white">
                      {es ? 'Nota' : 'Note'}
                    </h2>
                    <p className="mt-2 text-sm text-brand-navy/75 dark:text-gray-300 leading-relaxed">
                      {es ? 'Soporte disponible solo para cuentas de investigacion y consultas institucionales.' : 'Support is available for research accounts and institutional inquiries only.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-brand-orange/40 bg-brand-orange/10 p-5">
              <p className="text-sm text-brand-navy/80 dark:text-gray-200 leading-relaxed">
                {supportPageEnabled ? (
                  <>
                    {es
                      ? 'Si prefieres enviar un formulario, usa la pagina de Soporte.'
                      : 'If you prefer to submit a form, use the Support page.'}{' '}
                    <Link to="/support" className="font-bold text-brand-orange underline underline-offset-2">
                      {es ? 'Abrir Soporte' : 'Open Support'}
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    {es
                      ? 'El formulario publico puede estar deshabilitado. Usa el correo de soporte para contactarnos.'
                      : 'Public support intake may be disabled. Use the support email to contact us.'}
                  </>
                )}
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-gray-50 dark:bg-black/20 p-5">
              <p className="text-xs text-brand-navy/70 dark:text-gray-400">
                <strong>{es ? 'Ultima Actualizacion:' : 'Last Updated:'}</strong> 2026-04-02.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ContactPage;


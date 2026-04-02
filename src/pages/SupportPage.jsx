import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { LifeBuoy, ShieldCheck, PackageSearch, MessageSquareWarning } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { useAuth } from '../context/AuthProvider';
import { submitSupportRequest } from '../services/requestService';
import { getLocalOwnerSettings } from '../services/orderService';

// Avoid eslint false-positive on JSX member expressions like <motion.form /> by
// binding them to components.
const MotionForm = motion.form;
const MotionDiv = motion.div;

const ISSUE_OPTIONS = [
  'Portal Access',
  'Order Issue',
  'Return / Replacement',
  'Billing / Invoice',
  'Account Restore',
  'Documents / COA',
  'Other',
];

const inputClasses = 'w-full px-4 py-3 border border-brand-navy dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-brand-navy dark:text-gray-100 placeholder:text-brand-navy/50 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition-all';

const SupportPage = () => {
  const { language = 'en', reduceMotion } = useAccessibility();
  const { session } = useAuth();
  const location = useLocation();
  const es = language === 'es';
  const ownerSettings = useMemo(() => getLocalOwnerSettings(), []);
  const supportEmail = ownerSettings?.support_email || 'support@peptq.com';

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    issueType: 'Portal Access',
    orderReference: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const frame = window.requestAnimationFrame(() => {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || session?.fullName || '',
        email: prev.email || session?.email || '',
      }));
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [session?.email, session?.fullName]);

  const text = {
    title: es ? 'Soporte' : 'Support',
    titleAccent: es ? 'Operativo' : 'Request',
    subtitle: es
      ? 'Describe el problema y enviaremos tu solicitud al flujo de soporte de PEPTQ.'
      : 'Describe the issue and we will route your request into the PEPTQ support queue.',
    submit: es ? 'Enviar Soporte' : 'Send Support Request',
    processing: es ? 'Enviando Soporte...' : 'Sending Support Request...',
    backToCatalog: es ? 'Volver al Catalogo' : 'Back to Catalog',
    successTitle: es ? 'Soporte Recibido' : 'Support Request Received',
    successBody: es
      ? 'Tu mensaje ya esta en la cola de soporte. Un operador revisara el caso y te respondera lo antes posible.'
      : 'Your message is now in the support queue. An operator will review the case and respond as soon as possible.',
    submitError: es ? 'No pudimos enviar tu solicitud. Intenta de nuevo en un momento.' : 'We could not send your request. Please try again in a moment.',
    labels: {
      fullName: es ? 'Nombre Completo *' : 'Full Name *',
      email: es ? 'Correo Electronico *' : 'Email Address *',
      issueType: es ? 'Tipo de Problema *' : 'Issue Type *',
      orderReference: es ? 'Referencia de Pedido' : 'Order Reference',
      message: es ? 'Que esta pasando? *' : 'What is happening? *',
    },
    placeholders: {
      fullName: es ? 'Tu nombre completo' : 'Your full name',
      email: es ? 'tu@correo.com' : 'you@example.com',
      orderReference: es ? 'ORD-2026-0001 (opcional)' : 'ORD-2026-0001 (optional)',
      message: es
        ? 'Comparte los detalles, lo que intentabas hacer y cualquier numero de pedido o contexto util...'
        : 'Share the details, what you were trying to do, and any order number or context that helps...',
    },
    issueOptions: es
      ? {
          'Portal Access': 'Acceso al Portal',
          'Order Issue': 'Problema con Pedido',
          'Return / Replacement': 'Devolucion / Reemplazo',
          'Billing / Invoice': 'Facturacion / Factura',
          'Account Restore': 'Restaurar Cuenta',
          'Documents / COA': 'Documentos / COA',
          'Other': 'Otro',
        }
      : Object.fromEntries(ISSUE_OPTIONS.map((option) => [option, option])),
    escalations: es ? 'Las alertas de soporte se envian actualmente a' : 'Support alerts currently route to',
    faqTitle: es ? 'Notas de Soporte' : 'Support Notes',
  };

  const formMotionProps = reduceMotion
    ? {
        initial: false,
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, scale: 0.95 },
      };

  const successMotionProps = reduceMotion
    ? {
        initial: false,
        animate: { opacity: 1 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
      };

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (submitError) setSubmitError('');
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const messageParts = [
      formData.orderReference ? `Order Reference: ${formData.orderReference}` : '',
      formData.message,
    ].filter(Boolean);

    setSubmitError('');
    setIsSubmitting(true);

    try {
      await submitSupportRequest({
        email: formData.email,
        fullName: formData.fullName,
        issueType: formData.issueType,
        message: messageParts.join('\n\n'),
        sourcePage: location.pathname || '/support',
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setIsSubmitting(false);
        setFormData({
          fullName: session?.fullName || '',
          email: session?.email || '',
          issueType: 'Portal Access',
          orderReference: '',
          message: '',
        });
      }, 2500);
    } catch {
      setSubmitError(text.submitError);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0f] transition-colors duration-300">
      <section className="py-12 md:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
            <div className="lg:w-5/12 space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-montserrat font-black text-brand-navy dark:text-white uppercase tracking-tight leading-tight">
                  {text.title} <span className="text-brand-orange block">{text.titleAccent}</span>
                </h1>
                <p className="text-lg md:text-xl text-brand-navy/70 dark:text-gray-400 font-medium leading-relaxed">
                  {text.subtitle}
                </p>
              </div>

              <div className="space-y-6 pt-6">
                <div className="flex gap-4">
                  <LifeBuoy className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">Support Queue</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">Requests land in the PEPTQ support ledger with issue type, message, and source route.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <PackageSearch className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">Order Context</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">Include an order reference if the issue touches shipping, payment, invoice, or fulfillment.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <ShieldCheck className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">Single Intake Path</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">{text.escalations} <span className="font-bold text-brand-navy dark:text-gray-200">{supportEmail}</span>.</p>
                  </div>
                </div>
                <div className="flex gap-4 bg-brand-orange/5 p-4 rounded-xl border border-brand-orange/20">
                  <MessageSquareWarning className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-orange uppercase tracking-widest text-sm">Manual Lite</h3>
                    <p className="text-sm text-brand-navy/70 dark:text-gray-400">Support is triaged by issue type first, then moved through owner review from the dashboard and sheet queue.</p>
                  </div>
                </div>
              </div>
            </div>

                <div className="lg:w-7/12 w-full">
                  <AnimatePresence mode="wait">
                    {!submitted ? (
                  <MotionForm
                    key="form"
                    onSubmit={handleSubmit}
                    className="bg-white dark:bg-white/5 border-2 border-brand-navy dark:border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-sm"
                    {...formMotionProps}
                  >
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label htmlFor="support-full-name" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">{text.labels.fullName}</label>
                          <input id="support-full-name" data-autofocus type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className={inputClasses} placeholder={text.placeholders.fullName} />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="support-email" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">{text.labels.email}</label>
                          <input id="support-email" type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClasses} placeholder={text.placeholders.email} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label htmlFor="support-issue-type" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">{text.labels.issueType}</label>
                          <select
                            id="support-issue-type"
                            name="issueType"
                            value={formData.issueType}
                            onChange={handleChange}
                            required
                            className={`${inputClasses} scheme-light dark:scheme-dark`}
                          >
                            {ISSUE_OPTIONS.map((option) => (
                              <option key={option} value={option} className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100">
                                {text.issueOptions[option] || option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="support-order-reference" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">{text.labels.orderReference}</label>
                          <input id="support-order-reference" type="text" name="orderReference" value={formData.orderReference} onChange={handleChange} className={inputClasses} placeholder={text.placeholders.orderReference} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="support-message" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">{text.labels.message}</label>
                        <textarea id="support-message" name="message" value={formData.message} onChange={handleChange} rows="6" required className={`${inputClasses} resize-none`} placeholder={text.placeholders.message} />
                      </div>

                      <button type="submit" disabled={isSubmitting} className="w-full bg-brand-orange hover:bg-[#b84600] text-white font-black py-5 rounded-xl transition-all shadow-xl hover:shadow-brand-orange/20 transform hover:-translate-y-1 disabled:opacity-50 uppercase tracking-widest">
                        {isSubmitting ? text.processing : text.submit}
                      </button>
                      <div className="text-center">
                        <Link to="/catalog" className="text-xs font-black uppercase tracking-widest text-brand-navy/65 dark:text-gray-300 underline underline-offset-2 hover:text-brand-orange">
                          {text.backToCatalog}
                        </Link>
                      </div>
                      {submitError && <p role="alert" className="text-center text-sm font-bold text-brand-orange">{submitError}</p>}
                    </div>
                  </MotionForm>
                ) : (
                  <MotionDiv
                    key="success"
                    role="status"
                    aria-live="polite"
                    className="bg-white dark:bg-white/5 border-2 border-brand-navy dark:border-white/10 rounded-3xl p-16 text-center shadow-2xl backdrop-blur-sm"
                    {...successMotionProps}
                  >
                    <div className="w-24 h-24 bg-brand-orange rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-brand-orange/20">
                      <span className="text-4xl text-white font-bold" aria-hidden="true">OK</span>
                    </div>
                    <h2 className="text-3xl font-black text-brand-navy dark:text-white uppercase mb-4 tracking-tight">{text.successTitle}</h2>
                    <p className="text-brand-navy/70 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                      {text.successBody}
                    </p>
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-[#0a0a0f] border-t dark:border-white/5 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-montserrat font-black text-brand-navy dark:text-white mb-12 uppercase tracking-tighter text-center">
            {text.faqTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                q: es ? 'Acceso al portal?' : 'Portal access issue?',
                a: es ? 'Usa "Portal Access" si no puedes entrar, si tu PIN fallo o si necesitas revisar tu estado.' : 'Use "Portal Access" if you cannot sign in, your PIN failed, or you need your status reviewed.',
              },
              {
                q: es ? 'Problema con pedido?' : 'Order issue?',
                a: es ? 'Agrega tu numero de pedido para que el operador revise estado, pago, rastreo o discrepancias.' : 'Add your order number so the operator can review status, payment, tracking, or discrepancy details.',
              },
              {
                q: es ? 'Restaurar cuenta?' : 'Need account restore?',
                a: es ? 'Selecciona "Account Restore" si solicitaste eliminacion y ahora necesitas volver a entrar.' : 'Choose "Account Restore" if you previously requested deletion and now need access restored.',
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-white dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 rounded-2xl p-6 hover:border-brand-orange/40 transition-colors">
                <h3 className="font-bold text-brand-navy dark:text-white mb-3 text-sm uppercase tracking-wide">{faq.q}</h3>
                <p className="text-xs text-brand-navy/60 dark:text-gray-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SupportPage;

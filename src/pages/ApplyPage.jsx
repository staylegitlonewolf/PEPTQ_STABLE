
  import { useState } from 'react';
  // eslint-disable-next-line no-unused-vars
  import { motion, AnimatePresence } from 'framer-motion';
  import { useManifest } from '../context/ManifestContext';
  import { buildSubmissionPayload, submitResearchInquiry } from '../services/submissionService';
  import { ShieldCheck, ClipboardList, Beaker } from 'lucide-react';
  import { Link } from 'react-router-dom';
  import { useAccessibility } from '../context/AccessibilityContext';

const BETA_MODE = import.meta.env.VITE_BETA_MODE === 'true';

const ApplyPage = () => {
  const { language = 'en', reduceMotion } = useAccessibility();
  const es = language === 'es';
  const { manifestItems } = useManifest();

  // Client final additions (insert exactly as written; do not merge/rewrite).
  const ageRequirementNote = 'Applicants must be 21 years of age or older.';
  const proceedAcknowledgment = 'By proceeding, you confirm that you are at least 21 years of age, are a qualified purchaser acquiring materials strictly for lawful laboratory research use, understand associated risks, and agree to all Terms and Conditions.';

  const toAbsoluteImageUrl = (imagePath) => {
    if (!imagePath) return '';
    try {
      return new URL(imagePath, window.location.origin).href;
    } catch {
      return imagePath;
    }
  };

  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    researchArea: '',
    message: '',
    preferredContact: 'Email',
    agreed: false,
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const text = {
    title: es ? 'Solicitud de Cuenta' : 'Research Account',
    titleAccent: es ? 'de Investigacion' : 'Application',
    subtitle: es
      ? 'Envia tus credenciales institucionales para acceder al inventario verificado de PEPTQ.'
      : "Submit your institutional credentials to access PEPTQ's verified research inventory.",
    apply: es ? 'Solicitar Acceso' : 'Apply for Access',
    processing: es ? 'Procesando Solicitud...' : 'Processing Application...',
    successTitle: es ? 'Solicitud Recibida' : 'Application Received',
    successBody: es
      ? 'Nuestro equipo esta revisando tus credenciales. Recibiras una actualizacion dentro de 24-48 horas.'
      : 'Our institutional compliance team is reviewing your credentials. You will receive a status update within 24-48 hours.',
    verificationFaq: es ? 'FAQ de Verificacion' : 'Verification FAQ',
    submitError: es ? 'La solicitud fallo. Intenta de nuevo en un momento.' : 'Submission failed. Please try again in a moment.',
    labels: {
      company: es ? 'Nombre de Institucion *' : 'Company Name *',
      contact: es ? 'Nombre de Contacto *' : 'Contact Name *',
      email: es ? 'Correo Electronico *' : 'Email Address *',
      phone: es ? 'Numero de Telefono *' : 'Phone Number *',
      researchArea: es ? 'Area de Investigacion *' : 'Research Area *',
      scope: es ? 'Descripcion del Alcance' : 'Description of Scope',
      preferred: es ? 'Metodo de Contacto Preferido *' : 'Preferred Contact Method *',
      agree: es
        ? 'Acepto los Terminos Institucionales y confirmo que los materiales son para uso de investigacion de laboratorio.'
        : 'I agree to the Institutional Terms, certify that I am at least 21 years of age, and confirm all materials are intended strictly for laboratory research use only in compliance with local and federal regulations.',
    },
    placeholders: {
      institution: es ? 'Institucion' : 'Institution',
      fullName: es ? 'Nombre completo' : 'Full Name',
      email: es ? 'tu@institucion.edu o correo comercial verificado' : 'you@institution.edu or verified business email',
      phone: '+1 (555) 000-0000',
      specialty: es ? 'Selecciona una especialidad' : 'Select a specialty',
      scope: es ? 'Compuestos especificos y uso esperado...' : 'Specific compounds and expected usage...',
    },
    contactMethod: {
      email: es ? 'Correo' : 'Email',
      phone: es ? 'Telefono' : 'Phone',
    },
  };

  const inputClasses = "w-full px-4 py-3 border border-brand-navy dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-brand-navy dark:text-gray-100 placeholder:text-brand-navy/50 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition-all";
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (submitError) setSubmitError('');
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const rawEmail = String(formData.email || '').trim();
    const normalizedEmail = rawEmail.toLowerCase();
    const emailParts = normalizedEmail.split('@');
    const domain = emailParts.length === 2 ? String(emailParts[1] || '').trim() : '';
    const freeDomains = new Set([
      'gmail.com',
      'googlemail.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
      'live.com',
      'msn.com',
      'icloud.com',
      'aol.com',
      'proton.me',
      'protonmail.com',
      'gmx.com',
      'pm.me',
    ]);

    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    const allowedInstitutionOrBusinessEmail = looksLikeEmail
      && Boolean(domain)
      && (domain.endsWith('.edu') || !freeDomains.has(domain));

    if (!allowedInstitutionOrBusinessEmail) {
      setSubmitError(es
        ? 'Usa un correo institucional (.edu) o un correo comercial verificado (no dominios gratuitos).'
        : 'Use an institutional (.edu) or verified business email (no free email domains).');
      return;
    }

    const payload = buildSubmissionPayload({ formData, manifestItems, toAbsoluteImageUrl });
    setSubmitError('');
    setIsSubmitting(true);

    try {
      await submitResearchInquiry(payload);
      setSubmitted(true);

      setTimeout(() => {
        setSubmitted(false);
        setIsSubmitting(false);
        setFormData({
          companyName: '',
          contactName: '',
          email: '',
          phone: '',
          researchArea: '',
          message: '',
          preferredContact: 'Email',
          agreed: false,
        });
      }, 2500);
    } catch (error) {
      setSubmitError(error?.message || text.submitError);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-300">
      <section className="py-12 md:py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">

            {/* LEFT COLUMN: Title and Description */}
            <div className="lg:w-5/12 space-y-8">
              <div className="space-y-4">
                <h1 className={`font-montserrat font-black text-brand-navy dark:text-white uppercase tracking-tight leading-tight ${
                  es ? 'text-4xl md:text-5xl lg:text-6xl xl:text-[5.25rem]' : 'text-4xl md:text-5xl lg:text-7xl'
                }`}>
                  {text.title}{' '}
                  <span className={`text-brand-orange block ${
                    es ? 'text-[0.82em] md:text-[0.8em] lg:text-[0.78em]' : ''
                  }`}>
                    {text.titleAccent}
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-brand-navy/70 dark:text-gray-400 font-medium leading-relaxed">
                  {text.subtitle}
                </p>
              </div>

              <div className="space-y-6 pt-6">
                <div className="flex gap-4">
                  <ShieldCheck className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">Strict Verification</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">All accounts undergo institutional credential and research-use review before approval.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <ClipboardList className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">Batch Traceability</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">Full HPLC and COA documentation is provided for each verified research lot.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <ShieldCheck className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">Secure Intake</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">Application details are transmitted over HTTPS and used only for account verification and access updates.</p>
                  </div>
                </div>
                {manifestItems.length > 0 && (
                  <div className="flex gap-4 bg-brand-orange/5 p-4 rounded-xl border border-brand-orange/20">
                    <Beaker className="text-brand-orange shrink-0" size={28} />
                    <div>
                      <h3 className="font-bold text-brand-orange uppercase tracking-widest text-sm">Manifest Summary</h3>
                      <p className="text-sm text-brand-navy/70 dark:text-gray-400">Inquiry includes {manifestItems.length} selected items for research access.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: The Form */}
            <div className="lg:w-7/12 w-full">
              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="bg-white dark:bg-white/5 border-2 border-brand-navy dark:border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-sm"
                    {...formMotionProps}
                  >
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label htmlFor="apply-company-name" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">{text.labels.company}</label>
                          <input id="apply-company-name" data-autofocus type="text" name="companyName" value={formData.companyName} onChange={handleChange} required className={inputClasses} placeholder={text.placeholders.institution} />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="apply-contact-name" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">{text.labels.contact}</label>
                          <input id="apply-contact-name" type="text" name="contactName" value={formData.contactName} onChange={handleChange} required className={inputClasses} placeholder={text.placeholders.fullName} />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="apply-email" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">{text.labels.email}</label>
                          <input id="apply-email" type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClasses} placeholder={text.placeholders.email} />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="apply-phone" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">{text.labels.phone}</label>
                          <input id="apply-phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} required className={inputClasses} placeholder={text.placeholders.phone} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="apply-research-area" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">{text.labels.researchArea}</label>
                        <select
                          id="apply-research-area"
                          name="researchArea"
                          value={formData.researchArea}
                          onChange={handleChange}
                          required
                          className={`${inputClasses} scheme-light dark:scheme-dark`}
                        >
                          <option className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100" value="">{text.placeholders.specialty}</option>
                          <option className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100" value="Therapeutic Development">Therapeutic Development</option>
                          <option className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100" value="Drug Discovery">Drug Discovery</option>
                          <option className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100" value="Diagnostics">Diagnostics</option>
                          <option className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100" value="Academic Research">Academic Research</option>
                          <option className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100" value="Other">Other</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="apply-message" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">{text.labels.scope}</label>
                        <textarea id="apply-message" name="message" value={formData.message} onChange={handleChange} rows="4" className={`${inputClasses} resize-none`} placeholder={text.placeholders.scope} />
                      </div>

                      <div className="space-y-3">
                        <span className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">{text.labels.preferred}</span>
                        <div className="flex gap-8">
                          {['Email', 'Phone'].map((method) => (
                            <label key={method} htmlFor={`apply-preferred-${method.toLowerCase()}`} className="inline-flex items-center gap-2 text-brand-navy dark:text-gray-100 font-bold cursor-pointer">
                              <input id={`apply-preferred-${method.toLowerCase()}`} type="radio" name="preferredContact" value={method} checked={formData.preferredContact === method} onChange={handleChange} className="accent-brand-orange w-4 h-4" />
                              {method === 'Email' ? text.contactMethod.email : text.contactMethod.phone}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-start gap-3 py-2">
                        <input id="apply-agreed" type="checkbox" name="agreed" checked={formData.agreed} onChange={handleChange} required className="mt-1 accent-brand-orange w-4 h-4" />
                        <label htmlFor="apply-agreed" className="text-xs font-bold text-brand-navy/70 dark:text-gray-300">
                          {text.labels.agree}
                        </label>
                      </div>

                      <p className="text-xs font-semibold text-brand-navy/65 dark:text-gray-400 leading-relaxed">
                        {ageRequirementNote}
                      </p>
                      <p className="text-xs font-semibold text-brand-navy/65 dark:text-gray-400 leading-relaxed">
                        {proceedAcknowledgment}
                      </p>

                      <button type="submit" disabled={isSubmitting} className="w-full bg-brand-orange hover:bg-[#b84600] text-white font-black py-5 rounded-xl transition-all shadow-xl hover:shadow-brand-orange/20 transform hover:-translate-y-1 disabled:opacity-50 uppercase tracking-widest">
                        {isSubmitting ? text.processing : text.apply}
                      </button>
                      <p className="text-center text-[11px] font-semibold text-brand-navy/60 dark:text-gray-400 leading-relaxed">
                        {es
                          ? 'El envio no garantiza aprobacion. Todas las solicitudes estan sujetas a revision de cumplimiento y verificacion institucional.'
                          : 'Submission does not guarantee approval. All applications are subject to compliance review and institutional verification.'}
                      </p>
                      <p className="text-center text-[11px] font-semibold text-brand-navy/60 dark:text-gray-400 leading-relaxed">
                        {es
                          ? 'Todos los materiales estan destinados solo para uso de investigacion en laboratorio.'
                          : 'All materials are intended for laboratory research use only.'}
                      </p>
                      {!BETA_MODE && (
                        <div className="text-center">
                          <Link to="/catalog" className="text-xs font-black uppercase tracking-widest text-brand-navy/65 dark:text-gray-300 underline underline-offset-2 hover:text-brand-orange">
                            {text.guest}
                          </Link>
                        </div>
                      )}
                      {submitError && <p role="alert" className="text-center text-sm font-bold text-brand-orange">{submitError}</p>}
                    </div>
                  </motion.form>
                ) : (
                  <motion.div
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
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Grid Footer */}
      <section className="bg-gray-50 dark:bg-[#0a0a0f] border-t dark:border-white/5 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-montserrat font-black text-brand-navy dark:text-white mb-12 uppercase tracking-tighter text-center">
            {text.verificationFaq}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                q: es ? 'Tiempo de verificacion?' : 'Verification Time?',
                a: es ? 'Las credenciales institucionales normalmente se revisan en 24-48 horas habiles.' : 'Institutional credentials are typically reviewed within 24-48 business hours.',
              },
              {
                q: es ? 'Informacion requerida?' : 'Required Info?',
                a: es ? 'Se requiere nombre de empresa/universidad, alcance de investigacion y datos de contacto.' : 'Company/University name, research scope, and contact credentials are required.',
              },
              {
                q: es ? 'Terminos de pago?' : 'Payment Terms?',
                a: es ? 'Los pagos se procesan via metodos de factura aprobados (ACH o Zelle) despues de verificacion de cuenta y aprobacion de cumplimiento.' : 'Payments are processed via approved invoice methods (ACH or Zelle) following account verification and compliance approval.',
              },
              {
                q: es ? 'Internacional?' : 'International?',
                a: es ? 'Las ordenes internacionales se revisan caso por caso sujeto a cumplimiento regulatorio y viabilidad logistica.' : 'International orders are reviewed on a case-by-case basis subject to regulatory compliance and logistics feasibility.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 rounded-2xl p-6 hover:border-brand-orange/40 transition-colors">
                <h3 className="font-bold text-brand-navy dark:text-white mb-3 text-sm uppercase tracking-wide">{faq.q}</h3>
                <p className="text-xs text-brand-navy/60 dark:text-gray-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ApplyPage;

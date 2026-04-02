import React, { useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { X, ShieldCheck, ClipboardList, Beaker } from 'lucide-react';
import { useManifest } from '../context/ManifestContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { buildSubmissionPayload, submitResearchInquiry } from '../services/submissionService';
import { useAccessibleOverlay } from '../hooks/useAccessibleOverlay';

const ApplicationForm = ({ isOpen, onClose }) => {
  const { manifestItems, clearManifest } = useManifest();
  const { reduceMotion } = useAccessibility();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const steps = [
    { label: 'Identity', desc: 'Researcher & Institution' },
    { label: 'Compliance', desc: 'Research Intent' },
    { label: 'Verification', desc: 'Credential Review' },
  ];

  const [formData, setFormData] = useState({
    companyName: '',
    department: '',
    contactName: '',
    email: '',
    phone: '',
    researchArea: '',
    message: '',
    preferredContact: 'Email',
    agreed: false,
    eligibility: false,
  });
  const dialogRef = useAccessibleOverlay({ isOpen, onClose });
  const dialogTitleId = 'application-form-title';
  const dialogDescriptionId = 'application-form-description';

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

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload = buildSubmissionPayload({ formData, manifestItems });
      await submitResearchInquiry(payload);
      setSubmitted(true);

      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setIsSubmitting(false);
        clearManifest();
        setStep(1);
      }, 3000);
    } catch (error) {
      setSubmitError(error?.message || 'Verification server timeout. Please retry.');
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full px-4 py-3 border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#181824] text-brand-navy dark:text-gray-100 placeholder:text-gray-400 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange outline-none transition-all";
  const overlayMotionProps = reduceMotion
    ? {
        initial: false,
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
  const dialogMotionProps = reduceMotion
    ? {
        initial: false,
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 50, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 50, scale: 0.95 },
      };
  const stepMotionProps = reduceMotion
    ? {
        initial: false,
        animate: { opacity: 1 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <Motion.div
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-start md:items-center justify-center p-2 sm:p-4 overflow-y-auto"
          {...overlayMotionProps}
          onClick={onClose}
        >
          <Motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            aria-describedby={dialogDescriptionId}
            tabIndex={-1}
            className="bg-white dark:bg-[#0a0a0f] rounded-2xl md:rounded-[2.5rem] shadow-2xl max-w-5xl w-full border border-white/10 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row relative max-h-[94vh] lg:min-h-[650px]"
            {...dialogMotionProps}
            onClick={(e) => e.stopPropagation()}
          >
            {/* CLOSE BUTTON */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 md:top-8 md:right-8 z-50 text-gray-400 hover:text-brand-orange transition-all hover:rotate-90"
              aria-label="Close institutional verification form"
            >
              <X size={28} />
            </button>

            {/* LEFT SIDE: PRESTIGE SIDEBAR */}
            <div className="lg:w-2/5 bg-brand-navy dark:bg-white/5 p-6 md:p-8 lg:p-12 text-white flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/5">
              <div>
                <div className="mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center shadow-lg shadow-brand-orange/20">
                    <ShieldCheck size={24} className="text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-70">PEPTQ Security</span>
                </div>

                <h2 id={dialogTitleId} className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-[0.9] mb-6 md:mb-8">
                  Institutional <br />
                  <span className="text-brand-orange">Verification</span>
                </h2>

                <p id={dialogDescriptionId} className="text-sm text-white/60 leading-relaxed mb-8 md:mb-10 font-medium">
                  Submit institutional credentials for access to PEPTQ's verified research compounds.
                </p>

                {/* Step Progress Visualizer */}
                <div className="space-y-6 md:space-y-8">
                  {steps.map((s, idx) => (
                    <div key={idx} className={`flex items-center gap-5 transition-all duration-500 ${step >= idx + 1 ? 'opacity-100' : 'opacity-20'}`}>
                      <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${step >= idx + 1 ? 'bg-brand-orange border-brand-orange text-white shadow-lg shadow-brand-orange/30' : 'border-white/20 text-white'}`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest">{s.label}</p>
                        <p className="text-[10px] opacity-50 font-medium">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck size={18} className="text-brand-orange" aria-hidden="true" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">The Data Vault</span>
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed italic font-medium">
                  Verified accounts unlock full batch-specific traceability: HPLC logs, solubility tools, and molecular mapping data.
                </p>
              </div>
            </div>

            {/* RIGHT SIDE: INTERACTIVE FORM */}
            <div className="lg:w-3/5 p-5 sm:p-6 md:p-8 lg:p-12 bg-white dark:bg-[#0a0a0f] overflow-y-auto custom-scrollbar">
              {!submitted ? (
                <form onSubmit={handleSubmit} className="h-full flex flex-col justify-between">
                  <div className="space-y-8">

                    {/* STEP 1: IDENTITY */}
                    {step === 1 && (
                      <Motion.div {...stepMotionProps} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                          <div className="space-y-2">
                            <label htmlFor="application-company-name" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Research Institution *</label>
                            <input id="application-company-name" data-autofocus type="text" name="companyName" value={formData.companyName} onChange={handleChange} required className={inputClasses} placeholder="e.g. Stanford University" />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="application-department" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Department *</label>
                            <input id="application-department" type="text" name="department" value={formData.department} onChange={handleChange} required className={inputClasses} placeholder="e.g. Molecular Biology" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="application-contact-name" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Lead Researcher Name *</label>
                          <input id="application-contact-name" type="text" name="contactName" value={formData.contactName} onChange={handleChange} required className={inputClasses} placeholder="Dr. Alexander Wright" />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="application-email" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Institutional Email Address *</label>
                          <input id="application-email" type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClasses} placeholder="researcher@institution.edu" />
                        </div>
                        <button type="button" onClick={() => setStep(2)} className="w-full bg-brand-navy hover:bg-brand-orange text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-xs mt-6 transition-all shadow-xl active:scale-95">
                          Continue to Compliance
                        </button>
                      </Motion.div>
                    )}

                    {/* STEP 2: COMPLIANCE */}
                    {step === 2 && (
                      <Motion.div {...stepMotionProps} className="space-y-6">
                        <div className="space-y-2">
                          <label htmlFor="application-research-area" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Primary Research Specialty *</label>
                          <select
                            id="application-research-area"
                            name="researchArea"
                            value={formData.researchArea}
                            onChange={handleChange}
                            required
                            className={`${inputClasses} [color-scheme:light] dark:[color-scheme:dark]`}
                          >
                            <option className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100" value="">Select Specialization...</option>
                            <option className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100" value="Therapeutic">Therapeutic Development</option>
                            <option className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100" value="Neuroscience">Neuroscience & Cognitive Research</option>
                            <option className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100" value="Metabolic">Metabolic Pathway Analysis</option>
                            <option className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100" value="DrugDiscovery">High-Throughput Drug Discovery</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="application-message" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Research Intent Statement</label>
                          <textarea id="application-message" name="message" value={formData.message} onChange={handleChange} rows="5" className={`${inputClasses} resize-none`} placeholder="Summarize the intended application of the selected compounds..."></textarea>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <button type="button" onClick={() => setStep(1)} className="flex-1 bg-gray-100 dark:bg-white/5 text-gray-400 font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest transition-all">Back</button>
                          <button type="button" onClick={() => setStep(3)} className="flex-[2.5] bg-brand-navy text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-xs transition-all shadow-lg active:scale-95">Final Verification</button>
                        </div>
                      </Motion.div>
                    )}

                    {/* STEP 3: FINAL VERIFICATION */}
                    {step === 3 && (
                      <Motion.div {...stepMotionProps} className="space-y-8">
                        <div className="space-y-5 bg-gray-50 dark:bg-white/5 p-8 rounded-[2rem] border border-dashed border-gray-200 dark:border-white/10">
                          <div className="flex gap-4">
                            <input id="application-eligibility" type="checkbox" name="eligibility" checked={formData.eligibility} onChange={handleChange} required className="mt-1 accent-brand-orange h-5 w-5 cursor-pointer" />
                            <label htmlFor="application-eligibility" className="text-[11px] font-bold text-gray-500 dark:text-gray-300 uppercase leading-relaxed tracking-tight">
                              I certify I am 21+ years of age and authorized by the institution listed to procure research materials.
                            </label>
                          </div>
                          <div className="flex gap-4 pt-2 border-t border-gray-200/50 dark:border-white/5">
                            <input id="application-agreed" type="checkbox" name="agreed" checked={formData.agreed} onChange={handleChange} required className="mt-1 accent-brand-orange h-5 w-5 cursor-pointer" />
                            <label htmlFor="application-agreed" className="text-[11px] font-bold text-gray-500 dark:text-gray-300 uppercase leading-relaxed tracking-tight">
                              I acknowledge these compounds are strictly for Laboratory Research and meet all PEPTQ Supply Agreements.
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <button type="button" onClick={() => setStep(2)} className="flex-1 bg-gray-100 dark:bg-white/5 text-gray-400 font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest">Back</button>
                          <button type="submit" disabled={isSubmitting} className="flex-[2.5] bg-brand-orange text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-xs shadow-2xl shadow-brand-orange/30 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50">
                            {isSubmitting ? 'Authenticating...' : 'Submit Credentials'}
                          </button>
                        </div>
                        {submitError && <p role="alert" className="text-center text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">{submitError}</p>}
                      </Motion.div>
                    )}
                  </div>

                  {/* Scientific Compliance Badges */}
                  <div className="flex justify-center items-center gap-6 sm:gap-10 opacity-20 mt-10 md:mt-12 grayscale hover:grayscale-0 transition-all">
                    <div className="flex flex-col items-center">
                      <ShieldCheck size={24} />
                      <span className="text-[8px] font-black uppercase mt-2 tracking-widest">GHS Standard</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <ClipboardList size={24} />
                      <span className="text-[8px] font-black uppercase mt-2 tracking-widest">ACS Grade</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Beaker size={24} />
                      <span className="text-[8px] font-black uppercase mt-2 tracking-widest">21CFR Prep</span>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6" role="status" aria-live="polite">
                  <div className="w-24 h-24 bg-brand-orange/10 rounded-full flex items-center justify-center animate-pulse">
                    <ShieldCheck size={48} className="text-brand-orange" />
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter">Application Logged</h3>
                  <p className="text-xs text-gray-400 max-w-xs uppercase font-bold leading-relaxed tracking-widest">
                    Institutional verification is in progress. A compliance officer will contact you within 24-48 business hours.
                  </p>
                </div>
              )}
            </div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
};

export default ApplicationForm;


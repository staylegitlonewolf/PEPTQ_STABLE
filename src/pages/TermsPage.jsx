import { FileCheck, ShieldAlert, Scale, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { useAccessibility } from '../context/AccessibilityContext';
import { getLocalSystemSettings } from '../services/orderService';

function TermsPage() {
  const { language = 'en' } = useAccessibility();
  const { role, isApproved } = useAuth();
  const navigate = useNavigate();
  const es = language === 'es';

  const systemSettings = getLocalSystemSettings();
  const isStoreOn = systemSettings?.store_mode !== 'OFF';
  const isGuestOrPending = !role || ['GUEST', 'PENDING'].includes(role);
  const showRequestAccess = isGuestOrPending && isStoreOn;

  const researchUseAgreementLine = 'By accessing this site or completing a purchase, you agree that all materials are for research use only and not for human or veterinary use.';
  const shortResearchUseLine = es
    ? 'Todos los materiales estan destinados solo para uso de investigacion en laboratorio.'
    : 'All materials are intended for laboratory research use only.';
  const researchUseAgreementLineLocalized = es
    ? 'Al acceder a este sitio o completar una compra, aceptas que todos los materiales son solo para uso de investigacion y no para uso humano ni veterinario.'
    : researchUseAgreementLine;

  // Client final additions (insert exactly as written; do not merge/rewrite).
  const eligibilityInsert = 'You must be at least 21 years of age to access or purchase from PEPTQ. By using this site, you represent and warrant that you meet this requirement and are legally permitted to acquire materials for laboratory research purposes.';
  const ordersReturnsInsert = 'PEPTQ reserves the right to refuse, cancel, or restrict any order at its discretion if deemed non-compliant with research-use policies. Due to the nature of research materials, opened products are not eligible for return. Unopened items may be considered for return at PEPTQ’s discretion, subject to safety, handling, and chain-of-custody requirements.';
  const governingLawInsert1 = 'These Terms shall be governed by and interpreted in accordance with the laws of the State of Florida.';
  const governingLawInsert2 = 'Any disputes shall be subject to the exclusive jurisdiction of the courts located in Miami-Dade County, Florida.';
  const severabilityInsert = 'If any provision of these Terms is determined to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.';

  const sections = es ? [
    {
      title: 'Acuerdo de Uso Solo en Investigacion',
      points: [
        'Todos los materiales PEPTQ estan destinados estrictamente a investigacion en laboratorio.',
        'Los productos no son para uso humano ni veterinario.',
        'Al acceder al sitio o comprar, confirmas que el uso sera solo para investigacion y cumplimiento aplicable.',
      ],
    },
    {
      title: 'Eligibility',
      points: [
        eligibilityInsert,
      ],
    },
    {
      title: 'Elegibilidad y Verificacion',
      points: [
        'El acceso esta limitado a cuentas institucionales de investigacion verificadas.',
        'Las credenciales pueden requerir verificacion adicional.',
        'PEPTQ se reserva el derecho de aprobar o rechazar solicitudes a su discrecion.',
      ],
    },
    {
      title: 'Pedidos y Terminos de Pago',
      points: [
        'Los pedidos se gestionan mediante procesos institucionales basados en factura.',
        'Los metodos de pago aprobados incluyen ACH y Zelle.',
        'Los pedidos se liberan solo despues de pago liquidado y confirmacion operativa.',
      ],
    },
    {
      title: 'Orders, Returns & Refusals',
      points: [
        ordersReturnsInsert,
      ],
    },
    {
      title: 'Limitacion de Responsabilidad',
      points: [
        'PEPTQ no asume responsabilidad por mal uso, manejo inadecuado o incumplimiento.',
        'En la maxima medida permitida, la responsabilidad se limita segun estos terminos.',
      ],
    },
    {
      title: 'Indemnizacion',
      points: [
        'Aceptas indemnizar a PEPTQ por reclamos derivados de uso indebido o incumplimiento.',
      ],
    },
    {
      title: 'Responsabilidad de Cumplimiento',
      points: [
        'Eres responsable de cumplir con leyes y regulaciones aplicables.',
        'Eres responsable de almacenamiento, manejo y uso seguro.',
      ],
    },
    {
      title: 'Comunicaciones y Uso de Datos',
      points: [
        'Los datos enviados por formularios se usan para verificacion, lista de espera y soporte.',
        'PEPTQ no vende datos enviados por formularios.',
        'Consulta la Politica de Privacidad para detalles.',
      ],
    },
    {
      title: 'Governing Law',
      points: [
        governingLawInsert1,
        governingLawInsert2,
      ],
    },
    {
      title: 'Severability',
      points: [
        severabilityInsert,
      ],
    },
    {
      title: 'Modificaciones a los Terminos',
      points: [
        'PEPTQ puede actualizar estos terminos periodicamente.',
        'El uso continuo del sitio indica aceptacion de los terminos vigentes.',
      ],
    },
  ] : [
    {
      title: 'Research Use Only Agreement',
      points: [
        'All materials are intended for laboratory research use only.',
        'Products are not for human or veterinary use.',
        'You are responsible for ensuring all materials are used in compliance with applicable research regulations.',
      ],
    },
    {
      title: 'Eligibility',
      points: [
        eligibilityInsert,
      ],
    },
    {
      title: 'Eligibility & Verification',
      points: [
        'Access is limited to verified institutional research accounts.',
        'Institutional credentials are subject to compliance review and verification.',
        'PEPTQ may approve or deny access at its discretion.',
      ],
    },
    {
      title: 'Orders & Payment Terms',
      points: [
        'Orders are handled through an institutional, invoice-based process.',
        'Approved payment methods include ACH and Zelle.',
        'Orders are released only after cleared payment and operational confirmation.',
      ],
    },
    {
      title: 'Orders, Returns & Refusals',
      points: [
        ordersReturnsInsert,
      ],
    },
    {
      title: 'Limitation of Liability',
      points: [
        'PEPTQ assumes no liability for misuse, improper handling, or purchaser regulatory non-compliance.',
        'To the maximum extent permitted, liability is limited as described in these terms.',
      ],
    },
    {
      title: 'Indemnification',
      points: [
        'You agree to indemnify and hold harmless PEPTQ for claims arising from misuse or non-compliance.',
      ],
    },
    {
      title: 'Compliance Responsibility',
      points: [
        'You are responsible for compliance with all applicable federal, state, and local laws and regulations.',
        'You are responsible for safe storage, handling, and authorized use.',
      ],
    },
    {
      title: 'Communications & Data Use',
      points: [
        'Contact details submitted through PEPTQ forms are used for access verification, waitlist updates, and support.',
        'PEPTQ does not sell submitted contact data.',
        'See the Privacy Policy for details.',
      ],
    },
    {
      title: 'Governing Law',
      points: [
        governingLawInsert1,
        governingLawInsert2,
      ],
    },
    {
      title: 'Severability',
      points: [
        severabilityInsert,
      ],
    },
    {
      title: 'Modifications to Terms',
      points: [
        'PEPTQ may update these terms from time to time.',
        'Continued use of the site indicates acceptance of the current terms.',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-300">
      <section className="py-12 md:py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col xl:flex-row gap-12 xl:gap-16 items-start">
            <div className="xl:w-5/12 space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-montserrat font-black text-brand-navy dark:text-white uppercase tracking-tight leading-tight">
                  {es ? 'Terminos y' : 'Terms'} <span className="text-brand-orange block">{es ? 'Condiciones' : '& Conditions'}</span>
                </h1>

                {showRequestAccess && (
                  <div className="py-2">
                    <button
                      type="button"
                      onClick={() => navigate('/apply')}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-[#e06d00]"
                    >
                      {es ? 'Solicitar Acceso de Investigacion' : 'Request Research Access'}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}

                <p className="text-lg md:text-xl text-brand-navy/70 dark:text-gray-400 font-medium leading-relaxed">
                  {es
                    ? 'El acceso institucional de investigacion esta regido por restricciones claras de uso, requisitos de verificacion y responsabilidades de cumplimiento.'
                    : 'Institutional research access is governed by clear usage restrictions, verification requirements, and compliance responsibilities.'}
                </p>

                <div className="rounded-2xl border border-brand-orange/40 bg-brand-orange/10 p-5">
                  <p className="text-sm font-black text-brand-navy dark:text-gray-200 leading-relaxed">
                    {researchUseAgreementLineLocalized}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-brand-navy/65 dark:text-gray-400 leading-relaxed">
                    {shortResearchUseLine}
                  </p>
                </div>
              </div>

              <div className="space-y-6 pt-3">
                <div className="flex gap-4">
                  <FileCheck className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Acuerdo Documentado' : 'Documented Agreement'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">{es ? 'Los terminos definen las obligaciones para el acceso institucional de investigacion.' : 'Terms define the obligations for institutional research access.'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <ShieldAlert className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Restricciones de Uso' : 'Use Restrictions'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">{es ? 'Los materiales estan restringidos a contextos aprobados de investigacion y educacion.' : 'Materials are restricted to approved research and educational contexts.'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Scale className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Deber de Cumplimiento' : 'Compliance Duty'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">{es ? 'Los compradores son responsables del cumplimiento legal y regulatorio.' : 'Purchasers are responsible for legal and regulatory adherence.'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:w-7/12 w-full bg-white dark:bg-white/5 border-2 border-brand-navy dark:border-white/10 rounded-3xl p-7 md:p-10 shadow-2xl">
              <div className="space-y-7">
                {sections.map((section, index) => (
                  <div key={section.title} className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-5">
                    <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-brand-navy dark:text-white mb-3">
                      {index + 1}. {section.title}
                    </h2>
                    <ul className="list-disc pl-5 space-y-2">
                      {section.points.map((point) => (
                        <li key={point} className="text-sm text-brand-navy/75 dark:text-gray-300 leading-relaxed">{point}</li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-5">
                  <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-brand-navy dark:text-white mb-3">
                    {es ? 'Politica de Privacidad' : 'Privacy Policy'}
                  </h2>
                  <p className="text-sm text-brand-navy/75 dark:text-gray-300 leading-relaxed">
                    {es ? 'Lee la politica completa en la pagina dedicada.' : 'Read the full policy on the dedicated page.'}{' '}
                    <Link to="/privacy" className="font-bold text-brand-orange underline underline-offset-2">
                      {es ? 'Abrir Politica de Privacidad' : 'Open Privacy Policy'}
                    </Link>
                    .
                  </p>
                </div>

                <div className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-gray-50 dark:bg-black/20 p-5">
                  <p className="text-xs text-brand-navy/70 dark:text-gray-400">
                    <strong>{es ? 'Ultima Actualizacion:' : 'Last Updated:'}</strong> 2026-04-02.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default TermsPage;

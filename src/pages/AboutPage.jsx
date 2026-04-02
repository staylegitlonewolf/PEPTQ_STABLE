import { ShieldCheck, ClipboardList, Search, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { useAccessibility } from '../context/AccessibilityContext';
import { getLocalSystemSettings } from '../services/orderService';

function AboutPage() {
  const { language = 'en' } = useAccessibility();
  const { role } = useAuth();
  const navigate = useNavigate();
  const es = language === 'es';

  const systemSettings = getLocalSystemSettings();
  const isStoreOn = systemSettings?.store_mode !== 'OFF';
  // If role is GUEST or PENDING, show CTA
  const isGuestOrPending = !role || ['GUEST', 'PENDING'].includes(role);
  const showRequestAccess = isGuestOrPending && isStoreOn;

  const cards = es
    ? [
      { title: 'Integridad', desc: 'Pureza verificada y consistencia analitica en cada liberacion.' },
      { title: 'Documentacion', desc: 'COA y datos de soporte estructurados para auditoria.' },
      { title: 'Cumplimiento', desc: 'Validacion institucional antes del acceso de cuenta.' },
    ]
    : [
      { title: 'Integrity', desc: 'Verified purity and analytical consistency for each release.' },
      { title: 'Documentation', desc: 'COA and supporting data structured for auditability.' },
      { title: 'Compliance', desc: 'Institutional credential validation before account access.' },
    ];

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-300">
      <section className="py-12 md:py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col xl:flex-row gap-12 xl:gap-16 items-start">
            <div className="xl:w-5/12 space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-montserrat font-black text-brand-navy dark:text-white uppercase tracking-tight leading-tight">
                  {es ? 'Acerca de' : 'About'} <span className="text-brand-orange block">PEPTQ</span>
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
                    ? 'Suministro de investigacion de precision basado en disciplina analitica, documentacion transparente y soporte institucional.'
                    : 'Precision research supply built around analytical discipline, transparent documentation, and institutional support.'}
                </p>
              </div>

              <div className="space-y-6 pt-3">
                <div className="flex gap-4">
                  <ShieldCheck className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Integridad Analitica' : 'Analytical Integrity'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">{es ? 'Cada lote sigue verificacion HPLC con evidencia analitica documentada.' : 'Every batch follows HPLC verification with documented analytical evidence.'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <ClipboardList className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Trazabilidad de Lotes' : 'Batch Traceability'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">{es ? 'Desde la sintesis hasta la liberacion, los registros se estructuran para revision institucional.' : 'From synthesis through release, records are structured for institutional review.'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Search className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Alineacion de Investigacion' : 'Research Alignment'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">{es ? 'Las operaciones estan diseniadas para programas de investigacion y educacion aprobados.' : 'Operations are designed for approved laboratory and educational research programs.'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:w-7/12 w-full bg-white dark:bg-white/5 border-2 border-brand-navy dark:border-white/10 rounded-3xl p-7 md:p-10 shadow-2xl">
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-brand-navy dark:text-white mb-3">
                    {es ? 'Quienes Somos / Aviso' : 'Who We Are / Notice'}
                  </h2>
                  <p className="text-brand-navy/75 dark:text-gray-300 leading-relaxed font-medium">
                    {es
                      ? 'PEPTQ es una empresa de suministros para investigacion enfocada en acceso confiable a compuestos verificados analiticamente. Apoyamos a compradores de investigacion que requieren consistencia de calidad, documentacion clara y control de procesos responsable.'
                      : 'PEPTQ is a research supply company focused on reliable access to analytically verified compounds. We support research purchasers who require quality consistency, clear documentation, and accountable process control.'}
                  </p>
                  <p className="mt-3 text-sm text-brand-navy/70 dark:text-gray-400 leading-relaxed">
                    {es
                      ? 'PEPTQ es un proveedor de productos quimicos y no es una farmacia de compuestos o instalacion de compuestos bajo la Seccion 503A de la FDA, y no es una instalacion de subcontratacion bajo la Seccion 503B. Materiales restringidos a uso de laboratorio.'
                      : 'PEPTQ is a chemical supplier and is not a compounding pharmacy or chemical compounding facility under Section 503A of the Federal Food, Drug, and Cosmetic Act, and is not an outsourcing facility under Section 503B. All materials are restricted to qualified laboratory, research, and analytical use.'}
                  </p>
                </div>

                <div>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-brand-navy dark:text-white mb-3">{es ? 'Estandar Operativo' : 'Operating Standard'}</h2>
                  <p className="text-brand-navy/75 dark:text-gray-300 leading-relaxed font-medium">
                    {es
                      ? 'Nuestro marco de procesos enfatiza manejo controlado, rutas de verificacion de terceros y documentacion por lote para apoyar la gobernanza de laboratorio y flujos de cumplimiento institucional.'
                      : 'Our process framework emphasizes controlled handling, third-party verification pathways, and batch-level documentation intended to support laboratory governance and institutional compliance workflows.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {cards.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-4">
                      <h3 className="text-sm font-black uppercase tracking-wide text-brand-navy dark:text-white mb-2">{item.title}</h3>
                      <p className="text-xs text-brand-navy/70 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-brand-orange/40 bg-brand-orange/10 dark:bg-brand-orange/10 p-5">
                  <p className="text-sm font-bold text-brand-navy dark:text-gray-200 leading-relaxed">
                    {es
                      ? 'Todos los materiales estan destinados solo para uso de investigacion en laboratorio.'
                      : 'All materials are intended for laboratory research use only.'}
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

export default AboutPage;

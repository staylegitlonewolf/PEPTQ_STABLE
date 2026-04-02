import { Target, ShieldCheck, ArrowRightCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { useAccessibility } from '../context/AccessibilityContext';
import { getLocalSystemSettings } from '../services/orderService';

function MissionPage() {
  const { language = 'en' } = useAccessibility();
  const { role } = useAuth();
  const navigate = useNavigate();
  const es = language === 'es';

  const systemSettings = getLocalSystemSettings();
  const isStoreOn = systemSettings?.store_mode !== 'OFF';
  const isGuestOrPending = !role || ['GUEST', 'PENDING'].includes(role);
  const showRequestAccess = isGuestOrPending && isStoreOn;

  const values = es ? [
    {
      title: 'Integridad Analitica',
      desc: 'Cada lote sigue protocolos HPLC y rutas de verificacion independiente para confirmacion objetiva de calidad.',
    },
    {
      title: 'Continuidad de Lote',
      desc: 'Los estandares de proceso controlado priorizan consistencia y trazabilidad durante todo el ciclo de liberacion.',
    },
    {
      title: 'Enfoque Institucional',
      desc: 'Los servicios se disenan para laboratorios aprobados que requieren abastecimiento responsable para investigacion.',
    },
  ] : [
    {
      title: 'Analytical Integrity',
      desc: 'Each batch follows HPLC protocols and independent verification pathways for objective quality confirmation.',
    },
    {
      title: 'Batch Continuity',
      desc: 'Controlled process standards prioritize consistency and traceable lifecycle records across releases.',
    },
    {
      title: 'Institutional Focus',
      desc: 'Services are designed for approved laboratory environments requiring accountable research sourcing.',
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
                  {es ? 'Mision' : 'Mission'} <span className="text-brand-orange block">{es ? 'Estructura' : 'Framework'}</span>
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
                    ? 'Impulsando el acceso a investigacion con compuestos verificados, controles transparentes y estandares institucionales disciplinados.'
                    : 'Advancing research access through verified compounds, transparent controls, and disciplined institutional standards.'}
                </p>
              </div>

              <div className="space-y-6 pt-3">
                <div className="flex gap-4">
                  <Target className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Objetivo Claro' : 'Clear Objective'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">{es ? 'Proveer suministro confiable para investigacion con confianza analitica verificable.' : 'Provide dependable research supply with verifiable analytical confidence.'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <ShieldCheck className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Gobernanza Controlada' : 'Controlled Governance'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">{es ? 'Alinear documentacion y cumplimiento con expectativas institucionales de conformidad.' : 'Align documentation and fulfillment to institutional compliance expectations.'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:w-7/12 w-full bg-white dark:bg-white/5 border-2 border-brand-navy dark:border-white/10 rounded-3xl p-7 md:p-10 shadow-2xl">
              <div className="space-y-8">
                <div className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-brand-navy/5 dark:bg-black/20 p-5">
                  <p className="text-lg md:text-xl text-brand-navy dark:text-white font-bold leading-relaxed">
                    {es
                      ? '"Apoyar a equipos de investigacion aprobados con compuestos verificados analiticamente, visibilidad completa de lotes y disciplina constante de abastecimiento."'
                      : '“To support approved research teams with analytically verified compounds, complete batch visibility, and consistent sourcing discipline.”'}
                  </p>
                </div>

                <div>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-brand-navy dark:text-white mb-4">{es ? 'Valores Clave' : 'Core Values'}</h2>
                  <div className="space-y-4">
                    {values.map((value) => (
                      <div key={value.title} className="border-l-4 border-brand-orange pl-4 py-1">
                        <h3 className="text-sm font-black uppercase tracking-wide text-brand-navy dark:text-white mb-1">{value.title}</h3>
                        <p className="text-sm text-brand-navy/70 dark:text-gray-400 leading-relaxed">{value.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-5">
                    <h3 className="text-sm font-black uppercase tracking-wide text-brand-navy dark:text-white mb-3">{es ? 'A Quien Apoyamos' : 'Who We Support'}</h3>
                    <ul className="space-y-2 text-sm text-brand-navy/75 dark:text-gray-300">
                      <li>{es ? 'Universidades y grupos academicos de investigacion' : 'Universities and academic research groups'}</li>
                      <li>{es ? 'Laboratorios autorizados y equipos CRO' : 'Licensed laboratories and CRO teams'}</li>
                      <li>{es ? 'Programas institucionales de investigacion farmaceutica' : 'Institutional pharmaceutical research programs'}</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-5">
                    <h3 className="text-sm font-black uppercase tracking-wide text-brand-navy dark:text-white mb-3">{es ? 'Estandar de Ejecucion' : 'Execution Standard'}</h3>
                    <ul className="space-y-2 text-sm text-brand-navy/75 dark:text-gray-300">
                      <li>{es ? 'Flujo analitico verificado por liberacion' : 'Verified analytical workflow per release'}</li>
                      <li>{es ? 'Documentacion y registros de lote auditables' : 'Accountable documentation and batch records'}</li>
                      <li>{es ? 'Respuesta estructurada y continuidad de soporte' : 'Structured response and support continuity'}</li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-2xl border border-brand-orange/40 bg-brand-orange/10 p-5 flex items-start gap-3">
                  <ArrowRightCircle className="text-brand-orange mt-0.5" size={18} />
                  <p className="text-sm font-bold text-brand-navy dark:text-gray-200 leading-relaxed">
                    {es
                      ? 'Cada decision operativa se disena para mantener el acceso de investigacion confiable, transparente y listo para uso institucional a escala.'
                      : 'Every operational decision is designed to keep research access reliable, transparent, and institution-ready at scale.'}
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

export default MissionPage;

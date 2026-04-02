import { Landmark, ReceiptText, Truck, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { useAccessibility } from '../context/AccessibilityContext';
import { getLocalSystemSettings } from '../services/orderService';

function PaymentPolicyPage() {
  const { language = 'en' } = useAccessibility();
  const { role } = useAuth();
  const navigate = useNavigate();
  const es = language === 'es';

  const systemSettings = getLocalSystemSettings();
  const isStoreOn = systemSettings?.store_mode !== 'OFF';
  const isGuestOrPending = !role || ['GUEST', 'PENDING'].includes(role);
  const showRequestAccess = isGuestOrPending && isStoreOn;

  const processSteps = es ? [
    {
      step: 'Solicitud de Aplicacion',
      desc: 'Envia detalles del perfil institucional y alcance de investigacion a traves del flujo Solicitar Cuenta de Investigacion.',
    },
    {
      step: 'Revision de Credenciales',
      desc: 'La revision de cumplimiento confirma elegibilidad institucional y preparacion de cuenta.',
    },
    {
      step: 'Emision de Factura',
      desc: 'Las cuentas aprobadas reciben detalles de factura, actualizaciones de disponibilidad y guia de cumplimiento.',
    },
    {
      step: 'Pago y Liberacion',
      desc: 'La liberacion procede despues de confirmar pago ACH o Zelle.',
    },
  ] : [
    {
      step: 'Application Submission',
      desc: 'Submit institutional profile details and research scope via the Request Research Account workflow.',
    },
    {
      step: 'Credential Review',
      desc: 'Compliance review confirms institutional eligibility and account readiness.',
    },
    {
      step: 'Invoice Issuance',
      desc: 'Approved accounts receive invoice details, availability updates, and fulfillment guidance.',
    },
    {
      step: 'Payment and Release',
      desc: 'Fulfillment proceeds after cleared ACH or Zelle payment confirmation.',
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
                  {es ? 'Pago y' : 'Payment &'} <span className="text-brand-orange block">{es ? 'Pedidos' : 'Ordering'}</span>
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
                    ? 'Operaciones institucionales basadas en factura con pasos documentados para aprobacion, pago y liberacion.'
                    : 'Institutional invoice-based operations with documented steps for approval, payment, and release.'}
                </p>
              </div>

              <div className="space-y-6 pt-3">
                <div className="flex gap-4">
                  <Landmark className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">Accepted Methods</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">{es ? 'ACH y Zelle son los metodos de pago habilitados para cuentas aprobadas.' : 'ACH and Zelle are the supported payment rails for approved accounts.'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <ReceiptText className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Estandar de Factura' : 'Invoice Standard'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">{es ? 'Todas las transacciones se gestionan mediante flujos institucionales de facturacion.' : 'All transactions are managed through institutional invoice workflows.'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Truck className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Tiempo de Liberacion' : 'Release Timing'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">{es ? 'Los pedidos se liberan despues de confirmar pago y verificacion.' : 'Orders are released after payment clearance and verification completion.'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:w-7/12 w-full bg-white dark:bg-white/5 border-2 border-brand-navy dark:border-white/10 rounded-3xl p-7 md:p-10 shadow-2xl">
              <div className="space-y-8">
                <div className="rounded-2xl border border-brand-orange/40 bg-brand-orange/10 p-5">
                  <p className="text-sm font-bold text-brand-navy dark:text-gray-200 leading-relaxed">
                    {es
                      ? 'PEPTQ opera con un modelo institucional basado en facturas; no se admiten tarjetas de credito ni portales de consumo.'
                      : 'PEPTQ operates on an invoice-based institutional model; credit cards and consumer transaction portals are not supported.'}
                  </p>
                </div>

                <div>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-brand-navy dark:text-white mb-4">{es ? 'Flujo de Aprobacion y Cumplimiento' : 'Approval and Fulfillment Flow'}</h2>
                  <div className="space-y-3">
                    {processSteps.map((item, index) => (
                      <div key={item.step} className="rounded-xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-4">
                        <h3 className="text-sm font-black uppercase tracking-wide text-brand-navy dark:text-white mb-1">{index + 1}. {item.step}</h3>
                        <p className="text-sm text-brand-navy/70 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-5">
                    <h3 className="text-sm font-black uppercase tracking-wide text-brand-navy dark:text-white mb-3">{es ? 'Terminos de Factura' : 'Invoice Terms'}</h3>
                    <ul className="space-y-2 text-sm text-brand-navy/75 dark:text-gray-300">
                      <li>{es ? 'Validez de factura: 30 dias desde emision' : 'Invoice validity: 30 days from issuance'}</li>
                      <li>{es ? 'Terminos estandar: Net 30' : 'Standard terms: Net 30'}</li>
                      <li>{es ? 'Cuenta al dia requerida para nuevas liberaciones' : 'Account standing required for new releases'}</li>
                      <li>{es ? 'Todos los pagos son finales y no reversibles' : 'All payments are final and non-reversible'}</li>
                      <li>{es ? 'No se permiten contracargos o reversiones' : 'No chargebacks or reversals'}</li>
                      <li>{es ? 'Los pedidos se liberan solo despues de pago liquidado' : 'Orders are released only after cleared payment'}</li>
                      <li>{es ? 'Pago incompleto puede cancelar la asignacion' : 'Incomplete payment may cancel allocation'}</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-5">
                    <h3 className="text-sm font-black uppercase tracking-wide text-brand-navy dark:text-white mb-3">{es ? 'Paquete de Documentacion' : 'Documentation Package'}</h3>
                    <ul className="space-y-2 text-sm text-brand-navy/75 dark:text-gray-300">
                      <li>{es ? 'COA y datos de pureza analitica' : 'COA and analytical purity data'}</li>
                      <li>{es ? 'Identificadores de lote y contexto de trazabilidad' : 'Batch identifiers and traceability context'}</li>
                      <li>{es ? 'Informacion de almacenamiento y manejo' : 'Storage and handling information'}</li>
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-5">
                    <h3 className="text-sm font-black uppercase tracking-wide text-brand-navy dark:text-white mb-3">{es ? 'Politica de Envio' : 'Shipping Policy'}</h3>
                    <p className="text-sm text-brand-navy/70 dark:text-gray-400 leading-relaxed">
                      {es ? 'Lee la politica completa de envio en su pagina dedicada.' : 'Read the full shipping policy on its dedicated page.'}{' '}
                      <Link to="/shipping" className="font-bold text-brand-orange underline underline-offset-2">
                        {es ? 'Ver Politica de Envio' : 'View Shipping Policy'}
                      </Link>
                      .
                    </p>
                  </div>
                  <div className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-5">
                    <h3 className="text-sm font-black uppercase tracking-wide text-brand-navy dark:text-white mb-3">{es ? 'Politica de Reembolso' : 'Refund Policy'}</h3>
                    <p className="text-sm text-brand-navy/70 dark:text-gray-400 leading-relaxed">
                      {es ? 'Lee la politica completa de reembolso en su pagina dedicada.' : 'Read the full refund policy on its dedicated page.'}{' '}
                      <Link to="/refund" className="font-bold text-brand-orange underline underline-offset-2">
                        {es ? 'Ver Politica de Reembolso' : 'View Refund Policy'}
                      </Link>
                      .
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-brand-orange/40 bg-brand-orange/10 p-5">
                  <p className="text-sm font-bold text-brand-navy dark:text-gray-200 leading-relaxed">
                    {es
                      ? 'Al completar el pago, aceptas los Terminos y Condiciones de PEPTQ y confirmas que todos los materiales se compran solo para uso de investigacion.'
                      : "By completing payment, you agree to PEPTQ's Terms & Conditions and confirm that all materials are being purchased for research use only."}
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

export default PaymentPolicyPage;


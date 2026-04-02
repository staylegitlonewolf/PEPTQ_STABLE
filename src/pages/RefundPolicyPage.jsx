import { ReceiptText, ShieldAlert, Clock, PackageX } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

function RefundPolicyPage() {
  const { language = 'en' } = useAccessibility();
  const es = language === 'es';

  const sections = [
    {
      title: es ? 'Ventas finales' : 'All Sales Final',
      points: es ? [
        'Todas las ventas son finales.',
        'No se aceptan devoluciones de productos abiertos o materiales sensibles/restringidos.',
      ] : [
        'All sales are final.',
        'No returns are accepted for opened products or restricted/sensitive materials.',
      ],
    },
    {
      title: es ? 'Danios y discrepancias' : 'Damage and Discrepancies',
      points: es ? [
        'Reporta danos o discrepancias dentro de 48 horas de la entrega.',
        'Incluye el ID del pedido y detalles claros del problema para revision.',
      ] : [
        'Report damage or discrepancies within 48 hours of delivery.',
        'Include the order ID and clear details of the issue for review.',
      ],
    },
    {
      title: es ? 'Reemplazos' : 'Replacements',
      points: es ? [
        'Los reemplazos se emiten a discrecion de PEPTQ despues de revision.',
        'PEPTQ puede requerir evidencia o informacion adicional para verificar el reclamo.',
      ] : [
        'Replacements are issued at PEPTQ discretion after review.',
        'PEPTQ may require evidence or additional information to validate a claim.',
      ],
    },
    {
      title: es ? 'Envios rechazados o no entregables' : 'Refused or Undeliverable Shipments',
      points: es ? [
        'Envios rechazados o no entregables no son reembolsables.',
        'La exactitud de direccion es responsabilidad del comprador.',
      ] : [
        'Refused or undeliverable shipments are not refundable.',
        'Address accuracy is the purchaser responsibility.',
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
                  {es ? 'Politica de' : 'Refund'} <span className="text-brand-orange block">{es ? 'Reembolso' : 'Policy'}</span>
                </h1>
                <p className="text-lg md:text-xl text-brand-navy/70 dark:text-gray-400 font-medium leading-relaxed">
                  {es
                    ? 'Lineamientos claros de revision, reemplazo y ventas finales.'
                    : 'Clear review guidelines for issues, replacements, and final sales.'}
                </p>
              </div>

              <div className="space-y-6 pt-3">
                <div className="flex gap-4">
                  <ReceiptText className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Finalidad' : 'Finality'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">
                      {es ? 'Ventas finales y procesos de revision claros.' : 'Final sales with clear review process.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Clock className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Ventana de reporte' : 'Report Window'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">
                      {es ? 'Reporta dentro de 48 horas.' : 'Report within 48 hours.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <ShieldAlert className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Revision' : 'Review'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">
                      {es ? 'Se revisan reclamos antes de cualquier accion.' : 'Claims are reviewed before any action is taken.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <PackageX className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'No devoluciones' : 'No Returns'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">
                      {es ? 'No devoluciones en productos abiertos o restringidos.' : 'No returns on opened or restricted materials.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:w-7/12 w-full bg-white dark:bg-white/5 border-2 border-brand-navy dark:border-white/10 rounded-3xl p-7 md:p-10 shadow-2xl">
              <div className="space-y-7">
                {sections.map((section) => (
                  <div key={section.title} className="rounded-2xl border border-brand-navy/15 dark:border-white/15 bg-white dark:bg-black/20 p-5">
                    <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-brand-navy dark:text-white mb-3">
                      {section.title}
                    </h2>
                    <ul className="list-disc pl-5 space-y-2">
                      {section.points.map((point) => (
                        <li key={point} className="text-sm text-brand-navy/75 dark:text-gray-300 leading-relaxed">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

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

export default RefundPolicyPage;


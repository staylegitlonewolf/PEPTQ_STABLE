import { Truck, Clock, MapPin, Thermometer } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

function ShippingPolicyPage() {
  const { language = 'en' } = useAccessibility();
  const es = language === 'es';

  const sections = [
    {
      title: es ? 'Liberacion y envio' : 'Release and Shipping',
      points: es ? [
        'Los pedidos se envian solo despues de aprobacion de cuenta y pago confirmado.',
        'La liberacion ocurre despues de pago liquidado (ACH o Zelle) y confirmacion operativa.',
      ] : [
        'Orders ship only after account approval and confirmed payment.',
        'Release occurs after cleared payment (ACH or Zelle) and operational confirmation.',
      ],
    },
    {
      title: es ? 'Tiempo de procesamiento' : 'Processing Time',
      points: es ? [
        'Los tiempos de salida dependen del articulo, disponibilidad y requisitos de cumplimiento.',
        'Las actualizaciones de estado y seguimiento se proporcionan cuando el envio se procesa.',
      ] : [
        'Processing time depends on item availability and compliance requirements.',
        'Status updates and tracking are provided when shipment is processed.',
      ],
    },
    {
      title: es ? 'Seguimiento' : 'Tracking',
      points: es ? [
        'Cuando se envia un pedido, se registra informacion de seguimiento cuando esta disponible.',
        'Si necesitas verificacion o documentos, usa la pagina de Contacto.',
      ] : [
        'When an order ships, tracking information is recorded when available.',
        'For verification documents or assistance, use the Contact page.',
      ],
    },
    {
      title: es ? 'Restricciones de envio' : 'Shipping Restrictions',
      points: es ? [
        'Los envios pueden estar limitados por region y requisitos regulatorios.',
        'Los envios internacionales se revisan caso por caso sujeto a cumplimiento y viabilidad logistica.',
      ] : [
        'Shipments may be restricted by region and regulatory requirements.',
        'International orders are reviewed case-by-case subject to regulatory compliance and logistics feasibility.',
      ],
    },
    {
      title: es ? 'Exactitud de direccion' : 'Address Accuracy',
      points: es ? [
        'El comprador es responsable de proporcionar una direccion correcta y completa.',
        'Direcciones incorrectas o incompletas pueden causar retrasos o devoluciones.',
      ] : [
        'Purchasers are responsible for providing accurate and complete shipping addresses.',
        'Incorrect or incomplete addresses may cause delays or returns.',
      ],
    },
    {
      title: es ? 'Perdidas y retrasos' : 'Lost or Delayed Shipments',
      points: es ? [
        'Los retrasos del transportista o interrupciones estan fuera del control de PEPTQ.',
        'Si un envio parece perdido o retrasado, contacta soporte con el ID del pedido.',
      ] : [
        'Carrier delays or disruptions may occur and can be outside PEPTQ control.',
        'If a shipment appears lost or delayed, contact support with the order ID.',
      ],
    },
    {
      title: es ? 'Control de temperatura' : 'Temperature/Control',
      points: es ? [
        'Cuando aplica, se proveen instrucciones de almacenamiento y manejo con la documentacion del pedido.',
        'Los requisitos de control (si aplica) se comunican durante el proceso de liberacion.',
      ] : [
        'Where applicable, storage and handling instructions are provided with order documentation.',
        'Control requirements (if applicable) are communicated during release.',
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
                  {es ? 'Politica de' : 'Shipping'} <span className="text-brand-orange block">{es ? 'Envio' : 'Policy'}</span>
                </h1>
                <p className="text-lg md:text-xl text-brand-navy/70 dark:text-gray-400 font-medium leading-relaxed">
                  {es
                    ? 'Envio institucional despues de aprobacion y pago confirmado.'
                    : 'Institutional shipping after approval and cleared payment.'}
                </p>
              </div>

              <div className="space-y-6 pt-3">
                <div className="flex gap-4">
                  <Truck className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Envio institucional' : 'Institutional Shipping'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">
                      {es ? 'Los envios proceden solo despues de aprobacion y pago liquidado.' : 'Shipments proceed only after approval and cleared payment.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Clock className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Procesamiento' : 'Processing'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">
                      {es ? 'Los tiempos se comunican durante liberacion y factura.' : 'Timelines are communicated during release and invoicing.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <MapPin className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Restricciones' : 'Restrictions'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">
                      {es ? 'Las restricciones regionales pueden aplicar.' : 'Regional and regulatory restrictions may apply.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Thermometer className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Control' : 'Control'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">
                      {es ? 'Instrucciones de almacenamiento se entregan con documentacion.' : 'Storage instructions are delivered with documentation.'}
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

export default ShippingPolicyPage;


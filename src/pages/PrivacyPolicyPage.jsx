import { Shield, Lock, Share2, Mail } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

function PrivacyPolicyPage() {
  const { language = 'en' } = useAccessibility();
  const es = language === 'es';

  const sections = [
    {
      title: es ? 'Informacion que recopilamos' : 'Information We Collect',
      points: es ? [
        'Nombre completo',
        'Correo electronico',
        'Numero de telefono',
        'Empresa o institucion',
        'Alcance y proposito de investigacion (segun se envie en formularios)',
        'Datos de soporte enviados voluntariamente (mensaje, pagina de origen)',
      ] : [
        'Full name',
        'Email address',
        'Phone number',
        'Company or institution',
        'Research scope and purpose (as submitted in forms)',
        'Support data you submit voluntarily (message, source page)',
      ],
    },
    {
      title: es ? 'Por que la recopilamos' : 'Why We Collect It',
      points: es ? [
        'Verificar elegibilidad institucional y cumplimiento',
        'Administrar solicitudes de acceso, lista de espera y soporte',
        'Comunicarnos contigo sobre el estado de tu cuenta y actualizaciones de acceso',
      ] : [
        'Verify institutional eligibility and compliance',
        'Administer access applications, waitlist submissions, and support intake',
        'Contact you about account status and access updates',
      ],
    },
    {
      title: es ? 'Como se usa' : 'How It Is Used',
      points: es ? [
        'Revisar y procesar solicitudes',
        'Mantener registros operativos y de cumplimiento',
        'Enviar comunicaciones relacionadas con la cuenta (cuando aplique)',
      ] : [
        'Review and process submissions',
        'Maintain operational and compliance records',
        'Send account-related communications (when applicable)',
      ],
    },
    {
      title: es ? 'Con quien se comparte' : 'Who It Is Shared With',
      points: es ? [
        'PEPTQ no vende tu informacion.',
        'La informacion puede ser compartida solo con proveedores necesarios para operar el sitio y comunicaciones (por ejemplo, correo) y solo para ese fin.',
        'Se puede divulgar si es requerido por ley o para proteger la seguridad e integridad de los sistemas.',
      ] : [
        'PEPTQ does not sell your information.',
        'Information may be shared only with service providers required to operate the site and communications (for example, email) and only for that purpose.',
        'Information may be disclosed if required by law or to protect system integrity and safety.',
      ],
    },
    {
      title: es ? 'Como se protege' : 'How It Is Protected',
      points: es ? [
        'Transmision segura (HTTPS) para envios de formularios',
        'Controles de acceso operativos y administrativos',
        'Minimizacion: se recopila solo lo necesario para acceso institucional y soporte',
      ] : [
        'Secure transport (HTTPS) for form submissions',
        'Administrative and operational access controls',
        'Minimization: we collect what is needed for institutional access and support',
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
                  {es ? 'Politica de' : 'Privacy'} <span className="text-brand-orange block">{es ? 'Privacidad' : 'Policy'}</span>
                </h1>
                <p className="text-lg md:text-xl text-brand-navy/70 dark:text-gray-400 font-medium leading-relaxed">
                  {es
                    ? 'Descripcion clara de lo que se recopila, por que se recopila y como se protege.'
                    : 'A clear description of what is collected, why it is collected, and how it is protected.'}
                </p>
              </div>

              <div className="space-y-6 pt-3">
                <div className="flex gap-4">
                  <Shield className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Uso institucional' : 'Institutional Use'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">
                      {es ? 'La recopilacion existe para verificacion, cumplimiento y comunicacion de cuenta.' : 'Collection exists for verification, compliance, and account communication.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Lock className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'Proteccion' : 'Protection'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">
                      {es ? 'Se aplican controles tecnicos y administrativos para proteger los datos.' : 'Technical and administrative controls are applied to protect data.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Share2 className="text-brand-orange shrink-0" size={28} />
                  <div>
                    <h3 className="font-bold text-brand-navy dark:text-white uppercase tracking-widest text-sm">{es ? 'No venta' : 'No Sale'}</h3>
                    <p className="text-sm text-brand-navy/60 dark:text-gray-500">
                      {es ? 'PEPTQ no vende datos enviados por formularios.' : 'PEPTQ does not sell information submitted through forms.'}
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

                <div className="rounded-2xl border border-brand-orange/40 bg-brand-orange/10 p-5">
                  <div className="flex items-start gap-3">
                    <Mail className="text-brand-orange shrink-0" size={20} />
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wide text-brand-navy dark:text-white">
                        {es ? 'Contacto' : 'Contact'}
                      </h3>
                      <p className="text-sm text-brand-navy/75 dark:text-gray-300 leading-relaxed mt-1">
                        {es
                          ? 'Para preguntas sobre privacidad o datos, usa la pagina de Contacto.'
                          : 'For privacy or data questions, use the Contact page.'}
                      </p>
                    </div>
                  </div>
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

export default PrivacyPolicyPage;


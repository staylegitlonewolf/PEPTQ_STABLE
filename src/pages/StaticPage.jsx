import { useAccessibility } from '../context/AccessibilityContext';

const StaticPage = ({ title, subtitle, children }) => {
  const { language = 'en' } = useAccessibility();
  const es = language === 'es';
  const resolvedTitle = title || (es ? 'Contenido' : 'Content');

  return (
    <div className="min-h-dvh bg-white dark:bg-[#0a0a0f] transition-colors duration-300">
      {/* Hero Section */}
      <section className="bg-brand-navy text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-montserrat font-black mb-4">
            {resolvedTitle}
          </h1>
          {subtitle && (
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto prose dark:prose-invert prose-sm md:prose-base">
          {children}
        </div>
      </section>
    </div>
  );
};

export default StaticPage;

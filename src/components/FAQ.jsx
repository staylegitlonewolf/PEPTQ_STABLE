import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getDynamicFAQ } from '../services/orderService';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const normalizeFaqAnswer = (answer) => {
    const text = String(answer || '').trim();
    if (!text) return '';

    // Ensure PDF-required wording holds even if FAQs are overridden via owner settings.
    if (/invoice-?based/i.test(text) && /ACH/i.test(text) && /Zelle/i.test(text)) {
      return 'Payments are processed via approved invoice methods (ACH or Zelle) following account verification and compliance approval.';
    }

    if (/Orders are evaluated per region/i.test(text)) {
      return 'International orders are reviewed on a case-by-case basis subject to regulatory compliance and logistics feasibility.';
    }

    // Client launch polish: keep the full disclaimer in the footer only.
    if (/All products are intended strictly/i.test(text) || /not for human or veterinary use/i.test(text)) {
      return 'All materials are intended for laboratory research use only.';
    }

    return text;
  };

  const staticFaqs = [
    {
      question: 'Who can order from PEPTQ?',
      answer:
        'PEPTQ supplies research-grade peptides exclusively to verified institutions, including universities, pharmaceutical companies, and licensed research laboratories. All orders require institutional verification and approved research credentials.',
    },
    {
      question: 'What testing and verification do you provide?',
      answer:
        'Every batch is tested for purity using HPLC (High-Performance Liquid Chromatography) or HPLC-DAD methods. We provide full Certificates of Analysis (COA) with batch traceability, molecular formula verification, and analytical integrity documentation for all approved research accounts.',
    },
    {
      question: 'What payment methods do you accept?',
      answer:
        'Payments are processed via approved invoice methods (ACH or Zelle) following account verification and compliance approval.',
    },
    {
      question: 'Do you support international orders?',
      answer:
        'International orders are reviewed on a case-by-case basis subject to regulatory compliance and logistics feasibility.',
    },
    {
      question: 'How long does the approval process take?',
      answer:
        'Research account applications are typically reviewed within 24-48 hours. Once approved, you will receive an institutional invoice and access credentials to view batch verification documentation.',
    },
    {
      question: 'Are these products for human consumption?',
      answer:
        'All materials are intended for laboratory research use only.',
    },
  ];

  const dynamicFaqs = getDynamicFAQ();
  const selectedFaqs = Array.isArray(dynamicFaqs) && dynamicFaqs.length ? dynamicFaqs : staticFaqs;
  const faqs = selectedFaqs.map((faq) => ({
    ...faq,
    answer: normalizeFaqAnswer(faq.answer),
  }));

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 px-6 bg-white dark:bg-gray-950">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-montserrat font-black text-brand-navy dark:text-gray-100 mb-2 text-center">
          Frequently Asked Questions
        </h2>
        <p className="text-brand-navy text-opacity-70 dark:text-gray-300 dark:text-opacity-100 mb-12 text-center">
          Learn more about our institutional research supply process
        </p>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={faq.id || index}
              className="bg-white dark:bg-gray-900 border-2 border-brand-navy dark:border-gray-700 rounded-peptrx overflow-hidden"
            >
              <button
                type="button"
                id={`faq-trigger-${index}`}
                aria-expanded={openIndex === index}
                aria-controls={`faq-panel-${index}`}
                onClick={() => toggleFAQ(index)}
                className={`w-full flex items-center justify-between p-6 text-left transition ${
                  openIndex === index
                    ? 'bg-brand-navy text-white'
                    : 'hover:bg-brand-navy/5 dark:hover:bg-gray-800'
                }`}
              >
                <h3
                  className={`pr-4 text-lg font-montserrat font-bold ${
                    openIndex === index ? 'text-white' : 'text-brand-navy dark:text-gray-100'
                  }`}
                >
                  {faq.question}
                </h3>
                {openIndex === index ? (
                  <ChevronUp className="text-brand-orange flex-shrink-0" size={24} />
                ) : (
                  <ChevronDown className="text-brand-orange flex-shrink-0" size={24} />
                )}
              </button>
              {openIndex === index && (
                <div
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${index}`}
                  className="px-6 pb-6 text-brand-navy text-opacity-80 dark:text-gray-300 dark:text-opacity-100"
                >
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;


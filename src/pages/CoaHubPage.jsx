import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, QrCode, FileText } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';

function CoaHubPage() {
  const BETA_MODE = import.meta.env.VITE_BETA_MODE === 'true';
  const navigate = useNavigate();
  const { language = 'en', reduceMotion } = useAccessibility();
  const es = language === 'es';

  const [lotId, setLotId] = useState('');
  const [error, setError] = useState('');

  const text = useMemo(() => ({
    title: es ? 'Biblioteca COA' : 'COA Library',
    subtitle: es
      ? 'Escanea el QR en tu etiqueta o ingresa un ID de lote para abrir el Certificado de Analisis.'
      : 'Scan the QR code on your label or enter a Lot ID to open the Certificate of Analysis.',
    betaNoticeTitle: es ? 'No disponible en beta' : 'Not available in beta',
    betaNoticeBody: es
      ? 'La biblioteca COA esta deshabilitada en esta version beta. Los codigos QR finales deben apuntar a peptq.com/coa/<ID_DE_LOTE>.'
      : 'The COA Library is disabled in this beta build. Final QR codes should point to peptq.com/coa/<LOT_ID>.',
    lotLabel: es ? 'ID de lote' : 'Lot ID',
    placeholder: es ? 'Ej: MIC1026-01' : 'Example: MIC1026-01',
    open: es ? 'Abrir COA' : 'Open COA',
    hint: es
      ? 'Esto abrira el perfil de verificacion del lote y el enlace COA cuando este disponible.'
      : 'This opens the batch verification profile and the COA link when available.',
    tipsTitle: es ? 'Consejos' : 'Tips',
    tips: es
      ? [
          'Los IDs de lote distinguen mayusculas/minusculas; copia exactamente lo que aparece en la etiqueta.',
          'Si tu QR ya abre un enlace, asegurate de que apunte a /coa/<LOT_ID>.',
          'Si falta el documento COA, el lote aun puede mostrarse como verificado mientras se publica el PDF.'
        ]
      : [
          'Lot IDs are case-sensitive; match the label exactly.',
          'If you already have a QR link, point it to /coa/<LOT_ID>.',
          'If the COA document is missing, the lot may still show as verified while the PDF is published.'
        ],
  }), [es]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');
    if (BETA_MODE) {
      setError(text.betaNoticeTitle);
      return;
    }
    const next = String(lotId || '').trim();
    if (!next) {
      setError(es ? 'Ingresa un ID de lote.' : 'Enter a Lot ID.');
      return;
    }
    navigate(`/coa/${encodeURIComponent(next)}`);
  };

  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-brand-navy/10 bg-white/80 p-8 shadow-xl dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-orange/30 bg-brand-orange/10 text-brand-orange">
              <QrCode size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-orange">
                {es ? 'Verificacion de lote' : 'Batch verification'}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-brand-navy dark:text-white">
                {text.title}
              </h1>
              <p className="mt-3 text-sm text-brand-navy/70 dark:text-gray-300">
                {text.subtitle}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <label className="block text-[11px] font-black uppercase tracking-[0.18em] text-brand-navy/60 dark:text-white/60">
              {text.lotLabel}
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={lotId}
                onChange={(e) => setLotId(e.target.value)}
                placeholder={text.placeholder}
                disabled={BETA_MODE}
                className="h-12 w-full rounded-xl border border-brand-navy/15 bg-white px-4 text-sm font-semibold text-brand-navy outline-none transition focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/20 dark:border-white/10 dark:bg-[#0b1220] dark:text-white"
              />
              <button
                type="submit"
                disabled={BETA_MODE}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#e06d00] active:scale-[0.99]"
                style={reduceMotion ? undefined : { willChange: 'transform' }}
              >
                <Search size={16} />
                {text.open}
              </button>
            </div>
            {BETA_MODE ? (
              <div className="mt-4 rounded-2xl border border-brand-orange/35 bg-brand-orange/10 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-orange">
                  {text.betaNoticeTitle}
                </p>
                <p className="mt-2 text-xs font-semibold text-brand-navy/70 dark:text-gray-300">
                  {text.betaNoticeBody}
                </p>
              </div>
            ) : null}
            {error ? (
              <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>
            ) : (
              <p className="mt-3 text-xs text-brand-navy/60 dark:text-gray-300/80">
                {text.hint}
              </p>
            )}
          </form>

          <div className="mt-8 rounded-2xl border border-brand-navy/10 bg-white/60 p-6 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-navy/60 dark:text-white/60">
                {text.tipsTitle}
              </p>
              <FileText size={18} className="text-brand-orange" />
            </div>
            <div className="mt-3 space-y-2 text-sm text-brand-navy/70 dark:text-gray-300">
              {text.tips.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CoaHubPage;

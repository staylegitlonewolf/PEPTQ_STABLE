import { useState } from 'react';
import { Boxes } from 'lucide-react';

  const normalizeText = (value) => String(value || '').trim();

function CatalogImage({
  src = '',
  alt = '',
  className = '',
  wrapperClassName = '',
  placeholderLabel = 'Image pending',
}) {
  const normalizedSrc = normalizeText(src);
  const [failedSrc, setFailedSrc] = useState('');
  const hasError = Boolean(normalizedSrc) && failedSrc === normalizedSrc;

  if (!normalizedSrc || hasError) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center text-center ${wrapperClassName}`.trim()}>
        <Boxes className="h-8 w-8 text-brand-navy/25 dark:text-white/20" />
        <p className="mt-2 text-[11px] font-semibold text-brand-navy/55 dark:text-gray-400">
          {placeholderLabel}
        </p>
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      className={className}
      onError={() => setFailedSrc(normalizedSrc)}
    />
  );
}

export default CatalogImage;

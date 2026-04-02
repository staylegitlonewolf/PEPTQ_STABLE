import { useMemo, useRef, useState } from 'react';
import { fetchPubChemData } from '../services/catalogService';

const inputClass = 'w-full rounded-xl border border-brand-navy/20 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-3 text-sm text-brand-navy dark:text-gray-100 placeholder:text-brand-navy/40 dark:placeholder:text-gray-500 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20';
const selectClass = `${inputClass} [color-scheme:light] dark:[color-scheme:dark]`;

const stageOrder = ['idle', 'uploading', 'synced'];
const HANDLE_ADVISORY_LENGTH = 40;
const DEFAULT_PURITY_STRING = '≥99% PURITY (HPLC VERIFIED)';
const HPLC_DAD_PURITY_STRING = '≥99% PURITY (HPLC-DAD)';

const createInitialPreview = () => ({
  title: '',
  strength: '',
  description: '',
  purity: DEFAULT_PURITY_STRING,
  formula: '',
  mass: '',
  cas_number: '',
  form_factor: '',
  solubility: '',
  inventory: 'INQUIRY',
  storage: '',
  research_usesafetyInfo: 'Research Use Only. Handle with standard lab precautions.',
  price_vip: '',
  cid_pubchem: '',
  synonyms: [],
});

const createPredictedHandle = (title, strength) => {
  const combined = [String(title || '').trim(), String(strength || '').trim()]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!combined) return '';

  return combined
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const mergeLabeledLines = (baseText, entries = []) => {
  const base = String(baseText || '').trim();
  const normalizedBase = base.toLowerCase();
  const extras = entries
    .filter(({ label, value }) => String(value || '').trim() && !normalizedBase.includes(`${String(label || '').trim().toLowerCase()}:`))
    .map(({ label, value }) => `${String(label || '').trim()}: ${String(value || '').trim()}`);

  return [base, ...extras].filter(Boolean).join('\n');
};

function ProductUploader({ onSubmit, referenceItems = [] }) {
  const [title, setTitle] = useState('');
  const [casNumber, setCasNumber] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFileBase64, setImageFileBase64] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [imageMimeType, setImageMimeType] = useState('');
  const [statusStage, setStatusStage] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('Awaiting product intake.');
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState(createInitialPreview());
  const [previewReady, setPreviewReady] = useState(false);
  const [stagedStrength, setStagedStrength] = useState('');
  const [strengthQueue, setStrengthQueue] = useState([]);
  const [publishMode, setPublishMode] = useState('DRAFT');

  const fileInputRef = useRef(null);

  const progressPercent = useMemo(() => {
    const index = stageOrder.indexOf(statusStage);
    if (index < 0) return 0;
    return Math.round((index / (stageOrder.length - 1)) * 100);
  }, [statusStage]);

  const predictedHandle = useMemo(
    () => createPredictedHandle(previewData.title, previewData.strength),
    [previewData.title, previewData.strength]
  );
  const isHandleLong = predictedHandle.length > HANDLE_ADVISORY_LENGTH;
  const referenceSuggestions = useMemo(() => {
    const query = String(title || casNumber || '').trim().toLowerCase();
    const seen = new Set();

    return referenceItems
      .flatMap((item) => [
        String(item?.name || item?.title || '').trim(),
        String(item?.handle || item?.id || item?.slug || '').trim(),
        String(item?.cas || item?.cas_number || '').trim(),
      ])
      .filter((entry) => {
        const normalized = String(entry || '').trim().toLowerCase();
        if (!normalized || seen.has(normalized)) return false;
        seen.add(normalized);
        return !query || normalized.includes(query);
      })
      .slice(0, 8);
  }, [title, casNumber, referenceItems]);
  const referenceQueryFound = referenceSuggestions.length > 0 || Boolean(String(previewData.cid_pubchem || '').trim());
  const canEditDetails = previewReady || Boolean(String(title || previewData.title || '').trim());
  const referenceQuery = useMemo(
    () => String(previewData.cas_number || casNumber || previewData.title || title || '').trim(),
    [previewData.cas_number, casNumber, previewData.title, title]
  );

  const resetFileState = () => {
    setImageFileBase64('');
    setImageFileName('');
    setImageMimeType('');
  };

  const resetPreview = () => {
    setPreviewData(createInitialPreview());
    setPreviewReady(false);
    setStagedStrength('');
    setStrengthQueue([]);
  };

  const addStrengthVariant = () => {
    const normalizedStrength = String(stagedStrength || '').trim();
    if (!normalizedStrength) {
      setStatusMessage('Enter a strength value before staging another variant.');
      return;
    }

    setStrengthQueue((prev) => {
      const exists = prev.some((item) => item.toLowerCase() === normalizedStrength.toLowerCase());
      if (exists) return prev;
      return [...prev, normalizedStrength];
    });
    setStagedStrength('');
  };

  const removeStrengthVariant = (target) => {
    setStrengthQueue((prev) => prev.filter((item) => item !== target));
  };

  const encodeFile = async (file) => {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Image read failed.'));
      reader.readAsDataURL(file);
    });

    const base64Content = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
    if (!base64Content) {
      throw new Error('Unable to parse image file.');
    }

    setImageFileBase64(base64Content);
    setImageFileName(file.name || 'catalog-image.png');
    setImageMimeType(file.type || 'image/png');
    setImageUrl('');
    setStatusMessage('Product photo staged for upload.');
  };

  const handleSelectFile = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file) {
      resetFileState();
      return;
    }

    try {
      await encodeFile(file);
    } catch (error) {
      resetFileState();
      setStatusStage('idle');
      setStatusMessage(error?.message || 'Image upload preparation failed.');
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event?.dataTransfer?.files?.[0];
    if (!file) return;

    try {
      await encodeFile(file);
    } catch (error) {
      resetFileState();
      setStatusStage('idle');
      setStatusMessage(error?.message || 'Image upload preparation failed.');
    }
  };

  const handleSubmit = async () => {
    try {
      if (!String(previewData.title || title || '').trim()) {
        throw new Error('Product name is required before final submit.');
      }

      setStatusStage('uploading');
      setStatusMessage('Uploading Image...');

      const inlineStrength = String(previewData.strength || '').trim();
      const stagedVariants = Array.from(
        new Set([
          ...strengthQueue,
          ...(inlineStrength ? [inlineStrength] : []),
        ].map((entry) => String(entry || '').trim()).filter(Boolean))
      );

      const variants = stagedVariants.length ? stagedVariants : [''];

      for (const strengthValue of variants) {
        await onSubmit({
          title: strengthValue
            ? `${String(previewData.title || '').trim()} ${strengthValue}`.trim()
            : previewData.title,
          casNumber: previewData.cas_number || casNumber,
          cidPubchem: previewData.cid_pubchem,
          imageUrl,
          imageFileBase64,
          imageFileName,
          imageMimeType,
          description: mergeLabeledLines(previewData.description, [
            { label: 'Form', value: previewData.form_factor },
            { label: 'Solubility', value: previewData.solubility },
          ]),
          purity: previewData.purity,
          formula: previewData.formula,
          mass: previewData.mass,
          storage: previewData.storage,
          researchUseSafetyInfo: previewData.research_usesafetyInfo,
          inventory: previewData.inventory,
          priceVip: previewData.price_vip,
          visible: publishMode === 'PUBLISH',
        });
      }

      setStatusStage('synced');
      setStatusMessage(
        publishMode === 'PUBLISH'
          ? 'Synced. Product variants are queued to publish live in the store.'
          : 'Synced. Product variants are queued as draft for owner verification.'
      );
      setTitle('');
      setCasNumber('');
      setImageUrl('');
      resetPreview();
      resetFileState();
      setPublishMode('DRAFT');
    } catch (error) {
      setStatusStage('idle');
      setStatusMessage(error?.message || 'Product intake failed.');
    }
  };

  const handleGeneratePreview = async () => {
    const workingTitle = String(title || '').trim();
    if (!workingTitle) {
      setStatusMessage('Product name is required before generating preview.');
      return;
    }

    setPreviewData((prev) => ({
      ...prev,
      title: workingTitle,
      cas_number: casNumber || prev.cas_number,
    }));

    setPreviewReady(true);
    setStatusStage('synced');
    setStatusMessage('Preview staged. Review and edit all fields before submit.');
  };

  const handleAutoFillFromPubChem = async () => {
    const lookupQuery = String(casNumber || title || previewData.cas_number || previewData.title || '').trim();
    if (!lookupQuery) {
      setStatusStage('idle');
      setStatusMessage('Enter a product name or CAS number before running PubChem autofill.');
      return;
    }

    try {
      setIsAutoFilling(true);
      setStatusStage('uploading');
      setStatusMessage('Checking PubChem for product reference data...');

      const result = await fetchPubChemData(lookupQuery);
      if (!result?.success || !result?.data) {
        setStatusStage('idle');
        setStatusMessage(result?.message || 'PubChem autofill failed. Manual entry is still available.');
        return;
      }

      const nextData = result.data;
      setTitle((prev) => nextData.title || prev);
      setCasNumber((prev) => nextData.cas_number || prev);
      setPreviewData((prev) => ({
        ...prev,
        title: nextData.title || prev.title || lookupQuery,
        cas_number: nextData.cas_number || prev.cas_number,
        formula: nextData.formula || prev.formula,
        mass: nextData.mass || prev.mass,
        cid_pubchem: nextData.cid_pubchem || prev.cid_pubchem,
        synonyms: Array.isArray(nextData.synonyms) ? nextData.synonyms : prev.synonyms,
      }));
      setPreviewReady(true);
      setStatusStage('synced');
      setStatusMessage(result.message || 'PubChem autofill succeeded. Review all fields before submit.');
    } catch (error) {
      setStatusStage('idle');
      setStatusMessage(error?.message || 'PubChem autofill failed. Please enter details manually.');
    } finally {
      setIsAutoFilling(false);
    }
  };

  const updatePreviewField = (field, value) => {
    setPreviewData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 p-3 space-y-3">
      <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">Simplified Uploader</p>
      <p className="text-xs text-brand-navy/65 dark:text-gray-400">Owner-safe workflow for adding new catalog entries with automated enrichment.</p>

      <input
        id="owner-catalog-product-name"
        name="catalogProductName"
        className={inputClass}
        list="owner-catalog-reference-suggestions"
        value={title}
        onChange={(event) => {
          const nextValue = event.target.value;
          setTitle(nextValue);
          setPreviewData((prev) => ({
            ...prev,
            title: nextValue,
          }));
          if (String(nextValue || '').trim() && !previewReady) {
            setPreviewReady(true);
          }
        }}
        placeholder="Product Name"
      />
      <datalist id="owner-catalog-reference-suggestions">
        {referenceSuggestions.map((entry) => (
          <option key={entry} value={entry} />
        ))}
      </datalist>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleAutoFillFromPubChem}
          disabled={isAutoFilling}
          className={`rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-widest ${
            isAutoFilling
              ? 'border border-brand-navy/15 dark:border-white/10 text-brand-navy/35 dark:text-gray-500 cursor-not-allowed'
              : 'border border-brand-orange/40 text-brand-orange'
          }`}
        >
          {isAutoFilling ? 'PubChem Running...' : 'Auto-Fill from PubChem'}
        </button>
        <button
          type="button"
          onClick={handleGeneratePreview}
          className="rounded-xl border border-brand-orange/40 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-brand-orange"
        >
          Generate Preview
        </button>
      </div>
      <p className="text-[11px] text-brand-navy/65 dark:text-gray-400">
        PubChem is optional helper logic only. If lookup fails, the uploader stays manual and the site keeps running.
      </p>

      <input
        id="owner-catalog-cas-number"
        name="catalogCasNumber"
        className={inputClass}
        value={casNumber}
        onChange={(event) => {
          const nextValue = event.target.value;
          setCasNumber(nextValue);
          setPreviewData((prev) => ({
            ...prev,
            cas_number: nextValue,
          }));
        }}
        placeholder="CAS (optional)"
      />
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-brand-navy/55 dark:text-gray-500">Backup references:</span>
        <a href="https://pubchem.ncbi.nlm.nih.gov/" target="_blank" rel="noreferrer" className="font-black uppercase tracking-widest text-brand-orange">PubChem</a>
        <a href="https://commonchemistry.cas.org/" target="_blank" rel="noreferrer" className="font-black uppercase tracking-widest text-brand-orange">CAS Common Chemistry</a>
        <a href="https://www.ebi.ac.uk/chembl/" target="_blank" rel="noreferrer" className="font-black uppercase tracking-widest text-brand-orange">ChEMBL</a>
        <a href="https://www.chemspider.com/" target="_blank" rel="noreferrer" className="font-black uppercase tracking-widest text-brand-orange">ChemSpider</a>
      </div>
      {referenceQuery && (
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <p className="text-brand-navy/60 dark:text-gray-400">
            Reference query: <span className="font-black text-brand-navy dark:text-gray-200">{referenceQuery}</span>
          </p>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-black uppercase tracking-widest ${
            referenceQueryFound
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          }`}>
            {referenceQueryFound ? 'FOUND' : 'MANUAL'}
          </span>
          <span className="text-brand-navy/55 dark:text-gray-500">
            {referenceQueryFound ? 'Reference match found while typing or via PubChem.' : 'No live match yet. Manual technical entry is still allowed.'}
          </span>
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-center text-xs cursor-pointer transition ${
          isDragging
            ? 'border-brand-orange bg-brand-orange/10 text-brand-navy dark:text-white'
            : 'border-brand-navy/20 dark:border-white/20 text-brand-navy/70 dark:text-gray-300'
        }`}
      >
        Drag and drop product photo here, or click to select
      </div>

      <input
        ref={fileInputRef}
        id="owner-catalog-image-file"
        name="catalogImageFile"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSelectFile}
      />

      <input
        id="owner-catalog-image-url"
        name="catalogImageUrl"
        className={inputClass}
        value={imageUrl}
        onChange={(event) => {
          setImageUrl(event.target.value);
          if (event.target.value) {
            resetFileState();
          }
        }}
        placeholder="Image URL (optional alternative)"
      />

      {imageFileName && (
        <p className="text-[11px] text-brand-navy/70 dark:text-gray-400">Staged file: {imageFileName}</p>
      )}

      {canEditDetails && (
        <div className="rounded-xl border border-brand-orange/25 bg-brand-orange/5 p-3 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-brand-orange">Technical Data & Catalog Fields</p>
          {predictedHandle && (
            <div className="rounded-lg border border-brand-navy/15 dark:border-white/15 bg-white/80 dark:bg-white/5 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">Predicted Slug</p>
              <p className="text-xs font-bold text-brand-navy dark:text-white mt-1">{predictedHandle}</p>
              {isHandleLong && (
                <p className="text-[11px] font-semibold text-brand-orange mt-1">
                  Advisory: slug is over {HANDLE_ADVISORY_LENGTH} characters. Consider shortening title/strength for cleaner portal URLs.
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={inputClass} value={previewData.title} onChange={(event) => updatePreviewField('title', event.target.value)} placeholder="Title" />
            <input className={inputClass} value={previewData.strength} onChange={(event) => updatePreviewField('strength', event.target.value)} placeholder="Strength (example: 10mg)" />
            <select
              className={selectClass}
              value={publishMode}
              onChange={(event) => setPublishMode(event.target.value === 'PUBLISH' ? 'PUBLISH' : 'DRAFT')}
            >
              <option className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100" value="DRAFT">Save as Draft</option>
              <option className="bg-white text-brand-navy dark:bg-[#111827] dark:text-gray-100" value="PUBLISH">Publish to Store</option>
            </select>
            <div className="space-y-2">
              <input
                className={inputClass}
                value={previewData.purity}
                onChange={(event) => updatePreviewField('purity', event.target.value)}
                placeholder="Purity String"
              />
              <div className="flex gap-2">
                <p className="text-xs font-medium text-gray-500 mb-1 w-full">Quick Fill: Purity</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updatePreviewField('purity', DEFAULT_PURITY_STRING)}
                  className="rounded-lg border border-brand-orange/40 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand-orange"
                >
                  HPLC VERIFIED
                </button>
                <button
                  type="button"
                  onClick={() => updatePreviewField('purity', HPLC_DAD_PURITY_STRING)}
                  className="rounded-lg border border-brand-orange/40 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand-orange"
                >
                  HPLC-DAD
                </button>
              </div>
            </div>
            <input className={inputClass} value={previewData.formula} onChange={(event) => updatePreviewField('formula', event.target.value)} placeholder="Formula" />
            <input className={inputClass} value={previewData.mass} onChange={(event) => updatePreviewField('mass', event.target.value)} placeholder="Molecular Mass" />
            <input className={inputClass} value={previewData.cas_number} onChange={(event) => updatePreviewField('cas_number', event.target.value)} placeholder="CAS Number" />
            <input className={inputClass} value={previewData.form_factor} onChange={(event) => updatePreviewField('form_factor', event.target.value)} placeholder="Form (example: lyophilized powder)" />
            <input className={inputClass} value={previewData.solubility} onChange={(event) => updatePreviewField('solubility', event.target.value)} placeholder="Solubility" />
            <input className={inputClass} value={previewData.inventory} onChange={(event) => updatePreviewField('inventory', event.target.value)} placeholder="Inventory" />
            <input className={inputClass} value={previewData.storage} onChange={(event) => updatePreviewField('storage', event.target.value)} placeholder="Storage Notes" />
            <input className={inputClass} value={previewData.price_vip} onChange={(event) => updatePreviewField('price_vip', event.target.value)} placeholder="Base Price ($)" />
          </div>
          <p className="text-[11px] text-brand-navy/60 dark:text-gray-400">
            Draft keeps the product hidden for review. Publish to Store creates it live immediately.
          </p>
          {(previewData.cid_pubchem || (Array.isArray(previewData.synonyms) && previewData.synonyms.length > 0)) && (
            <div className="rounded-lg border border-brand-navy/10 dark:border-white/10 p-3 space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-400">Reference Snapshot</p>
              {previewData.cid_pubchem ? (
                <p className="text-xs text-brand-navy/70 dark:text-gray-300">PubChem CID: {previewData.cid_pubchem}</p>
              ) : null}
              {Array.isArray(previewData.synonyms) && previewData.synonyms.length > 0 ? (
                <p className="text-xs text-brand-navy/70 dark:text-gray-300">
                  Synonyms: {previewData.synonyms.slice(0, 4).join(' · ')}
                </p>
              ) : null}
            </div>
          )}

          <div className="rounded-lg border border-brand-navy/10 dark:border-white/10 p-3 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-400">Multi-Strength Quick Add</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className={inputClass}
                value={stagedStrength}
                onChange={(event) => setStagedStrength(event.target.value)}
                placeholder="Stage another strength (example: 20mg)"
              />
              <button
                type="button"
                onClick={addStrengthVariant}
                className="rounded-xl border border-brand-navy/25 dark:border-white/20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-brand-navy dark:text-gray-200"
              >
                Add Strength
              </button>
            </div>
            {strengthQueue.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {strengthQueue.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => removeStrengthVariant(entry)}
                    className="rounded-full border border-brand-navy/20 dark:border-white/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-brand-navy dark:text-gray-200"
                    title="Remove staged strength"
                  >
                    {entry} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          <textarea
            className={inputClass}
            rows={3}
            value={previewData.description}
            onChange={(event) => updatePreviewField('description', event.target.value)}
            placeholder="Scientific Summary"
          />
          <textarea
            className={inputClass}
            rows={2}
            value={previewData.research_usesafetyInfo}
            onChange={(event) => updatePreviewField('research_usesafetyInfo', event.target.value)}
            placeholder="Shipping / handling notes"
          />
        </div>
      )}

      <div className="space-y-1">
        <div className="h-2 w-full rounded-full bg-brand-navy/10 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full bg-brand-orange transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-brand-navy/70 dark:text-gray-400">{statusMessage}</p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="rounded-xl bg-brand-orange px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
      >
        Submit to Catalog
      </button>
    </div>
  );
}

export default ProductUploader;

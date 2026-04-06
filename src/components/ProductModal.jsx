import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, ShieldAlert, Printer } from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { useAccessibleOverlay } from '../hooks/useAccessibleOverlay';
import { getLocalOwnerSettings, getAssetUrl } from '../services/orderService';
import { toEmbeddableGoogleDriveUrl } from '../utils/driveLinks';
import { publicAssetAbsoluteUrl, publicAssetUrl } from '../utils/publicAssets';
import StructureViewer from './StructureViewer';
import CatalogImage from './CatalogImage';

const escapePrintHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const resolveStockMeta = (product, fallbackThreshold = 5) => {
  const rawStock = Number(product?.bulk_stock ?? product?.bulkStock ?? product?.stock_qty ?? product?.stockQty);
  const hasNumericStock = Number.isFinite(rawStock);
  const stock = hasNumericStock ? Math.max(0, rawStock) : null;
  const rawThreshold = Number(product?.low_stock_threshold ?? product?.lowStockThreshold);
  const threshold = Number.isFinite(rawThreshold) && rawThreshold > 0
    ? rawThreshold
    : Math.max(0, Number(fallbackThreshold || 0));
  const inStock = hasNumericStock ? stock > 0 : product?.in_stock !== false;
  const isLowStock = hasNumericStock && inStock && threshold > 0 && stock <= threshold;

  return {
    hasNumericStock,
    stock,
    threshold,
    inStock,
    isLowStock,
  };
};

const ProductModal = ({
  isOpen,
  product,
  onClose,
  onAddToManifest,
  onPreorder,
  canOrder = false,
  canPreorder = false,
  onRequestAccess,
  requestAccessLabel = 'Request Access',
  catalogItems = [],
  onNavigate = () => {},
}) => {
  // State initialized from props; key-based remount resets automatically
  const [activeProduct, setActiveProduct] = useState(product);
  const [activeTab, setActiveTab] = useState(0);
  const [requestedQuantity, setRequestedQuantity] = useState(Math.max(1, Number(product?.quantity || 1)));
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const navigate = useNavigate();
  const { reduceMotion } = useAccessibility();
  const dialogRef = useAccessibleOverlay({ isOpen, onClose });
  const lightLogo = toEmbeddableGoogleDriveUrl(
    getAssetUrl('WEBSITE_LIGHT_LOGO', getAssetUrl('light', publicAssetUrl('logo.svg')))
  );
  const productState = activeProduct || product || null;
  const stockMeta = resolveStockMeta(productState, 5);
  const canUseManifest = canOrder && stockMeta.inStock;
  const canUsePreorder = canPreorder && stockMeta.hasNumericStock && !stockMeta.inStock;
  const maxOrderable = stockMeta.hasNumericStock ? Math.max(1, Number(stockMeta.stock || 1)) : null;

  if (!isOpen || !activeProduct) return null;

  const sidebarCatalog = [...(Array.isArray(catalogItems) ? catalogItems : [])].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    return String(a.strength || '').localeCompare(String(b.strength || ''), undefined, { numeric: true, sensitivity: 'base' });
  });

  const handleAddToManifest = () => {
    const quantity = stockMeta.hasNumericStock
      ? Math.min(Math.max(1, Number(requestedQuantity || 1)), Math.max(1, Number(stockMeta.stock || 1)))
      : Math.max(1, Number(requestedQuantity || 1));
    onAddToManifest({ ...activeProduct, quantity });
    onClose();
  };

  const handleProductSelect = (prod) => {
    if (activeProduct?.id === prod.id) return;
    setActiveProduct(prod);
    setActiveTab(0);
    setRequestedQuantity(Math.max(1, Number(prod?.quantity || 1)));
    setIsOverviewExpanded(false);
    onNavigate(prod);
  };

  const handleOpenCoa = () => {
    const lotId = String(
      activeProduct?.lot_id
        ?? activeProduct?.lotId
        ?? activeProduct?.coa_lot_id
        ?? activeProduct?.coaLotId
        ?? activeProduct?.coa_lot
        ?? activeProduct?.coaLot
        ?? ''
    ).trim();

    if (lotId) {
      navigate('/coa/' + encodeURIComponent(lotId));
    } else {
      navigate('/coa');
    }

    onClose();
  };

  const handlePrintReference = () => {
    if (typeof window === 'undefined') return;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=980,height=760');
    if (!printWindow) return;

    const portalRoute = activeProduct?.handle
      ? `/portal/${encodeURIComponent(activeProduct.handle)}`
      : window.location.pathname;
    const portalUrl = `${window.location.origin}${portalRoute}`;

    const visualUrl = activeProduct.image;

    const parseLabel = (label) => String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const technicalMap = technicalItems.reduce((acc, line) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return acc;
      const label = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (!label || !value) return acc;
      acc[parseLabel(label)] = value;
      return acc;
    }, {});

    const getIdentifierValue = (targetLabel) => {
      const found = Array.isArray(activeProduct.identifiers)
        ? activeProduct.identifiers.find((entry) => String(entry?.label || '').trim().toLowerCase() === String(targetLabel).trim().toLowerCase())
        : null;
      return found?.value ? String(found.value).trim() : '';
    };

    const readTechValue = (...keys) => {
      for (const key of keys) {
        const normalized = parseLabel(key);
        if (technicalMap[normalized]) return technicalMap[normalized];
      }
      return '';
    };

    const blockA = [
      { label: 'Strength / Dosage', value: activeProduct.strength || 'N/A' },
      { label: 'Category Tag', value: activeProduct.category || 'N/A' },
    ];

    const blockB = [
      { label: 'Formula', value: readTechValue('Formula') || activeProduct.formula || 'N/A' },
      { label: 'Molecular Mass', value: readTechValue('Molecular Mass', 'Mass') || activeProduct.mass || 'N/A' },
      { label: 'CAS Number', value: readTechValue('CAS') || activeProduct.cas || 'Pending verification' },
    ];

    const blockC = [
      { label: 'Storage Temp', value: readTechValue('Storage', 'Storage Temp', 'Storage Temperature') || activeProduct.storage || 'See institutional handling protocol' },
      { label: 'Solubility', value: readTechValue('Solubility') || activeProduct.solubility || 'See technical data sheet' },
      { label: 'Appearance', value: getIdentifierValue('Appearance') || activeProduct.form || readTechValue('Form') || 'Batch-specific profile' },
      { label: 'Usage Status', value: 'Research Use Only' },
    ];

    const buildTableRows = (rows) => rows.map((row) => `
      <tr>
        <th>${escapePrintHtml(row.label)}</th>
        <td>${escapePrintHtml(row.value || 'N/A')}</td>
      </tr>
    `).join('');

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapePrintHtml(activeProduct.name)} Technical Dossier</title>
    <style>
      @page { size: letter; margin: 12mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
      }
      .page {
        width: 100%;
        min-height: calc(100vh - 24mm);
      }
      .doc-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e2e8f0;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .brand img { height: 24px; width: auto; }
      .doc-label {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #64748b;
      }
      .product-line {
        margin-top: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .product-line img {
        width: 42px;
        height: 42px;
        object-fit: contain;
      }
      .product-name {
        font-size: 30px;
        line-height: 1;
        font-weight: 900;
        margin: 0;
      }
      .product-strength {
        margin: 4px 0 0;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        color: #ea580c;
        letter-spacing: 0.08em;
      }
      .section-title {
        margin: 20px 0 10px;
        font-size: 19px;
        font-weight: 800;
      }
      .visual-frame {
        width: 100%;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 16px;
      }
      .visual-frame img {
        width: 100%;
        max-height: 240mm;
        object-fit: contain;
      }
      .block {
        margin-top: 14px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        overflow: hidden;
      }
      .block-title {
        margin: 0;
        padding: 8px 10px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #64748b;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
        padding: 8px 10px;
        vertical-align: top;
      }
      th {
        width: 34%;
        font-size: 12px;
        font-weight: 800;
      }
      td {
        font-size: 12px;
        color: #1f2937;
      }
      .footer-block {
        margin-top: 20px;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;
      }
      .footer-title {
        margin: 0;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: #64748b;
      }
      .footer-text {
        margin: 6px 0 0;
        font-size: 11px;
        line-height: 1.4;
      }
      .meta {
        margin-top: 8px;
        font-size: 11px;
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
      }
      .meta a {
        color: #ea580c;
        font-weight: 700;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <section class="page">
      <div class="doc-header">
        <div class="brand">
          <img src="${escapePrintHtml(lightLogo || publicAssetAbsoluteUrl('logo.svg'))}" alt="PEPTQ logo" />
          <span class="doc-label">Technical Dossier</span>
        </div>
        <span class="doc-label">${escapePrintHtml(new Date().toLocaleDateString())}</span>
      </div>

      <div class="product-line">
        <img src="${escapePrintHtml(activeProduct.image)}" alt="${escapePrintHtml(activeProduct.name)}" />
        <div>
          <h1 class="product-name">${escapePrintHtml(activeProduct.name)}</h1>
          <p class="product-strength">${escapePrintHtml(activeProduct.strength || '')}</p>
        </div>
      </div>

      <div class="visual-frame">
        <img id="visual-image" src="${escapePrintHtml(visualUrl)}" alt="${escapePrintHtml(activeProduct.name)} visual reference" />
      </div>

      <h2 class="section-title">Technical Dossier</h2>

      <section class="block">
        <h3 class="block-title">Block A: Header</h3>
        <table>
          <tbody>${buildTableRows(blockA)}</tbody>
        </table>
      </section>

      <section class="block">
        <h3 class="block-title">Block B: Core Science</h3>
        <table>
          <tbody>${buildTableRows(blockB)}</tbody>
        </table>
      </section>

      <section class="block">
        <h3 class="block-title">Block C: Guidance</h3>
        <table>
          <tbody>${buildTableRows(blockC)}</tbody>
        </table>
      </section>

      <div class="footer-block">
        <p class="footer-title">Research Use Only</p>
        <p class="footer-text">21+ certification required. All materials are intended for laboratory research use only.</p>
        <div class="meta">
          <a href="${escapePrintHtml(portalUrl)}" target="_blank" rel="noopener noreferrer">Portal Reference</a>
        </div>
      </div>
    </section>
  </body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    const waitForPrintAssets = () => new Promise((resolve) => {
      const childDocument = printWindow.document;
      const images = Array.from(childDocument.images || []);

      if (images.length === 0) {
        resolve();
        return;
      }

      let settled = 0;
      let resolved = false;

      const finish = () => {
        settled += 1;
        if (!resolved && settled >= images.length) {
          resolved = true;
          resolve();
        }
      };

      images.forEach((image) => {
        if (image.complete) {
          finish();
          return;
        }

        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
      });

      window.setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }, 2500);
    });

    const runPrint = async () => {
      await waitForPrintAssets();
      window.setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 120);
    };

    printWindow.addEventListener('afterprint', () => {
      window.setTimeout(() => {
        printWindow.close();
      }, 120);
    }, { once: true });

    if (printWindow.document.readyState === 'complete') {
      void runPrint();
    } else {
      printWindow.addEventListener('load', () => {
        void runPrint();
      }, { once: true });
    }
  };

  const tabs = [
    { label: 'Technical Data', icon: FileText },
    { label: 'Safety', icon: ShieldAlert },
    { label: 'Print', icon: Printer },
  ];

  const tabTitles = [
    '',
    'Safety Information',
    'Print',
  ];

  const overviewText = activeProduct.overview || activeProduct.description;
  const hasExpandableOverview = String(overviewText || '').trim().length > 260;
  const keyFeatures = Array.isArray(activeProduct.keyFeatures) ? activeProduct.keyFeatures : [];
  const researchFocus = Array.isArray(activeProduct.researchFocusNonClinical) ? activeProduct.researchFocusNonClinical : [];
  const researchApplications = Array.isArray(activeProduct.researchApplicationsNonClinical) ? activeProduct.researchApplicationsNonClinical : [];
  const notesForInvestigators = String(activeProduct.notesForInvestigators || '').trim();
  const regulatoryUse = String(activeProduct.regulatoryUse || '').trim();
  const showTechData = activeProduct.show_tech_data !== false;
  const ownerSettings = getLocalOwnerSettings();
  const enable3DViewer = ownerSettings?.enable_3d_viewer !== false;
  const technicalItems = String(activeProduct.technicalData || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
  const safetyText = activeProduct.safetyInfo || 'All materials are intended for laboratory research use only.';
  const dialogTitleId = activeProduct?.id ? `product-modal-title-${activeProduct.id}` : 'product-modal-title';
  const dialogDescriptionId = activeProduct?.id ? `product-modal-description-${activeProduct.id}` : 'product-modal-description';

  return (
    <div className="fixed inset-0 z-60 flex items-stretch md:items-center justify-center bg-white dark:bg-[#0a0a0f] p-0 sm:p-4 print-product-modal" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        tabIndex={-1}
        className="relative w-full h-full max-h-dvh sm:max-h-[95vh] flex flex-col xl:flex-row bg-white dark:bg-[#0a0a0f] overflow-y-auto xl:overflow-hidden rounded-none sm:rounded-2xl print-product-shell"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="xl:hidden sticky top-0 z-110 flex items-center justify-between gap-2 px-2.5 sm:px-3 py-2.5 sm:py-3 border-b border-gray-100 dark:border-gray-900 bg-white/95 dark:bg-[#0a0a0f]/95 backdrop-blur-sm print-hide">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintReference}
              className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 px-3 py-2 text-brand-navy dark:text-white shadow-sm"
              aria-label="Print product reference"
            >
              <Printer size={16} />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide">Print Reference</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCoa}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange/10 dark:bg-black/40 border border-brand-orange/35 dark:border-brand-orange/45 px-3 py-2 text-brand-orange shadow-sm"
              aria-label="Open COA lookup"
            >
              <FileText size={16} />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide">COA</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 p-2.5 text-brand-navy dark:text-white shadow-sm"
            aria-label="Close product modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* CLOSE BUTTON */}
        <button type="button" onClick={onClose} aria-label="Close product modal" className="hidden xl:block absolute top-3 right-3 sm:top-4 sm:right-4 z-100 rounded-full bg-white/80 dark:bg-black/50 border border-gray-200 dark:border-gray-800 p-2.5 sm:p-3 text-brand-navy dark:text-white hover:scale-110 transition-all shadow-2xl print-hide">
          <X size={22} />
        </button>

        {/* LEFT RAIL: BROWSE */}
        <div className="hidden xl:flex flex-col w-70 border-r border-gray-100 dark:border-gray-900 bg-gray-50/30 dark:bg-black/20 p-6 overflow-y-auto print-hide">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Catalog Index</h3>
          <div className="space-y-3">
            {sidebarCatalog.map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => handleProductSelect(prod)}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all border ${
                  activeProduct.id === prod.id
                  ? 'bg-white dark:bg-gray-800 border-brand-orange shadow-md'
                  : 'border-transparent opacity-40 hover:opacity-100'
                }`}
              >
                <CatalogImage
                  src={prod.image}
                  alt={prod.name || 'Catalog item'}
                  className="w-10 h-10 object-contain"
                  wrapperClassName="rounded-lg border border-dashed border-brand-navy/10 dark:border-white/10 bg-white/70 dark:bg-white/5"
                  placeholderLabel="Pending"
                />
                <div className="text-left">
                  <div className="text-xs font-bold text-brand-navy dark:text-white truncate w-32 flex items-center gap-1.5">
                    <span className="truncate">{prod.name}</span>
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                    <span className="text-brand-orange">{prod.strength}</span>
                    <span className={prod.in_stock === false ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>
                      {prod.in_stock === false ? 'OUT' : 'IN'}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: IMAGE */}
        <div className="relative flex flex-col items-center justify-start p-3 sm:p-7 md:p-8 bg-[#fcfcfc] dark:bg-[#08080c] min-h-55 shrink-0 xl:flex-1 print-omit">
          <div className="w-full max-w-140 h-[62vh] sm:h-[68vh] md:h-[72vh]">
            <div className={`${reduceMotion ? '' : 'animate-in zoom-in-95 duration-500'} h-full`}>
              <StructureViewer product={activeProduct} enable3D={enable3DViewer} />
            </div>
          </div>
        </div>

        {/* RIGHT: DATA DRAWER */}
        <div className="w-full xl:w-145 bg-white dark:bg-[#0a0a0f] xl:border-l border-gray-100 dark:border-gray-900 flex flex-col">
          <div role="tablist" aria-label="Product details sections" className="flex overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-900 px-2.5 sm:px-6 md:px-8 pt-3 sm:pt-6 md:pt-8">
            {tabs.map((tab, idx) => {
              const TabIcon = tab.icon;

              return (
                <button
                  key={tab.label}
                  type="button"
                  role="tab"
                  id={`product-tab-${idx}`}
                  aria-selected={activeTab === idx}
                  aria-controls={`product-tabpanel-${idx}`}
                  onClick={() => setActiveTab(idx)}
                  className={`shrink-0 pb-3 sm:pb-4 px-2.5 sm:px-4 md:px-5 text-[9px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest whitespace-nowrap relative ${activeTab === idx ? 'text-brand-orange' : 'text-gray-400'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <TabIcon size={13} />
                    {tab.label}
                  </span>
                  {activeTab === idx && <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-orange" />}
                </button>
              );
            })}
          </div>

          <div
            id={`product-tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`product-tab-${activeTab}`}
            className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 lg:p-10"
          >
          <div className="mb-4 flex items-center justify-between gap-3">
            {tabTitles[activeTab] ? (
              <h2 className="text-xl sm:text-2xl font-bold text-brand-navy dark:text-white wrap-break-word">{tabTitles[activeTab]}</h2>
            ) : (
              <span className="sr-only">Product details</span>
            )}
          </div>

            {activeTab === 0 && (
              <>
                <div className="mb-5">
                  <h1 id={dialogTitleId} className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-white leading-tight wrap-break-word">
                    {activeProduct.name}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${stockMeta.inStock ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'}`}>
                      {stockMeta.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                    {stockMeta.hasNumericStock && stockMeta.isLowStock ? (
                      <span className="inline-flex rounded-full border border-brand-orange/30 bg-brand-orange/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-brand-orange">
                        {stockMeta.stock <= Math.max(2, Math.floor(stockMeta.threshold / 2)) ? `Only ${stockMeta.stock} left` : `Low stock - ${stockMeta.stock} left`}
                      </span>
                    ) : null}
                  </div>
                  <div id={dialogDescriptionId} className="mt-2">
  <p
    className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed wrap-break-word"
    style={!isOverviewExpanded && hasExpandableOverview ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
  >
    {overviewText}
  </p>
  {hasExpandableOverview ? (
    <button
      type="button"
      onClick={() => setIsOverviewExpanded((prev) => !prev)}
      className="mt-2 inline-flex text-[10px] font-black uppercase tracking-[0.22em] text-brand-orange hover:underline underline-offset-4"
    >
      {isOverviewExpanded ? 'Show less' : 'Read more'}
    </button>
  ) : null}
</div>
                </div>

                {(keyFeatures.length || researchFocus.length || researchApplications.length || notesForInvestigators || regulatoryUse) ? (
  <div className="mt-4 grid gap-3">
    {keyFeatures.length ? (
      <div className="rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-navy/60 dark:text-gray-300">Key Features</p>
        <ul className="mt-2 space-y-2">
          {keyFeatures.map((item) => (
            <li key={item} className="text-sm text-brand-navy/70 dark:text-gray-200 leading-relaxed">{item}</li>
          ))}
        </ul>
      </div>
    ) : null}
    {researchFocus.length ? (
      <div className="rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-navy/60 dark:text-gray-300">Research Focus (Non-clinical)</p>
        <ul className="mt-2 space-y-2">
          {researchFocus.map((item) => (
            <li key={item} className="text-sm text-brand-navy/70 dark:text-gray-200 leading-relaxed">{item}</li>
          ))}
        </ul>
      </div>
    ) : null}
    {researchApplications.length ? (
      <div className="rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-navy/60 dark:text-gray-300">Research Applications (Non-clinical)</p>
        <ul className="mt-2 space-y-2">
          {researchApplications.map((item) => (
            <li key={item} className="text-sm text-brand-navy/70 dark:text-gray-200 leading-relaxed">{item}</li>
          ))}
        </ul>
      </div>
    ) : null}
    {notesForInvestigators ? (
      <div className="rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-navy/60 dark:text-gray-300">Notes For Investigators</p>
        <p className="mt-2 text-sm text-brand-navy/70 dark:text-gray-200 leading-relaxed">{notesForInvestigators}</p>
      </div>
    ) : null}
    {regulatoryUse ? (
      <div className="rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-brand-orange/5 dark:bg-white/5 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-navy/60 dark:text-gray-300">Regulatory Use</p>
        <p className="mt-2 text-sm text-brand-navy/70 dark:text-gray-200 leading-relaxed">{regulatoryUse}</p>
      </div>
    ) : null}
  </div>
) : null}

<div className="border-t border-gray-100 dark:border-white/10 mb-4" />

                <h3 className="text-xs font-black uppercase tracking-[0.18em] text-brand-navy/70 dark:text-gray-300 mb-2">
                  Technical Data
                </h3>

                {!showTechData ? (
                  <p className="scientific-data-text text-gray-600 dark:text-gray-300 leading-relaxed">
                    Technical data is hidden for this product.
                  </p>
                ) : technicalItems.length > 0 ? (
                  <ul className="space-y-3">
                    {technicalItems.map((item) => (
                      <li key={item} className="scientific-data-text text-gray-600 dark:text-gray-300 leading-relaxed border-b border-gray-100 dark:border-white/10 pb-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="scientific-data-text text-gray-600 dark:text-gray-300 leading-relaxed">
                    Technical data is not available for this product.
                  </p>
                )}
              </>
            )}

            {activeTab === 1 && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  <span className="scientific-data-text">
                  {safetyText}
                  </span>
                </p>
              </>
            )}

            {activeTab === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-brand-navy/80 dark:text-gray-200">
                  Generate a printable reference sheet for this product.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrintReference}
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-orange/60 bg-brand-orange/10 px-4 py-2 text-sm font-black uppercase tracking-widest text-brand-orange hover:bg-brand-orange hover:text-white transition-colors"
                  >
                    <Printer size={16} />
                    Print
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCoa}
                    className="inline-flex items-center gap-2 rounded-xl border border-brand-navy/25 dark:border-white/15 bg-white/80 dark:bg-white/5 px-4 py-2 text-sm font-black uppercase tracking-widest text-brand-navy dark:text-gray-100 hover:border-brand-orange/60 hover:text-brand-orange transition-colors"
                  >
                    <FileText size={16} />
                    COA
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6 md:p-8 border-t border-gray-100 dark:border-gray-900 print-omit">
            {canUseManifest ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-brand-navy/10 dark:border-white/10 px-4 py-3">
                  <label htmlFor="product-requested-qty" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-400">
                    Requested Quantity
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      id="product-requested-qty"
                      type="number"
                      min="1"
                      max={maxOrderable || undefined}
                      step="1"
                      value={requestedQuantity}
                      onChange={(event) => {
                        const raw = Math.max(1, Number(event.target.value || 1));
                        const nextValue = stockMeta.hasNumericStock ? Math.min(raw, Math.max(1, Number(stockMeta.stock || 1))) : raw;
                        setRequestedQuantity(nextValue);
                      }}
                      className="w-28 rounded-xl border border-brand-navy/20 dark:border-white/10 bg-white dark:bg-[#111827] px-3 py-2 text-sm font-bold text-brand-navy dark:text-gray-100 outline-none"
                    />
                    {stockMeta.hasNumericStock ? (
                      <p className="text-xs font-semibold text-brand-navy/65 dark:text-gray-400">
                        Max available: {stockMeta.stock}
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-brand-navy/65 dark:text-gray-400">
                        Quantity will be reviewed manually.
                      </p>
                    )}
                  </div>
                </div>

          <button
                  type="button"
                  onClick={handleAddToManifest}
                  className="w-full py-4 sm:py-5 bg-brand-orange text-white text-base sm:text-lg font-black uppercase tracking-wider sm:tracking-widest rounded-2xl shadow-2xl hover:-translate-y-1 transition-all"
                >
                  Add to Research Manifest
                </button>
              </div>
            ) : canUsePreorder ? (
              <button
                type="button"
                onClick={() => {
                  if (onPreorder) onPreorder(activeProduct);
                  onClose();
                }}
                className="w-full py-4 sm:py-5 bg-brand-navy text-white text-base sm:text-lg font-black uppercase tracking-wider sm:tracking-widest rounded-2xl shadow-2xl hover:-translate-y-1 transition-all"
              >
                Pre-Order
              </button>
            ) : (
              <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-4">
                <p className="text-sm font-semibold text-brand-navy dark:text-gray-200">
                  Sign in to view institutional pricing and initiate procurement inquiry.
                </p>
                {onRequestAccess && (
                  <button
                    type="button"
                    onClick={onRequestAccess}
                    className="mt-3 inline-flex items-center rounded-xl border border-brand-orange px-3 py-2 text-xs font-black uppercase tracking-widest text-brand-orange hover:bg-brand-orange hover:text-white transition-colors"
                  >
                    {requestAccessLabel}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;

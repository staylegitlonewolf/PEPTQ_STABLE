import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Delete } from 'lucide-react';
import ProductGrid from '../components/ProductGrid';
import IdentityStatusBadge from '../components/IdentityStatusBadge';
import ProductModal from '../components/ProductModal';
import ApplicationForm from '../components/ApplicationForm';
import InquiryDrawer from '../components/InquiryDrawer';
import FAQ from '../components/FAQ';
import CatalogImage from '../components/CatalogImage';
import { useManifest } from '../context/ManifestContext';
import { useAuth } from '../context/AuthProvider';
import { useAccessibility } from '../context/AccessibilityContext';
import { useStoreDebugMode } from '../debug/masterDebug';
import { getLocalSystemSettings, submitOrderRequest, submitPreorderRequest } from '../services/orderService';
import { getCatalogForRole, getCatalogStrengthOptions } from '../services/catalogService';
import { getPortalGatePolicy } from '../services/portalGatePolicy';
import { fetchMemberProfile, getComputedShipping, stringifyComputedShipping, validateDiscountCode } from '../services/requestService';
import { getTrackedStock } from '../utils/stock';

const parseStrengthMg = (strength) => {
  const match = String(strength || '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

const normalizeSlug = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const normalizeManifestHandle = (value) => normalizeSlug(value);

const buildManifestPricing = (items = [], discount = null) => {
  const nextItems = (Array.isArray(items) ? items : []).map((item) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const rawUnitPrice = Number(item.unit_price ?? item.price ?? 0);
    const unitPrice = Number.isFinite(rawUnitPrice) ? rawUnitPrice : 0;
    const handle = normalizeManifestHandle(item.handle || item.id || item.name);
    const isEligible = Boolean(
      discount
      && Number(discount.discount_pct || 0) > 0
      && (
        String(discount.scope || '').toUpperCase() === 'ALL'
        || normalizeManifestHandle(discount.product_handle) === handle
        || (Array.isArray(discount.applicable_handles) && discount.applicable_handles.some((entry) => normalizeManifestHandle(entry) === handle))
      )
    );
    const discountedUnitPrice = isEligible
      ? Number((unitPrice * (1 - (Number(discount.discount_pct || 0) / 100))).toFixed(2))
      : Number(unitPrice.toFixed(2));

    return {
      ...item,
      handle: handle || item.handle || item.id || '',
      quantity,
      unit_price: Number(unitPrice.toFixed(2)),
      discounted_unit_price: discountedUnitPrice,
      line_total: Number((quantity * discountedUnitPrice).toFixed(2)),
      discount_applied: isEligible,
    };
  });

  const subtotal = Number(nextItems.reduce((sum, item) => sum + (Number(item.unit_price || 0) * Number(item.quantity || 1)), 0).toFixed(2));
  const total = Number(nextItems.reduce((sum, item) => sum + Number(item.line_total || 0), 0).toFixed(2));

  return {
    items: nextItems,
    subtotal,
    total,
    discountAmount: Number((subtotal - total).toFixed(2)),
  };
};

function HomePage({ isSearchPanelOpen = false, onCloseSearchPanel = () => {} }) {
  const { role, isApproved, session } = useAuth();
  const { language = 'en' } = useAccessibility();
  const es = language === 'es';
  const location = useLocation();
  const navigate = useNavigate();
  const { slug } = useParams();
  const { isStoreOn, isStoreOff } = useStoreDebugMode();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStrength, setActiveStrength] = useState('');
  const [orderActionState, setOrderActionState] = useState({ type: 'idle', message: '' });
  const [identityState, setIdentityState] = useState({ loading: false, shipping: null, businessName: '', error: '' });
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [isApplyingDiscountCode, setIsApplyingDiscountCode] = useState(false);
  const { manifestItems, addToManifest, updateManifestQuantity, removeFromManifest, clearManifest } = useManifest();
  const [roleCatalog, setRoleCatalog] = useState([]);
  const [strengthOptions, setStrengthOptions] = useState([]);
  useEffect(() => {
    let active = true;
    const loadCatalog = async () => {
      const [items, strengths] = await Promise.all([
        getCatalogForRole(role),
        getCatalogStrengthOptions(role),
      ]);
      if (!active) return;
      setRoleCatalog(Array.isArray(items) ? items : []);
      setStrengthOptions(
        (Array.isArray(strengths) ? strengths : [])
          .sort((a, b) => parseStrengthMg(a) - parseStrengthMg(b))
      );
    };
    loadCatalog();
    return () => { active = false; };
  }, [role]);
  const gatePolicy = useMemo(() => getPortalGatePolicy(role), [role]);
  const systemSettings = useMemo(() => getLocalSystemSettings(), []);
  const lowStockThreshold = Number(systemSettings.low_stock_threshold ?? 5);

  const text = {
    searchPlaceholder: es ? 'Buscar compuestos, formulas o CAS...' : 'Search compounds, formulas, or CAS...',
    clearSearch: es ? 'Limpiar busqueda' : 'Clear search',
    collapseSearch: es ? 'Colapsar panel de busqueda' : 'Collapse search panel',
    showing: es ? 'Mostrando' : 'Showing',
    of: es ? 'de' : 'of',
    products: es ? 'productos' : 'products',
    resetSearch: es ? 'Restablecer Busqueda' : 'Reset Search',
    preview: es ? 'Vista de Producto' : 'Product Preview',
    noPreview: es ? 'No hay imagen de vista previa para la busqueda actual.' : 'No preview image available for current search.',
    vial: 'Vial',
    strengthFilter: es ? 'Filtro de Concentracion' : 'Strength Filter',
    clearFilter: es ? 'Limpiar Filtro' : 'Clear Filter',
    recent: es ? 'Visto Recientemente' : 'Recently Viewed Research',
    clearHistory: es ? 'Limpiar Historial' : 'Clear History',
    portalStatus: es ? 'Estado del portal' : 'Portal status',
    storeOffMsg: es ? 'Inicio de sesion y solicitudes de acceso estan temporalmente deshabilitados.' : 'Login and request-access actions are temporarily disabled.',
    accessState: es ? 'Estado de acceso' : 'Access state',
    requestAccess: es ? 'Solicitar Acceso' : 'Request Access',
    requestResearchAccess: es ? 'Solicitar Acceso de Investigacion' : 'Request Research Access',
    portalOffline: es ? 'Portal Desconectado' : 'Portal Offline',
    activeIdentity: es ? 'Identidad activa' : 'Active identity',
    personalAccount: es ? 'Cuenta personal' : 'Personal account',
    businessAccount: es ? 'Cuenta de negocio' : 'Business account',
    shippingTo: es ? 'Enviando a' : 'Shipping to',
    personalCheckout: es ? 'Los pedidos usan tu direccion personal guardada.' : 'Orders are using your saved personal shipping address.',
    businessCheckout: es ? 'Los prefills comerciales estan activos para pedidos.' : 'Business shipping prefills are active for orders.',
    identityEdit: es ? 'Editar perfil' : 'Edit profile',
    noCompounds: es ? 'No se encontraron compuestos' : 'No Compounds Found',
    noCompoundsHint: es ? 'Intenta ajustar la busqueda o seleccionar otra concentracion.' : 'Try adjusting your search or selecting a different strength.',
    submitRequest: es ? 'Enviar Solicitud de Compra' : 'Submit Procurement Request',
    openManifest: es ? 'Abrir Manifiesto' : 'Open Manifest',
  };

  const recentKey = 'peptq_recent_v1';
  const [recentViewed, setRecentViewed] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(recentKey) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [isRecentlyViewedExpanded, setIsRecentlyViewedExpanded] = useState(true);

  useEffect(() => {
    if (!slug) {
      setIsProductModalOpen(false);
      setActiveProduct(null);
      return;
    }
    const source = roleCatalog;
    const match = source.find(
      (item) => normalizeSlug(item.handle || item.id || item.name) === normalizeSlug(slug)
    );
    if (match) {
      setActiveProduct(match);
      setIsProductModalOpen(true);
    }
  }, [slug, roleCatalog]);

  const redirectGuestToPortal = () => {
    const from = `${location.pathname}${location.search}${location.hash}`;
    navigate('/profile', {
      state: { from },
      replace: false,
    });
  };

  const handleAddToManifest = (product) => {
    if (!isApproved) {
      if (isStoreOn) {
        redirectGuestToPortal();
      }
      return;
    }

    addToManifest(product);
    setIsDrawerOpen(true);
  };

  const handleIncreaseManifestItem = (item) => {
    if (!item?.id) return;
    updateManifestQuantity(item.id, Number(item.quantity || 1) + 1);
  };

  const handleDecreaseManifestItem = (item) => {
    if (!item?.id) return;
    updateManifestQuantity(item.id, Math.max(1, Number(item.quantity || 1) - 1));
  };

  const handleRemoveManifestItem = (item) => {
    if (!item?.id) return;
    removeFromManifest(item.id);
  };

  const handlePreorder = async (product) => {
    if (!isApproved || !session?.email) {
      if (isStoreOn) {
        redirectGuestToPortal();
      }
      return;
    }

    try {
      await submitPreorderRequest({
        memberEmail: session.email,
        productHandle: product?.handle || product?.id || product?.name,
        productTitle: product?.name || product?.title || product?.handle || '',
        requestedQty: Number(product?.quantity || 1),
      });
      setOrderActionState({
        type: 'success',
        message: `${product?.name || 'Product'} added to the preorder queue. The owner will review and contact you manually when stock is ready.`,
      });
      setIsProductModalOpen(false);
      setActiveProduct(null);
      navigate('/catalog', { replace: true });
    } catch (error) {
      const duplicatePreorder = String(error?.message || '').toLowerCase().includes('already have an open preorder request');
      setOrderActionState({
        type: duplicatePreorder ? 'success' : 'error',
        message: error?.message || 'Unable to submit preorder request.',
      });
    }
  };

  const handleOpenProduct = (product) => {
    setActiveProduct(product);
    setIsProductModalOpen(true);
    const slugPath = normalizeSlug(product.handle || product.id || product.name);
    navigate(`/catalog/${slugPath}`, { replace: false });
    setRecentViewed((prev) => {
      const next = [product, ...prev.filter((item) => item.id !== product.id)].slice(0, 10);
      localStorage.setItem(recentKey, JSON.stringify(next));
      return next;
    });
  };

  const handleCloseProduct = () => {
    setIsProductModalOpen(false);
    setActiveProduct(null);
    navigate('/catalog', { replace: true });
  };

  const handleSearchChange = (event) => setSearchQuery(event.target.value);
  const handleClearSearch = () => setSearchQuery('');
  const handleTagClick = (tag) => setActiveStrength((prev) => (prev === tag ? '' : tag));
  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveStrength('');
  };

  const handleClearRecent = () => {
    localStorage.removeItem(recentKey);
    setRecentViewed([]);
  };

  const handleManifestPrimaryAction = async () => {
    if (!isApproved) {
      setIsDrawerOpen(false);
      setIsFormOpen(true);
      return;
    }

    try {
      const stockByHandle = new Map(
        roleCatalog.map((item) => [
          normalizeManifestHandle(item.handle || item.id || item.name),
          item,
        ])
      );

      for (const item of manifestItems) {
        const handle = normalizeManifestHandle(item.handle || item.id || item.name);
        const stockMeta = getTrackedStock(stockByHandle.get(handle) || item);
        if (stockMeta.hasNumericStock && Number(item.quantity || 1) > Number(stockMeta.stock || 0)) {
          setOrderActionState({
            type: 'error',
            message: `${item.name || handle} only has ${stockMeta.stock} unit${Number(stockMeta.stock) === 1 ? '' : 's'} available right now. Adjust your manifest before submitting.`,
          });
          return;
        }
      }

      const email = session?.email || '';
      const memberProfile = await fetchMemberProfile({ email, actorEmail: email });
      const shippingData = stringifyComputedShipping(memberProfile);
      await submitOrderRequest({
        memberEmail: email,
        items: manifestPricing.items.map((item) => ({
          ...item,
          unit_price: item.discounted_unit_price,
          price: item.discounted_unit_price,
        })),
        shippingData,
        researchPurpose: 'Institutional procurement request via manifest',
        discountCode: appliedDiscount?.code || '',
        discountPercent: Number(appliedDiscount?.discount_pct || 0),
        discountScope: appliedDiscount?.scope || 'ALL',
        discountProductHandle: appliedDiscount?.product_handle || '',
      });

      clearManifest();
      setAppliedDiscount(null);
      setDiscountCode('');
      setIsDrawerOpen(false);
      setOrderActionState({ type: 'success', message: 'Procurement request submitted to ledger queue.' });
    } catch (error) {
      setOrderActionState({ type: 'error', message: error?.message || 'Unable to submit procurement request.' });
    }
  };

  const handleApplyDiscountCode = async () => {
    if (!discountCode.trim()) {
      setOrderActionState({ type: 'error', message: 'Enter a discount code before applying it.' });
      return;
    }

    try {
      setIsApplyingDiscountCode(true);
      const discount = await validateDiscountCode({
        code: discountCode,
        productHandles: manifestItems.map((item) => item.handle || item.id || item.name),
      });
      setAppliedDiscount(discount);
      setDiscountCode(discount?.code || String(discountCode).trim().toUpperCase());
      setOrderActionState({ type: 'success', message: `Discount code ${discount?.code || String(discountCode).trim().toUpperCase()} applied.` });
    } catch (error) {
      setAppliedDiscount(null);
      setOrderActionState({ type: 'error', message: error?.message || 'Unable to apply discount code.' });
    } finally {
      setIsApplyingDiscountCode(false);
    }
  };

  const handleRemoveDiscountCode = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
    setOrderActionState({ type: 'success', message: 'Discount code removed.' });
  };

  const handleDiscountCodeInputChange = (value) => {
    const nextValue = String(value || '');
    setDiscountCode(nextValue);
    if (appliedDiscount && nextValue.trim().toUpperCase() !== String(appliedDiscount.code || '').trim().toUpperCase()) {
      setAppliedDiscount(null);
    }
  };

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const normalizedStrength = activeStrength.replace(/\s+/g, '').toLowerCase();

    return roleCatalog.filter((product) => {
      const searchableText = [
        product.name,
        product.description,
        product.formula,
        product.cas,
        product.category,
        product.mass,
        product.strength,
      ].filter(Boolean).map((value) => String(value).toLowerCase()).join(' ');

      const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
      const matchesQuery = queryTokens.length === 0 || queryTokens.every((token) => searchableText.includes(token));

      const productStrength = String(product.strength || '').replace(/\s+/g, '').toLowerCase();
      const matchesStrength = !normalizedStrength || productStrength === normalizedStrength;

      return matchesQuery && matchesStrength;
    });
  }, [searchQuery, activeStrength, roleCatalog]);

  const lightboxPreviewProduct = useMemo(() => {
    if (filteredProducts.length > 0) return filteredProducts[0];
    if (recentViewed.length > 0) return recentViewed[0];
    return roleCatalog[0] || null;
  }, [filteredProducts, recentViewed, roleCatalog]);

  const manifestPricing = useMemo(
    () => buildManifestPricing(manifestItems, appliedDiscount),
    [manifestItems, appliedDiscount]
  );

  useEffect(() => {
    if (!isApproved || !session?.email) {
      setIdentityState({ loading: false, shipping: null, businessName: '', error: '' });
      return;
    }

    let active = true;

    const hydrateIdentityBadge = async () => {
      try {
        setIdentityState((prev) => ({ ...prev, loading: true, error: '' }));
        const profile = await fetchMemberProfile({ email: session.email, actorEmail: session.email });
        if (!active || !profile) return;
        const shipping = getComputedShipping(profile);
        setIdentityState({
          loading: false,
          shipping,
          businessName: String(profile.business_name || '').trim(),
          error: '',
        });
      } catch (error) {
        if (!active) return;
        const errMsg = String(error?.message || '');
        const isSoftError = errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('failed to fetch');
        setIdentityState({
          loading: false,
          shipping: null,
          businessName: '',
          error: isSoftError ? '' : (error?.message || 'Unable to load active identity.'),
        });
      }
    };

    hydrateIdentityBadge();

    return () => {
      active = false;
    };
  }, [isApproved, session?.email]);

  useEffect(() => {
    if (manifestItems.length === 0) {
      setAppliedDiscount(null);
      setDiscountCode('');
      return;
    }

    if (!appliedDiscount) return;

    const stillApplicable = manifestPricing.items.some((item) => item.discount_applied);
    if (!stillApplicable) {
      setAppliedDiscount(null);
      setDiscountCode('');
    }
  }, [manifestItems.length, appliedDiscount, manifestPricing.items]);

  const renderStrengthTagButton = (tag) => (
    <button
      key={tag}
      type="button"
      onClick={() => handleTagClick(tag)}
      className={`px-3 py-1.5 rounded-full text-xs font-montserrat font-bold border transition-all duration-200 ${
        activeStrength === tag
          ? 'bg-brand-orange text-white border-brand-orange shadow-lg'
          : 'bg-white dark:bg-white/5 text-brand-navy dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-brand-orange'
      }`}
    >
      {tag}
    </button>
  );

  const strengthFilterContent = (
    <>
      <div className="flex flex-wrap gap-2">
        {strengthOptions.map(renderStrengthTagButton)}
      </div>

      {activeStrength && (
        <button
          type="button"
          onClick={() => setActiveStrength('')}
          className="mt-4 text-[11px] font-bold text-brand-orange border-b border-brand-orange"
        >
          {text.clearFilter}
        </button>
      )}
    </>
  );

  return (
    <>
      <div className={`overflow-hidden transition-all duration-300 ease-out ${isSearchPanelOpen ? 'max-h-350 opacity-100 pointer-events-auto relative z-70 -mt-30 sm:-mt-32 lg:mt-0' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        <section className="bg-white dark:bg-[#0a0a0f] border-b border-brand-navy/10 dark:border-white/5 sticky top-0 z-70 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95 pt-3">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8 pt-4 sm:pt-6">
            <div className="rounded-2xl border-2 border-brand-orange/30 bg-white dark:bg-[#101018] p-3 sm:p-4 shadow-xl">
              <div className="flex items-center gap-2 rounded-xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-transparent overflow-hidden">
                <input
                  id="catalog-search"
                  name="catalogSearch"
                  type="search"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder={text.searchPlaceholder}
                  className="w-full px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base font-montserrat font-bold text-brand-navy dark:text-gray-100 placeholder:text-brand-navy/30 dark:placeholder:text-gray-500 bg-transparent outline-none"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="px-3 sm:px-4 text-xl sm:text-2xl text-brand-navy/50 hover:text-brand-orange transition-colors"
                    aria-label={text.clearSearch}
                  >
                    x
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onCloseSearchPanel}
                  className="mr-2 h-9 w-9 inline-flex items-center justify-center rounded-lg border border-brand-navy/20 dark:border-white/20 text-brand-navy dark:text-gray-200"
                  aria-label={text.collapseSearch}
                >
                  <Delete size={15} />
                </button>
              </div>

              {searchQuery && filteredProducts.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {filteredProducts.slice(0, 6).map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleOpenProduct(product)}
                      className="bg-brand-orange/10 hover:bg-brand-orange text-brand-navy hover:text-white dark:text-white font-montserrat font-bold px-4 py-2 rounded-lg transition-colors text-xs shadow-sm border border-brand-orange/30"
                    >
                      {product.name}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-brand-navy/10 dark:border-white/10 bg-white dark:bg-white/5 p-3">
                <p className="text-[11px] font-semibold text-brand-navy/60 dark:text-gray-400">
                  {text.showing} {filteredProducts.length} {text.of} {roleCatalog.length} {text.products}
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-1 text-[11px] font-bold text-brand-orange border-b border-brand-orange"
                >
                  {text.resetSearch}
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-brand-navy/10 dark:border-white/10 bg-linear-to-br from-white to-brand-orange/5 dark:from-[#141420] dark:to-[#1a1420] p-3">
                <p className="text-[10px] font-montserrat font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 mb-3">
                  {text.preview}
                </p>
                {lightboxPreviewProduct?.image ? (
                  <div className="overflow-hidden rounded-lg border border-brand-navy/10 dark:border-white/10 bg-white/70 dark:bg-white/5">
                    <img
                      src={lightboxPreviewProduct.image}
                      alt={lightboxPreviewProduct.name || 'Catalog product'}
                      className="h-44 sm:h-56 w-full object-contain"
                    />
                    <div className="px-3 py-2 border-t border-brand-navy/10 dark:border-white/10">
                      <p className="text-xs font-black text-brand-navy dark:text-gray-100 truncate">{lightboxPreviewProduct.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-brand-orange">{lightboxPreviewProduct.strength || text.vial}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-brand-navy/20 dark:border-white/20 px-3 py-10 text-center text-xs font-semibold text-brand-navy/60 dark:text-gray-400">
                    {text.noPreview}
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-brand-navy/10 dark:border-white/10 bg-white dark:bg-white/5 p-3">
                <p className="text-[10px] font-montserrat font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 mb-3">
                  {text.strengthFilter}
                </p>
                {strengthFilterContent}
              </div>
            </div>
          </div>
        </section>
      </div>

      {recentViewed.length > 0 && (
        <section className={`bg-white dark:bg-[#0a0a0f] border-b border-gray-100 dark:border-white/5 transition-all duration-300 ${isSearchPanelOpen ? '' : 'pt-4'}`}>
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setIsRecentlyViewedExpanded(!isRecentlyViewedExpanded)}
                className="flex items-center gap-2 group"
              >
                <span className={`text-brand-orange transition-transform duration-300 ${isRecentlyViewedExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
                <h3 className="text-xs font-montserrat font-black uppercase tracking-tighter text-brand-navy dark:text-gray-400 group-hover:text-brand-orange">
                  {text.recent}
                </h3>
              </button>
              <button
                onClick={handleClearRecent}
                className="text-[10px] uppercase font-bold text-gray-400 hover:text-red-500 transition-colors"
              >
                {text.clearHistory}
              </button>
            </div>

            {isRecentlyViewedExpanded && (
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {recentViewed.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleOpenProduct(product)}
                    className="group flex-none w-55 h-75 text-left rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-3 hover:shadow-xl transition-all"
                  >
                    <div className="mb-3 h-47.5 overflow-hidden rounded-lg bg-gray-50 dark:bg-black/20 p-3">
                      <CatalogImage
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                        wrapperClassName="rounded-lg border border-dashed border-brand-navy/10 dark:border-white/10 bg-white/70 dark:bg-white/5"
                        placeholderLabel="Image pending"
                      />
                    </div>
                    <p className="text-xs font-bold text-brand-navy dark:text-gray-200 truncate">{product.name}</p>
                    <p className="text-[10px] text-brand-orange font-black mt-1 uppercase">{product.strength || text.vial}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="min-h-100 bg-white dark:bg-[#0a0a0f]">
        {isStoreOff && (
          <div className="max-w-6xl mx-auto px-6 pt-8">
            <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-3 text-sm font-semibold text-brand-navy dark:text-gray-200">
              {text.portalStatus}: <span className="text-brand-orange font-black">STOREOFF</span>. {text.storeOffMsg}
            </div>
          </div>
        )}

        {!isApproved && (
          <div className="max-w-6xl mx-auto px-6 pt-8">
            <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-3 text-sm font-semibold text-brand-navy dark:text-gray-200">
              {text.accessState}: <span className="text-brand-orange font-black">{gatePolicy.gateState}</span>. {gatePolicy.guidance}
            </div>
          </div>
        )}

        {orderActionState.message && (
          <div className="max-w-6xl mx-auto px-6 pt-4">
            <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${orderActionState.type === 'error' ? 'border border-brand-orange/40 bg-brand-orange/10 text-brand-orange' : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
              {orderActionState.message}
            </div>
          </div>
        )}

        {isApproved && (
          <div className="max-w-6xl mx-auto px-6 pt-6">
            <IdentityStatusBadge
              title={text.activeIdentity}
              modeLabel={identityState.shipping?.address_type === 'BUSINESS' ? text.businessAccount : text.personalAccount}
              shippingLabel={text.shippingTo}
              shippingSummary={identityState.shipping
                ? [identityState.shipping.address, identityState.shipping.city, identityState.shipping.state].filter(Boolean).join(', ')
                : ''}
              detailText={identityState.shipping?.address_type === 'BUSINESS' ? text.businessCheckout : text.personalCheckout}
              addressType={identityState.shipping?.address_type || 'PERSONAL'}
              businessName={identityState.shipping?.address_type === 'BUSINESS' ? identityState.businessName : ''}
              loading={identityState.loading}
              editLabel={text.identityEdit}
            />
            {identityState.error ? (
              <p className="mt-3 text-xs font-semibold text-brand-orange">{identityState.error}</p>
            ) : null}
          </div>
        )}

        {filteredProducts.length > 0 ? (
          <ProductGrid
            products={filteredProducts}
            onAddToManifest={handleAddToManifest}
            onPreorder={handlePreorder}
            onProductClick={handleOpenProduct}
            sidePanel={null}
            canOrder={isStoreOn && isApproved}
            canPreorder={isStoreOn && isApproved}
            onRequestAccess={isStoreOn ? redirectGuestToPortal : undefined}
            requestAccessLabel={isStoreOff ? text.portalOffline : text.requestAccess}
            lowStockThreshold={Number.isFinite(lowStockThreshold) ? lowStockThreshold : 5}
          />
        ) : (
          <div className="max-w-6xl mx-auto px-6 py-20 text-center">
            <div className="text-5xl mb-4">🔬</div>
            <h3 className="text-2xl font-montserrat font-black text-brand-navy dark:text-white uppercase">{text.noCompounds}</h3>
            <p className="text-gray-500 mt-2">{text.noCompoundsHint}</p>
            <button
              onClick={handleResetFilters}
              className="mt-6 text-brand-orange font-bold border-b-2 border-brand-orange pb-1"
            >
              {text.resetSearch}
            </button>
          </div>
        )}
      </div>

      <FAQ />

      <ProductModal
        key={activeProduct?.id || 'product-modal'}
        isOpen={isProductModalOpen}
        product={activeProduct}
        catalogItems={roleCatalog}
        onClose={handleCloseProduct}
        onAddToManifest={handleAddToManifest}
        onPreorder={handlePreorder}
        userRole={role}
        canOrder={isStoreOn && isApproved}
        canPreorder={isStoreOn && isApproved}
        onRequestAccess={isStoreOn ? redirectGuestToPortal : undefined}
        requestAccessLabel={isStoreOff ? text.portalOffline : text.requestAccess}
        onNavigate={(prod) => {
          const slugPath = normalizeSlug(prod.handle || prod.id || prod.name);
          navigate(`/catalog/${slugPath}`, { replace: false });
        }}
      />

      <InquiryDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        items={manifestItems}
        onClearAll={clearManifest}
        onIncreaseItem={handleIncreaseManifestItem}
        onDecreaseItem={handleDecreaseManifestItem}
        onRemoveItem={handleRemoveManifestItem}
        onRequestBulkQuote={handleManifestPrimaryAction}
        primaryActionLabel={isApproved ? text.submitRequest : text.requestResearchAccess}
        discountCode={discountCode}
        onDiscountCodeChange={handleDiscountCodeInputChange}
        onApplyDiscountCode={handleApplyDiscountCode}
        onRemoveDiscountCode={handleRemoveDiscountCode}
        isApplyingDiscountCode={isApplyingDiscountCode}
        appliedDiscount={appliedDiscount}
        subtotalAmount={manifestPricing.subtotal}
        discountAmount={manifestPricing.discountAmount}
        totalAmount={manifestPricing.total}
      />

      <button
        type="button"
        onClick={() => {
          if (!isApproved) {
            if (isStoreOn) {
              redirectGuestToPortal();
            }
            return;
          }
          setIsDrawerOpen(true);
        }}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 bg-brand-orange text-white font-montserrat font-bold px-4 sm:px-6 py-3 sm:py-4 rounded-full shadow-2xl flex items-center gap-2 sm:gap-3 text-sm sm:text-base request-btn-laser"
      >
        <span className="bg-white text-brand-orange w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs">
          {manifestItems.length}
        </span>
        {isApproved ? text.openManifest : (isStoreOff ? text.portalOffline : text.requestResearchAccess)}
      </button>

      <ApplicationForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </>
  );
}

export default HomePage;

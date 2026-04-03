import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Plus, Minus, Trash2, Sparkles, CheckCircle2, ShoppingBag } from 'lucide-react';
import { submitPreorderRequest } from '../services/orderService';
import { useAccessibility } from '../context/AccessibilityContext';
import { getCatalogForRole } from '../services/catalogService';
import { useAuth } from '../context/AuthProvider';

const inputClasses = 'w-full px-4 py-3 border border-brand-navy/25 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-brand-navy dark:text-gray-100 placeholder:text-brand-navy/50 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition-all';
const MAX_VISIBLE_CART_ITEMS = 5;
const CART_ITEM_GAP_PX = 12;

const DEFAULT_PURITY = 'Purity ≥99% (HPLC-verified)';
const SKU_CATALOG = [
  { handle: '5-AMINO-1MQ-10MG', title: '5-Amino 1MQ 10mg', purity: DEFAULT_PURITY },
  { handle: 'BPC-157', title: 'BPC-157', purity: DEFAULT_PURITY },
  { handle: 'CJC-1295-10MG', title: 'CJC-1295 10mg', purity: DEFAULT_PURITY },
  { handle: 'GHK-CU-100MG', title: 'GHK-Cu 100mg', purity: DEFAULT_PURITY },
  { handle: 'GLOW-70MG', title: 'Glow 70mg', purity: DEFAULT_PURITY },
  { handle: 'GLUTATHIONE-1500MG', title: 'Glutathione 1500mg', purity: DEFAULT_PURITY },
  { handle: 'IPAMORELIN-10MG', title: 'Ipamorelin 10mg', purity: DEFAULT_PURITY },
  { handle: 'KISSPEPTIN-10MG', title: 'Kisspeptin 10mg', purity: DEFAULT_PURITY },
  { handle: 'KLOW-80MG', title: 'KLOW 80mg', purity: DEFAULT_PURITY },
  { handle: 'L-CARNITINE-1200MG', title: 'L-Carnitine 1200mg', purity: DEFAULT_PURITY },
  { handle: 'LIPO-C-10MG', title: 'Lipo-C 10mg', purity: DEFAULT_PURITY },
  { handle: 'MOTS-C-15MG', title: 'MOTS-c 15mg', purity: DEFAULT_PURITY },
  { handle: 'NAD-PLUS-700MG', title: 'NAD+ 700mg', purity: DEFAULT_PURITY },
  { handle: 'NAD-PLUS-1000MG', title: 'NAD+ 1000mg', purity: DEFAULT_PURITY },
  { handle: 'PT-141-10MG', title: 'PT-141 10mg', purity: DEFAULT_PURITY },
  { handle: 'RETATRUTIDE-10MG', title: 'Retatrutide 10mg', purity: DEFAULT_PURITY },
  { handle: 'RETATRUTIDE-20MG', title: 'Retatrutide 20mg', purity: DEFAULT_PURITY },
  { handle: 'SELANK-10MG', title: 'Selank 10mg', purity: DEFAULT_PURITY },
  { handle: 'SEMAX-10MG', title: 'Semax 10mg', purity: DEFAULT_PURITY },
  { handle: 'SERMORELIN-10MG', title: 'Sermorelin 10mg', purity: DEFAULT_PURITY },
  { handle: 'SS-31-10MG', title: 'SS-31 10mg', purity: DEFAULT_PURITY },
  { handle: 'TB-BPC-BLEND-20MG', title: 'TB/BPC Blend 20mg', purity: DEFAULT_PURITY },
  { handle: 'TB-500-10MG', title: 'TB-500 10mg', purity: DEFAULT_PURITY },
  { handle: 'EPITALON-10MG', title: 'Epitalon 10mg', purity: DEFAULT_PURITY },
  { handle: 'TESAMORELIN-10MG', title: 'Tesamorelin 10mg', purity: DEFAULT_PURITY },
];

const PreorderPage = () => {
  const { role = 'GUEST' } = useAuth();
  const { language = 'en', reduceMotion } = useAccessibility();
  const es = language === 'es';
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [catalog, setCatalog] = useState(SKU_CATALOG);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [selectedHandle, setSelectedHandle] = useState('');
  const [cartListMaxHeight, setCartListMaxHeight] = useState('');
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const cartItemRefs = useRef([]);

  const text = {
    title: es ? 'Preorden' : 'Pre-Order',
    subtitle: es
      ? 'Reserva un lote y recibe seguimiento manual cuando este listo.'
      : 'Reserve a lot and get manual follow-up when stock is ready.',
    cta: es ? 'Enviar Preorden' : 'Submit Pre-Order',
    processing: es ? 'Enviando...' : 'Submitting...',
    success: (count) => es
      ? `Preorden enviada para ${count} item(s). Te contactaremos pronto.`
      : `Pre-order submitted for ${count} item(s). We will contact you soon.`,
    stepOne: es ? 'Paso 1 · Selecciona SKU' : 'Step 1 · Select SKUs',
    stepTwo: es ? 'Paso 2 · Revisa y envia' : 'Step 2 · Review & submit',
    cartButtonLabel: es ? 'Abrir carrito de preorden' : 'Open pre-order cart',
    cartButtonHint: es ? 'Selecciona SKU para continuar' : 'Select SKUs to continue',
    cartButtonReady: es ? 'Revisa carrito y continua al formulario' : 'Review cart and continue to the form',
    cartDrawerTitle: es ? 'Finaliza tu preorden' : 'Complete your pre-order',
    cartDrawerSubtitle: es
      ? 'Confirma tus articulos y agrega tus datos antes de enviar.'
      : 'Confirm your items and add your details before submitting.',
    backToCatalog: es ? 'Volver a SKU' : 'Back to SKUs',
    cartEmptyState: es ? 'Agrega SKU antes de abrir el formulario.' : 'Add SKUs before opening the form.',
    policyNotice: es
      ? 'Las preordenes no garantizan reserva; el cumplimiento sigue el orden de llegada y disponibilidad. Recibiras seguimiento manual con disponibilidad y siguientes pasos.'
      : 'Pre-orders are not guaranteed reservations; fulfillment follows arrival order and stock readiness. You will receive manual follow-up with availability and next steps.',
    labels: {
      name: es ? 'Nombre completo' : 'Full name',
      phone: es ? 'Telefono' : 'Phone',
      notes: es ? 'Notas / uso previsto' : 'Notes / intended use',
      email: es ? 'Correo aprobado *' : 'Approved email *',
      cart: es ? 'Carrito de preorden' : 'Pre-order cart',
    },
  };

  const catalogFallback = useMemo(() => SKU_CATALOG, []);
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartPreview = cart.length
    ? `${cart.slice(0, 2).map((item) => item.title).join(' · ')}${cart.length > 2 ? ` +${cart.length - 2}` : ''}`
    : '';

  const addToCart = (handle) => {
    setSubmitError('');
    setSuccessMessage('');
    setSelectedHandle(handle);
    setCart((prev) => {
      const existing = prev.find((item) => item.handle === handle);
      if (existing) {
        return prev.map((item) => item.handle === handle ? { ...item, qty: item.qty + 1 } : item);
      }
      const sku = catalog.find((s) => s.handle === handle);
      return [...prev, {
        handle,
        title: sku?.title || handle,
        strength: sku?.strength || sku?.size || '',
        qty: 1,
      }];
    });
  };

  useEffect(() => {
    let active = true;
    const loadCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        const items = await getCatalogForRole(role || 'GUEST');
        const mapped = (Array.isArray(items) ? items : []).map((item) => {
          const strength = item.strength || item.size || '';
          const purityRaw = (item.purity_string || item.purity || '').toString().trim();
          let purity = purityRaw;
          if (!purity || /^\d+(\.\d+)?$/.test(purity)) {
            const num = Number(purity);
            if (Number.isFinite(num) && num > 0 && num <= 1.5) {
              purity = `Purity ≥${Math.round(num * 100)}% (HPLC-verified)`;
            } else if (Number.isFinite(num) && num > 1.5 && num <= 100) {
              purity = `Purity ≥${Math.round(num)}% (HPLC-verified)`;
            } else {
              purity = DEFAULT_PURITY;
            }
          }
          return {
            handle: item.handle || item.slug || item.id,
            title: item.name || item.title || item.handle,
            strength,
            purity,
          };
        }).filter((item) => item.handle && item.title);

        if (active && mapped.length) setCatalog(mapped);
        else if (active) setCatalog(catalogFallback);
      } catch {
        if (active) setCatalog(catalogFallback);
      } finally {
        if (active) setIsLoadingCatalog(false);
      }
    };

    loadCatalog();
    return () => { active = false; };
  }, [role, catalogFallback]);

  useEffect(() => {
    if (!isCartDrawerOpen || typeof document === 'undefined') return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsCartDrawerOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartDrawerOpen]);

  const updateQty = (handle, delta) => {
    setCart((prev) => prev
      .map((item) => item.handle === handle ? { ...item, qty: Math.max(1, item.qty + delta) } : item)
      .filter((item) => item.qty > 0));
  };

  const removeItem = (handle) => {
    setCart((prev) => prev.filter((item) => item.handle !== handle));
    if (selectedHandle === handle) setSelectedHandle('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!email.trim()) {
      setSubmitError(es ? 'Correo requerido.' : 'Email is required.');
      return;
    }
    if (!cart.length) {
      setSubmitError(es ? 'Agrega al menos un SKU.' : 'Add at least one SKU.');
      return;
    }
    if (!acknowledged) {
      setSubmitError(es ? 'Confirma la política de preorden.' : 'Please acknowledge the preorder policy.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    setSuccessMessage('');

    try {
      for (const item of cart) {
      await submitPreorderRequest({
        memberEmail: email.trim(),
        productHandle: item.handle,
        productTitle: item.title,
        requestedQty: item.qty,
        customerName: fullName.trim(),
        phone: phone.trim(),
        notes: notes.trim(),
      });
    }
      setSuccessMessage(text.success(cart.length));
      setCart([]);
      setSelectedHandle('');
    } catch (error) {
      setSubmitError(error?.message || (es ? 'No se pudo enviar la preorden.' : 'Unable to submit preorder.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const shouldScrollCart = cart.length > MAX_VISIBLE_CART_ITEMS;

  useLayoutEffect(() => {
    if (!shouldScrollCart) {
      setCartListMaxHeight('');
      return;
    }

    const visibleNodes = cartItemRefs.current
      .slice(0, MAX_VISIBLE_CART_ITEMS)
      .filter(Boolean);

    if (!visibleNodes.length) return;

    const totalHeight = visibleNodes.reduce((sum, node) => sum + node.offsetHeight, 0)
      + (Math.max(visibleNodes.length - 1, 0) * CART_ITEM_GAP_PX);

    setCartListMaxHeight(`${totalHeight}px`);
  }, [cart, shouldScrollCart]);

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-300">
      <section className="px-6 py-12 md:py-18">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="max-w-3xl space-y-5">
            <span className="inline-flex items-center rounded-full border border-brand-orange/20 bg-brand-orange/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-brand-orange">
              {text.stepOne}
            </span>
            <h1 className="text-4xl font-montserrat font-black uppercase leading-tight md:text-5xl">
              <span className="text-brand-navy dark:text-white">PRE-</span>
              <span className="text-brand-orange">ORDER</span>
            </h1>
            <p className="text-lg font-medium leading-relaxed text-brand-navy/75 dark:text-gray-300">
              {text.subtitle}
            </p>
            {(submitError || successMessage) && !isCartDrawerOpen && (
              <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${submitError ? 'border-brand-orange/30 bg-brand-orange/10 text-brand-orange' : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                {submitError || successMessage}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="ml-1 text-[11px] font-black uppercase tracking-widest text-brand-orange">
                {es ? 'Selecciona SKU' : 'Select SKU'}
              </span>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-orange/20 bg-white/85 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-brand-orange shadow-sm dark:bg-white/5">
                <Sparkles size={14} />
                <span>{cartItemCount} item(s)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {catalog.map((sku) => {
                const inCart = cart.some((item) => item.handle === sku.handle);
                const isSelected = selectedHandle === sku.handle || inCart;
                return (
                  <button
                    key={sku.handle}
                    type="button"
                    onClick={() => addToCart(sku.handle)}
                    className={`relative rounded-2xl border border-brand-navy/15 bg-white p-4 text-left transition hover:border-brand-orange/50 hover:shadow-md dark:border-white/10 dark:bg-white/5 ${isSelected ? 'border-brand-orange bg-brand-orange/5 ring-2 ring-brand-orange/25' : ''}`}
                    disabled={isLoadingCatalog}
                  >
                    {isSelected && (
                      <span className="absolute right-3 top-3 text-brand-orange" aria-label="Selected">
                        <CheckCircle2 size={16} />
                      </span>
                    )}
                    <p className="pr-6 text-sm font-black uppercase tracking-widest leading-snug text-brand-navy dark:text-brand-orange">
                      {sku.title}
                    </p>
                    {sku.strength && (
                      <p className="mt-2 text-[11px] font-semibold text-brand-navy/60 dark:text-gray-400">
                        {sku.strength}
                      </p>
                    )}
                    {sku.purity && (
                      <p className="text-[11px] font-semibold text-brand-navy/60 dark:text-gray-400">
                        {sku.purity}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sticky bottom-20 z-20 pt-2 md:bottom-6">
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              disabled={!cart.length}
              className={`mx-auto flex w-full max-w-3xl items-center justify-between gap-4 rounded-2xl border px-4 py-4 text-left shadow-2xl transition-all md:px-5 ${cart.length ? 'border-brand-orange/30 bg-brand-navy text-white hover:-translate-y-0.5 hover:border-brand-orange/60 dark:bg-[#0b1830]' : 'cursor-not-allowed border-brand-navy/10 bg-white/95 text-brand-navy/45 dark:border-white/10 dark:bg-[#0f172a]/95 dark:text-gray-500'}`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${cart.length ? 'bg-brand-orange text-white' : 'bg-brand-navy/5 text-brand-navy/40 dark:bg-white/10 dark:text-gray-500'}`}>
                  <ShoppingBag size={20} />
                </span>
                <span className="min-w-0">
                  <span className={`block text-[11px] font-black uppercase tracking-[0.18em] ${cart.length ? 'text-brand-orange/80' : 'text-brand-orange'}`}>
                    {text.cartButtonLabel}
                  </span>
                  <span className="block truncate text-sm font-bold md:text-base">
                    {cart.length ? text.cartButtonReady : text.cartButtonHint}
                  </span>
                  {cartPreview && (
                    <span className="block truncate pt-1 text-xs font-semibold text-white/70">
                      {cartPreview}
                    </span>
                  )}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.14em] ${cart.length ? 'bg-white text-brand-navy' : 'bg-brand-navy/5 text-brand-navy/45 dark:bg-white/10 dark:text-gray-500'}`}>
                {cartItemCount} item(s)
              </span>
            </button>
          </div>
        </div>
      </section>

      <div className={`fixed inset-0 z-50 ${isCartDrawerOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-brand-navy/40 backdrop-blur-[2px] transition-opacity duration-300 ${isCartDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsCartDrawerOpen(false)}
        />

        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-brand-navy/10 bg-[#fdfdfd] shadow-2xl transition-transform duration-300 dark:border-white/10 dark:bg-[#0f172a] ${isCartDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
          style={reduceMotion ? { transition: 'none' } : undefined}
        >
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <div className="border-b border-brand-navy/10 px-5 py-4 dark:border-white/10 md:px-6">
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-brand-orange transition hover:text-brand-navy dark:hover:text-white"
              >
                <ArrowLeft size={16} />
                {text.backToCatalog}
              </button>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-orange">
                    {text.stepTwo}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-brand-navy dark:text-white">
                    {text.cartDrawerTitle}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-brand-navy/70 dark:text-gray-300">
                    {text.cartDrawerSubtitle}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-brand-orange/25 bg-brand-orange/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-brand-orange">
                  <Sparkles size={14} />
                  {cartItemCount} item(s)
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 md:px-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="ml-1 text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400">
                    {text.labels.cart}
                  </span>
                </div>

                <div className="rounded-2xl border border-brand-navy/15 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                  {!cart.length && (
                    <p className="text-sm font-medium text-brand-navy/60 dark:text-gray-400">{text.cartEmptyState}</p>
                  )}
                  {!!cart.length && (
                    <div
                      className={`space-y-3 ${shouldScrollCart ? 'overflow-y-auto pr-2' : ''}`}
                      style={shouldScrollCart && cartListMaxHeight ? { maxHeight: cartListMaxHeight } : undefined}
                    >
                      {cart.map((item, index) => (
                        <div
                          key={item.handle}
                          ref={(node) => {
                            cartItemRefs.current[index] = node;
                          }}
                          className="flex items-center gap-3"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-bold text-brand-navy dark:text-gray-100">{item.title}</p>
                            {item.strength && (
                              <p className="text-[11px] uppercase tracking-widest text-brand-navy/60 dark:text-gray-400">
                                {item.strength}
                              </p>
                            )}
                          </div>
                          <div className="inline-flex items-center gap-2">
                            <button type="button" onClick={() => updateQty(item.handle, -1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-navy/15 text-brand-navy dark:border-white/15 dark:text-gray-100">
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center font-bold text-brand-navy dark:text-white">{item.qty}</span>
                            <button type="button" onClick={() => updateQty(item.handle, 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-navy/15 text-brand-navy dark:border-white/15 dark:text-gray-100">
                              <Plus size={14} />
                            </button>
                          </div>
                          <button type="button" onClick={() => removeItem(item.handle)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="preorder-name" className="ml-1 block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400">
                  {text.labels.name}
                </label>
                <input
                  id="preorder-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClasses}
                  placeholder={es ? 'Nombre completo' : 'Full name'}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="preorder-email" className="ml-1 block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400">
                  {text.labels.email}
                </label>
                <input
                  id="preorder-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClasses}
                  placeholder={es ? 'tu@institucion.edu' : 'you@institution.edu'}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="preorder-phone" className="ml-1 block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400">
                  {text.labels.phone}
                </label>
                <input
                  id="preorder-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClasses}
                  placeholder={es ? '+1 (555) 000-0000' : '+1 (555) 000-0000'}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="preorder-notes" className="ml-1 block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400">
                  {text.labels.notes}
                </label>
                <textarea
                  id="preorder-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="4"
                  className={`${inputClasses} resize-none`}
                  placeholder={es ? 'Notas, uso previsto, plazos...' : 'Notes, intended use, timing...'}
                />
              </div>

              <label className="flex items-start gap-2 rounded-2xl border border-brand-navy/10 bg-white/70 px-4 py-4 text-sm text-brand-navy/70 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="mt-1 accent-brand-orange"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <span>
                  {text.policyNotice}
                </span>
              </label>

              {submitError && <p role="alert" className="text-sm font-bold text-brand-orange">{submitError}</p>}
              {successMessage && <p role="status" className="text-sm font-bold text-emerald-500">{successMessage}</p>}
            </div>

            <div className="border-t border-brand-navy/10 px-5 py-4 dark:border-white/10 md:px-6">
              <button
                type="submit"
                disabled={isSubmitting || !cart.length}
                className="w-full rounded-xl bg-brand-orange py-4 font-black uppercase tracking-widest text-white shadow-xl transition-all hover:-translate-y-1 hover:bg-[#b84600] hover:shadow-brand-orange/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? text.processing : text.cta}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
};

export default PreorderPage;

import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Package, Plus, Minus, Trash2, Sparkles, CheckCircle2 } from 'lucide-react';
import { submitPreorderRequest } from '../services/orderService';
import { useAccessibility } from '../context/AccessibilityContext';
import { getCatalogForRole } from '../services/catalogService';
import { useAuth } from '../context/AuthProvider';

const inputClasses = 'w-full px-4 py-3 border border-brand-navy/25 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-brand-navy dark:text-gray-100 placeholder:text-brand-navy/50 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition-all';
const MAX_VISIBLE_CART_ITEMS = 5;

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
    labels: {
      name: es ? 'Nombre completo' : 'Full name',
      phone: es ? 'Telefono' : 'Phone',
      notes: es ? 'Notas / uso previsto' : 'Notes / intended use',
      email: es ? 'Correo aprobado *' : 'Approved email *',
      cart: es ? 'Carrito de preorden' : 'Pre-order cart',
    },
    emptyCart: es ? 'Selecciona un SKU para preordenar.' : 'Select an SKU to preorder.',
  };

  const catalogFallback = useMemo(() => SKU_CATALOG, []);

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

  const visibleCart = cart.slice(0, MAX_VISIBLE_CART_ITEMS);
  const hiddenCount = Math.max(0, cart.length - MAX_VISIBLE_CART_ITEMS);

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-300">
      <section className="py-12 md:py-18 px-6">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-start">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-montserrat font-black uppercase leading-tight">
                <span className="text-brand-navy dark:text-white">PRE-</span>
                <span className="text-brand-orange">ORDER</span>
              </h1>
              <p className="text-lg text-brand-navy/75 dark:text-gray-300 font-medium leading-relaxed">
                {text.subtitle}
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-brand-orange ml-1">
                    {es ? 'Selecciona SKU' : 'Select SKU'}
                  </span>
                  <span className="text-[10px] font-black text-brand-orange uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={14} /> {cart.reduce((s, i) => s + i.qty, 0)} item(s)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {catalog.map((sku) => {
                    const inCart = cart.some((item) => item.handle === sku.handle);
                    const isSelected = selectedHandle === sku.handle || inCart;
                    return (
                      <button
                        key={sku.handle}
                        type="button"
                        onClick={() => addToCart(sku.handle)}
                        className={`text-left relative rounded-xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 hover:border-brand-orange/50 hover:shadow-md transition p-3 ${isSelected ? 'border-brand-orange bg-brand-orange/5 ring-2 ring-brand-orange/25' : ''}`}
                        disabled={isLoadingCatalog}
                      >
                        {isSelected && (
                          <span
                            className="absolute top-2 right-2 text-brand-orange"
                            aria-label="Selected"
                          >
                            <CheckCircle2 size={16} />
                          </span>
                        )}
                        <p className="text-sm font-black uppercase tracking-widest text-brand-navy dark:text-brand-orange leading-snug">
                          {sku.title}
                        </p>
                        {sku.strength && (
                          <p className="text-[11px] font-semibold text-brand-navy/60 dark:text-gray-400 mt-1">
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
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-white/5 border-2 border-brand-navy dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-sm space-y-5"
              style={reduceMotion ? { transition: 'none' } : undefined}
            >
              <div className="space-y-2">
                <label htmlFor="preorder-name" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">
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
                <label htmlFor="preorder-email" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">
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
                <label htmlFor="preorder-phone" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">
                    {text.labels.cart}
                  </span>
                  <span className="text-[10px] font-black text-brand-orange uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={14} /> {cart.reduce((s, i) => s + i.qty, 0)} {es ? 'item(s)' : 'item(s)'}
                  </span>
                </div>

                <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 space-y-3">
                  {!cart.length && (
                    <p className="text-sm text-brand-navy/60 dark:text-gray-400 font-medium">{text.emptyCart}</p>
                  )}
                  {visibleCart.map((item) => (
                    <div key={item.handle} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-brand-navy dark:text-gray-100">{item.title}</p>
                        {item.strength && (
                          <p className="text-[11px] uppercase tracking-widest text-brand-navy/60 dark:text-gray-400">
                            {item.strength}
                          </p>
                        )}
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <button type="button" onClick={() => updateQty(item.handle, -1)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-brand-navy/15 dark:border-white/15 text-brand-navy dark:text-gray-100">
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-bold text-brand-navy dark:text-white">{item.qty}</span>
                        <button type="button" onClick={() => updateQty(item.handle, 1)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-brand-navy/15 dark:border-white/15 text-brand-navy dark:text-gray-100">
                          <Plus size={14} />
                        </button>
                      </div>
                      <button type="button" onClick={() => removeItem(item.handle)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {hiddenCount > 0 && (
                    <p className="text-[11px] font-semibold text-brand-navy/60 dark:text-gray-400">
                      {es
                        ? `+${hiddenCount} artÃ­culo(s) adicionales en el carrito de preorden.`
                        : `+${hiddenCount} more item(s) saved in your preorder cart.`}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="preorder-notes" className="block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400 ml-1">
                    {text.labels.notes}
                  </label>
                  <textarea
                    id="preorder-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="3"
                    className={`${inputClasses} resize-none`}
                    placeholder={es ? 'Notas, uso previsto, plazos...' : 'Notes, intended use, timing...'}
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm text-brand-navy/70 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="mt-1 accent-brand-orange"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <span>
                  Pre-orders are not guaranteed reservations; fulfillment follows arrival order and stock readiness. You will receive manual follow-up with availability and next steps.
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-orange hover:bg-[#b84600] text-white font-black py-4 rounded-xl transition-all shadow-xl hover:shadow-brand-orange/20 transform hover:-translate-y-1 disabled:opacity-50 uppercase tracking-widest"
              >
                {isSubmitting ? text.processing : text.cta}
              </button>

              {submitError && <p role="alert" className="text-center text-sm font-bold text-brand-orange">{submitError}</p>}
              {successMessage && <p role="status" className="text-center text-sm font-bold text-emerald-500">{successMessage}</p>}
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PreorderPage;

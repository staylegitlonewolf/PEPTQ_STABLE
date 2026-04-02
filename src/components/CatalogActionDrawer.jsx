import React, { useState } from 'react';
import { Copy, PackageMinus, PackagePlus, QrCode, Trash2, X } from 'lucide-react';
import { useAccessibleOverlay } from '../hooks/useAccessibleOverlay';

function CatalogActionDrawer({
  isOpen,
  onClose,
  product = null,
  onToggleVisibility = async () => {},
  updatingVisibility = false,
  onGenerateQr = () => {},
  activeQrHandle = '',
  activeQrUrl = '',
  onCopyHandle = () => {},
  onSubmitAdjustment = () => {},
  submittingAdjustment = false,
  onSavePrice = async () => {},
  savingPrice = false,
  onOpenDiscounts = () => {},
  onDeleteProduct = async () => {},
  deletingProduct = false,
}) {
  const drawerRef = useAccessibleOverlay({ isOpen, onClose });
  const [direction, setDirection] = useState('IN');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [price, setPrice] = useState(() => (
    Number.isFinite(Number(product?.price_vip)) ? Number(product.price_vip).toFixed(2) : ''
  ));

  if (!isOpen || !product) return null;

  const currentStock = Number.isFinite(Number(product?.bulk_stock)) ? Number(product.bulk_stock) : null;
  const isActiveQrRow = String(activeQrHandle || '').trim().toLowerCase() === String(product?.handle || '').trim().toLowerCase();
  const isLive = product?.visible !== false;

  const handleAdjustmentSubmit = (event) => {
    event.preventDefault();
    onSubmitAdjustment({
      handle: product?.handle,
      quantity: Number(quantity || 0),
      direction,
      reason,
    });
  };

  const handlePriceSubmit = (event) => {
    event.preventDefault();
    onSavePrice({
      handle: product?.handle,
      priceVip: price,
    });
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/50">
      <button
        type="button"
        aria-label="Close catalog action drawer"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-drawer-title"
        tabIndex={-1}
        className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-brand-navy/15 dark:border-white/10 bg-white dark:bg-[#111827] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400">Catalog Actions</p>
            <h2 id="catalog-drawer-title" className="mt-1 text-xl font-black text-brand-navy dark:text-white">
              {product?.title || product?.handle}
            </h2>
            <p className="mt-1 text-xs font-mono text-brand-navy/60 dark:text-gray-400">{product?.handle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-brand-navy/15 dark:border-white/10 p-2 text-brand-navy dark:text-gray-200"
            aria-label="Close catalog action drawer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <section className="rounded-2xl border border-brand-navy/10 dark:border-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">Visibility & Handle</p>
            <div className="mt-3">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                  isLive
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                }`}
              >
                {isLive ? 'Live In-Store' : 'Not Available'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 rounded-xl border border-brand-navy/20 dark:border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-brand-navy dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={product.visible !== false}
                  disabled={updatingVisibility}
                  onChange={(event) => onToggleVisibility(product.handle, event.target.checked)}
                />
                {updatingVisibility ? 'Saving...' : 'Set Live'}
              </label>
              <button
                type="button"
                onClick={() => onCopyHandle(product.handle)}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-navy/20 dark:border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-brand-navy dark:text-gray-200"
              >
                <Copy size={14} />
                Copy Handle
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-brand-navy/10 dark:border-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">QR Code</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onGenerateQr(product.handle)}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-orange/30 px-3 py-2 text-xs font-black uppercase tracking-widest text-brand-orange"
              >
                <QrCode size={14} />
                Generate QR
              </button>
              {isActiveQrRow && activeQrUrl ? (
                <a
                  href={activeQrUrl}
                  download={`peptq-${product.handle}-qr.png`}
                  className="rounded-xl border border-brand-navy/20 dark:border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-brand-navy dark:text-gray-200"
                >
                  Download QR
                </a>
              ) : null}
            </div>
            {isActiveQrRow && activeQrUrl ? (
              <div className="mt-4 rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-white/70 dark:bg-[#0f172a]/60 p-3">
                <img
                  src={activeQrUrl}
                  alt={`${product.handle} QR preview`}
                  className="mx-auto h-56 w-full rounded-xl object-contain"
                />
                <p className="mt-3 text-[11px] text-brand-navy/55 dark:text-gray-400">
                  QR links to the live catalog page for this product.
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-brand-navy/10 dark:border-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">Price & Discounts</p>
            <form className="mt-3 space-y-3" onSubmit={handlePriceSubmit}>
              <label className="block">
                <span className="mb-2 block text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400">
                  VIP Price
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-brand-navy/55 dark:text-gray-400">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="w-full rounded-xl border border-brand-navy/20 dark:border-white/15 bg-white dark:bg-[#0b1220] pl-8 pr-4 py-3 text-sm text-brand-navy dark:text-gray-100 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                    placeholder={Number.isFinite(Number(product?.price_vip)) ? Number(product.price_vip).toFixed(2) : '0.00'}
                  />
                </div>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={savingPrice}
                  className="rounded-xl border border-brand-navy/20 dark:border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-navy dark:text-gray-200 disabled:opacity-60"
                >
                  {savingPrice ? 'Saving...' : 'Save Price'}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDiscounts(product)}
                  className="rounded-xl border border-brand-orange/30 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-orange"
                >
                  Discount
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-brand-navy/10 dark:border-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">Adjust Stock</p>
            <p className="mt-2 text-sm text-brand-navy dark:text-gray-200">
              Current tracked stock: {currentStock == null ? 'Untracked' : currentStock}
            </p>
            <form className="mt-4 space-y-4" onSubmit={handleAdjustmentSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDirection('IN')}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black uppercase tracking-widest ${
                    direction === 'IN'
                      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-brand-navy/15 dark:border-white/10 text-brand-navy dark:text-gray-200'
                  }`}
                >
                  <PackagePlus size={16} />
                  Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('OUT')}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black uppercase tracking-widest ${
                    direction === 'OUT'
                      ? 'border-brand-orange/35 bg-brand-orange/10 text-brand-orange'
                      : 'border-brand-navy/15 dark:border-white/10 text-brand-navy dark:text-gray-200'
                  }`}
                >
                  <PackageMinus size={16} />
                  Remove Stock
                </button>
              </div>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="w-full rounded-xl border border-brand-navy/20 dark:border-white/15 bg-white dark:bg-[#0b1220] px-4 py-3 text-sm text-brand-navy dark:text-gray-100 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                placeholder="10"
              />
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="min-h-28 w-full rounded-xl border border-brand-navy/20 dark:border-white/15 bg-white dark:bg-[#0b1220] px-4 py-3 text-sm text-brand-navy dark:text-gray-100 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                placeholder={direction === 'IN' ? 'New shipment arrived.' : 'Breakage during handling.'}
              />
              <button
                type="submit"
                disabled={submittingAdjustment || currentStock == null}
                className="rounded-xl bg-brand-orange px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingAdjustment ? 'Saving...' : 'Apply Adjustment'}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-red-700 dark:text-red-300">Delete Product</p>
            <p className="mt-2 text-sm text-brand-navy/70 dark:text-gray-300">
              This removes the product row from the catalog sheet.
            </p>
            <button
              type="button"
              onClick={() => onDeleteProduct(product.handle)}
              disabled={deletingProduct}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/35 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-700 dark:text-red-300 disabled:opacity-60"
            >
              <Trash2 size={14} />
              {deletingProduct ? 'Deleting...' : 'Delete Product'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default CatalogActionDrawer;

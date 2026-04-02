import React, { useState } from 'react';
import { PackagePlus, PackageMinus, X } from 'lucide-react';
import { useAccessibleOverlay } from '../hooks/useAccessibleOverlay';

function StockAdjustmentModal({
  isOpen,
  onClose,
  onSubmit,
  product = null,
  submitting = false,
}) {
  const dialogRef = useAccessibleOverlay({ isOpen, onClose });
  const [direction, setDirection] = useState('IN');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');

  if (!isOpen || !product) return null;

  const titleId = 'stock-adjustment-title';
  const descriptionId = 'stock-adjustment-description';
  const currentStock = Number.isFinite(Number(product?.bulk_stock)) ? Number(product.bulk_stock) : null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      handle: product?.handle,
      quantity: Number(quantity || 0),
      direction,
      reason,
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/55 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="w-full max-w-lg rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-[#111827] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400">Manual Adjuster</p>
            <h2 id={titleId} className="mt-1 text-xl font-black text-brand-navy dark:text-white">
              Adjust Stock
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-brand-navy/65 dark:text-gray-300">
              Record restock or breakage without touching the raw sheet. This writes a clean `MANUAL_STOCK_ADJUSTMENT` row to the inventory log.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-brand-navy/15 dark:border-white/10 p-2 text-brand-navy dark:text-gray-200"
            aria-label="Close stock adjustment modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-brand-navy/10 dark:border-white/10 p-4">
          <p className="text-sm font-bold text-brand-navy dark:text-white">{product?.title || product?.handle}</p>
          <p className="mt-1 text-xs font-mono text-brand-navy/60 dark:text-gray-400">{product?.handle}</p>
          <p className="mt-2 text-sm text-brand-navy dark:text-gray-200">
            Current tracked stock: {currentStock == null ? 'Untracked' : currentStock}
          </p>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
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

          <div>
            <label htmlFor="stock-adjustment-qty" className="mb-2 block text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">
              Quantity
            </label>
            <input
              id="stock-adjustment-qty"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-xl border border-brand-navy/20 dark:border-white/15 bg-white dark:bg-[#0b1220] px-4 py-3 text-sm text-brand-navy dark:text-gray-100 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              placeholder="10"
            />
          </div>

          <div>
            <label htmlFor="stock-adjustment-reason" className="mb-2 block text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">
              Reason
            </label>
            <textarea
              id="stock-adjustment-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-brand-navy/20 dark:border-white/15 bg-white dark:bg-[#0b1220] px-4 py-3 text-sm text-brand-navy dark:text-gray-100 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
              placeholder={direction === 'IN' ? 'New shipment arrived.' : 'Breakage during handling.'}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-brand-navy/20 dark:border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-navy dark:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || currentStock == null}
              className="rounded-xl bg-brand-orange px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StockAdjustmentModal;

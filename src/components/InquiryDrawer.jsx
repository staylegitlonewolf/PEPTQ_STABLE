import { Minus, Plus, Trash2, X } from 'lucide-react';
import { useAccessibleOverlay } from '../hooks/useAccessibleOverlay';

const InquiryDrawer = ({
  isOpen,
  onClose,
  items,
  onClearAll,
  onIncreaseItem = () => {},
  onDecreaseItem = () => {},
  onRemoveItem = () => {},
  onRequestBulkQuote,
  primaryActionLabel = 'Request Research Access',
  discountCode = '',
  onDiscountCodeChange = () => {},
  onApplyDiscountCode = () => {},
  onRemoveDiscountCode = () => {},
  isApplyingDiscountCode = false,
  appliedDiscount = null,
  subtotalAmount = 0,
  discountAmount = 0,
  totalAmount = 0,
}) => {
  const drawerRef = useAccessibleOverlay({ isOpen, onClose });
  const titleId = 'inquiry-drawer-title';
  const descriptionId = 'inquiry-drawer-description';

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={`fixed top-0 right-0 h-full w-full sm:w-[460px] bg-white dark:bg-gray-900 border-l border-brand-navy/20 dark:border-gray-700 z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="h-full flex flex-col">
          <div className="px-6 py-5 border-b border-brand-navy/15 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 id={titleId} className="text-xl font-montserrat font-black text-brand-navy dark:text-gray-100">
                Research Manifest
              </h2>
              <p id={descriptionId} className="text-sm text-brand-navy/60 dark:text-gray-400">
                {items.length} selected product{items.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg border border-brand-navy/30 dark:border-gray-600 text-brand-navy dark:text-gray-200 hover:bg-brand-navy hover:text-white dark:hover:bg-gray-700 transition"
              aria-label="Close inquiry drawer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {items.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center">
                <p className="text-sm font-montserrat font-bold text-brand-navy/60 dark:text-gray-400">
                  Your research manifest is currently empty.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-peptrx border border-brand-navy/20 dark:border-gray-700 p-3"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-contain rounded border border-brand-navy/10 dark:border-gray-700"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-montserrat font-bold text-brand-navy dark:text-gray-100">
                        {item.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-brand-navy/60 dark:text-gray-400">
                        <span>
                          {Number(item.unit_price || item.price || 0) > 0 ? `$${Number(item.unit_price || item.price || 0).toFixed(2)}` : 'Price set on invoice'}
                        </span>
                        <span>·</span>
                        <span>Qty {Number(item.quantity || 1)}</span>
                        {item.has_tracked_stock ? (
                          <>
                            <span>·</span>
                            <span>Max {Number(item.stock_limit || item.bulk_stock || 0)}</span>
                          </>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onDecreaseItem(item)}
                          disabled={Number(item.quantity || 1) <= 1}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-navy/20 dark:border-gray-700 text-brand-navy dark:text-gray-200 disabled:opacity-40"
                          aria-label={`Decrease ${item.name} quantity`}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-8 text-center text-sm font-black text-brand-navy dark:text-gray-100">
                          {Number(item.quantity || 1)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onIncreaseItem(item)}
                          disabled={item.has_tracked_stock && Number(item.quantity || 1) >= Number(item.stock_limit || item.bulk_stock || 0)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-navy/20 dark:border-gray-700 text-brand-navy dark:text-gray-200 disabled:opacity-40"
                          aria-label={`Increase ${item.name} quantity`}
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item)}
                          className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-orange/25 text-brand-orange"
                          aria-label={`Remove ${item.name} from manifest`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 py-5 border-t border-brand-navy/15 dark:border-gray-700 space-y-3">
            <div className="rounded-peptrx border border-brand-navy/15 dark:border-gray-700 p-3 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(event) => onDiscountCodeChange(event.target.value)}
                  placeholder="Enter coupon code"
                  className="min-w-0 flex-1 rounded-lg border border-brand-navy/20 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-brand-navy dark:text-gray-100 outline-none"
                />
                <button
                  type="button"
                  onClick={onApplyDiscountCode}
                  disabled={items.length === 0 || !discountCode.trim() || isApplyingDiscountCode}
                  className="rounded-lg border border-brand-orange/40 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-brand-orange disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApplyingDiscountCode ? 'Checking' : 'Apply'}
                </button>
              </div>

              {appliedDiscount && (
                <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <p className="font-black uppercase tracking-widest">{appliedDiscount.code} active</p>
                  <p className="mt-1">
                    {Number(appliedDiscount.discount_pct || 0).toFixed(0)}% off
                    {String(appliedDiscount.scope || '').toUpperCase() === 'PRODUCT' && appliedDiscount.product_handle
                      ? ` on ${appliedDiscount.product_handle}`
                      : ' all eligible items'}
                  </p>
                  <button
                    type="button"
                    onClick={onRemoveDiscountCode}
                    className="mt-2 text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 underline underline-offset-2"
                  >
                    Remove Code
                  </button>
                </div>
              )}

              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between text-brand-navy/75 dark:text-gray-300">
                  <span>Subtotal</span>
                  <span>${Number(subtotalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-brand-navy/75 dark:text-gray-300">
                  <span>Discount</span>
                  <span>- ${Number(discountAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between font-black text-brand-navy dark:text-gray-100">
                  <span>Total</span>
                  <span>${Number(totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClearAll}
              disabled={items.length === 0}
              className="w-full py-3 rounded-peptrx border border-brand-navy/30 dark:border-gray-600 text-brand-navy dark:text-gray-100 font-montserrat font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={onRequestBulkQuote}
              disabled={items.length === 0}
              className="w-full py-3 rounded-peptrx bg-brand-orange text-white font-montserrat font-bold hover:bg-[#b84600] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {primaryActionLabel}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default InquiryDrawer;

import React from 'react';
import { Plus, Beaker } from 'lucide-react';
import CatalogImage from './CatalogImage';

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

const ProductCard = ({
  product,
  onAddToManifest,
  onPreorder,
  onClick,
  canOrder = false,
  canPreorder = false,
  onRequestAccess,
  requestAccessLabel = 'Request Access',
  lowStockThreshold = 5,
}) => {
  const stockMeta = resolveStockMeta(product, lowStockThreshold);
  const inStock = stockMeta.inStock;
  const canUseManifest = canOrder && inStock;
  const canUsePreorder = canPreorder && stockMeta.hasNumericStock && !inStock;
  const isAccessEnabled = canUseManifest || canUsePreorder || Boolean(onRequestAccess);
  const stockLabel = inStock ? 'IN STOCK' : 'OUT OF STOCK';
  const stockClass = inStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  const price = product?.price_vip ?? product?.priceVip;
  const lowStockLabel = stockMeta.hasNumericStock && stockMeta.isLowStock
    ? (stockMeta.stock <= Math.max(2, Math.floor(stockMeta.threshold / 2)) ? `ONLY ${stockMeta.stock} LEFT` : `LOW STOCK · ${stockMeta.stock} LEFT`)
    : '';

  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open details for ${product.name}`}
      className="group relative flex flex-col bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 hover:dark:bg-white/8"
    >
      <div className="aspect-square overflow-hidden bg-gray-50 dark:bg-black/20 p-6">
        <CatalogImage
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500"
          wrapperClassName="rounded-xl border border-dashed border-brand-navy/10 dark:border-white/10 bg-white/70 dark:bg-white/5"
          placeholderLabel="Drive image pending"
        />
      </div>

      <div className="p-5 flex flex-col grow">
        <div className="mb-4">
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${stockClass}`}>
            {stockLabel}
          </p>
          {lowStockLabel ? (
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-orange mb-1">
              {lowStockLabel}
            </p>
          ) : null}
          <h3 className="text-xl font-bold text-brand-navy dark:text-white group-hover:text-brand-orange transition-colors">
            {product.name}
          </h3>
          <p className="text-sm font-medium text-brand-navy/50 dark:text-gray-400 mt-1">
            {product.strength}{price ? ` • $${price}` : ''}
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="w-full bg-white dark:bg-white/10 border border-brand-orange text-brand-orange font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-brand-orange hover:text-white transition-all"
            tabIndex={0}
            aria-label="View Details"
          >
            View Details
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (canUseManifest) {
                onAddToManifest(product);
                return;
              }
              if (canUsePreorder) {
                if (onPreorder) onPreorder(product);
                return;
              }
              if (onRequestAccess) onRequestAccess();
            }}
            className="w-full bg-brand-navy dark:bg-brand-orange text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!isAccessEnabled}
          >
            <Plus size={16} />
            {canUseManifest ? 'Add to Manifest' : canUsePreorder ? 'Pre-Order' : requestAccessLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

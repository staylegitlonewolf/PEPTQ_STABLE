import React from 'react';
import ProductCard from './ProductCard';

// onRequestAccess should open /apply page for research access requests
const ProductGrid = ({
  products,
  onAddToManifest,
  onPreorder,
  onProductClick,
  sidePanel = null,
  canOrder = false,
  canPreorder = false,
  onRequestAccess,
  requestAccessLabel = 'Request Access',
  lowStockThreshold = 5,
}) => {
  const gridClasses = sidePanel
    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8';

  return (
    /* FIXED: bg-white for light, matches body #0a0a0f for dark */
    <section className="py-12 px-6 bg-white dark:bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col xl:flex-row gap-8 xl:gap-10">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
              <div>
                <h2 className="text-3xl md:text-5xl font-montserrat font-black text-brand-navy dark:text-white uppercase tracking-tight">
                  Research <span className="text-brand-orange">Products</span>
                </h2>
                <p className="text-brand-navy/60 dark:text-gray-400 font-medium mt-2">
                  Access our curated collection of research materials. Approved members can pre-order tracked items when a shelf is empty.
                </p>
              </div>
            </div>

            <div className={gridClasses}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToManifest={onAddToManifest}
                  onPreorder={onPreorder}
                  onClick={() => onProductClick(product)}
                  canOrder={canOrder}
                  canPreorder={canPreorder}
                  onRequestAccess={onRequestAccess}
                  requestAccessLabel={requestAccessLabel}
                  lowStockThreshold={lowStockThreshold}
                />
              ))}
            </div>
          </div>
          {sidePanel && (
            <aside className="hidden xl:block w-72 shrink-0">
              {sidePanel}
            </aside>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;

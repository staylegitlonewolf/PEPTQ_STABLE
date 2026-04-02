import React, { useMemo, useState } from 'react';
import { Boxes, RefreshCw, Search, SlidersHorizontal, TriangleAlert } from 'lucide-react';

const resolveStockMeta = (item, fallbackThreshold = 5) => {
  const rawStock = Number(item?.bulk_stock);
  const hasNumericStock = Number.isFinite(rawStock);
  const stock = hasNumericStock ? Math.max(0, rawStock) : null;
  const rawThreshold = Number(item?.low_stock_threshold);
  const threshold = Number.isFinite(rawThreshold) && rawThreshold > 0
    ? rawThreshold
    : Math.max(0, Number(fallbackThreshold || 0));
  const outOfStock = hasNumericStock && stock <= 0;
  const lowStock = hasNumericStock && stock > 0 && threshold > 0 && stock <= threshold;

  if (!hasNumericStock) {
    return {
      hasNumericStock,
      stock,
      threshold,
      badge: 'UNTRACKED',
      tone: 'border-brand-navy/20 bg-brand-navy/5 text-brand-navy dark:border-white/15 dark:bg-white/5 dark:text-gray-200',
    };
  }

  if (outOfStock) {
    return {
      hasNumericStock,
      stock,
      threshold,
      badge: 'OUT OF STOCK',
      tone: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    };
  }

  if (lowStock) {
    return {
      hasNumericStock,
      stock,
      threshold,
      badge: `LOW STOCK · ${stock} LEFT`,
      tone: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    };
  }

  return {
    hasNumericStock,
    stock,
    threshold,
    badge: 'IN STOCK',
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  };
};

function OwnerInventoryPanel({
  items = [],
  loading = false,
  fallbackThreshold = 5,
  onRefresh = () => {},
  onOpenActions = () => {},
  globalWarningValue = '',
  onGlobalWarningChange = () => {},
  onSaveGlobalWarning = () => {},
  inputClass = '',
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');

  const summary = useMemo(() => {
    return (Array.isArray(items) ? items : []).reduce((acc, item) => {
      const meta = resolveStockMeta(item, fallbackThreshold);
      acc.total += 1;
      if (!meta.hasNumericStock) {
        acc.untracked += 1;
      } else {
        acc.tracked += 1;
        acc.units += Number(meta.stock || 0);
      }
      if (meta.badge === 'OUT OF STOCK') acc.out += 1;
      if (String(meta.badge).startsWith('LOW STOCK')) acc.low += 1;
      return acc;
    }, {
      total: 0,
      tracked: 0,
      untracked: 0,
      units: 0,
      out: 0,
      low: 0,
    });
  }, [items, fallbackThreshold]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    return (Array.isArray(items) ? items : [])
      .filter((item) => {
        const meta = resolveStockMeta(item, fallbackThreshold);
        const haystack = `${item.title} ${item.handle} ${item.internal_sku} ${item.inventory}`.toLowerCase();
        if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;

        if (filter === 'LIVE') return item.visible !== false;
        if (filter === 'HIDDEN') return item.visible === false;
        if (filter === 'LOW') return String(meta.badge).startsWith('LOW STOCK');
        if (filter === 'OUT') return meta.badge === 'OUT OF STOCK';
        if (filter === 'TRACKED') return meta.hasNumericStock;
        if (filter === 'UNTRACKED') return !meta.hasNumericStock;
        return true;
      })
      .sort((a, b) => String(a.title || a.handle).localeCompare(String(b.title || b.handle)));
  }, [items, query, filter, fallbackThreshold]);

  return (
    <section className="rounded-2xl border border-brand-navy/15 dark:border-white/10 p-4 space-y-4 bg-white/70 dark:bg-white/3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">Shelf View</p>
          <h3 className="mt-1 text-lg font-black text-brand-navy dark:text-white">Owner Inventory Panel</h3>
          <p className="mt-1 text-xs text-brand-navy/60 dark:text-gray-400">
            Catalog rows from the sheet. Open a product to manage visibility, QR, stock, price, and deletion in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-navy/20 dark:border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-brand-navy dark:text-gray-200"
        >
          <RefreshCw size={14} />
          Refresh Shelf
        </button>
      </div>

      <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400">Global Low-Stock Warning</p>
            <p className="mt-1 text-xs text-brand-navy/60 dark:text-gray-400">
              This is the default warning line used when a product does not have its own custom low-stock value.
            </p>
          </div>
          <div className="flex w-full max-w-md gap-2">
            <input
              className={inputClass}
              value={globalWarningValue}
              onChange={(event) => onGlobalWarningChange(event.target.value)}
              inputMode="numeric"
              placeholder="5"
            />
            <button
              type="button"
              onClick={onSaveGlobalWarning}
              className="rounded-xl bg-brand-orange px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400">Catalog Items</p>
          <p className="mt-2 text-2xl font-black text-brand-navy dark:text-white">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Tracked Units</p>
          <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">{summary.units}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Low Stock</p>
          <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-300">{summary.low}</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-red-700 dark:text-red-300">Out Of Stock</p>
          <p className="mt-2 text-2xl font-black text-red-700 dark:text-red-300">{summary.out}</p>
        </div>
        <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-brand-navy/50 dark:text-gray-400">Untracked</p>
          <p className="mt-2 text-2xl font-black text-brand-navy dark:text-white">{summary.untracked}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-navy/40 dark:text-gray-500" />
          <input
            className={`${inputClass} pl-10`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, handle, SKU, or inventory text"
          />
        </label>
        <select className={inputClass} value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="ALL">All Catalog</option>
          <option value="LIVE">Live Only</option>
          <option value="HIDDEN">Hidden Only</option>
          <option value="LOW">Low Stock</option>
          <option value="OUT">Out Of Stock</option>
          <option value="TRACKED">Tracked Only</option>
          <option value="UNTRACKED">Untracked Only</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 p-4 text-sm text-brand-navy/60 dark:text-gray-400">
          Loading inventory shelf...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 p-4 text-sm text-brand-navy/60 dark:text-gray-400">
          No catalog rows match the current shelf filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand-navy/15 dark:border-white/10">
          <table className="min-w-full divide-y divide-brand-navy/10 dark:divide-white/10">
            <thead className="bg-brand-navy/[0.04] dark:bg-white/[0.04]">
              <tr className="text-left text-[11px] font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Handle</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Low-Stock Warning</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-navy/10 dark:divide-white/10">
              {filteredItems.map((item) => {
                const meta = resolveStockMeta(item, fallbackThreshold);
                return (
                  <tr key={item.handle} className="align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <Boxes size={16} className="mt-0.5 text-brand-orange" />
                        <div>
                          <p className="text-sm font-bold text-brand-navy dark:text-white">{item.title || item.handle}</p>
                          <p className="text-xs text-brand-navy/60 dark:text-gray-400">{item.internal_sku || 'No SKU'}{item.last_updated ? ` · Updated ${item.last_updated}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-brand-navy dark:text-gray-200">{item.handle}</td>
                    <td className="px-4 py-3 text-sm text-brand-navy dark:text-gray-200">
                      {meta.hasNumericStock ? meta.stock : (item.inventory || 'INQUIRY')}
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-navy dark:text-gray-200">
                      {meta.hasNumericStock ? meta.threshold : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${meta.tone}`}>
                        {String(meta.badge).startsWith('LOW STOCK') ? <TriangleAlert size={12} /> : null}
                        {meta.badge}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-navy dark:text-gray-200">
                      {Number.isFinite(Number(item.price_vip)) ? `$${Number(item.price_vip).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onOpenActions(item)}
                        className="inline-flex items-center gap-2 rounded-lg border border-brand-orange/30 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-brand-orange"
                      >
                        <SlidersHorizontal size={14} />
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default OwnerInventoryPanel;

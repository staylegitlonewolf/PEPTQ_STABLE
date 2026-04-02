import React, { useMemo, useState } from 'react';
import { History, RefreshCw, Search } from 'lucide-react';

const formatWhen = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

function OwnerInventoryMovementLog({
  rows = [],
  loading = false,
  onRefresh = () => {},
  inputClass = '',
}) {
  const [query, setQuery] = useState('');

  const filteredRows = useMemo(() => {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    return (Array.isArray(rows) ? rows : []).filter((row) => {
      if (!normalizedQuery) return true;
      const haystack = `${row.handle} ${row.title} ${row.order_id} ${row.actor_email} ${row.command} ${row.note}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [rows, query]);

  return (
    <section className="rounded-2xl border border-brand-navy/15 dark:border-white/10 p-4 space-y-4 bg-white/70 dark:bg-white/3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">Shelf Tape</p>
          <h3 className="mt-1 text-lg font-black text-brand-navy dark:text-white">Inventory Movement Log</h3>
          <p className="mt-1 text-xs text-brand-navy/60 dark:text-gray-400">
            Tracks portal-driven stock changes from accept and cancel flows. Direct sheet edits are not auto-captured in this first pass.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-navy/20 dark:border-white/15 px-3 py-2 text-xs font-black uppercase tracking-widest text-brand-navy dark:text-gray-200"
        >
          <RefreshCw size={14} />
          Refresh Tape
        </button>
      </div>

      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-navy/40 dark:text-gray-500" />
        <input
          className={`${inputClass} pl-10`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by handle, order, operator, or note"
        />
      </label>

      {loading ? (
        <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 p-4 text-sm text-brand-navy/60 dark:text-gray-400">
          Loading inventory tape...
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 p-4 text-sm text-brand-navy/60 dark:text-gray-400">
          No movement rows yet for the current filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand-navy/15 dark:border-white/10">
          <table className="min-w-full divide-y divide-brand-navy/10 dark:divide-white/10">
            <thead className="bg-brand-navy/[0.04] dark:bg-white/[0.04]">
              <tr className="text-left text-[11px] font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Move</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-navy/10 dark:divide-white/10">
              {filteredRows.map((row, index) => {
                const positive = Number(row.delta || 0) > 0;
                const deltaLabel = `${positive ? '+' : ''}${Number(row.delta || 0)}`;
                const tone = positive
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-brand-orange';

                return (
                  <tr key={`${row.timestamp}-${row.handle}-${index}`} className="align-top">
                    <td className="px-4 py-3 text-xs text-brand-navy dark:text-gray-200">{formatWhen(row.timestamp)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <History size={16} className="mt-0.5 text-brand-orange" />
                        <div>
                          <p className="text-sm font-bold text-brand-navy dark:text-white">{row.title || row.handle}</p>
                          <p className="text-xs font-mono text-brand-navy/60 dark:text-gray-400">{row.handle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-black ${tone}`}>{deltaLabel}</p>
                      <p className="text-[11px] text-brand-navy/60 dark:text-gray-400">{row.command || row.direction}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-navy dark:text-gray-200">
                      <p>{Number(row.previous_stock || 0)} {'->'} {Number(row.next_stock || 0)}</p>
                      <p className="text-brand-navy/60 dark:text-gray-400">qty {Number(row.quantity || 0)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-navy dark:text-gray-200">
                      <p>{row.order_id || '-'}</p>
                      {row.note ? <p className="mt-1 text-brand-navy/60 dark:text-gray-400">{row.note}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-navy dark:text-gray-200">{row.actor_email || 'system'}</td>
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

export default OwnerInventoryMovementLog;

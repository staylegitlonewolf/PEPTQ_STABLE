import React from 'react';

const toneByStatus = {
  PENDING: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  CONTACTED: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  READY: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  CONVERTED: 'border-brand-navy/20 dark:border-white/15 bg-brand-navy/5 dark:bg-white/5 text-brand-navy dark:text-gray-200',
  CANCELLED: 'border-brand-orange/30 bg-brand-orange/10 text-brand-orange',
};

const formatWhen = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

const OwnerPreorderQueue = ({
  rows = [],
  loading = false,
  onRefresh = () => {},
  onStatusChange = () => {},
  updatingId = '',
}) => {
  const items = Array.isArray(rows) ? rows : [];
  const pendingCount = items.filter((row) => row.status === 'PENDING').length;
  const readyCount = items.filter((row) => row.status === 'READY').length;

  return (
    <section className="rounded-3xl border border-brand-navy/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 md:p-5 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-navy/55 dark:text-gray-400">Preorder Queue</p>
          <h3 className="text-lg font-black text-brand-navy dark:text-white">Manual interest ledger for out-of-stock products</h3>
          <p className="text-xs text-brand-navy/65 dark:text-gray-400">
            Pending {pendingCount} · Ready {readyCount} · Total {items.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-xl border border-brand-navy/20 dark:border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-navy dark:text-gray-200"
        >
          Refresh Queue
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-brand-navy/70 dark:text-gray-400">Loading preorder queue...</p>
      ) : !items.length ? (
        <p className="text-sm text-brand-navy/70 dark:text-gray-400">No preorder requests yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((row) => {
            const status = String(row.status || 'PENDING').toUpperCase();
            const statusTone = toneByStatus[status] || toneByStatus.PENDING;
            const isUpdating = updatingId && updatingId === row.preorder_id;

            return (
              <article
                key={row.preorder_id || `${row.member_email}-${row.product_handle}-${row.timestamp}`}
                className="rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-white/80 dark:bg-white/3 p-4 space-y-3"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusTone}`}>
                        {status}
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy/45 dark:text-gray-500">
                        {row.preorder_id}
                      </span>
                    </div>
                    <p className="text-base font-black text-brand-navy dark:text-white">
                      {row.product_title || row.product_handle}
                    </p>
                    <p className="text-xs text-brand-navy/70 dark:text-gray-400">
                      Handle: {row.product_handle} · Qty {Number(row.requested_qty || 0)}
                    </p>
                  </div>
                  <div className="text-xs text-brand-navy/70 dark:text-gray-400">
                    Requested {formatWhen(row.timestamp)}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-brand-navy/10 dark:border-white/10 p-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-brand-navy/55 dark:text-gray-500">Member</p>
                    <p className="mt-1 text-sm font-bold text-brand-navy dark:text-gray-100">
                      {row.full_name || row.member_email}
                    </p>
                    {row.business_name ? (
                      <p className="text-xs text-brand-navy/70 dark:text-gray-400">{row.business_name}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <a href={`mailto:${row.member_email}`} className="rounded-lg border border-brand-orange/30 px-2.5 py-1 font-bold text-brand-orange">
                        Email
                      </a>
                      {row.phone ? (
                        <a href={`tel:${row.phone}`} className="rounded-lg border border-brand-navy/20 dark:border-white/15 px-2.5 py-1 font-bold text-brand-navy dark:text-gray-200">
                          Call
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-brand-navy/10 dark:border-white/10 p-3">
                    <p className="text-[11px] font-black uppercase tracking-widest text-brand-navy/55 dark:text-gray-500">Operator Notes</p>
                    <p className="mt-1 text-xs text-brand-navy/70 dark:text-gray-400 whitespace-pre-wrap">
                      {row.owner_notes || 'No owner notes yet.'}
                    </p>
                    <p className="mt-2 text-[11px] text-brand-navy/50 dark:text-gray-500">
                      Contacted: {row.notified_at ? formatWhen(row.notified_at) : 'Not yet'}
                    </p>
                    {row.converted_order_id ? (
                      <p className="text-[11px] text-brand-navy/50 dark:text-gray-500">Converted Order: {row.converted_order_id}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isUpdating || status === 'CONTACTED'}
                    onClick={() => onStatusChange(row, 'CONTACTED')}
                    className="rounded-xl border border-sky-500/30 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-300 disabled:opacity-50"
                  >
                    Mark Contacted
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating || status === 'READY'}
                    onClick={() => onStatusChange(row, 'READY')}
                    className="rounded-xl border border-emerald-500/30 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 disabled:opacity-50"
                  >
                    Mark Ready
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating || status === 'CONVERTED'}
                    onClick={() => onStatusChange(row, 'CONVERTED')}
                    className="rounded-xl border border-brand-navy/20 dark:border-white/15 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-brand-navy dark:text-gray-200 disabled:opacity-50"
                  >
                    Mark Converted
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating || status === 'CANCELLED'}
                    onClick={() => onStatusChange(row, 'CANCELLED')}
                    className="rounded-xl border border-brand-orange/30 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-brand-orange disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default OwnerPreorderQueue;

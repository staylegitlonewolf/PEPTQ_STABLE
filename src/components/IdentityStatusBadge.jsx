import { Building2, MapPin, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

function IdentityStatusBadge({
  title = 'Active identity',
  modeLabel = 'Personal account',
  shippingLabel = 'Shipping to',
  shippingSummary = '',
  detailText = '',
  addressType = 'PERSONAL',
  businessName = '',
  loading = false,
  editLabel = 'Edit profile',
}) {
  const isBusiness = String(addressType || '').toUpperCase() === 'BUSINESS';
  const Icon = isBusiness ? Building2 : UserRound;

  return (
    <div className="rounded-3xl border border-brand-orange/20 bg-linear-to-br from-white to-brand-orange/5 dark:from-[#111827] dark:to-[#1b1220] px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-orange">{title}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-orange/25 bg-brand-orange/10 text-brand-orange">
              <Icon size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-widest text-brand-navy dark:text-white">{modeLabel}</p>
              {businessName ? (
                <p className="mt-1 truncate text-sm font-semibold text-brand-navy/75 dark:text-gray-300">{businessName}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 sm:min-w-[260px]">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-navy/55 dark:text-gray-400">{shippingLabel}</p>
          {loading ? (
            <p className="mt-2 text-sm font-semibold text-brand-navy/65 dark:text-gray-300">Loading shipping profile...</p>
          ) : (
            <>
              <div className="mt-2 flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-brand-orange" />
                <p className="text-sm font-semibold leading-relaxed text-brand-navy dark:text-gray-100">
                  {shippingSummary || 'No shipping address saved yet.'}
                </p>
              </div>
              {detailText ? (
                <p className="mt-2 text-xs text-brand-navy/60 dark:text-gray-400">{detailText}</p>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Link
          to="/profile"
          className="inline-flex items-center rounded-xl border border-brand-orange/35 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-brand-orange transition hover:bg-brand-orange hover:text-white"
        >
          {editLabel}
        </Link>
      </div>
    </div>
  );
}

export default IdentityStatusBadge;

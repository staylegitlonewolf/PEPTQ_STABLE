import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ShieldCheck, ArrowRight } from 'lucide-react';

const normalizeLot = (value) => String(value || '').trim().toUpperCase();

const CoaLibraryPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [lotInput, setLotInput] = useState('');

  const deepLinkLot = useMemo(() => normalizeLot(searchParams.get('lot') || searchParams.get('lot_id')), [searchParams]);

  useEffect(() => {
    if (!deepLinkLot) return;
    navigate(`/verify/${encodeURIComponent(deepLinkLot)}`, { replace: true });
  }, [deepLinkLot, navigate]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextLot = normalizeLot(lotInput);
    if (!nextLot) return;
    navigate(`/verify/${encodeURIComponent(nextLot)}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange border border-brand-orange/20 mb-4">
          <ShieldCheck size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">COA Library</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-brand-navy dark:text-white tracking-tighter mb-3">Scan for COA</h1>
        <p className="text-sm text-brand-navy/60 dark:text-gray-400 font-medium">
          Enter a LOT ID to view a Certificate of Analysis. If a COA is not uploaded yet, you will see a pending message (never a blank page).
        </p>
      </div>

      <div className="rounded-4xl border border-brand-navy/15 dark:border-white/10 bg-white/50 dark:bg-white/5 p-6 sm:p-8 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch">
          <label className="sr-only" htmlFor="lot_id">LOT ID</label>
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/30 dark:text-white/30" />
            <input
              id="lot_id"
              value={lotInput}
              onChange={(e) => setLotInput(e.target.value)}
              placeholder="Example: MIC1026-01"
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-bold text-brand-navy dark:text-white placeholder:text-brand-navy/30 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="rounded-2xl bg-brand-navy text-white px-6 py-3 text-xs font-black uppercase tracking-widest hover:bg-brand-orange transition-colors"
          >
            Lookup COA
          </button>
        </form>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-brand-navy/60 dark:text-gray-400">
            Tip: Most labels include a LOT value. Scan the QR or type the LOT here.
          </div>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-navy dark:text-white/70 hover:text-brand-orange transition-colors"
          >
            Browse Catalog <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CoaLibraryPage;

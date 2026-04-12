import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Search, 
  FlaskConical, 
  Calendar, 
  FileText, 
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  Lock
} from 'lucide-react';
import { catalogService } from '../services/catalogService';
import { toEmbeddableGoogleDriveUrl } from '../utils/driveLinks';

// ── Auth helper ───────────────────────────────────────────────────────────────
const AUTH_KEY = 'peptq_auth_v1';
const APPROVED_ROLES = new Set(['MEMBER', 'VIP', 'OWNER', 'INSTITUTIONAL']);
const getSessionRole = () => {
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    const session = raw ? JSON.parse(raw) : null;
    return String(session?.role || 'GUEST').trim().toUpperCase();
  } catch { return 'GUEST'; }
};

const VerifyPage = () => {
  const { lotId } = useParams();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const role      = getSessionRole();
  const isMember  = APPROVED_ROLES.has(role);
  const isOwner   = role === 'OWNER';

  useEffect(() => {
    const fetchLot = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await catalogService.getLotDetails(lotId);
        if (data) {
          setRecord(data);
        } else {
          setError('Lot entry not found in our registry.');
        }
      } catch {
        setError('Unable to reach the verification server.');
      } finally {
        setLoading(false);
      }
    };

    fetchLot();
  }, [lotId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <Loader2 className="h-12 w-12 text-brand-orange animate-spin mb-4" />
        <p className="text-sm font-black uppercase tracking-widest text-brand-navy/60 dark:text-white/60">
          Authenticating Research Batch...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center max-w-md mx-auto">
        <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-black text-brand-navy dark:text-white mb-2 uppercase tracking-tight">
          Verification Failed
        </h1>
        <p className="text-sm text-brand-navy/60 dark:text-gray-400 mb-8">
          The Lot ID <span className="font-bold text-brand-navy dark:text-white">"{lotId}"</span> could not be verified against our master registry. Please check the ID on your vial or contact institutional support.
        </p>
        <Link 
          to="/" 
          className="rounded-full bg-brand-navy text-white px-8 py-3 text-xs font-black uppercase tracking-widest hover:bg-brand-orange transition-colors"
        >
          Return to Portal
        </Link>
      </div>
    );
  }


  const coaUrl = String(record?.coa_url || '').trim();
  const coaEmbedUrl = toEmbeddableGoogleDriveUrl(coaUrl);
  const isPdf = /\\.pdf(?:$|[?#])/i.test(coaUrl);
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Verification Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <ShieldCheck size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Research Batch Verified</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-brand-navy dark:text-white tracking-tighter mb-2">
          Batch Authentication
        </h1>
        <p className="text-sm text-brand-navy/60 dark:text-gray-400 uppercase tracking-widest font-bold">
          Lot Resource Profile: {lotId}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Technical Data Grid */}
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="rounded-3xl border border-brand-navy/15 dark:border-white/10 bg-white/50 dark:bg-white/5 p-6 backdrop-blur-xl">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange mb-6">Batch Profile</h2>
            
            <div className="grid grid-cols-2 gap-y-6">
              <div>
                <p className="text-[10px] font-black uppercase text-brand-navy/40 dark:text-white/40 mb-1 flex items-center gap-1.5">
                  <FlaskConical size={12} /> Product Identity
                </p>
                <p className="text-sm font-black text-brand-navy dark:text-white truncate">{record.product_id}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-brand-navy/40 dark:text-white/40 mb-1 flex items-center gap-1.5">
                  <Search size={12} /> Registry ID
                </p>
                <p className="text-sm font-black text-brand-navy dark:text-white">{record.lot_id}</p>
              </div>
              <div className="col-span-2">
                <div className="p-4 rounded-2xl bg-brand-navy dark:bg-white text-white dark:text-brand-navy shadow-xl shadow-brand-navy/10">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1 text-center">Certified Purity Level</p>
                  <p className="text-4xl font-black text-center tracking-tighter">{record.purity_pct}%</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-brand-navy/40 dark:text-white/40 mb-1 flex items-center gap-1.5">
                  <Calendar size={12} /> Date Tested
                </p>
                <p className="text-sm font-black text-brand-navy dark:text-white">{record.test_date || 'Certified Prior'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-brand-navy/40 dark:text-white/40 mb-1 flex items-center gap-1.5">
                  <ShieldCheck size={12} /> Status
                </p>
                <p className="text-sm font-black text-emerald-500 uppercase">{record.verification_state || 'VERIFIED'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-brand-navy/15 dark:border-white/10 bg-white/50 dark:bg-white/5 p-6 backdrop-blur-xl">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-navy/60 dark:text-white/60">Integrity Notes</h3>
                <FileText size={16} className="text-brand-orange" />
             </div>
             <p className="text-xs text-brand-navy/60 dark:text-gray-400 leading-relaxed font-medium">
               This record is cryptographically linked to its physical counterpart via the unique LOT identifier. PEPTQ ensures that every vial dispatched in this batch corresponds 100% to the analytical laboratory report shown.
             </p>
          </div>
        </div>

        {/* COA Preview / Link */}
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
           {record.coa_url ? (
             <div className="group relative overflow-hidden rounded-4xl border-2 border-brand-navy/10 dark:border-white/10 bg-black aspect-3/4 shadow-2xl transition-all hover:border-brand-orange/50">
               {/* ── Member gate: blur PDF for non-members ── */}
               {!isMember && (
                 <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-navy/80 backdrop-blur-md px-8 text-center">
                   <div className="h-14 w-14 rounded-full bg-brand-orange/20 flex items-center justify-center mb-4">
                     <Lock size={28} className="text-brand-orange" />
                   </div>
                   <p className="text-xs font-black uppercase tracking-[0.2em] text-white mb-2">Members Only</p>
                   <p className="text-[11px] text-white/60 mb-6 leading-relaxed">
                     Certificate of Analysis documents are restricted to verified PEPTQ members.
                   </p>
                   <Link
                     to="/apply"
                     className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-orange text-white text-xs font-black uppercase tracking-widest hover:bg-brand-orange/90 transition-colors"
                   >
                     Apply for Access <ArrowRight size={13} />
                   </Link>
                 </div>
               )}
               {/* COA Document */}
               <div className={!isMember ? 'blur-sm pointer-events-none select-none' : ''}>
                 {isPdf ? (
                   <iframe
                     src={coaEmbedUrl || coaUrl}
                     title="Certificate of Analysis"
                     className="w-full h-full"
                     style={{ border: 0 }}
                   />
                 ) : (
                   <img
                     src={coaEmbedUrl || coaUrl}
                     alt="Certificate of Analysis"
                     className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                   />
                 )}
               </div>
               {isMember && (
                 <>
                   <div className="absolute inset-x-0 bottom-0 p-8 bg-linear-to-t from-black/80 to-transparent">
                     <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Primary Lab Certificate</p>
                     <a
                       href={coaUrl}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="inline-flex items-center gap-2 text-white font-black uppercase tracking-widest text-xs group-hover:text-brand-orange transition-colors"
                     >
                       View Full Document <ExternalLink size={14} />
                     </a>
                   </div>
                   <div className="absolute top-6 right-6 h-10 w-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20">
                     <Search size={18} />
                   </div>
                 </>
               )}
             </div>
           ) : (
             <div className="rounded-4xl border-2 border-dashed border-brand-navy/15 dark:border-white/10 flex flex-col items-center justify-center p-12 text-center aspect-3/4">
                <AlertCircle size={48} className="text-brand-navy/20 dark:text-white/20 mb-4" />
                <p className="text-sm font-black text-brand-navy dark:text-white uppercase mb-2">CoA Document Pending</p>
                <p className="text-xs text-brand-navy/50 dark:text-gray-500">This batch is verified, but the digital document is currently undergoing encryption. Check back shortly.</p>
             </div>
           )}
           
           <div className="flex justify-center">
              <Link to="/login" className="inline-flex items-center gap-2 group text-[10px] font-black uppercase tracking-[0.2em] text-brand-navy dark:text-white/60 hover:text-brand-orange transition-colors">
                 Proceed to Member Portal <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyPage;


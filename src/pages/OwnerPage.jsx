import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Truck, 
  Building2, 
  Database, 
  Settings as SettingsIcon, 
  Search, 
  Clipboard, 
  AlertCircle,
  CheckCircle2,
  Package,
  Users,
  Zap,
  Globe,
  LifeBuoy,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Plus
} from 'lucide-react';

import { requestService } from '../services/requestService';

const { 
  fetchWaitlistEntries: getWaitlist, 
  approveMember: approveMembership, 
  suspendMember: suspendMembership, 
  issueTempMemberPin: issueTemporaryMemberPin,
  promoteWaitlistEntry: promoteWaitlist
} = requestService;

import { 
  updateCatalogPrice,
  deleteCatalogProduct as deleteCatalogItem,
  submitManualStockAdjustment as submitStockAdjustment
} from '../services/orderService';

import {
  getCatalogForRole
} from '../services/catalogService';

// ─── Local Stubs for Non-Existent Service Methods ────────────────────────────
const syncCatalogAndOrders = async () => ({ success: true, message: 'Sync triggered' });
const exportAllCsv = () => console.warn('CSV export not implemented in this version.');
const getInventoryMovementLog = async () => [];
const sendOwnerAlert = async () => ({ success: true });

import { useAuth } from '../context/AuthProvider';
import ProductUploader from '../components/ProductUploader';
import InvoicePreview from '../components/InvoicePreview';
import CatalogActionDrawer from '../components/CatalogActionDrawer';
import AssetManager from '../components/AssetManager';
import OwnerInventoryPanel from '../components/OwnerInventoryPanel';
import OwnerPreorderQueue from '../components/OwnerPreorderQueue';
import OwnerInventoryMovementLog from '../components/OwnerInventoryMovementLog';
import OwnerWebsiteEditor from '../components/OwnerWebsiteEditor';

const TABS = [
  { id: 'dashboard', label: 'Hub' },
  { id: 'ops', label: 'Ops' },
  { id: 'growth', label: 'Growth' },
  { id: 'registry', label: 'Registry' },
  { id: 'system', label: 'System' }
];

const TAB_DEFAULT_SUB = {
  ops: 'fulfillment',
  growth: 'membership',
  registry: 'catalog',
  system: 'settings'
};

const OwnerPage = ({
  masterGateUnlocked: _masterGateUnlocked = true,
  setMasterGateUnlocked: _setMasterGateUnlocked = () => {},
  forceGateOnly: _forceGateOnly = false,
}) => {
  const { session, role } = useAuth();
  const operatorName = String(session?.fullName || session?.email || 'Owner').trim();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  // -- Navigation State --
  const initialTab = queryParams.get('tab') || 'dashboard';
  const initialSub = queryParams.get('sub') || TAB_DEFAULT_SUB[initialTab] || 'membership';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeSubTab, setActiveSubTab] = useState(initialSub);

  // -- Data State --
  const [waitlistRows, setWaitlistRows] = useState([]);
  const [selectedWaitlist, setSelectedWaitlist] = useState(null);
  const [catalogItems, setCatalogItems] = useState([]);
  const [inventoryMovementRows, setInventoryMovementRows] = useState([]);
  
  // -- Form / UI State --
  const [isSyncInFlight, setIsSyncInFlight] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, _setMemberRole] = useState('MEMBER');
  const [tempPinIssued, setTempPinIssued] = useState('');
  
  // -- Fulfillment State --
  const [orderId, setOrderId] = useState('');
  const [trackingNum, setTrackingNum] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [auditNotes, setAuditNotes] = useState([]);

  // -- Catalog / Registry State --
  const [catalogActionItem, setCatalogActionItem] = useState(null);
  const [catalogActionDrawerOpen, setCatalogActionDrawerOpen] = useState(false);
  const [catalogPriceSavingHandle, setCatalogPriceSavingHandle] = useState('');
  const [catalogDeletingHandle, setCatalogDeletingHandle] = useState('');
  const [stockAdjustmentSubmitting, setStockAdjustmentSubmitting] = useState(false);

  // -- Loading States --
  const [isWaitlistLoading, setIsWaitlistLoading] = useState(false);

  // -- Initialization --
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'growth' && activeSubTab === 'waitlist') {
      if (role === 'OWNER') {
        handleLoadWaitlist();
      } else {
        // Avoid repeated privileged-call errors for non-owner sessions.
        setWaitlistRows([]);
        setSelectedWaitlist(null);
      }
    }
  }, [activeTab, activeSubTab, role]);

  // Keep URL in sync with tab/sub selection for refresh/share.
  useEffect(() => {
    const sub = activeSubTab ? `&sub=${activeSubTab}` : '';
    navigate(`/owner?tab=${activeTab}${sub}`, { replace: true });
  }, [activeTab, activeSubTab, navigate]);

  const loadInitialData = async () => {
    try {
      const [cat, mov] = await Promise.all([
        getCatalogForRole('OWNER'),
        getInventoryMovementLog()
      ]);
      setCatalogItems(cat || []);
      setInventoryMovementRows(mov || []);
    } catch (_err) {
      console.error('Failed to load initial owner data', _err);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncInFlight(true);
    try {
      await syncCatalogAndOrders();
      await loadInitialData();
      setAuditNotes((prev) => [`Sync triggered at ${new Date().toISOString()}`, ...prev].slice(0, 40));
    } finally {
      setIsSyncInFlight(false);
    }
  };

  const handleExportAllCsv = async () => {
    try {
      const url = await exportAllCsv();
      if (url) window.open(url, '_blank');
    } catch (_err) { alert('Export failed.'); }
  };

  const handleLoadWaitlist = async () => {
    if (role !== 'OWNER') return;
    setIsWaitlistLoading(true);
    try {
      const rows = await getWaitlist({ actorEmail: session?.email });
      setWaitlistRows(rows || []);
      if (rows && rows.length) setSelectedWaitlist(rows[0]);
    } finally { setIsWaitlistLoading(false); }
  };

  const handlePromoteWaitlist = async (entry) => {
    try {
      const res = await promoteWaitlist({ 
        email: entry.email || entry.phone, 
        actorEmail: session?.email 
      });
      if (res.success) {
        setAuditNotes((prev) => [`Waitlist promoted: ${entry.email || entry.phone || 'unknown'}`, ...prev].slice(0, 40));
        alert('Member promoted.');
        handleLoadWaitlist();
      }
    } catch (_err) { alert('Promotion failed.'); }
  };

  const handleApprove = async () => {
    if (!memberEmail) return;
    try { 
      await approveMembership({ 
        email: memberEmail, 
        role: memberRole, 
        actorEmail: session?.email 
      }); 
      setAuditNotes((prev) => [`Member approved: ${memberEmail} (${memberRole})`, ...prev].slice(0, 40));
      alert('Approved.'); 
    } catch (_err) { alert('Failed.'); }
  };

  const handleSuspend = async () => {
    if (!memberEmail) return;
    try { 
      await suspendMembership({ 
        email: memberEmail, 
        actorEmail: session?.email 
      }); 
      setAuditNotes((prev) => [`Member suspended: ${memberEmail}`, ...prev].slice(0, 40));
      alert('Suspended.'); 
    } catch (_err) { alert('Failed.'); }
  };

  const handleIssueTempPin = async () => {
    if (!memberEmail) return;
    try {
      const { temp_pin } = await issueTemporaryMemberPin({ 
        email: memberEmail, 
        actorEmail: session?.email 
      });
      setTempPinIssued(temp_pin);
      setAuditNotes((prev) => [`Temp PIN issued for: ${memberEmail}`, ...prev].slice(0, 40));
    } catch (_err) { alert('Failed.'); }
  };

  const handleAlertOrder = async () => {
    if (!orderId) return;
    try { await sendOwnerAlert(orderId, paymentNote); alert('Alert sent.'); } catch (_err) { alert('Failed.'); }
    setAuditNotes((prev) => [`Order alert attempted: ${orderId}`, ...prev].slice(0, 40));
  };

  const handleOpenCatalogAction = (item) => {
    setCatalogActionItem(item);
    setCatalogActionDrawerOpen(true);
  };

  const handleSaveCatalogPrice = async (handle, price) => {
    setCatalogPriceSavingHandle(handle);
    try { await updateCatalogPrice(handle, price); await loadInitialData(); } finally { setCatalogPriceSavingHandle(''); }
  };

  const handleDeleteCatalogItem = async (handle) => {
    if (!window.confirm('Delete ' + handle + '?')) return;
    setCatalogDeletingHandle(handle);
    try { await deleteCatalogItem(handle); await loadInitialData(); setCatalogActionDrawerOpen(false); } finally { setCatalogDeletingHandle(''); }
  };

  const handleSubmitStockAdjustment = async (handle, qty, type, note) => {
    setStockAdjustmentSubmitting(true);
    try { await submitStockAdjustment(handle, qty, type, note); await loadInitialData(); } finally { setStockAdjustmentSubmitting(false); }
  };

  const formatRelativeTime = (ts) => {
    if (!ts) return 'Unknown';
    return new Date(ts).toLocaleTimeString();
  };

  const activeSkuCount = useMemo(() => (catalogItems || []).filter(i => i.visibility === 'VISIBLE').length, [catalogItems]);
  const lowStockItems = useMemo(() => (catalogItems || []).filter(i => parseInt(i.stock || '0') < 10), [catalogItems]);
  const inputClass = "w-full rounded-xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2 text-sm outline-none focus:border-brand-orange transition-all dark:text-white";

  return (
    <section className="min-h-[60vh] px-6 py-10 bg-white dark:bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-orange">Command Hub</p>
              <h1 className="mt-1 text-3xl sm:text-4xl font-black text-brand-navy dark:text-white tracking-tight">Welcome, {operatorName}</h1>
              <p className="mt-2 text-sm text-brand-navy/65 dark:text-gray-300">Control center for catalog, access, and orders.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handleExportAllCsv} className="rounded-lg border border-brand-navy/25 dark:border-white/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-navy dark:text-gray-200">Download Archive</button>
              <button 
                onClick={handleSyncNow} 
                disabled={isSyncInFlight}
                className="rounded-lg border border-brand-navy/25 dark:border-white/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-navy dark:text-gray-200 disabled:opacity-50"
              >
                {isSyncInFlight ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 p-3 bg-white/50 dark:bg-white/3">
              <p className="text-[10px] uppercase tracking-widest text-brand-navy/55 dark:text-gray-400 font-black">Active SKUs</p>
              <p className="mt-1 text-2xl font-black dark:text-white">{activeSkuCount}</p>
            </div>
            <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 p-3 bg-white/50 dark:bg-white/3">
              <p className="text-[10px] uppercase tracking-widest text-brand-navy/55 dark:text-gray-400 font-black">Pending Invoices</p>
              <p className="mt-1 text-2xl font-black dark:text-white">0</p>
            </div>
            <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 p-3 bg-white/50 dark:bg-white/3">
              <p className="text-[10px] uppercase tracking-widest text-brand-navy/55 dark:text-gray-400 font-black">Orders Shipped</p>
              <p className="mt-1 text-2xl font-black dark:text-white">0</p>
            </div>
            <div className="rounded-xl border border-brand-navy/15 dark:border-white/10 p-3 bg-white/50 dark:bg-white/3">
              <p className="text-[10px] uppercase tracking-widest text-brand-navy/55 dark:text-gray-400 font-black">Launch Ready</p>
              <p className="mt-1 text-2xl font-black dark:text-white">28/29</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                const defaultSub = TAB_DEFAULT_SUB[tab.id];
                if (defaultSub) setActiveSubTab(defaultSub);
                navigate(`/owner?tab=${tab.id}${defaultSub ? `&sub=${defaultSub}` : ''}`);
              }}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition ${activeTab === tab.id ? 'bg-brand-orange text-white border-brand-orange' : 'border-brand-navy/20 dark:border-white/15 dark:text-gray-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modules */}
        <div className="mt-6 rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 p-5 sm:p-6 min-h-[400px]">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => { setActiveTab('ops'); setActiveSubTab('fulfillment'); }} className="flex flex-col items-center p-6 rounded-2xl border-2 border-brand-navy/10 hover:border-brand-orange transition-all group">
                   <div className="h-12 w-12 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange group-hover:bg-brand-orange group-hover:text-white"><Truck size={24} /></div>
                   <h3 className="mt-4 text-sm font-black uppercase tracking-widest dark:text-white">Fulfillment</h3>
                </button>
                <button onClick={() => { setActiveTab('growth'); setActiveSubTab('membership'); }} className="flex flex-col items-center p-6 rounded-2xl border-2 border-brand-navy/10 hover:border-emerald-500 transition-all group">
                   <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white"><Building2 size={24} /></div>
                   <h3 className="mt-4 text-sm font-black uppercase tracking-widest dark:text-white">Growth</h3>
                </button>
                <button onClick={() => { setActiveTab('registry'); setActiveSubTab('catalog'); }} className="flex flex-col items-center p-6 rounded-2xl border-2 border-brand-navy/10 hover:border-blue-500 transition-all group">
                   <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white"><Database size={24} /></div>
                   <h3 className="mt-4 text-sm font-black uppercase tracking-widest dark:text-white">Registry</h3>
                </button>
              </div>
               <div className="rounded-2xl border border-brand-navy/15 dark:border-white/10 p-5 bg-white/50 dark:bg-white/5">
                 <h3 className="text-xs font-black uppercase text-brand-orange mb-4">Live Insights</h3>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <p className="text-[10px] font-black uppercase opacity-50">Recent Movement</p>
                       {(inventoryMovementRows || []).slice(0, 3).map((move, i) => (
                         <div key={i} className="text-xs p-2 rounded-lg border border-brand-navy/10 flex justify-between dark:text-gray-200">
                           <span>{move.product_id} ({move.change_qty})</span>
                           <span className="opacity-40">{formatRelativeTime(move.timestamp)}</span>
                         </div>
                       ))}
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-black uppercase opacity-50 text-brand-orange">Low Stock</p>
                       {(lowStockItems || []).slice(0, 3).map(item => (
                         <div key={item.handle} className="text-xs p-2 rounded-lg border border-brand-orange/20 text-brand-orange flex justify-between">
                           <span>{item.name}</span>
                           <span className="font-black">{item.stock}</span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab !== 'dashboard' && (
            <div className="mb-6 flex flex-wrap gap-2 border-b border-brand-navy/10 pb-4 dark:border-white/10">
               {activeTab === 'ops' && [{id:'fulfillment',l:'Processing'},{id:'discounts',l:'Discounts'}].map(s=>(
                 <button key={s.id} onClick={()=>setActiveSubTab(s.id)} className={`px-3 py-1 text-[10px] font-black uppercase transition ${activeSubTab===s.id?'text-brand-orange':'opacity-60 dark:text-white'}`}>{s.l}</button>
               ))}
               {activeTab === 'growth' && [{id:'membership',l:'Members'},{id:'waitlist',l:'Waitlist'}].map(s=>(
                 <button key={s.id} onClick={()=>setActiveSubTab(s.id)} className={`px-3 py-1 text-[10px] font-black uppercase transition ${activeSubTab===s.id?'text-emerald-500':'opacity-60 dark:text-white'}`}>{s.l}</button>
               ))}
               {activeTab === 'registry' && [{id:'catalog',l:'Catalog'},{id:'inventory',l:'Stock'},{id:'assets',l:'Assets'}].map(s=>(
                 <button key={s.id} onClick={()=>setActiveSubTab(s.id)} className={`px-3 py-1 text-[10px] font-black uppercase transition ${activeSubTab===s.id?'text-blue-500':'opacity-60 dark:text-white'}`}>{s.l}</button>
               ))}
               {activeTab === 'system' && [{id:'settings',l:'System'},{id:'website-editor',l:'Editor'},{id:'help-notes',l:'Notes'}].map(s=>(
                 <button key={s.id} onClick={()=>setActiveSubTab(s.id)} className={`px-3 py-1 text-[10px] font-black uppercase transition ${activeSubTab===s.id?'text-fuchsia-500':'opacity-60 dark:text-white'}`}>{s.l}</button>
               ))}
            </div>
          )}

          {activeTab === 'ops' && activeSubTab === 'fulfillment' && (
            <div className="space-y-4">
               <h2 className="text-xl font-black dark:text-white">Order Processor</h2>
               <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
                  <div className="space-y-4">
                     <div className="rounded-xl border border-brand-navy/10 p-4 space-y-3 dark:border-white/10">
                        <p className="text-[10px] font-black uppercase text-brand-orange">1. Metadata</p>
                        <div className="grid grid-cols-2 gap-3">
                           <input className={inputClass} value={orderId} onChange={e=>setOrderId(e.target.value)} placeholder="Order ID" />
                           <input className={inputClass} value={trackingNum} onChange={e=>setTrackingNum(e.target.value)} placeholder="Tracking #" />
                        </div>
                     </div>
                     <div className="rounded-xl border border-brand-navy/10 p-4 space-y-3 dark:border-white/10">
                        <p className="text-[10px] font-black uppercase text-brand-orange">2. Actions</p>
                        <textarea className={inputClass + " min-h-[100px]"} value={paymentNote} onChange={e=>setPaymentNote(e.target.value)} placeholder="Payment Note" />
                        <button onClick={handleAlertOrder} className="rounded-lg bg-brand-navy text-white px-4 py-2 text-[10px] font-black dark:bg-white dark:text-black uppercase tracking-widest">Send Alert</button>
                     </div>
                  </div>
                  <div className="rounded-xl border border-brand-navy/10 p-4 dark:border-white/10 bg-black/5 dark:bg-white/5 overflow-y-auto max-h-[400px]">
                     <p className="text-[10px] font-black uppercase opacity-50 mb-4">Audit Tape</p>
                     <div className="space-y-2">
                       {auditNotes.length > 0 ? auditNotes.map((n, i) => <p key={i} className="text-[11px] leading-relaxed dark:text-gray-300">- {n}</p>) : <p className="text-xs opacity-40">No entries.</p>}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'growth' && activeSubTab === 'membership' && (
             <div className="space-y-4">
                <h2 className="text-xl font-black dark:text-white">Growth & Access</h2>
                <div className="rounded-xl border border-brand-navy/10 p-4 space-y-3 dark:border-white/10">
                   <input className={inputClass} value={memberEmail} onChange={e=>setMemberEmail(e.target.value)} placeholder="Member Email" />
                   <div className="flex flex-wrap gap-2">
                      <button onClick={handleApprove} className="rounded-lg bg-emerald-500 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest">Approve Access</button>
                      <button onClick={handleSuspend} className="rounded-lg border border-brand-navy/20 px-4 py-2 text-[10px] font-black dark:text-white uppercase tracking-widest">Suspend</button>
                      <button onClick={handleIssueTempPin} className="rounded-lg border border-brand-orange/40 text-brand-orange px-4 py-2 text-[10px] font-black uppercase tracking-widest">Issue PIN</button>
                   </div>
                   {tempPinIssued && <p className="text-xs text-brand-orange">Generated PIN: {tempPinIssued}</p>}
                </div>
                <div className="rounded-xl border border-brand-navy/10 p-4 dark:border-white/10">
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-black uppercase opacity-60 dark:text-white">Waitlist Queue</h3>
                      <button onClick={handleLoadWaitlist} className="text-[10px] font-black uppercase text-brand-orange underline">Refresh</button>
                   </div>
                   <div className="space-y-2">
                      {waitlistRows.length > 0 ? waitlistRows.slice(0, 5).map(r => (
                        <div key={r.email} className="text-xs p-3 rounded-lg border border-brand-navy/5 flex justify-between items-center dark:bg-white/5">
                           <span>{r.full_name} ({r.email})</span>
                           <button onClick={()=>handlePromoteWaitlist(r)} className="text-[10px] font-black uppercase text-emerald-500">Promote</button>
                        </div>
                      )) : <p className="text-xs opacity-40">Queue empty.</p>}
                   </div>
                </div>
             </div>
         )}

          {activeTab === 'growth' && activeSubTab === 'waitlist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black dark:text-white">Waitlist Intake</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleLoadWaitlist}
                    className="rounded-lg border border-brand-orange/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-orange"
                    disabled={isWaitlistLoading}
                  >
                    {isWaitlistLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                  {selectedWaitlist && (
                    <button
                      onClick={() => handlePromoteWaitlist(selectedWaitlist)}
                      className="rounded-lg bg-emerald-500 text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest"
                    >
                      Promote Selected
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-brand-navy/10 dark:border-white/10 overflow-hidden">
                <div className="grid grid-cols-7 bg-brand-navy/5 dark:bg-white/5 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-brand-navy/70 dark:text-gray-200">
                  <div className="col-span-2">Name / Email</div>
                  <div>Phone</div>
                  <div>Source</div>
                  <div>Status</div>
                  <div>PIN</div>
                  <div>Actions</div>
                </div>
                <div>
                  {(waitlistRows || []).length ? (
                    waitlistRows.map((r) => (
                      <button
                        key={`${r.email}-${r.row_id || ''}`}
                        onClick={() => { setSelectedWaitlist(r); setMemberEmail(r.email); }}
                        className={`grid grid-cols-7 w-full px-4 py-3 text-left text-sm transition ${
                          selectedWaitlist && selectedWaitlist.email === r.email ? 'bg-emerald-50 dark:bg-white/10' : 'hover:bg-brand-navy/5 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="col-span-2">
                          <div className="font-semibold text-brand-navy dark:text-white">{r.full_name || 'Unknown'}</div>
                          <div className="text-xs text-brand-navy/70 dark:text-gray-300">{r.email || '—'}</div>
                        </div>
                        <div className="text-xs text-brand-navy/80 dark:text-gray-300">{r.phone || '—'}</div>
                        <div className="text-xs text-brand-navy/80 dark:text-gray-300">{r.source || '—'}</div>
                        <div className="text-xs font-black text-brand-orange">{r.status || 'PENDING'}</div>
                        <div className="text-xs font-black text-brand-navy dark:text-white">{r.member_pin || '—'}</div>
                        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase">
                          <span className="text-brand-orange">{r.requested_at || ''}</span>
                          <span className="text-brand-navy/60 dark:text-gray-300">{r.notes || ''}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-brand-navy/70 dark:text-gray-300">No waitlist entries.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'registry' && activeSubTab === 'catalog' && (
            <div className="space-y-4">
               <h2 className="text-xl font-black dark:text-white">Global Registry</h2>
               <div className="rounded-xl border border-blue-500/10 p-4 bg-blue-500/5 dark:bg-blue-500/10">
                  <ProductUploader onSuccess={loadInitialData} referenceItems={catalogItems} />
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {catalogItems.map(item => (
                    <div key={item.handle} className="rounded-xl border border-brand-navy/10 p-4 bg-white dark:bg-white/5">
                       <div className="flex justify-between">
                          <h4 className="text-sm font-black truncate pr-2 dark:text-white">{item.name}</h4>
                          <span className="text-[10px] font-black opacity-60 uppercase">{item.visibility}</span>
                       </div>
                       <div className="mt-2 flex justify-between items-center">
                          <span className="text-xs font-black text-brand-orange">${item.price}</span>
                          <button onClick={()=>handleOpenCatalogAction(item)} className="text-[10px] font-black uppercase underline dark:text-gray-400">Edit</button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'system' && activeSubTab === 'website-editor' && <OwnerWebsiteEditor />}
          {activeTab === 'system' && activeSubTab === 'help-notes' && (
             <div className="space-y-4">
                <h2 className="text-xl font-black dark:text-white">Operational Notes</h2>
                <div className="prose prose-sm dark:prose-invert">
                   <p className="text-xs text-brand-navy/60 dark:text-gray-400">Guardrails for portal management:</p>
                   <ul className="text-[11px] space-y-1 opacity-70 dark:text-gray-300">
                      <li>• Sync Now pulls fresh state from the Google Script Bridge.</li>
                      <li>• Promotion logic creates a matching row in the Membership sheet.</li>
                      <li>• Catalog edits update the Registry sheet immediately.</li>
                   </ul>
                </div>
             </div>
          )}

        </div>
      </div>

      <InvoicePreview />
      <CatalogActionDrawer
        isOpen={catalogActionDrawerOpen}
        onClose={() => setCatalogActionDrawerOpen(false)}
        item={catalogActionItem}
        onSavePrice={handleSaveCatalogPrice}
        savingPrice={catalogPriceSavingHandle === String(catalogActionItem?.handle || '')}
        onDeleteProduct={handleDeleteCatalogItem}
        deletingProduct={catalogDeletingHandle === String(catalogActionItem?.handle || '')}
        onSubmitAdjustment={handleSubmitStockAdjustment}
        submittingAdjustment={stockAdjustmentSubmitting}
      />
    </section>
  );
};

export default OwnerPage;

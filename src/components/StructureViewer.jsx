import { useEffect, useMemo, useRef, useState } from 'react';
import { Beaker, Boxes } from 'lucide-react';
import { fetchPubChemStructureData } from '../services/catalogService';
import CatalogImage from './CatalogImage';

const THREEDMOL_SCRIPT_SRC = 'https://3Dmol.org/build/3Dmol-min.js';
let scriptLoadPromise = null;
const EMPTY_STRUCTURE_STATE = {
  cid: '',
  loading: false,
  has2d: false,
  has3d: false,
  image2dDataUrl: '',
  sdf3d: '',
  error: '',
};

const normalizeText = (value) => String(value || '').trim();

const getProductCid = (product = {}) => (
  normalizeText(product?.cid_pubchem || product?.cidPubchem || product?.pubchemCid)
);

const getViewerModeMeta = ({ hasCid = false, enable3d = false, has3d = false, has2d = false }) => {
  if (hasCid && enable3d && has3d) {
    return {
      label: 'Interactive 3D',
      note: 'Drag to rotate. Scroll or pinch to zoom.',
    };
  }

  if (hasCid && has2d) {
    return {
      label: '2D Structure',
      note: enable3d ? '3D unavailable for this compound, showing 2D structure.' : '3D is disabled, showing 2D structure.',
    };
  }

  return {
    label: 'Product Image',
    note: hasCid ? 'Structure assets were unavailable, so the catalog image is shown.' : 'No PubChem CID is stored for this product yet.',
  };
};

const load3DMolScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('3D viewer requires a browser environment.'));
  }

  if (window.$3Dmol?.createViewer) {
    return Promise.resolve(window.$3Dmol);
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${THREEDMOL_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.$3Dmol), { once: true });
      existing.addEventListener('error', () => reject(new Error('3Dmol.js failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = THREEDMOL_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(window.$3Dmol);
    script.onerror = () => reject(new Error('3Dmol.js failed to load.'));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
};

function StructureViewer({ product, enable3D = true }) {
  const cid = getProductCid(product);
  const fallbackImage = normalizeText(product?.image);
  const title = normalizeText(product?.name || product?.title || 'Product');
  const formula = normalizeText(product?.formula);
  const viewerRef = useRef(null);
  const glViewerRef = useRef(null);
  const [structureState, setStructureState] = useState({
    ...EMPTY_STRUCTURE_STATE,
    cid: '',
  });

  useEffect(() => {
    let active = true;

    if (!cid) {
      return undefined;
    }

    fetchPubChemStructureData(cid).then((result) => {
      if (!active) return;
      setStructureState({
        cid,
        loading: false,
        has2d: Boolean(result?.has2d),
        has3d: Boolean(result?.has3d),
        image2dDataUrl: normalizeText(result?.image2dDataUrl),
        sdf3d: typeof result?.sdf3d === 'string' ? result.sdf3d : '',
        error: result?.success === false ? normalizeText(result?.message) : '',
      });
    });

    return () => {
      active = false;
    };
  }, [cid]);

  const effectiveStructureState = cid && structureState.cid === cid
    ? structureState
    : {
      ...EMPTY_STRUCTURE_STATE,
      cid,
      loading: Boolean(cid),
    };

  useEffect(() => {
    let cancelled = false;

    if (!enable3D || !structureState.has3d || !structureState.sdf3d || !viewerRef.current) {
      return undefined;
    }

    load3DMolScript()
      .then(($3Dmol) => {
        if (cancelled || !viewerRef.current || !$3Dmol?.createViewer) return;
        const viewer = $3Dmol.createViewer(viewerRef.current, {
          backgroundColor: 'white',
        });
        viewer.clear();
        viewer.addModel(structureState.sdf3d, 'sdf');
        viewer.setStyle({}, {
          stick: { radius: 0.18, colorscheme: 'cyanCarbon' },
          sphere: { scale: 0.28, colorscheme: 'cyanCarbon' },
        });
        viewer.zoomTo();
        viewer.render();
        glViewerRef.current = viewer;
      })
      .catch(() => {
        if (cancelled) return;
        setStructureState((prev) => ({
          ...prev,
          has3d: false,
          error: prev.error || 'Interactive 3D is unavailable on this device right now.',
        }));
      });

    return () => {
      cancelled = true;
      if (glViewerRef.current?.clear) {
        try {
          glViewerRef.current.clear();
          glViewerRef.current.render?.();
        } catch {
          // noop
        }
      }
      glViewerRef.current = null;
    };
  }, [enable3D, structureState.has3d, structureState.sdf3d]);

  const modeMeta = useMemo(
    () => getViewerModeMeta({
      hasCid: Boolean(cid),
      enable3d: enable3D,
      has3d: effectiveStructureState.has3d,
      has2d: effectiveStructureState.has2d,
    }),
    [cid, effectiveStructureState.has2d, effectiveStructureState.has3d, enable3D]
  );

  const shouldShow3D = Boolean(cid && enable3D && effectiveStructureState.has3d && effectiveStructureState.sdf3d);
  const shouldShow2D = Boolean(cid && effectiveStructureState.has2d && (!shouldShow3D || !enable3D));

  return (
    <div className="w-full h-full rounded-3xl border border-brand-navy/10 dark:border-white/10 bg-white dark:bg-[#0e1624] p-3 sm:p-4 flex flex-col">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-orange">{modeMeta.label}</p>
          <p className="mt-1 text-[11px] text-brand-navy/60 dark:text-gray-400">{modeMeta.note}</p>
        </div>
        {formula ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-navy/15 dark:border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-brand-navy/70 dark:text-gray-300">
            <Beaker size={12} />
            {formula}
          </div>
        ) : null}
      </div>

      <div className="relative flex-1 min-h-[16rem] sm:min-h-[24rem]">
        {effectiveStructureState.loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-brand-orange/25 bg-brand-orange/5">
            <div className="h-8 w-8 rounded-full border-2 border-brand-orange/30 border-t-brand-orange animate-spin" />
            <p className="text-xs font-semibold text-brand-navy/70 dark:text-gray-300">Loading structure assets...</p>
          </div>
        ) : null}

        {!effectiveStructureState.loading && shouldShow3D ? (
          <div ref={viewerRef} className="h-full w-full rounded-2xl overflow-hidden bg-white" aria-label={`${title} interactive 3D structure`} />
        ) : null}

        {!effectiveStructureState.loading && !shouldShow3D && shouldShow2D ? (
          <div className="h-full w-full rounded-2xl overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-[#0f172a] dark:to-[#111827] flex items-center justify-center p-3">
            <img
              src={effectiveStructureState.image2dDataUrl}
              alt={`${title} 2D structure`}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : null}

        {!effectiveStructureState.loading && !shouldShow3D && !shouldShow2D ? (
          <div className="h-full w-full rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-[#0b1120] dark:to-[#0f172a] flex items-center justify-center p-3">
            {fallbackImage ? (
              <CatalogImage
                src={fallbackImage}
                alt={title}
                className="max-h-full max-w-full object-contain drop-shadow-2xl"
                wrapperClassName="rounded-2xl border border-dashed border-brand-navy/10 dark:border-white/10 bg-white/70 dark:bg-white/5"
                placeholderLabel="Image pending"
              />
            ) : (
              <div className="text-center">
                <Boxes className="mx-auto h-10 w-10 text-brand-navy/30 dark:text-white/20" />
                <p className="mt-3 text-sm font-semibold text-brand-navy/65 dark:text-gray-300">No visual asset available</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {effectiveStructureState.error ? (
        <p className="mt-3 text-[11px] text-brand-navy/55 dark:text-gray-400">{effectiveStructureState.error}</p>
      ) : null}
    </div>
  );
}

export default StructureViewer;

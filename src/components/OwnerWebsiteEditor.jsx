import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, RefreshCcw, Save } from 'lucide-react';
import { WEBSITE_EDITOR_PAGES, buildSiteLayoutMap, getSiteLayoutText } from '../content/siteEditorConfig';
import { fetchSiteLayout, getLocalSiteLayout, saveSiteAsset, upsertSiteLayout } from '../services/orderService';
import { toEmbeddableGoogleDriveUrl } from '../utils/driveLinks';

const cardClass = 'rounded-xl border border-brand-navy/15 dark:border-white/10 bg-white/60 dark:bg-white/3';

const buildDraftForPage = (page, entries) => {
  const layoutMap = buildSiteLayoutMap(entries);
  const draft = {};

  const imageFields = page?.imageFields || (page?.imageField ? [page.imageField] : []);
  imageFields.forEach((field) => {
    draft[field.key] = getSiteLayoutText(layoutMap, field.sectionId, field.defaultValue);
  });

  return draft;
};

function OwnerWebsiteEditor({ actorEmail = '', inputClass = '', onAction = () => {} }) {
  const [selectedPageId, setSelectedPageId] = useState(WEBSITE_EDITOR_PAGES[0]?.id || 'coming-soon');
  const [layoutEntries, setLayoutEntries] = useState(() => getLocalSiteLayout());
  const [draft, setDraft] = useState(() => buildDraftForPage(WEBSITE_EDITOR_PAGES[0], getLocalSiteLayout()));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stagedAssets, setStagedAssets] = useState({});

  const selectedPage = useMemo(
    () => WEBSITE_EDITOR_PAGES.find((page) => page.id === selectedPageId) || WEBSITE_EDITOR_PAGES[0],
    [selectedPageId]
  );
  const imageFields = selectedPage?.imageFields || (selectedPage?.imageField ? [selectedPage.imageField] : []);

  useEffect(() => {
    setDraft(buildDraftForPage(selectedPage, layoutEntries));
  }, [selectedPage, layoutEntries]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const rows = await fetchSiteLayout();
        setLayoutEntries(rows);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => () => {
    Object.values(stagedAssets || {}).forEach((asset) => {
      if (asset?.previewUrl) URL.revokeObjectURL(asset.previewUrl);
    });
  }, [stagedAssets]);

  const baselineDraft = useMemo(() => buildDraftForPage(selectedPage, layoutEntries), [selectedPage, layoutEntries]);
  const hasDraftChanges = JSON.stringify(draft) !== JSON.stringify(baselineDraft);
  const hasPendingAssetUpload = Object.keys(stagedAssets || {}).length > 0;

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const rows = await fetchSiteLayout();
      setLayoutEntries(rows);
      onAction('success', `Website editor refreshed (${Array.isArray(rows) ? rows.length : 0} layout row${Array.isArray(rows) && rows.length === 1 ? '' : 's'}).`);
    } catch (error) {
      onAction('error', error?.message || 'Unable to refresh website editor content.');
    } finally {
      setLoading(false);
    }
  };

  const handleDraftChange = (key, value) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSelectAsset = async (event, field) => {
    const file = event?.target?.files?.[0];
    if (!file || !field) return;

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Image read failed.'));
      reader.readAsDataURL(file);
    });

    const base64Content = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
    if (!base64Content) {
      throw new Error('Unable to parse image file.');
    }

    setStagedAssets((prev) => ({
      ...prev,
      [field.key]: {
        fileName: file.name || `${field.sectionId.toLowerCase()}.png`,
        mimeType: file.type || 'image/png',
        fileBase64: base64Content,
        previewUrl: URL.createObjectURL(file),
      },
    }));
    onAction('success', `${field.label} image staged. Upload it when ready.`);
  };

  const handleUploadAsset = async (field) => {
    const stagedAsset = stagedAssets?.[field.key];
    if (!field || !stagedAsset) return;

    setUploading(true);
    try {
      const rows = await saveSiteAsset({
        sectionId: field.sectionId,
        fileBase64: stagedAsset.fileBase64,
        fileName: stagedAsset.fileName,
        mimeType: stagedAsset.mimeType,
        label: field.subText,
        actorEmail,
      });

      setLayoutEntries(rows);
      setStagedAssets((prev) => {
        const next = { ...prev };
        delete next[field.key];
        return next;
      });
      onAction('success', `${field.label} image uploaded.`);
    } catch (error) {
      onAction('error', error?.message || 'Unable to upload page image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSavePage = async () => {
    if (!selectedPage) return;

    setSaving(true);
    try {
      const images = selectedPage?.imageFields || (selectedPage?.imageField ? [selectedPage.imageField] : []);
      for (const imageField of images) {
        const normalizedImageValue = toEmbeddableGoogleDriveUrl(
          draft[imageField.key] || imageField.defaultValue
        );
        await upsertSiteLayout({
          sectionId: imageField.sectionId,
          isVisible: true,
          headerText: normalizedImageValue,
          subText: imageField.subText,
          ctaLabel: imageField.ctaLabel || 'IMAGE_URL',
          actorEmail,
        });
      }

      const rows = await fetchSiteLayout();
      setLayoutEntries(rows);
      onAction('success', `${selectedPage.label} images saved.`);
    } catch (error) {
      onAction('error', error?.message || 'Unable to save website editor changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-brand-navy dark:text-white">Website Editor</h2>
        <p className="text-sm text-brand-navy/65 dark:text-gray-300">
          Manage live website images only. Text changes belong in code so they stay intentional and easy to revise.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <aside className={`${cardClass} p-3 space-y-2`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">Pages</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-navy/25 dark:border-white/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-navy dark:text-gray-200"
            >
              <RefreshCcw size={12} />
              Refresh
            </button>
          </div>
          {WEBSITE_EDITOR_PAGES.map((page) => {
            const selected = page.id === selectedPageId;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => setSelectedPageId(page.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  selected
                    ? 'border-brand-orange/50 bg-brand-orange/10 text-brand-navy dark:text-white'
                    : 'border-brand-navy/10 dark:border-white/10 bg-white/50 dark:bg-white/5 text-brand-navy dark:text-gray-200'
                }`}
              >
                <p className="text-sm font-black">{page.label}</p>
                <p className="mt-1 text-xs opacity-75">{page.description}</p>
              </button>
            );
          })}
          <p className="text-[11px] text-brand-navy/55 dark:text-gray-400">
            This editor is intentionally image-first for v1.
          </p>
        </aside>

        <div className={`${cardClass} p-4 space-y-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">Editing</p>
              <h3 className="text-lg font-black text-brand-navy dark:text-white">{selectedPage?.label}</h3>
              <p className="text-xs text-brand-navy/60 dark:text-gray-400">
                {loading ? 'Refreshing live assets...' : 'Sheet-backed image overrides are merged into the public site on load.'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={handleSavePage}
                disabled={saving || (!hasDraftChanges && !hasPendingAssetUpload)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Page'}
              </button>
              <p className="text-[11px] text-brand-navy/55 dark:text-gray-400">
                {hasPendingAssetUpload
                  ? 'Image staged but not uploaded yet.'
                  : hasDraftChanges
                    ? 'You have unsaved image URL changes.'
                    : 'Everything is synced to the current saved version.'}
              </p>
            </div>
          </div>

          {imageFields.length ? (
            <div className="space-y-3 rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-brand-navy/[0.03] dark:bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">Live Images</p>
                  <p className="text-sm font-bold text-brand-navy dark:text-white">Brand assets and hero images</p>
                  <p className="text-[11px] text-brand-navy/55 dark:text-gray-400">
                    Replace existing assets used across the site. Hero image and brand visuals live here.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {imageFields.map((field) => {
                  const stagedAsset = stagedAssets?.[field.key];
                  const isDarkLogoField = field.key === 'darkLogo';
                  const preview =
                    stagedAsset?.previewUrl
                    || toEmbeddableGoogleDriveUrl(draft?.[field.key] || '')
                    || field.defaultValue
                    || '';
                  return (
                    <div key={field.sectionId} className="space-y-3 rounded-2xl border border-brand-navy/10 dark:border-white/10 bg-white/70 dark:bg-[#0f172a]/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-300">{field.label}</p>
                          <p className="text-[11px] text-brand-navy/55 dark:text-gray-400">
                            {field.subText}
                          </p>
                        </div>
                    <input
                      id={`asset-${field.key}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        handleSelectAsset(event, field).catch((error) => onAction('error', error?.message || 'Image staging failed.'));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById(`asset-${field.key}`)?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-brand-navy/25 dark:border-white/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-navy dark:text-gray-200"
                    >
                      <ImagePlus size={12} />
                      Select
                    </button>
                      </div>
                      <div className={`rounded-2xl border border-brand-navy/10 dark:border-white/10 p-3 ${isDarkLogoField ? 'bg-[#0f172a]' : 'bg-white dark:bg-[#0f172a]'}`}>
                        <img
                          src={preview}
                          alt={`${field.label} preview`}
                          className="mx-auto h-40 w-full rounded-xl object-contain"
                        />
                        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-navy/45 dark:text-gray-500">
                          Current preview
                        </p>
                      </div>
                      <input
                        className={inputClass}
                        value={draft[field.key] || ''}
                        onChange={(event) => handleDraftChange(field.key, event.target.value)}
                        placeholder="Paste image URL"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleUploadAsset(field)}
                          disabled={!stagedAsset || uploading}
                          className="rounded-xl border border-brand-orange/40 px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-orange disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {uploading ? 'Uploading...' : 'Upload Selected Image'}
                        </button>
                        {stagedAsset ? (
                          <p className="self-center text-xs text-brand-navy/60 dark:text-gray-400">
                            Staged: {stagedAsset.fileName}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-brand-navy/55 dark:text-gray-400">
                        URL edits save with the page. Standard Google Drive share links auto-convert to image-ready URLs on save.
                      </p>
                      <p className="text-[11px] text-brand-navy/55 dark:text-gray-400">
                        Recommended folder: `PEPTQ_Assets/Website_UI`
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default OwnerWebsiteEditor;

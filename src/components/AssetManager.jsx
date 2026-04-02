import { useState, useEffect } from 'react';
import { Image, Search, Upload, Trash2, Copy, Check, Loader2, X, Plus } from 'lucide-react';
import { getAssets, createAsset, deleteAsset } from '../services/catalogService';

export default function AssetManager({ onSelect }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Upload Form State
  const [uploadData, setUploadData] = useState({
    url: '',
    file: null,
    category: 'General',
    name: ''
  });

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await getAssets();
      setAssets(data || []);
    } catch {
      // Silence catch var
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleCopy = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      
      let payload = {
        category: uploadData.category,
        original_name: uploadData.name || (uploadData.file ? uploadData.file.name : 'asset.png')
      };

      if (uploadData.file) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(uploadData.file);
        });
        payload.base64 = base64;
        payload.mime_type = uploadData.file.type;
      } else if (uploadData.url) {
        payload.url = uploadData.url;
      } else {
        throw new Error('Please provide either a file or a URL');
      }

      await createAsset(payload);
      setUploadData({ url: '', file: null, category: 'General', name: '' });
      setShowUpload(false);
      loadAssets();
    } catch (e) {
      alert(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (assetId) => {
    if (!window.confirm('Delete this asset from the registry?')) return;
    try {
      await deleteAsset(assetId);
      loadAssets();
    } catch (e) {
      alert(e.message || 'Deletion failed');
    }
  };

  const filteredAssets = assets.filter(a => 
    a.original_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.category?.toLowerCase().includes(search.toLowerCase()) ||
    a.url?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && assets.length === 0) {
    return (
      <div className="flex items-center justify-center p-20 text-brand-navy/40 dark:text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        <span className="font-medium">Orchestrating asset library...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-navy/40" />
          <input
            type="text"
            placeholder="Search assets..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 rounded-xl text-sm focus:border-brand-orange outline-none transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-white text-sm font-bold rounded-xl hover:bg-brand-orange/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Asset
        </button>
      </div>

      {/* Upload Overlay */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0f1115] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            <div className="p-6 border-b border-brand-navy/5 dark:border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-lg dark:text-white">Add New Asset</h3>
              <button 
                onClick={() => !uploading && setShowUpload(false)}
                className="p-2 hover:bg-brand-navy/5 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 dark:text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/40 dark:text-gray-500">Source</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadData({ ...uploadData, url: '' })}
                    className={`p-3 text-xs font-bold rounded-xl border transition-all ${!uploadData.url ? 'bg-brand-orange/10 border-brand-orange text-brand-orange' : 'bg-transparent border-brand-navy/10 dark:border-white/10 dark:text-gray-400'}`}
                  >
                    Local File
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadData({ ...uploadData, file: null })}
                    className={`p-3 text-xs font-bold rounded-xl border transition-all ${uploadData.url || (!uploadData.file && uploadData.url === '') ? 'bg-brand-orange/10 border-brand-orange text-brand-orange' : 'bg-transparent border-brand-navy/10 dark:border-white/10 dark:text-gray-400'}`}
                  >
                    URL Link
                  </button>
                </div>
              </div>

              {!uploadData.url ? (
                <div className="p-8 border-2 border-dashed border-brand-navy/10 dark:border-white/10 rounded-2xl text-center">
                  <input
                    type="file"
                    className="hidden"
                    id="asset-file"
                    onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
                  />
                  <label htmlFor="asset-file" className="cursor-pointer space-y-2 block">
                    <Upload className="w-8 h-8 mx-auto text-brand-navy/20 dark:text-white/20" />
                    <p className="text-sm font-medium dark:text-gray-300">
                      {uploadData.file ? uploadData.file.name : 'Click to select image'}
                    </p>
                  </label>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="https://example.com/image.png"
                  className="w-full px-4 py-3 bg-brand-navy/5 dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 rounded-xl text-sm outline-none focus:border-brand-orange transition-colors"
                  value={uploadData.url}
                  onChange={(e) => setUploadData({ ...uploadData, url: e.target.value })}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/40 dark:text-gray-500">Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Hero Banner"
                    className="w-full px-4 py-2 bg-brand-navy/5 dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 rounded-xl text-sm outline-none focus:border-brand-orange transition-colors"
                    value={uploadData.name}
                    onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-navy/40 dark:text-gray-500">Category</label>
                  <select
                    className="w-full px-4 py-2 bg-brand-navy/5 dark:bg-white/5 border border-brand-navy/10 dark:border-white/10 rounded-xl text-sm outline-none focus:border-brand-orange transition-colors dark:text-gray-300"
                    value={uploadData.category}
                    onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                  >
                    <option value="General">General</option>
                    <option value="Catalog Product">Catalog Product</option>
                    <option value="UI Element">UI Element</option>
                    <option value="Banner">Banner</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => !uploading && setShowUpload(false)}
                  className="flex-1 py-3 text-sm font-bold text-brand-navy/60 dark:text-gray-400 border border-brand-navy/10 dark:border-white/10 rounded-xl hover:bg-brand-navy/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={uploading}
                  className="flex-1 py-3 text-sm font-bold text-white bg-brand-orange rounded-xl hover:bg-brand-orange/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : 'Finish Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Grid */}
      {filteredAssets.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-brand-navy/5 dark:border-white/5 rounded-3xl">
          <Image className="w-12 h-12 mx-auto text-brand-navy/10 dark:text-white/10 mb-4" />
          <p className="text-brand-navy/40 dark:text-gray-500 font-medium italic">No assets found in target sector.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => (
            <div 
              key={asset.asset_id}
              className="group relative bg-white dark:bg-white/5 rounded-2xl border border-brand-navy/10 dark:border-white/10 overflow-hidden hover:border-brand-orange/50 transition-all duration-300 shadow-sm"
            >
              {/* Thumbnail Container */}
              <div className="aspect-square bg-brand-navy/5 dark:bg-black/20 flex items-center justify-center relative overflow-hidden">
                {asset.url ? (
                  <img 
                    src={asset.url} 
                    alt={asset.original_name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <Image className="w-8 h-8 text-brand-navy/10 dark:text-white/10" />
                )}
                
                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-brand-navy/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(asset.url, asset.asset_id)}
                      className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg transition-colors title='Copy URL'"
                    >
                      {copiedId === asset.asset_id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(asset.asset_id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/40 text-white rounded-lg transition-colors title='Delete Asset'"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {onSelect && (
                      <button
                        onClick={() => onSelect(asset)}
                        className="p-2 bg-brand-orange text-white rounded-lg transition-colors"
                      >
                        Select
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-white/60 font-medium px-2 py-1 bg-black/30 rounded-full">
                    {asset.asset_id}
                  </span>
                </div>
              </div>

              {/* Info Area */}
              <div className="p-3 space-y-1">
                <p className="text-xs font-bold text-brand-navy dark:text-white truncate" title={asset.original_name}>
                  {asset.original_name}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-navy/40 dark:text-gray-500">
                    {asset.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

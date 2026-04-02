import fs from 'fs';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const catalogPath = path.join(__dirname, '..', 'src', 'data', 'catalog.json');
const csvPath = path.join(__dirname, '..', 'STABLE_Backend_Google_V1', 'GoogleSheets', 'PEPTQ_Backend - PEPTQ_Catalog.csv');

try {
  const rawJson = fs.readFileSync(catalogPath, 'utf8');
  const catalog = JSON.parse(rawJson);

  const headers = [
    "slug", "title", "description", "purity_string", "formula",
    "molecular_mass", "cas_number", "storage_notes", "shipping_notes",
    "qr_coa_link", "internal_sku", "price_vip", "inventory", "visible",
    "image_path", "last_updated", "low_stock_threshold"
  ];

  const escapeCSV = (str) => {
    if (str == null) return '';
    const val = String(str).replace(/"/g, '""');
    if (val.search(/("|,|\n)/g) >= 0) {
      return `"${val}"`;
    }
    return val;
  };

  const rows = catalog.map(item => {
    const slug = item.slug || item.id || item.handle || '';
    const title = item.title || item.name || '';
    const desc = item.overview || item.description || '';
    const purity = item.purity || item.purity_string || '';
    const formula = item.formula || '';
    const mass = item.mass || item.molecular_mass || '';
    const cas = item.cas || item.cas_number || '';
    const storage = item.storage || item.storage_notes || '';
    const shipping = item.shipping || item.shipping_notes || item.safetyInfo || 'Research Use Only.';
    const coa_link = item.coaUrl || item.qr_coa_link || '';
    const sku = item.internal_sku || `SKU-${slug.toUpperCase()}`;
    const price_vip = item.price_vip || item.priceVip || '';
    const inventory = item.bulkStock || item.bulk_stock != null ? String(item.bulk_stock) : '100';
    const visible = item.visible !== false ? 'TRUE' : 'FALSE';
    const image = item.image || item.image_path || '';
    const last_updated = new Date().toISOString();
    const threshold = item.low_stock_threshold || item.lowStockThreshold || '10';

    return [
      escapeCSV(slug), escapeCSV(title), escapeCSV(desc), escapeCSV(purity), escapeCSV(formula),
      escapeCSV(mass), escapeCSV(cas), escapeCSV(storage), escapeCSV(shipping),
      escapeCSV(coa_link), escapeCSV(sku), escapeCSV(price_vip), escapeCSV(inventory),
      escapeCSV(visible), escapeCSV(image), escapeCSV(last_updated), escapeCSV(threshold)
    ].join(',');
  });

  const csvContent = headers.join(',') + '\n' + rows.join('\n');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log('Successfully generated complete PEPTQ_Catalog.csv format from JSON!');
  fs.unlinkSync(catalogPath);
  console.log('Removed deprecated catalog.json.');
} catch (e) {
  console.error("Migration failed:", e.message);
}

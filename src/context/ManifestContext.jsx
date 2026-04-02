/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react';
import { clampRequestedQuantity, getTrackedStock } from '../utils/stock';

const ManifestContext = createContext(null);

export function ManifestProvider({ children }) {
  const [manifestItems, setManifestItems] = useState([]);

  const addToManifest = (product) => {
    if (!product) return;

    const basePrice = Number(product.price_vip ?? product.priceVip ?? product.unit_price ?? product.price ?? 0);
    const stockMeta = getTrackedStock(product);
    const requestedQuantity = clampRequestedQuantity(product.quantity || 1, product);
    if (stockMeta.hasNumericStock && requestedQuantity <= 0) return;

    setManifestItems((prev) => {
      const nextItem = {
        id: product.id,
        handle: product.handle || product.id || '',
        name: product.name,
        image: product.image || '',
        strength: product.strength || '',
        quantity: requestedQuantity,
        unit_price: Number.isFinite(basePrice) ? Number(basePrice.toFixed(2)) : 0,
        price: Number.isFinite(basePrice) ? Number(basePrice.toFixed(2)) : 0,
        calculator: product.calculator || null,
        bulk_stock: stockMeta.hasNumericStock ? stockMeta.stock : null,
        stock_limit: stockMeta.hasNumericStock ? stockMeta.stock : null,
        has_tracked_stock: stockMeta.hasNumericStock,
      };

      const existingIndex = prev.findIndex((item) => item.id === product.id);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const merged = {
          ...existing,
          ...nextItem,
          calculator: product.calculator || existing.calculator || null,
        };

        return prev.map((item, index) => (index === existingIndex ? merged : item));
      }

      return [...prev, nextItem];
    });
  };

  const updateManifestQuantity = (itemId, nextQuantity) => {
    const targetId = String(itemId || '').trim();
    if (!targetId) return;

    setManifestItems((prev) => prev.map((item) => {
      if (String(item.id || '') !== targetId) return item;

      const limit = Number(item.stock_limit);
      const hasTrackedStock = item.has_tracked_stock === true && Number.isFinite(limit);
      const normalized = Math.max(1, Math.round(Number(nextQuantity || 1)));
      return {
        ...item,
        quantity: hasTrackedStock ? Math.min(normalized, Math.max(1, limit)) : normalized,
      };
    }));
  };

  const removeFromManifest = (itemId) => {
    const targetId = String(itemId || '').trim();
    if (!targetId) return;
    setManifestItems((prev) => prev.filter((item) => String(item.id || '') !== targetId));
  };

  const clearManifest = () => {
    setManifestItems([]);
  };

  const value = useMemo(
    () => ({
      manifestItems,
      addToManifest,
      updateManifestQuantity,
      removeFromManifest,
      clearManifest,
    }),
    [manifestItems]
  );

  return <ManifestContext.Provider value={value}>{children}</ManifestContext.Provider>;
}

export function useManifest() {
  const context = useContext(ManifestContext);
  if (!context) {
    throw new Error('useManifest must be used within a ManifestProvider');
  }
  return context;
}

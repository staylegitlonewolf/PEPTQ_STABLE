export const getTrackedStock = (product = {}) => {
  const rawStock = Number(product?.bulk_stock ?? product?.bulkStock ?? product?.stock_qty ?? product?.stockQty);
  const hasNumericStock = Number.isFinite(rawStock);
  const stock = hasNumericStock ? Math.max(0, rawStock) : null;
  const inStock = hasNumericStock ? stock > 0 : product?.in_stock !== false;

  return {
    hasNumericStock,
    stock,
    inStock,
  };
};

export const clampRequestedQuantity = (quantity, product = {}) => {
  const normalized = Math.max(1, Math.round(Number(quantity || 1)));
  const stockMeta = getTrackedStock(product);

  if (!stockMeta.hasNumericStock) {
    return normalized;
  }

  if (stockMeta.stock <= 0) {
    return 0;
  }

  return Math.min(normalized, stockMeta.stock);
};

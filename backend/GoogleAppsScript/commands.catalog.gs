const CATALOG_HEADERS_ = [
  "slug",
  "title",
  "description",
  "purity_string",
  "formula",
  "molecular_mass",
  "cas_number",
  "storage_notes",
  "shipping_notes",
  "qr_coa_link",
  "internal_sku",
  "price_vip",
  "inventory",
  "visible",
  "image_path",
  "last_updated"
];

function buildCatalogItemFromRow_(row, includePrivileged, options) {
  options = options || {};
  const slug = String(row[0] || "").trim().toLowerCase();
  const title = String(row[1] || "").trim();
  const description = String(row[2] || "").trim();
  const purityString = String(row[3] || "").trim();
  const formula = String(row[4] || "").trim();
  const molecularMass = String(row[5] || "").trim();
  const casNumber = String(row[6] || "").trim();
  const storageNotes = String(row[7] || "").trim();
  const shippingNotes = String(row[8] || "").trim();
  const qrCoaLink = String(row[9] || "").trim();
  const internalSku = String(row[10] || "").trim();
  const inventoryRaw = row[12];
  const inventoryText = String(inventoryRaw || "").trim();
  const visible = toBoolean_(row[13] || false);
  const imagePath = String(row[14] || "").trim();
  const lastUpdated = String(row[15] || "").trim();
  const numericInventory = Number(inventoryRaw || 0);
  const lowStockThresholdColumn = Number(options.low_stock_threshold_column || 0);
  const lowStockThresholdRaw = lowStockThresholdColumn > 0 ? Number(row[lowStockThresholdColumn - 1] || 0) : NaN;

  const item = {
    slug: slug,
    handle: slug,
    id: slug,
    title: title,
    name: title,
    description: description,
    purity_string: purityString,
    purity: purityString,
    formula: formula,
    molecular_mass: molecularMass,
    mass: molecularMass,
    cas_number: casNumber,
    storage_notes: storageNotes,
    storage: storageNotes,
    shipping_notes: shippingNotes,
    research_usesafetyInfo: shippingNotes,
    qr_coa_link: qrCoaLink,
    qr_code_link: qrCoaLink,
    internal_sku: internalSku,
    inventory: inventoryText,
    visible: visible,
    image_path: imagePath,
    last_updated: lastUpdated,
    category: ""
  };

  if (Number.isFinite(lowStockThresholdRaw) && lowStockThresholdRaw > 0) {
    item.low_stock_threshold = lowStockThresholdRaw;
  }

  if (includePrivileged) {
    item.price_vip = Number(row[11] || 0);
    item.bulk_stock = Number.isFinite(numericInventory) ? numericInventory : 0;
  }

  return item;
}

function buildBetaCatalogItemFromRow_(row, headerMap, includePrivileged, sourceSheetName) {
  const product = toTextOrEmpty_(row[(headerMap.product || 1) - 1]);
  const strength = toTextOrEmpty_(row[(headerMap.strength || 1) - 1]);
  const purityString = headerMap.purity_string ? toTextOrEmpty_(row[headerMap.purity_string - 1]) : "";
  const description = headerMap.description ? toTextOrEmpty_(row[headerMap.description - 1]) : "";
  const rawPrice = headerMap.price_usd ? row[headerMap.price_usd - 1] : "";
  const priceUsd = Number(rawPrice);
  const statusColumn = headerMap.status || headerMap.statis;
  const visible = statusColumn ? toBoolean_(row[statusColumn - 1]) : true;
  const handle = buildCatalogHandleFromParts_(product, strength);

  const item = {
    slug: handle,
    handle: handle,
    id: handle,
    title: product,
    name: product,
    strength: strength,
    description: description,
    purity_string: purityString,
    purity: purityString,
    inventory: "",
    visible: visible,
    image_path: "",
    last_updated: "",
    category: "",
    source_sheet: toTextOrEmpty_(sourceSheetName || "CatalogBeta")
  };

  if (includePrivileged) {
    item.price_vip = Number.isFinite(priceUsd) ? priceUsd : 0;
    item.bulk_stock = 0;
  }

  return item;
}

function handleGetCatalog_(payload) {
  const role = String(payload.role || "GUEST").trim().toUpperCase();
  const approved = {
    MEMBER: true,
    VIP: true,
    OWNER: true,
    ADMIN: true,
    INSTITUTIONAL: true
  };
  const includePrivileged = !!approved[role];
  const requestedSheetName = resolveRequestedCatalogSheetName_(payload, PEPTQ_CONFIG.SHEETS.CATALOG);
  const catalogSheet = getSheet_(requestedSheetName);
  const lastRow = catalogSheet.getLastRow();
  const headerState = getHeaderMap_(catalogSheet, Math.max(catalogSheet.getLastColumn(), 1));
  const isBetaCatalog = isBetaCatalogHeaderMap_(headerState);
  const lowStockThresholdColumn = getColumnIndex_(catalogSheet, "low_stock_threshold") || 0;
  const sourceSheetName = toTextOrEmpty_(catalogSheet.getName() || requestedSheetName);

  if (lastRow < 2) {
    return jsonResponse_({
      status: "success",
      code: "SUCCESS_CATALOG",
      command: "GET_CATALOG",
      role: role,
      catalog_sheet: sourceSheetName,
      include_privileged: includePrivileged,
      count: 0,
      items: []
    });
  }

  const width = Math.max(catalogSheet.getLastColumn(), CATALOG_HEADERS_.length, lowStockThresholdColumn);
  const rows = catalogSheet.getRange(2, 1, lastRow - 1, width).getValues();
  const items = rows
    .map(function (row) {
      if (isBetaCatalog) {
        const betaItem = buildBetaCatalogItemFromRow_(row, headerState.map, includePrivileged, sourceSheetName);
        return betaItem.visible ? betaItem : null;
      }

      const visible = toBoolean_(row[13] || false);
      if (!visible) return null;
      const item = buildCatalogItemFromRow_(row, includePrivileged, {
        low_stock_threshold_column: lowStockThresholdColumn
      });
      item.source_sheet = sourceSheetName;
      return item;
    })
    .filter(Boolean);

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_CATALOG",
    command: "GET_CATALOG",
    role: role,
    catalog_sheet: sourceSheetName,
    include_privileged: includePrivileged,
    count: items.length,
    items: items
  });
}

function handleGetPubChemStructureProxy_(payload) {
  const cid = toTextOrEmpty_(payload.cid || payload.pubchem_cid || payload.pubchemCid);
  if (!/^\d+$/.test(cid)) {
    return jsonResponse_({
      status: "error",
      code: "ERR_INVALID_PUBCHEM_CID",
      command: "GET_PUBCHEM_STRUCTURE_PROXY",
      message: "cid must be a numeric PubChem CID"
    });
  }

  const pngEndpoint =
    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" +
    encodeURIComponent(cid) +
    "/PNG?image_size=large";
  const sdfEndpoint =
    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" +
    encodeURIComponent(cid) +
    "/record/SDF?record_type=3d";

  var imageDataUrl = "";
  var sdf3d = "";
  var has3d = false;

  try {
    const imageResponse = UrlFetchApp.fetch(pngEndpoint, {
      method: "get",
      muteHttpExceptions: true
    });
    if (Number(imageResponse.getResponseCode() || 0) === 200) {
      const imageBlob = imageResponse.getBlob();
      const imageMimeType = String(imageBlob.getContentType() || "image/png").trim() || "image/png";
      imageDataUrl =
        "data:" +
        imageMimeType +
        ";base64," +
        Utilities.base64Encode(imageBlob.getBytes());
    }
  } catch (error) {
    console.warn("PEPTQ_PUBCHEM_2D_PROXY_WARN", String(error));
  }

  try {
    const sdfResponse = UrlFetchApp.fetch(sdfEndpoint, {
      method: "get",
      muteHttpExceptions: true
    });
    if (Number(sdfResponse.getResponseCode() || 0) === 200) {
      sdf3d = String(sdfResponse.getContentText() || "").trim();
      has3d = Boolean(sdf3d);
    }
  } catch (error) {
    console.warn("PEPTQ_PUBCHEM_3D_PROXY_WARN", String(error));
  }

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_PUBCHEM_STRUCTURE_PROXY",
    command: "GET_PUBCHEM_STRUCTURE_PROXY",
    cid: cid,
    has_2d: Boolean(imageDataUrl),
    has_3d: has3d,
    image_2d_data_url: imageDataUrl,
    sdf_3d: sdf3d,
    message: has3d
      ? "3D structure available."
      : (imageDataUrl ? "2D structure available." : "No proxied structure assets available for this CID.")
  });
}

function handleCreateCatalogProduct_(payload) {
  const rawTitle = toTextOrEmpty_(payload.title || payload.product_name || payload.name);
  if (!rawTitle) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_PRODUCT_NAME",
      command: "CREATE_CATALOG_PRODUCT",
      message: "Product name is required"
    });
  }

  const catalogSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.CATALOG);
  ensureHeaders_(catalogSheet, CATALOG_HEADERS_);

  const baseSlug = createCatalogSlug_(rawTitle);
  const finalSlug = reserveUniqueCatalogSlug_(catalogSheet, baseSlug);
  const casNumber = toTextOrEmpty_(payload.cas_number || payload.cas || "");
  const description = toTextOrEmpty_(payload.description || "");
  const purityString = toTextOrEmpty_(payload.purity_string || payload.purity || "");
  const formulaOverride = toTextOrEmpty_(payload.formula || "");
  const massOverride = toTextOrEmpty_(payload.molecular_mass || payload.mass || "");
  const autoEnrich = payload.auto_enrich !== false && String(payload.auto_enrich || "true").toLowerCase() !== "false";

  const pubChemData = autoEnrich ? getPubChemEnrichment_(rawTitle, casNumber) : getPubChemFallback_();
  const resolvedFormula = formulaOverride || toTextOrEmpty_(pubChemData.formula || "");
  const resolvedMass = massOverride || toTextOrEmpty_(pubChemData.mass || "");
  const resolvedCasNumber = casNumber || toTextOrEmpty_(pubChemData.cas_number || "");
  const storageNotes = toTextOrEmpty_(payload.storage_notes || payload.storage || "");
  const shippingNotes = toTextOrEmpty_(payload.shipping_notes || payload.shippingNotes || payload.research_usesafetyInfo || "Research Use Only.");
  const qrCoaLink = toTextOrEmpty_(payload.qr_coa_link || payload.qrCoaLink || payload.coa_url || payload.qr_code_link || "");
  const inventory = toTextOrEmpty_(payload.inventory || "INQUIRY");
  const isVisible = toBoolean_(payload.visible);
  const imagePath = resolveCatalogImagePath_(payload, finalSlug);

  const now = new Date();
  const createdAt = now.toISOString();
  const internalSku = "SKU-" + finalSlug.toUpperCase();

  catalogSheet.appendRow([
    finalSlug,
    rawTitle,
    description,
    purityString,
    resolvedFormula,
    resolvedMass,
    resolvedCasNumber,
    storageNotes,
    shippingNotes,
    qrCoaLink,
    internalSku,
    toTextOrEmpty_(payload.price_vip || ""),
    inventory,
    isVisible,
    imagePath,
    createdAt
  ]);

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_CATALOG_PRODUCT_CREATED",
    command: "CREATE_CATALOG_PRODUCT",
    slug: finalSlug,
    handle: finalSlug,
    title: rawTitle,
    visible: isVisible,
    image_path: imagePath,
    pubchem: {
      formula: pubChemData.formula,
      mass: pubChemData.mass,
      resolved_formula: resolvedFormula,
      resolved_mass: resolvedMass,
      cas_number: resolvedCasNumber,
      source: pubChemData.source
    },
    message: isVisible ? "Catalog product created and published" : "Catalog product created as draft"
  });
}

function handleUpdateCatalogVisibility_(payload) {
  const slug = toTextOrEmpty_(payload.slug || payload.handle || payload.product_handle).toLowerCase();
  const actor = toTextOrEmpty_(payload.actor_email || payload.actor || "SYSTEM");
  const isVisible = toBoolean_(payload.visible);

  if (!slug) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_SLUG",
      command: "UPDATE_CATALOG_VISIBILITY",
      message: "slug is required"
    });
  }

  const catalogSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.CATALOG);
  ensureHeaders_(catalogSheet, CATALOG_HEADERS_);

  const slugColumn = getColumnIndex_(catalogSheet, "slug") || 1;
  const visibleColumn = getColumnIndex_(catalogSheet, "visible") || 14;
  const updatedColumn = getColumnIndex_(catalogSheet, "last_updated") || 16;

  const lastRow = catalogSheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse_({
        status: "error",
        code: "ERR_PRODUCT_NOT_FOUND",
        command: "UPDATE_CATALOG_VISIBILITY",
        slug: slug,
        message: "Catalog is empty"
      });
  }

  const rows = catalogSheet.getRange(2, 1, lastRow - 1, Math.max(catalogSheet.getLastColumn(), visibleColumn, updatedColumn, slugColumn)).getValues();
  var targetRow = 0;
  for (var i = 0; i < rows.length; i += 1) {
    const rowSlug = String(rows[i][slugColumn - 1] || "").trim().toLowerCase();
    if (rowSlug === slug) {
      targetRow = i + 2;
      break;
    }
  }

  if (!targetRow) {
    return jsonResponse_({
      status: "error",
      code: "ERR_PRODUCT_NOT_FOUND",
      command: "UPDATE_CATALOG_VISIBILITY",
      slug: slug,
      message: "Catalog slug not found"
    });
  }

  catalogSheet.getRange(targetRow, visibleColumn).setValue(isVisible);
  catalogSheet.getRange(targetRow, updatedColumn).setValue(new Date().toISOString());

  const visibilityCell = catalogSheet.getRange(targetRow, visibleColumn);
  const previousNote = String(visibilityCell.getNote() || "").trim();
  const nextAudit = "Visibility updated: " + (isVisible ? "LIVE" : "HIDDEN") + " | actor=" + actor + " | at=" + new Date().toISOString();
  visibilityCell.setNote(previousNote ? previousNote + "\n" + nextAudit : nextAudit);

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_CATALOG_VISIBILITY_UPDATED",
    command: "UPDATE_CATALOG_VISIBILITY",
    slug: slug,
    handle: slug,
    visible: isVisible,
    actor: actor,
    message: "Catalog visibility updated"
  });
}

function handleUpdateCatalogPrice_(payload) {
  const slug = toTextOrEmpty_(payload.slug || payload.handle || payload.product_handle).toLowerCase();
  const priceText = toTextOrEmpty_(payload.price_vip || payload.priceVip);

  if (!slug) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_SLUG",
      command: "UPDATE_CATALOG_PRICE",
      message: "slug is required"
    });
  }

  if (priceText === "") {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_PRICE",
      command: "UPDATE_CATALOG_PRICE",
      message: "price_vip is required"
    });
  }

  const parsedPrice = Number(priceText);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    return jsonResponse_({
      status: "error",
      code: "ERR_INVALID_PRICE",
      command: "UPDATE_CATALOG_PRICE",
      message: "price_vip must be a valid number greater than or equal to 0"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const catalogSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.CATALOG);
    ensureHeaders_(catalogSheet, CATALOG_HEADERS_);

    const slugColumn = getColumnIndex_(catalogSheet, "slug") || 1;
    const priceColumn = getColumnIndex_(catalogSheet, "price_vip") || 12;
    const updatedColumn = getColumnIndex_(catalogSheet, "last_updated") || 16;
    const lastRow = catalogSheet.getLastRow();

    if (lastRow < 2) {
      return jsonResponse_({
        status: "error",
        code: "ERR_PRODUCT_NOT_FOUND",
        command: "UPDATE_CATALOG_PRICE",
        slug: slug,
        message: "Catalog is empty"
      });
    }

    const width = Math.max(catalogSheet.getLastColumn(), slugColumn, priceColumn, updatedColumn);
    const rows = catalogSheet.getRange(2, 1, lastRow - 1, width).getValues();
    var targetRow = 0;
    for (var i = 0; i < rows.length; i += 1) {
      if (String(rows[i][slugColumn - 1] || "").trim().toLowerCase() === slug) {
        targetRow = i + 2;
        break;
      }
    }

    if (!targetRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_PRODUCT_NOT_FOUND",
        command: "UPDATE_CATALOG_PRICE",
        slug: slug,
        message: "Catalog slug not found"
      });
    }

    catalogSheet.getRange(targetRow, priceColumn).setValue(parsedPrice.toFixed(2));
    catalogSheet.getRange(targetRow, updatedColumn).setValue(new Date().toISOString());

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_CATALOG_PRICE_UPDATED",
      command: "UPDATE_CATALOG_PRICE",
      slug: slug,
      handle: slug,
      price_vip: parsedPrice,
      message: "Catalog price updated"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteCatalogProduct_(payload) {
  const slug = toTextOrEmpty_(payload.slug || payload.handle || payload.product_handle).toLowerCase();

  if (!slug) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_SLUG",
      command: "DELETE_CATALOG_PRODUCT",
      message: "slug is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const catalogSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.CATALOG);
    ensureHeaders_(catalogSheet, CATALOG_HEADERS_);

    const slugColumn = getColumnIndex_(catalogSheet, "slug") || 1;
    const lastRow = catalogSheet.getLastRow();

    if (lastRow < 2) {
      return jsonResponse_({
        status: "error",
        code: "ERR_PRODUCT_NOT_FOUND",
        command: "DELETE_CATALOG_PRODUCT",
        slug: slug,
        message: "Catalog is empty"
      });
    }

    const rows = catalogSheet.getRange(2, slugColumn, lastRow - 1, 1).getValues();
    var targetRow = 0;
    for (var i = 0; i < rows.length; i += 1) {
      if (String(rows[i][0] || "").trim().toLowerCase() === slug) {
        targetRow = i + 2;
        break;
      }
    }

    if (!targetRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_PRODUCT_NOT_FOUND",
        command: "DELETE_CATALOG_PRODUCT",
        slug: slug,
        message: "Catalog slug not found"
      });
    }

    catalogSheet.deleteRow(targetRow);

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_CATALOG_PRODUCT_DELETED",
      command: "DELETE_CATALOG_PRODUCT",
      slug: slug,
      handle: slug,
      message: "Catalog product deleted"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleManualStockAdjustment_(payload) {
  const slug = toTextOrEmpty_(payload.slug || payload.handle || payload.product_handle).toLowerCase();
  const actorEmail = normalizeEmail_(payload.actor_email || payload.actor || "SYSTEM");
  const reason = toTextOrEmpty_(payload.reason || payload.note || payload.adjustment_note);
  const direction = String(payload.direction || "").trim().toUpperCase();
  const quantityRaw = Number(payload.quantity || payload.qty || payload.amount || 0);
  const deltaRaw = Number(payload.delta || 0);

  if (!slug) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_SLUG",
      command: "MANUAL_STOCK_ADJUSTMENT",
      message: "slug is required"
    });
  }

  if (!reason) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_ADJUSTMENT_REASON",
      command: "MANUAL_STOCK_ADJUSTMENT",
      message: "reason is required"
    });
  }

  const quantity = Math.max(0, Number.isFinite(quantityRaw) ? quantityRaw : 0);
  var delta = Number.isFinite(deltaRaw) && deltaRaw !== 0 ? Math.round(deltaRaw) : 0;
  if (!delta) {
    if (!quantity) {
      return jsonResponse_({
        status: "error",
        code: "ERR_INVALID_ADJUSTMENT_QUANTITY",
        command: "MANUAL_STOCK_ADJUSTMENT",
        message: "quantity or delta is required"
      });
    }
    delta = direction === "OUT" ? -Math.round(quantity) : Math.round(quantity);
  }

  if (!delta) {
    return jsonResponse_({
      status: "error",
      code: "ERR_INVALID_ADJUSTMENT_DELTA",
      command: "MANUAL_STOCK_ADJUSTMENT",
      message: "delta cannot be zero"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const catalogSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.CATALOG);
    ensureHeaders_(catalogSheet, CATALOG_HEADERS_);

    const slugColumn = getColumnIndex_(catalogSheet, "slug") || 1;
    const updatedColumn = getColumnIndex_(catalogSheet, "last_updated") || 16;
    const stockColumn = getCatalogStockColumn_(catalogSheet);
    const titleColumn = getColumnIndex_(catalogSheet, "title") || 2;

    if (!stockColumn) {
      return jsonResponse_({
        status: "error",
        code: "ERR_MISSING_STOCK_COLUMN",
        command: "MANUAL_STOCK_ADJUSTMENT",
        message: "Tracked stock column not found. Add bulk_stock or use numeric inventory values."
      });
    }

    const lastRow = catalogSheet.getLastRow();
    if (lastRow < 2) {
      return jsonResponse_({
        status: "error",
        code: "ERR_PRODUCT_NOT_FOUND",
        command: "MANUAL_STOCK_ADJUSTMENT",
        slug: slug,
        message: "Catalog is empty"
      });
    }

    const width = Math.max(catalogSheet.getLastColumn(), slugColumn, stockColumn, titleColumn, updatedColumn);
    const rows = catalogSheet.getRange(2, 1, lastRow - 1, width).getValues();
    var targetRow = 0;
    var title = "";
    var previousStock = 0;
    for (var i = 0; i < rows.length; i += 1) {
      const rowSlug = String(rows[i][slugColumn - 1] || "").trim().toLowerCase();
      if (rowSlug !== slug) continue;
      targetRow = i + 2;
      title = String(rows[i][titleColumn - 1] || "").trim();
      const rawStock = rows[i][stockColumn - 1];
      if (rawStock === "" || rawStock == null || isNaN(Number(rawStock))) {
        return jsonResponse_({
          status: "error",
          code: "ERR_UNTRACKED_STOCK",
          command: "MANUAL_STOCK_ADJUSTMENT",
          slug: slug,
          message: "This product is not using numeric tracked stock yet."
        });
      }
      previousStock = Number(rawStock || 0);
      break;
    }

    if (!targetRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_PRODUCT_NOT_FOUND",
        command: "MANUAL_STOCK_ADJUSTMENT",
        slug: slug,
        message: "Catalog slug not found"
      });
    }

    var nextStock = previousStock + delta;
    var note = reason;
    if (nextStock < 0) {
      note += " | capped_at_zero";
      nextStock = 0;
    }

    catalogSheet.getRange(targetRow, stockColumn).setValue(nextStock);
    catalogSheet.getRange(targetRow, updatedColumn).setValue(new Date().toISOString());

    appendInventoryMovementLog_([{
      handle: slug,
      title: title,
      quantity: Math.abs(delta),
      delta: delta,
      previous_stock: previousStock,
      next_stock: nextStock,
      note: note
    }], {
      direction: delta > 0 ? "IN" : "OUT",
      command: "MANUAL_STOCK_ADJUSTMENT",
      actor_email: actorEmail,
      order_id: ""
    });

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_MANUAL_STOCK_ADJUSTMENT",
      command: "MANUAL_STOCK_ADJUSTMENT",
      slug: slug,
      handle: slug,
      title: title,
      delta: delta,
      previous_stock: previousStock,
      next_stock: nextStock,
      message: "Manual stock adjustment applied"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleFetchPubChemProxy_(payload) {
  const query = toTextOrEmpty_(payload.query || payload.title || payload.cas_number || payload.cas || "");
  if (!query) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_QUERY",
      command: "FETCH_PUBCHEM_PROXY",
      success: false,
      notFound: true,
      message: "Enter a product name or CAS number before using PubChem autofill."
    });
  }

  try {
    const lookup = fetchPubChemProxyRecord_(query);
    if (!lookup.found) {
      return jsonResponse_({
        status: "success",
        code: "SUCCESS_PUBCHEM_PROXY_NO_MATCH",
        command: "FETCH_PUBCHEM_PROXY",
        success: false,
        notFound: true,
        query: query,
        message: "No PubChem match found. Please fill the fields manually."
      });
    }

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_PUBCHEM_PROXY",
      command: "FETCH_PUBCHEM_PROXY",
      success: true,
      notFound: false,
      query: query,
      message: "PubChem autofill succeeded. Review the fields before saving.",
      data: {
        title: toTextOrEmpty_(lookup.title || query),
        formula: toTextOrEmpty_(lookup.formula),
        mass: toTextOrEmpty_(lookup.mass),
        cas_number: toTextOrEmpty_(lookup.cas_number),
        cid_pubchem: toTextOrEmpty_(lookup.cid),
        synonyms: Array.isArray(lookup.synonyms) ? lookup.synonyms : []
      }
    });
  } catch (error) {
    console.error("PEPTQ_PUBCHEM_PROXY_ERROR", String(error));
    return jsonResponse_({
      status: "success",
      code: "SUCCESS_PUBCHEM_PROXY_UNAVAILABLE",
      command: "FETCH_PUBCHEM_PROXY",
      success: false,
      notFound: false,
      query: query,
      message: "PubChem autofill is unavailable right now. Please enter details manually."
    });
  }
}

function getCatalogStockColumn_(catalogSheet) {
  return getColumnIndex_(catalogSheet, "bulk_stock") || getColumnIndex_(catalogSheet, "inventory") || 0;
}

function getPubChemFallback_() {
  return {
    found: false,
    formula: "",
    mass: "",
    cid: "",
    cas_number: "",
    source: "disabled"
  };
}

function createCatalogSlug_(title) {
  const normalized = String(title || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "compound";
}

function reserveUniqueCatalogSlug_(catalogSheet, baseSlug) {
  const slugColumn = getColumnIndex_(catalogSheet, "slug") || 1;
  const lastRow = catalogSheet.getLastRow();

  if (lastRow < 2) {
    return baseSlug;
  }

  const values = catalogSheet.getRange(2, slugColumn, lastRow - 1, 1).getValues();
  const existing = {};
  values.forEach(function (row) {
    const slug = String(row[0] || "").trim().toLowerCase();
    if (slug) existing[slug] = true;
  });

  if (!existing[baseSlug]) {
    return baseSlug;
  }

  var suffix = 2;
  while (existing[baseSlug + "-" + suffix]) {
    suffix += 1;
  }

  return baseSlug + "-" + suffix;
}

function resolveCatalogImagePath_(payload, slug) {
  const directUrl = toTextOrEmpty_(payload.image_url || payload.image_path || "");
  if (directUrl) {
    return directUrl;
  }

  const base64Content = String(payload.image_file_base64 || "").trim();
  if (!base64Content) {
    return "";
  }

  const fileName = toTextOrEmpty_(payload.image_file_name || (slug + ".png"));
  const mimeType = toTextOrEmpty_(payload.image_mime_type || "image/png");

  try {
    return uploadCatalogImageToDrive_(base64Content, fileName, mimeType);
  } catch (error) {
    console.error("PEPTQ_CATALOG_IMAGE_UPLOAD_ERROR", String(error));
    return "";
  }
}

function uploadCatalogImageToDrive_(base64Content, fileName, mimeType) {
  const bytes = Utilities.base64Decode(base64Content);
  const blob = Utilities.newBlob(bytes, mimeType || "image/png", fileName || "catalog-image.png");

  const folderId = String(PEPTQ_CONFIG.CATALOG_IMAGE_FOLDER_ID || "").trim();
  var file;

  if (folderId) {
    const folder = DriveApp.getFolderById(folderId);
    file = folder.createFile(blob);
  } else {
    file = DriveApp.createFile(blob);
  }

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = file.getUrl();

  // Register in Asset sheet
  try {
    registerAssetRow_(url, fileName, "Catalog Product");
  } catch (e) {
    console.warn("PEPTQ_ASSET_REG_WARN", "Failed to register catalog image as asset: " + String(e));
  }

  return url;
}

function getPubChemEnrichment_(title, casNumber) {
  const byCas = fetchPubChemProperties_(casNumber, "cas_number");
  if (byCas.found) {
    byCas.cas_number = casNumber || fetchPubChemCasByCid_(byCas.cid);
    return byCas;
  }

  const byName = fetchPubChemProperties_(title, "title");
  if (byName.found) {
    byName.cas_number = fetchPubChemCasByCid_(byName.cid);
    return byName;
  }

  return {
    found: false,
    formula: "",
    mass: "",
    cid: "",
    cas_number: "",
    source: "none"
  };
}

function fetchPubChemProxyRecord_(query) {
  const normalizedQuery = toTextOrEmpty_(query);
  if (!normalizedQuery) {
    return {
      found: false,
      title: "",
      formula: "",
      mass: "",
      cid: "",
      cas_number: "",
      synonyms: []
    };
  }

  const cidLookup = fetchPubChemJson_(
    "/compound/name/" + encodeURIComponent(normalizedQuery) + "/cids/JSON"
  );
  const cidList = cidLookup && cidLookup.IdentifierList && Array.isArray(cidLookup.IdentifierList.CID)
    ? cidLookup.IdentifierList.CID
    : [];
  const cid = cidList.length ? String(cidList[0]) : "";
  if (!cid) {
    return {
      found: false,
      title: "",
      formula: "",
      mass: "",
      cid: "",
      cas_number: "",
      synonyms: []
    };
  }

  const propertyPayload = fetchPubChemJson_(
    "/compound/cid/" + encodeURIComponent(cid) + "/property/Title,MolecularFormula,MolecularWeight/JSON"
  );
  const synonymPayload = fetchPubChemJson_(
    "/compound/cid/" + encodeURIComponent(cid) + "/synonyms/JSON",
    { optional: true }
  );

  const property =
    propertyPayload
    && propertyPayload.PropertyTable
    && Array.isArray(propertyPayload.PropertyTable.Properties)
    && propertyPayload.PropertyTable.Properties.length
      ? propertyPayload.PropertyTable.Properties[0]
      : {};

  const synonymsRaw =
    synonymPayload
    && synonymPayload.InformationList
    && Array.isArray(synonymPayload.InformationList.Information)
    && synonymPayload.InformationList.Information.length
      ? synonymPayload.InformationList.Information[0].Synonym
      : [];

  const synonyms = Array.isArray(synonymsRaw)
    ? synonymsRaw
      .map(function (entry) { return toTextOrEmpty_(entry); })
      .filter(Boolean)
      .slice(0, 8)
    : [];

  const casMatch = synonyms.find(function (entry) {
    return /^\d{2,7}-\d{2}-\d$/.test(String(entry || "").trim());
  }) || "";

  return {
    found: true,
    title: toTextOrEmpty_(property.Title || normalizedQuery),
    formula: toTextOrEmpty_(property.MolecularFormula),
    mass: property.MolecularWeight != null ? String(property.MolecularWeight) : "",
    cid: cid,
    cas_number: toTextOrEmpty_(casMatch),
    synonyms: synonyms
  };
}

function fetchPubChemProperties_(identifier, sourceLabel) {
  const token = String(identifier || "").trim();
  if (!token) {
    return {
      found: false,
      formula: "",
      mass: "",
      cid: "",
      source: "none"
    };
  }

  const endpoint =
    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/" +
    encodeURIComponent(token) +
    "/property/MolecularFormula,MolecularWeight,CID/JSON";

  try {
    const response = UrlFetchApp.fetch(endpoint, {
      method: "get",
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      return {
        found: false,
        formula: "",
        mass: "",
        cid: "",
        cas_number: "",
        source: "none"
      };
    }

    const data = JSON.parse(response.getContentText() || "{}");
    const properties =
      data && data.PropertyTable && Array.isArray(data.PropertyTable.Properties)
        ? data.PropertyTable.Properties
        : [];

    if (!properties.length) {
      return {
        found: false,
        formula: "",
        mass: "",
        cid: "",
        cas_number: "",
        source: "none"
      };
    }

    const first = properties[0] || {};
    const massRaw = Number(first.MolecularWeight);
    const cidRaw = Number(first.CID);

    return {
      found: true,
      formula: String(first.MolecularFormula || ""),
      mass: isNaN(massRaw) ? "" : Math.round(massRaw),
      cid: isNaN(cidRaw) ? "" : Math.round(cidRaw),
      cas_number: "",
      source: sourceLabel
    };
  } catch (error) {
    console.error("PEPTQ_PUBCHEM_ERROR", String(error));
    return {
      found: false,
      formula: "",
      mass: "",
      cid: "",
      cas_number: "",
      source: "none"
    };
  }
}

function fetchPubChemJson_(path, options) {
  const settings = options || {};
  const endpoint = "https://pubchem.ncbi.nlm.nih.gov/rest/pug" + String(path || "");
  const response = UrlFetchApp.fetch(endpoint, {
    method: "get",
    muteHttpExceptions: true,
    headers: {
      Accept: "application/json"
    }
  });

  const statusCode = Number(response.getResponseCode() || 0);
  if (statusCode !== 200) {
    if (settings.optional) return null;
    throw new Error("PubChem lookup failed with status " + statusCode);
  }

  return JSON.parse(response.getContentText() || "{}");
}

function fetchPubChemCasByCid_(cidValue) {
  const cid = String(cidValue || "").trim();
  if (!cid) return "";

  const endpoint =
    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" +
    encodeURIComponent(cid) +
    "/synonyms/JSON";

  try {
    const response = UrlFetchApp.fetch(endpoint, {
      method: "get",
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      return "";
    }

    const data = JSON.parse(response.getContentText() || "{}");
    const synonymsArray =
      data && data.InformationList && Array.isArray(data.InformationList.Information)
        ? data.InformationList.Information
        : [];

    if (!synonymsArray.length) {
      return "";
    }

    const synonyms = Array.isArray(synonymsArray[0].Synonym) ? synonymsArray[0].Synonym : [];
    const casMatch = synonyms.find(function (entry) {
      return /^\d{2,7}-\d{2}-\d$/.test(String(entry || "").trim());
    });

    return String(casMatch || "").trim();
  } catch (error) {
    console.error("PEPTQ_PUBCHEM_CAS_ERROR", String(error));
    return "";
  }
}

function handleSyncCatalogToFirestore_(payload) {
  const projectId = toTextOrEmpty_(payload.project_id || PEPTQ_CONFIG.FIREBASE_PROJECT_ID);
  const collectionPath = toTextOrEmpty_(payload.collection || PEPTQ_CONFIG.FIRESTORE_CATALOG_COLLECTION || "catalog_products");
  const includeHidden = toBoolean_(payload.include_hidden || payload.includeHidden);
  const dryRun = toBoolean_(payload.dry_run || payload.dryRun || "true");

  if (!projectId) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_FIREBASE_PROJECT_ID",
      command: "SYNC_CATALOG_TO_FIRESTORE",
      message: "Set PEPTQ_CONFIG.FIREBASE_PROJECT_ID or pass project_id in payload"
    });
  }

  if (!collectionPath) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_COLLECTION_PATH",
      command: "SYNC_CATALOG_TO_FIRESTORE",
      message: "Set PEPTQ_CONFIG.FIRESTORE_CATALOG_COLLECTION or pass collection in payload"
    });
  }

  const catalogSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.CATALOG);
  ensureHeaders_(catalogSheet, CATALOG_HEADERS_);

  const lastRow = catalogSheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse_({
      status: "success",
      code: "SUCCESS_CATALOG_FIRESTORE_SYNC",
      command: "SYNC_CATALOG_TO_FIRESTORE",
      dry_run: dryRun,
      include_hidden: includeHidden,
      synced_count: 0,
      skipped_hidden: 0,
      failures: [],
      message: "Catalog is empty"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const rows = catalogSheet.getRange(2, 1, lastRow - 1, CATALOG_HEADERS_.length).getValues();
    const oauthToken = ScriptApp.getOAuthToken();
    const baseUrl = "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(projectId) + "/databases/(default)/documents/";

    var syncedCount = 0;
    var skippedHidden = 0;
    const failures = [];

    for (var i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const slug = String(row[0] || "").trim().toLowerCase();
      const isVisible = toBoolean_(row[13] || false);

      if (!slug) {
        failures.push({
          row: i + 2,
          code: "ERR_MISSING_SLUG",
          message: "Row skipped because slug is empty"
        });
        continue;
      }

      if (!includeHidden && !isVisible) {
        skippedHidden += 1;
        continue;
      }

      const docPayload = Object.assign(buildCatalogItemFromRow_(row, true), {
        visible: isVisible,
        synced_at: new Date().toISOString(),
        source: "apps-script-sheet"
      });

      if (dryRun) {
        syncedCount += 1;
        continue;
      }

      const url = baseUrl + collectionPath + "/" + encodeURIComponent(slug);
      const response = UrlFetchApp.fetch(url, {
        method: "patch",
        muteHttpExceptions: true,
        contentType: "application/json",
        headers: {
          Authorization: "Bearer " + oauthToken
        },
        payload: JSON.stringify({ fields: buildFirestoreFields_(docPayload) })
      });

      const statusCode = response.getResponseCode();
      if (statusCode < 200 || statusCode >= 300) {
        failures.push({
          row: i + 2,
          slug: slug,
          code: "ERR_FIRESTORE_WRITE_FAILED",
          status: statusCode,
          body: String(response.getContentText() || "")
        });
        continue;
      }

      syncedCount += 1;
    }

    return jsonResponse_({
      status: failures.length ? "partial" : "success",
      code: "SUCCESS_CATALOG_FIRESTORE_SYNC",
      command: "SYNC_CATALOG_TO_FIRESTORE",
      project_id: projectId,
      collection: collectionPath,
      dry_run: dryRun,
      include_hidden: includeHidden,
      total_rows: rows.length,
      synced_count: syncedCount,
      skipped_hidden: skippedHidden,
      failure_count: failures.length,
      failures: failures,
      message: dryRun
        ? "Dry run complete. No Firestore writes performed."
        : "Firestore sync complete"
    });
  } finally {
    lock.releaseLock();
  }
}

function buildFirestoreFields_(obj) {
  const fields = {};
  Object.keys(obj || {}).forEach(function (key) {
    fields[key] = toFirestoreValue_(obj[key]);
  });
  return fields;
}

function toFirestoreValue_(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (typeof value === "number") {
    if (!isFinite(value)) {
      return { stringValue: "" };
    }
    if (Math.floor(value) === value) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }

  if (Object.prototype.toString.call(value) === "[object Date]") {
    return { timestampValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(function (entry) {
          return toFirestoreValue_(entry);
        })
      }
    };
  }

  if (typeof value === "object") {
    const nested = {};
    Object.keys(value).forEach(function (nestedKey) {
      nested[nestedKey] = toFirestoreValue_(value[nestedKey]);
    });
    return { mapValue: { fields: nested } };
  }

  return { stringValue: String(value) };
}


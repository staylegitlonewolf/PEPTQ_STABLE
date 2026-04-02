const SITE_LAYOUT_HEADERS_ = [
  "section_id",
  "is_visible",
  "header_text",
  "sub_text",
  "cta_label"
];

const DISCOUNT_CODE_HEADERS_ = [
  "code",
  "label",
  "discount_pct",
  "scope",
  "product_handle",
  "is_active",
  "is_single_use",
  "used_at",
  "used_by",
  "used_order_id",
  "updated_at",
  "updated_by"
];

function handleGetSiteLayout_() {
  const sheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ADMIN);
  ensureHeaders_(sheet, SITE_LAYOUT_HEADERS_);

  const rows = [];
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, SITE_LAYOUT_HEADERS_.length).getValues();
    values.forEach(function (row) {
      const sectionId = toTextOrEmpty_(row[0]);
      if (!sectionId) return;
      rows.push({
        section_id: sectionId,
        is_visible: toBoolean_(row[1]),
        header_text: toTextOrEmpty_(row[2]),
        sub_text: toTextOrEmpty_(row[3]),
        cta_label: toTextOrEmpty_(row[4])
      });
    });
  }

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_SITE_LAYOUT",
    command: "GET_SITE_LAYOUT",
    sections: rows,
    count: rows.length
  });
}

function handleUpsertSiteLayout_(payload) {
  const sectionId = toTextOrEmpty_(payload.section_id || payload.sectionId).toUpperCase();
  if (!sectionId) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_SECTION_ID",
      command: "UPSERT_SITE_LAYOUT",
      message: "section_id is required"
    });
  }

  const sheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ADMIN);
  ensureHeaders_(sheet, SITE_LAYOUT_HEADERS_);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const existingRow = findRowByColumnValue_(sheet, "section_id", sectionId);
    const rowValues = [
      sectionId,
      toBoolean_(payload.is_visible),
      toTextOrEmpty_(payload.header_text || payload.headerText),
      toTextOrEmpty_(payload.sub_text || payload.subText),
      toTextOrEmpty_(payload.cta_label || payload.ctaLabel)
    ];

    const targetRow = existingRow || Math.max(sheet.getLastRow(), 1) + 1;
    sheet.getRange(targetRow, 1, 1, SITE_LAYOUT_HEADERS_.length).setValues([rowValues]);

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_SITE_LAYOUT_UPSERTED",
      command: "UPSERT_SITE_LAYOUT",
      section_id: sectionId,
      row: targetRow,
      message: existingRow ? "Site layout section updated" : "Site layout section created"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleSaveSiteAsset_(payload) {
  const sectionId = toTextOrEmpty_(payload.section_id || payload.sectionId).toUpperCase();
  if (!sectionId) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_SECTION_ID",
      command: "SAVE_SITE_ASSET",
      message: "section_id is required"
    });
  }

  const base64Content = String(payload.image_file_base64 || payload.file_base64 || "").trim();
  if (!base64Content) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_FILE",
      command: "SAVE_SITE_ASSET",
      message: "image_file_base64 is required"
    });
  }

  const mimeType = toTextOrEmpty_(payload.image_mime_type || payload.mime_type || "image/png");
  const fileName = toTextOrEmpty_(payload.image_file_name || payload.file_name || (sectionId.toLowerCase() + ".png"));
  const nextLabel = toTextOrEmpty_(payload.sub_text || payload.asset_label || "Site asset");
  const nextType = toTextOrEmpty_(payload.cta_label || "IMAGE_URL");

  const sheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ADMIN);
  ensureHeaders_(sheet, SITE_LAYOUT_HEADERS_);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const existingRow = findRowByColumnValue_(sheet, "section_id", sectionId);
    var currentVisible = true;
    var currentSubText = "";
    var currentCtaLabel = "";

    if (existingRow) {
      const currentValues = sheet.getRange(existingRow, 1, 1, SITE_LAYOUT_HEADERS_.length).getValues()[0];
      currentVisible = toBoolean_(currentValues[1]);
      currentSubText = toTextOrEmpty_(currentValues[3]);
      currentCtaLabel = toTextOrEmpty_(currentValues[4]);
    }

    const uploadedUrl = uploadCatalogImageToDrive_(base64Content, fileName, mimeType);
    const targetRow = existingRow || Math.max(sheet.getLastRow(), 1) + 1;
    const rowValues = [
      sectionId,
      Object.prototype.hasOwnProperty.call(payload, "is_visible") ? toBoolean_(payload.is_visible) : currentVisible,
      uploadedUrl,
      nextLabel || currentSubText || "Site asset",
      nextType || currentCtaLabel || "IMAGE_URL"
    ];

    sheet.getRange(targetRow, 1, 1, SITE_LAYOUT_HEADERS_.length).setValues([rowValues]);

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_SITE_ASSET_SAVED",
      command: "SAVE_SITE_ASSET",
      section_id: sectionId,
      asset_url: uploadedUrl,
      row: targetRow,
      message: existingRow ? "Site asset updated" : "Site asset created"
    });
  } catch (error) {
    console.error("PEPTQ_SITE_ASSET_ERROR", String(error));
    return jsonResponse_({
      status: "error",
      code: "ERR_SITE_ASSET_SAVE_FAILED",
      command: "SAVE_SITE_ASSET",
      section_id: sectionId,
      message: String((error && error.message) || error || "Site asset upload failed")
    });
  } finally {
    lock.releaseLock();
  }
}

function INITIALIZE_BRAND_ASSETS_SCHEMA() {
  const sheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ADMIN);
  ensureHeaders_(sheet, SITE_LAYOUT_HEADERS_);

  const existing = sheet.getLastRow() >= 2
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, SITE_LAYOUT_HEADERS_.length).getValues()
    : [];
  const existingIds = existing.map(function (row) { return toTextOrEmpty_(row[0]).toUpperCase(); });

  const defaults = [
    ["COMING_SOON_MODE", true, "TRUE", "Master public-site gate", "TOGGLE"],
    ["ENABLE_3D_VIEWER", true, "TRUE", "3D viewer toggle", "TOGGLE"],
    ["EMAIL_MASTER_ENABLED", true, "TRUE", "Master email automation toggle", "TOGGLE"],
    ["EMAIL_COMING_SOON_ENABLED", true, "TRUE", "Coming Soon email automation toggle", "TOGGLE"],
    ["EMAIL_ORDER_SYSTEM_ENABLED", true, "TRUE", "Order email automation toggle", "TOGGLE"],
    ["WEBSITE_LIGHT_LOGO", true, "", "Light logo asset URL", "IMAGE_URL"],
    ["WEBSITE_DARK_LOGO", true, "", "Dark logo asset URL", "IMAGE_URL"],
    ["WEBSITE_FAVICON", true, "", "Favicon asset URL", "IMAGE_URL"],
    ["COMING_SOON_HERO_IMAGE", true, "", "Coming Soon hero asset URL", "IMAGE_URL"]
  ];

  const toAppend = defaults.filter(function (row) {
    return existingIds.indexOf(row[0]) === -1;
  });

  if (toAppend.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, SITE_LAYOUT_HEADERS_.length).setValues(toAppend);
  }

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_BRAND_ASSETS_INITIALIZED",
    added: toAppend.map(function (row) { return row[0]; }),
    total_rows: sheet.getLastRow()
  });
}

function normalizeDiscountCode_(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "");
}

function normalizeDiscountScope_(value) {
  return String(value || "").trim().toUpperCase() === "PRODUCT" ? "PRODUCT" : "ALL";
}

function parseDiscountHandles_(value) {
  if (Array.isArray(value)) {
    return value
      .map(function (entry) { return toTextOrEmpty_(entry).toLowerCase(); })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map(function (entry) { return toTextOrEmpty_(entry).toLowerCase(); })
      .filter(Boolean);
  }

  return [];
}

function getDiscountCodesSheet_() {
  const sheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.DISCOUNT_CODES);
  ensureHeaders_(sheet, DISCOUNT_CODE_HEADERS_);
  return sheet;
}

function mapDiscountRow_(row) {
  const isActive = toBoolean_(row[5]);
  const isSingleUse = toBoolean_(row[6]);
  const usedAt = row[7] ? new Date(row[7]).toISOString() : "";
  const usedBy = toTextOrEmpty_(row[8]);
  const usedOrderId = toTextOrEmpty_(row[9]);

  return {
    code: normalizeDiscountCode_(row[0]),
    label: toTextOrEmpty_(row[1]),
    discount_pct: Number(row[2] || 0),
    scope: normalizeDiscountScope_(row[3]),
    product_handle: toTextOrEmpty_(row[4]).toLowerCase(),
    is_active: isActive,
    is_single_use: isSingleUse,
    used_at: usedAt,
    used_by: usedBy,
    used_order_id: usedOrderId,
    updated_at: row[10] ? new Date(row[10]).toISOString() : "",
    updated_by: toTextOrEmpty_(row[11])
  };
}

function findDiscountCodeRow_(sheet, code) {
  return findRowByColumnValue_(sheet, "code", normalizeDiscountCode_(code));
}

function readDiscountCodeByRow_(sheet, rowIndex) {
  if (!rowIndex || rowIndex < 2) return null;
  const row = sheet.getRange(rowIndex, 1, 1, DISCOUNT_CODE_HEADERS_.length).getValues()[0];
  return mapDiscountRow_(row);
}

function isDiscountConsumed_(discount) {
  return Boolean(discount && discount.is_single_use && (discount.used_at || discount.used_by || discount.used_order_id));
}

function listDiscountCodes_(options) {
  const settings = options || {};
  const includeInactive = !!settings.includeInactive;
  const sheet = getDiscountCodesSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, DISCOUNT_CODE_HEADERS_.length).getValues();
  return rows
    .map(mapDiscountRow_)
    .map(function (row) {
      if (!includeInactive && !row.is_active) return null;
      return row;
    })
    .filter(Boolean)
    .sort(function (a, b) {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      if (isDiscountConsumed_(a) !== isDiscountConsumed_(b)) return isDiscountConsumed_(a) ? 1 : -1;
      return String(a.code || "").localeCompare(String(b.code || ""));
    });
}

function handleGetDiscountCodes_(payload) {
  const includeInactive = toBoolean_(payload && payload.include_inactive);
  const codes = listDiscountCodes_({ includeInactive: includeInactive });

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_DISCOUNT_CODES",
    command: "GET_DISCOUNT_CODES",
    count: codes.length,
    codes: codes
  });
}

function handleUpsertDiscountCode_(payload) {
  const code = normalizeDiscountCode_(payload.code || payload.discount_code);
  const label = toTextOrEmpty_(payload.label || payload.name || code);
  const discountPct = Number(payload.discount_pct || payload.discountPct || 0);
  const scope = normalizeDiscountScope_(payload.scope);
  const productHandle = toTextOrEmpty_(payload.product_handle || payload.productHandle).toLowerCase();
  const isActive = payload && payload.is_active != null ? toBoolean_(payload.is_active) : true;
  const isSingleUse = payload && payload.is_single_use != null ? toBoolean_(payload.is_single_use) : false;
  const usedAt = toTextOrEmpty_(payload.used_at || payload.usedAt);
  const usedBy = toTextOrEmpty_(payload.used_by || payload.usedBy);
  const usedOrderId = toTextOrEmpty_(payload.used_order_id || payload.usedOrderId);
  const actorEmail = normalizeEmail_(payload.actor_email || payload.actorEmail || "");

  if (!code) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_DISCOUNT_CODE",
      command: "UPSERT_DISCOUNT_CODE",
      message: "code is required"
    });
  }

  if (!(discountPct > 0) || discountPct > 100) {
    return jsonResponse_({
      status: "error",
      code: "ERR_INVALID_DISCOUNT_PCT",
      command: "UPSERT_DISCOUNT_CODE",
      message: "discount_pct must be between 1 and 100"
    });
  }

  if (scope === "PRODUCT" && !productHandle) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_PRODUCT_HANDLE",
      command: "UPSERT_DISCOUNT_CODE",
      message: "product_handle is required for product-scoped codes"
    });
  }

  const sheet = getDiscountCodesSheet_();
  const existingRow = findRowByColumnValue_(sheet, "code", code);
  const now = new Date().toISOString();
  const values = [[
    code,
    label || code,
    Number(discountPct.toFixed(2)),
    scope,
    scope === "PRODUCT" ? productHandle : "",
    isActive ? "TRUE" : "FALSE",
    isSingleUse ? "TRUE" : "FALSE",
    usedAt,
    usedBy,
    usedOrderId,
    now,
    actorEmail
  ]];

  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, DISCOUNT_CODE_HEADERS_.length).setValues(values);
  } else {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, DISCOUNT_CODE_HEADERS_.length).setValues(values);
  }

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_DISCOUNT_CODE_UPSERTED",
    command: "UPSERT_DISCOUNT_CODE",
    discount_code: code,
    scope: scope,
    product_handle: scope === "PRODUCT" ? productHandle : "",
    is_active: isActive,
    is_single_use: isSingleUse,
    message: "Discount code saved"
  });
}

function handleValidateDiscountCode_(payload) {
  const code = normalizeDiscountCode_(payload.code || payload.discount_code);
  const handles = parseDiscountHandles_(payload.product_handles || payload.product_handles_csv || payload.product_handles_json);

  if (!code) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_DISCOUNT_CODE",
      command: "VALIDATE_DISCOUNT_CODE",
      message: "code is required"
    });
  }

  if (!handles.length) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_PRODUCT_HANDLES",
      command: "VALIDATE_DISCOUNT_CODE",
      message: "product_handles are required"
    });
  }

  const codes = listDiscountCodes_({ includeInactive: false });
  const matched = codes.find(function (entry) {
    return entry.code === code;
  });

  if (!matched) {
    return jsonResponse_({
      status: "error",
      code: "ERR_DISCOUNT_CODE_NOT_FOUND",
      command: "VALIDATE_DISCOUNT_CODE",
      message: "Discount code not found or inactive."
    });
  }

  if (isDiscountConsumed_(matched)) {
    return jsonResponse_({
      status: "error",
      code: "ERR_DISCOUNT_ALREADY_USED",
      command: "VALIDATE_DISCOUNT_CODE",
      message: "This discount code has already been used."
    });
  }

  const applicableHandles = matched.scope === "ALL"
    ? handles
    : handles.filter(function (handle) {
      return String(handle || "").trim().toLowerCase() === matched.product_handle;
    });

  if (!applicableHandles.length) {
    return jsonResponse_({
      status: "error",
      code: "ERR_DISCOUNT_NOT_APPLICABLE",
      command: "VALIDATE_DISCOUNT_CODE",
      message: "Discount code does not apply to the selected products."
    });
  }

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_DISCOUNT_CODE_VALID",
    command: "VALIDATE_DISCOUNT_CODE",
    discount: {
      code: matched.code,
      label: matched.label,
      discount_pct: matched.discount_pct,
      scope: matched.scope,
      product_handle: matched.product_handle,
      is_single_use: matched.is_single_use,
      used_at: matched.used_at,
      used_by: matched.used_by,
      used_order_id: matched.used_order_id,
      applicable_handles: applicableHandles
    }
  });
}

function consumeDiscountCode_(code, memberEmail, orderId, actorEmail) {
  const normalizedCode = normalizeDiscountCode_(code);
  if (!normalizedCode) return null;

  const sheet = getDiscountCodesSheet_();
  const rowIndex = findDiscountCodeRow_(sheet, normalizedCode);
  if (!rowIndex) {
    return {
      ok: false,
      code: "ERR_DISCOUNT_CODE_NOT_FOUND",
      message: "Discount code not found or inactive."
    };
  }

  const record = readDiscountCodeByRow_(sheet, rowIndex);
  if (!record || !record.is_active) {
    return {
      ok: false,
      code: "ERR_DISCOUNT_CODE_NOT_FOUND",
      message: "Discount code not found or inactive."
    };
  }

  if (!record.is_single_use) {
    return {
      ok: true,
      record: record
    };
  }

  if (isDiscountConsumed_(record)) {
    return {
      ok: false,
      code: "ERR_DISCOUNT_ALREADY_USED",
      message: "This discount code has already been used."
    };
  }

  const now = new Date().toISOString();
  sheet.getRange(rowIndex, 8, 1, 5).setValues([[
    now,
    normalizeEmail_(memberEmail),
    toTextOrEmpty_(orderId),
    now,
    normalizeEmail_(actorEmail) || normalizeEmail_(memberEmail)
  ]]);

  return {
    ok: true,
    record: {
      code: record.code,
      label: record.label,
      discount_pct: record.discount_pct,
      scope: record.scope,
      product_handle: record.product_handle,
      is_single_use: true,
      used_at: now,
      used_by: normalizeEmail_(memberEmail),
      used_order_id: toTextOrEmpty_(orderId)
    }
  };
}

function handleGetQrCoa_(payload) {
  const lotId = toTextOrEmpty_(payload.lot_id || payload.lotId || payload.lot_number || payload.lotNumber).toUpperCase();
  if (!lotId) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_QR_IDENTIFIER",
      command: "GET_QR_COA",
      message: "lot_id is required"
    });
  }

  const sheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.LOT_REGISTRY);
  const lotHeaderMap = ensureLotRegistryHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse_({
      status: "error",
      code: "ERR_QR_COA_NOT_FOUND",
      command: "GET_QR_COA",
      message: "No QR/COA records exist yet"
    });
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), getLotRegistryHeaders_().length)).getValues();

  for (var i = 0; i < rows.length; i += 1) {
    const rowLotId = toTextOrEmpty_(rows[i][lotHeaderMap.lot_id]).toUpperCase();
    if (rowLotId === lotId) {
      const productId = toTextOrEmpty_(rows[i][lotHeaderMap.product_id]);
      const coaUrl = toTextOrEmpty_(rows[i][lotHeaderMap.coa_url]);
      const purityPct = Number(rows[i][lotHeaderMap.purity_pct] || 0);
      const verificationState = toTextOrEmpty_(rows[i][lotHeaderMap.verification_state] || "VERIFIED");

      return jsonResponse_({
        status: "success",
        code: "SUCCESS_QR_COA_LOOKUP",
        command: "GET_QR_COA",
        record: {
          lot_id: lotId,
          product_id: productId,
          coa_url: coaUrl,
          purity_pct: purityPct,
          verification_state: verificationState,
          test_date: toTextOrEmpty_(rows[i][lotHeaderMap.test_date]),
          expiry_date: toTextOrEmpty_(rows[i][lotHeaderMap.expiry_date]),
          qr_target_url: coaUrl
        }
      });
    }
  }

  return jsonResponse_({
    status: "error",
    code: "ERR_QR_COA_NOT_FOUND",
    command: "GET_QR_COA",
    message: "No QR/COA record found for the requested lot"
  });
}

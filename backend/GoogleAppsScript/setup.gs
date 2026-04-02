function getOwnerQuickLinksBootstrapHeaders_() {
  return ["link_id", "link_label", "link_url", "is_visible", "sort_order"];
}

function getArchiveBootstrapHeaders_() {
  return getOrdersHeaders_();
}

function getOwnerBootstrapHeaders_() {
  return [
    "section_id",
    "is_visible",
    "header_text",
    "sub_text",
    "cta_label",
    "email",
    "role",
    "pin",
    "business_name",
    "full_name",
    "phone",
    "photo_url",
    "timestamp"
  ];
}

function getBootstrapSchemaV10_() {
  return [
    { name: PEPTQ_CONFIG.SHEETS.WAITLIST, headers: PORTAL_REQUEST_HEADERS_ },
    { name: PEPTQ_CONFIG.SHEETS.PORTAL_REQUEST, headers: PORTAL_REQUEST_HEADERS_ },
    { name: PEPTQ_CONFIG.SHEETS.MEMBERS, headers: MEMBERS_HEADERS_ },
    { name: PEPTQ_CONFIG.SHEETS.CATALOG, headers: CATALOG_HEADERS_ },
    { name: PEPTQ_CONFIG.SHEETS.LOT_REGISTRY, headers: getLotRegistryHeaders_() },
    { name: PEPTQ_CONFIG.SHEETS.ORDERS, headers: getOrdersHeaders_() },
    { name: PEPTQ_CONFIG.SHEETS.PREORDERS, headers: getPreorderHeaders_() },
    { name: PEPTQ_CONFIG.SHEETS.OWNER, headers: getOwnerBootstrapHeaders_() },
    { name: PEPTQ_CONFIG.SHEETS.DISCOUNT_CODES, headers: DISCOUNT_CODE_HEADERS_ },
    { name: PEPTQ_CONFIG.SHEETS.INVENTORY, headers: getInventoryLogHeaders_() },
    { name: PEPTQ_CONFIG.SHEETS.SUPPORT, headers: SUPPORT_HEADERS_ },
    { name: PEPTQ_CONFIG.SHEETS.OWNER_QUICK_LINKS, headers: getOwnerQuickLinksBootstrapHeaders_() },
    { name: PEPTQ_CONFIG.SHEETS.ARCHIVE, headers: getArchiveBootstrapHeaders_() }
  ];
}

function ensureBootstrapSheet_(spreadsheet, sheetName, headers) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  return sheet;
}

/**
 * PEPTQ v1.0 AUTHENTIC FRESH-START BOOTSTRAP
 * Builds the trusted runtime + manual archive tabs directly from local code constants.
 * The 'Owner' sheet is now a unified hub for both site configuration and owner identity.
 */
function bootstrapV10FreshStart() {
  var ss = SpreadsheetApp.openById(PEPTQ_CONFIG.SPREADSHEET_ID);
  var schema = getBootstrapSchemaV10_();
  var touched = [];

  schema.forEach(function (entry) {
    ensureBootstrapSheet_(ss, entry.name, entry.headers);
    touched.push({
      sheet: entry.name,
      columns: entry.headers.length
    });
  });

  return {
    status: "success",
    code: "SUCCESS_BOOTSTRAP_V10",
    spreadsheet_id: ss.getId(),
    sheets: touched,
    count: touched.length,
    note: "The owner metadata sheet remains optional/manual because it is not part of the active runtime contract."
  };
}

/**
 * Unified helper for the consolidated Owner/Identity tab.
 */
function bootstrapOwnerDirectorySheetV10() {
  var ss = SpreadsheetApp.openById(PEPTQ_CONFIG.SPREADSHEET_ID);
  var headers = getOwnerBootstrapHeaders_();
  ensureBootstrapSheet_(ss, PEPTQ_CONFIG.SHEETS.OWNER, headers);

  return {
    status: "success",
    code: "SUCCESS_OWNER_CONSOLIDATED_BOOTSTRAPPED",
    spreadsheet_id: ss.getId(),
    sheet: PEPTQ_CONFIG.SHEETS.OWNER,
    columns: headers.length
  };
}

function validateBootstrapHeadersV10() {
  var ss = SpreadsheetApp.openById(PEPTQ_CONFIG.SPREADSHEET_ID);
  var schema = getBootstrapSchemaV10_();
  var results = [];
  var mismatches = [];

  schema.forEach(function (entry) {
    var sheet = ss.getSheetByName(entry.name);
    if (!sheet) {
      mismatches.push({ sheet: entry.name, reason: "missing_sheet" });
      return;
    }

    var actual = sheet.getRange(1, 1, 1, entry.headers.length).getValues()[0].map(function (value) {
      return String(value || "").trim();
    });
    var expected = entry.headers.slice();
    var ok = actual.length === expected.length && expected.every(function (header, index) {
      return actual[index] === header;
    });

    results.push({
      sheet: entry.name,
      ok: ok,
      expected_columns: expected.length
    });

    if (!ok) {
      mismatches.push({
        sheet: entry.name,
        expected: expected,
        actual: actual
      });
    }
  });

  return {
    status: mismatches.length ? "error" : "success",
    code: mismatches.length ? "ERR_BOOTSTRAP_SCHEMA_DRIFT" : "SUCCESS_BOOTSTRAP_SCHEMA_VALID",
    checked: results.length,
    results: results,
    mismatches: mismatches
  };
}

/**
 * PEPTQ Professional Matrix-Style Formatting
 * Applies consistent styling across all 14 production sheets:
 * 1. Freezes Header Row
 * 2. Background: Black (#000000)
 * 3. Font: Matrix Green (#00FF00)
 * 4. Font Weight: Bold
 * 5. Font Family: Consolas/Monospace
 */
function formatProductionSheets() {
  const ss = SpreadsheetApp.openById(PEPTQ_CONFIG.SPREADSHEET_ID);
  const sheets = Object.values(PEPTQ_CONFIG.SHEETS);
  const results = [];

  sheets.forEach(function (sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      results.push({ sheet: sheetName, status: "MISSING" });
      return;
    }

    const lastCol = Math.max(sheet.getLastColumn(), 1);
    const headerRange = sheet.getRange(1, 1, 1, lastCol);

    // 1. Freeze Header
    sheet.setFrozenRows(1);

    // 2. Apply Matrix Aesthetic
    headerRange.setBackground("#000000");
    headerRange.setFontColor("#00FF00");
    headerRange.setFontWeight("bold");
    headerRange.setFontFamily("Consolas");

    results.push({ sheet: sheetName, status: "STYLED", columns: lastCol });
  });

  return {
    status: "success",
    code: "SUCCESS_MATRIX_STYLING",
    spreadsheet_id: ss.getId(),
    results: results,
    count: results.length
  };
}

/**
 * Programmatic Aesthetic Audit
 * Validates that all production sheets adhere to the Matrix styling standard.
 */
function getFormattingAuditReport() {
  const ss = SpreadsheetApp.openById(PEPTQ_CONFIG.SPREADSHEET_ID);
  const sheets = Object.values(PEPTQ_CONFIG.SHEETS);
  const report = [];

  sheets.forEach(function (sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      report.push({ sheet: sheetName, ok: false, reason: "missing" });
      return;
    }

    const cell = sheet.getRange(1, 1);
    const bg = cell.getBackground();
    const fg = cell.getFontColor();
    const frozen = sheet.getFrozenRows();

    // Check against standard Matrix codes
    const bgMatch = bg === "#000000";
    const fgMatch = fg === "#00ff00"; // Apps Script returns lowercase hex

    report.push({
      sheet: sheetName,
      background: bg,
      font_color: fg,
      frozen_rows: frozen,
      is_matrix_styled: (bgMatch && fgMatch && frozen >= 1)
    });
  });

  return {
    status: "success",
    code: "SUCCESS_STYLE_AUDIT",
    timestamp: new Date().toISOString(),
    report: report
  };
}

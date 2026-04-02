function parsePayload_(e) {
  const fallbackParams = (e && e.parameter && typeof e.parameter === "object") ? e.parameter : {};

  if (!e || !e.postData) {
    if (Object.keys(fallbackParams).length > 0) return fallbackParams;
    throw new Error("Empty request body");
  }

  const raw = String(e.postData.contents || "").trim();
  if (!raw) {
    if (Object.keys(fallbackParams).length > 0) return fallbackParams;
    throw new Error("Empty request body");
  }

  const normalizedRaw = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  const contentType = String(e.postData.type || "").toLowerCase();
  const looksLikeJson = normalizedRaw.charAt(0) === "{" || normalizedRaw.charAt(0) === "[";

  if (contentType.indexOf("application/json") !== -1 || looksLikeJson) {
    try {
      const parsed = JSON.parse(normalizedRaw);
      if (parsed && typeof parsed === "object") return parsed;
      throw new Error("JSON payload must be an object");
    } catch (jsonError) {
      throw new Error("Invalid JSON body: " + String(jsonError && jsonError.message || jsonError));
    }
  }

  const formPayload = {};
  if (normalizedRaw.indexOf("=") !== -1) {
    normalizedRaw.split("&").forEach(function (pair) {
      const idx = pair.indexOf("=");
      const keyPart = idx === -1 ? pair : pair.slice(0, idx);
      const valuePart = idx === -1 ? "" : pair.slice(idx + 1);
      const key = decodeURIComponent(String(keyPart || "").replace(/\+/g, " ")).trim();
      if (!key) return;
      const value = decodeURIComponent(String(valuePart || "").replace(/\+/g, " "));
      formPayload[key] = value;
    });
  }

  if (Object.keys(formPayload).length > 0) return formPayload;
  if (Object.keys(fallbackParams).length > 0) return fallbackParams;

  throw new Error("Unsupported request payload format");
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function asText_(value) {
  if (value === undefined || value === null) return "";
  const text = String(value);
  if (/^[=+\-@]/.test(text)) return "'" + text;
  return text;
}

function getSpreadsheet_() {
  const configuredId = String(PEPTQ_CONFIG.SPREADSHEET_ID || "").trim();
  if (!configuredId || configuredId === "PASTE_SPREADSHEET_ID_HERE") {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (!active) {
      throw new Error("No active spreadsheet found. Set PEPTQ_CONFIG.SPREADSHEET_ID.");
    }
    return active;
  }
  return SpreadsheetApp.openById(configuredId);
}

function getSheetConfigKey_(sheetName) {
  const target = String(sheetName || "").trim();
  const aliases = PEPTQ_CONFIG.SHEET_ALIASES || {};
  const keys = Object.keys(PEPTQ_CONFIG.SHEETS || {});
  for (var i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const primary = String(PEPTQ_CONFIG.SHEETS[key] || "").trim();
    if (primary === target) {
      return key;
    }

    const keyAliases = Array.isArray(aliases[key]) ? aliases[key] : [];
    for (var j = 0; j < keyAliases.length; j += 1) {
      if (String(keyAliases[j] || "").trim() === target) {
        return key;
      }
    }
  }
  return "";
}

function getSheetNameCandidates_(sheetName) {
  const candidates = [];
  const seed = String(sheetName || "").trim();
  if (seed) candidates.push(seed);

  const key = getSheetConfigKey_(seed);
  if (!key) return candidates;

  const primary = String((PEPTQ_CONFIG.SHEETS && PEPTQ_CONFIG.SHEETS[key]) || "").trim();
  if (primary && candidates.indexOf(primary) === -1) candidates.push(primary);

  const aliases = PEPTQ_CONFIG.SHEET_ALIASES || {};
  const keyAliases = Array.isArray(aliases[key]) ? aliases[key] : [];
  for (var i = 0; i < keyAliases.length; i += 1) {
    const alias = String(keyAliases[i] || "").trim();
    if (alias && candidates.indexOf(alias) === -1) candidates.push(alias);
  }

  return candidates;
}

function getSheet_(sheetName) {
  const spreadsheet = getSpreadsheetForSheet_(sheetName);
  const candidates = getSheetNameCandidates_(sheetName);
  for (var i = 0; i < candidates.length; i += 1) {
    const found = spreadsheet.getSheetByName(candidates[i]);
    if (found) return found;
  }
  throw new Error("Sheet not found: " + sheetName);
}

function getOrCreateSheet_(sheetName) {
  const spreadsheet = getSpreadsheetForSheet_(sheetName);
  const candidates = getSheetNameCandidates_(sheetName);
  for (var i = 0; i < candidates.length; i += 1) {
    const found = spreadsheet.getSheetByName(candidates[i]);
    if (found) return found;
  }

  const createName = candidates[0] || String(sheetName || "").trim();
  return spreadsheet.insertSheet(createName);
}

function getSpreadsheetForSheet_(sheetName) {
  const configKey = getSheetConfigKey_(sheetName);
  const perVaultMap = PEPTQ_CONFIG.SPREADSHEET_IDS || {};
  const vaultId = configKey ? String(perVaultMap[configKey] || "").trim() : "";

  if (vaultId) {
    return SpreadsheetApp.openById(vaultId);
  }

  return getSpreadsheet_();
}

function normalizeEmail_(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";

  const parts = raw.split("@");
  if (parts.length !== 2) return raw;

  const local = String(parts[0] || "");
  const domain = String(parts[1] || "");

  // Gmail ignores `+tag` addressing; stripping it prevents test aliases (and duplicates)
  // from polluting sheets while preserving the real mailbox.
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const plusIndex = local.indexOf("+");
    const normalizedLocal = plusIndex === -1 ? local : local.slice(0, plusIndex);
    return normalizedLocal + "@" + domain;
  }

  return raw;
}

function toBoolean_(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function toTextOrEmpty_(value) {
  if (value === undefined || value === null) return "";
  return asText_(String(value).trim());
}

function resolveRequestedCatalogSheetName_(payload, fallbackSheetName) {
  const explicitSheetName = toTextOrEmpty_(
    (payload && (payload.catalog_sheet || payload.catalogSheet || payload.sheet_name || payload.sheetName)) || ""
  );
  if (explicitSheetName) return explicitSheetName;

  const source = toTextOrEmpty_(
    (payload && (payload.catalog_source || payload.catalogSource || payload.source)) || ""
  ).toUpperCase();

  if (source === "BETA") {
    return "CatalogBeta";
  }

  return toTextOrEmpty_(fallbackSheetName || PEPTQ_CONFIG.SHEETS.CATALOG);
}

function buildCatalogHandleFromParts_(productName, strength) {
  const productPart = toTextOrEmpty_(productName)
    .toLowerCase()
    .replace(/\+/g, "-plus-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const strengthPart = toTextOrEmpty_(strength)
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return [productPart, strengthPart].filter(Boolean).join("-");
}

function isBetaCatalogHeaderMap_(headerState) {
  const map = headerState && headerState.map ? headerState.map : (headerState || {});
  // Accept either `status` or legacy/typo `statis` as the live/visibility column.
  return Boolean(map.product && map.strength && (map.price_usd || map.purity_string || map.status || map.statis));
}

function getHeaderMap_(sheet, expectedHeaderCount) {
  const width = Math.max(Number(expectedHeaderCount) || 1, 1);
  const headers = sheet
    .getRange(1, 1, 1, width)
    .getValues()[0]
    .map(function (cell) {
      return String(cell || "").trim();
    });

  const map = {};
  headers.forEach(function (header, idx) {
    if (header) map[header.toLowerCase()] = idx + 1;
  });

  return { headers: headers, map: map };
}

function getColumnIndex_(sheet, headerName) {
  const headerKey = String(headerName || "").trim().toLowerCase();
  if (!headerKey) return 0;
  const headerState = getHeaderMap_(sheet, Math.max(sheet.getLastColumn(), 1));
  return headerState.map[headerKey] || 0;
}

function getOwnerConfigValue_(sectionId, defaultValue) {
  const normalizedSectionId = String(sectionId || "").trim().toUpperCase();
  if (!normalizedSectionId) return defaultValue;

  try {
    const ownerSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.OWNER);
    ensureHeaders_(ownerSheet, ["section_id", "is_visible", "header_text", "sub_text", "cta_label"]);

    const targetRow = findRowByColumnValue_(ownerSheet, "section_id", normalizedSectionId);
    if (!targetRow) return defaultValue;

    const headerTextColumn = getColumnIndex_(ownerSheet, "header_text") || 3;
    return ownerSheet.getRange(targetRow, headerTextColumn).getValue();
  } catch (error) {
    console.warn("OWNER_CONFIG_VALUE_LOOKUP_FAILED", normalizedSectionId, String(error));
    return defaultValue;
  }
}

function getNotificationRecipient_() {
  const supportRecipient = normalizeEmail_(getOwnerConfigValue_("OWNER_SUPPORT_EMAIL", ""));
  if (supportRecipient) return supportRecipient;

  const legacyRecipient = normalizeEmail_(getOwnerConfigValue_("NOTIFICATION_EMAIL", ""));
  if (legacyRecipient) return legacyRecipient;

  return normalizeEmail_(PEPTQ_CONFIG.NOTIFICATION_EMAIL || "");
}

function getScriptPropertyValue_(key, defaultValue) {
  const raw = PropertiesService.getScriptProperties().getProperty(String(key || "").trim());
  return raw == null ? defaultValue : raw;
}

function setScriptPropertyValue_(key, value) {
  PropertiesService.getScriptProperties().setProperty(String(key || "").trim(), String(value || ""));
}

function deleteScriptPropertyValue_(key) {
  PropertiesService.getScriptProperties().deleteProperty(String(key || "").trim());
}

function getEmailProvider_() {
  const provider = String(getOwnerConfigValue_("EMAIL_PROVIDER", "GOOGLE") || "GOOGLE").trim().toUpperCase();
  return provider === "RESEND" ? "RESEND" : "GOOGLE";
}

function getEmailSenderName_() {
  return String(getOwnerConfigValue_("OWNER_BUSINESS_NAME", "PEPTQ Portal") || "PEPTQ Portal").trim() || "PEPTQ Portal";
}

function getEmailSenderEmail_() {
  return normalizeEmail_(getOwnerConfigValue_("EMAIL_SENDER_EMAIL", ""));
}

function isOwnerConfigToggleEnabled_(sectionId, defaultValue) {
  const fallback = defaultValue ? "ENABLED" : "DISABLED";
  const raw = getOwnerConfigValue_(sectionId, fallback);
  if (typeof raw === "boolean") return raw;

  const normalized = String(raw || "").trim().toUpperCase();
  if (!normalized) return Boolean(defaultValue);

  if (normalized === "ENABLED" || normalized === "TRUE" || normalized === "1" || normalized === "YES" || normalized === "ON") {
    return true;
  }

  if (normalized === "DISABLED" || normalized === "FALSE" || normalized === "0" || normalized === "NO" || normalized === "OFF") {
    return false;
  }

  return Boolean(defaultValue);
}

function isPlatformEmailCategoryEnabled_(category) {
  const normalizedCategory = String(category || "GENERAL").trim().toUpperCase() || "GENERAL";
  if (normalizedCategory === "SECURITY") {
    return true;
  }

  if (!isOwnerConfigToggleEnabled_("EMAIL_MASTER_ENABLED", true)) {
    return false;
  }

  if (normalizedCategory === "COMING_SOON") {
    return isOwnerConfigToggleEnabled_("EMAIL_COMING_SOON_ENABLED", true);
  }

  if (normalizedCategory === "ORDER") {
    return isOwnerConfigToggleEnabled_("EMAIL_ORDER_SYSTEM_ENABLED", true);
  }

  return true;
}

function getResendApiKey_() {
  return String(getScriptPropertyValue_("PEPTQ_RESEND_API_KEY", "") || "").trim();
}

function normalizeAddressList_(value) {
  if (Array.isArray(value)) {
    return value
      .map(function (entry) { return normalizeEmail_(entry); })
      .filter(Boolean);
  }

  const text = String(value || "").trim();
  if (!text) return [];

  return text
    .split(",")
    .map(function (entry) { return normalizeEmail_(entry); })
    .filter(Boolean);
}

function formatEmailFrom_(name, email) {
  const normalizedEmail = normalizeEmail_(email);
  if (!normalizedEmail) return "";

  const normalizedName = String(name || "").trim().replace(/[<>"]/g, "");
  return normalizedName ? normalizedName + " <" + normalizedEmail + ">" : normalizedEmail;
}

function getEmailProviderRuntime_() {
  const selectedProvider = getEmailProvider_();
  const resendApiKey = getResendApiKey_();
  const senderEmail = getEmailSenderEmail_();
  const senderName = getEmailSenderName_();
  const resendReady = selectedProvider === "RESEND" && Boolean(resendApiKey) && Boolean(senderEmail);

  return {
    selected_provider: selectedProvider,
    active_provider: resendReady ? "RESEND" : "GOOGLE",
    resend_ready: resendReady,
    resend_api_key: resendApiKey,
    sender_email: senderEmail,
    sender_name: senderName
  };
}

function getEmailUsagePropertyKey_() {
  const timezone = Session.getScriptTimeZone ? Session.getScriptTimeZone() : "Etc/UTC";
  const dateKey = Utilities.formatDate(new Date(), timezone || "Etc/UTC", "yyyy-MM-dd");
  return "PEPTQ_EMAIL_USAGE_" + dateKey;
}

function createDefaultEmailUsageStats_() {
  return {
    total_sent: 0,
    by_category: {
      COMING_SOON: 0,
      ORDER: 0,
      SECURITY: 0,
      GENERAL: 0
    },
    by_provider: {
      GOOGLE: 0,
      RESEND: 0
    }
  };
}

function normalizeEmailUsageStats_(value) {
  const source = value && typeof value === "object" ? value : {};
  const stats = createDefaultEmailUsageStats_();
  stats.total_sent = Number(source.total_sent || 0) || 0;

  ["COMING_SOON", "ORDER", "SECURITY", "GENERAL"].forEach(function (key) {
    stats.by_category[key] = Number(source.by_category && source.by_category[key] || 0) || 0;
  });

  ["GOOGLE", "RESEND"].forEach(function (key) {
    stats.by_provider[key] = Number(source.by_provider && source.by_provider[key] || 0) || 0;
  });

  return stats;
}

function getTodayEmailUsageStats_() {
  const raw = getScriptPropertyValue_(getEmailUsagePropertyKey_(), "");
  if (!raw) {
    return createDefaultEmailUsageStats_();
  }

  try {
    return normalizeEmailUsageStats_(JSON.parse(raw));
  } catch (error) {
    console.warn("EMAIL_USAGE_STATS_PARSE_FAILED", String(error));
    return createDefaultEmailUsageStats_();
  }
}

function recordPlatformEmailUsage_(category, provider) {
  const normalizedCategory = String(category || "GENERAL").trim().toUpperCase() || "GENERAL";
  const normalizedProvider = String(provider || "GOOGLE").trim().toUpperCase() === "RESEND" ? "RESEND" : "GOOGLE";
  const next = getTodayEmailUsageStats_();

  next.total_sent += 1;
  next.by_category[normalizedCategory] = Number(next.by_category[normalizedCategory] || 0) + 1;
  next.by_provider[normalizedProvider] = Number(next.by_provider[normalizedProvider] || 0) + 1;

  PropertiesService.getScriptProperties().setProperty(
    getEmailUsagePropertyKey_(),
    JSON.stringify(next)
  );

  return next;
}

function sendViaGoogleProvider_(message) {
  const recipients = normalizeAddressList_(message.to);
  if (!recipients.length) {
    throw new Error("Missing email recipient");
  }

  const payload = {
    to: recipients.join(","),
    subject: String(message.subject || "").trim(),
    body: String(message.body || message.text || "").trim()
  };

  const cc = normalizeAddressList_(message.cc);
  const bcc = normalizeAddressList_(message.bcc);
  const replyTo = normalizeEmail_(message.replyTo || message.reply_to || "");
  const htmlBody = String(message.htmlBody || message.html || "").trim();
  const senderName = String(message.fromName || message.name || "").trim();

  if (cc.length) payload.cc = cc.join(",");
  if (bcc.length) payload.bcc = bcc.join(",");
  if (replyTo) payload.replyTo = replyTo;
  if (htmlBody) payload.htmlBody = htmlBody;
  if (senderName) payload.name = senderName;

  MailApp.sendEmail(payload);
}

function sendViaResendProvider_(message, runtime) {
  const recipients = normalizeAddressList_(message.to);
  if (!recipients.length) {
    throw new Error("Missing email recipient");
  }

  const senderEmail = normalizeEmail_(message.fromEmail || runtime.sender_email || "");
  if (!senderEmail) {
    throw new Error("Resend sender email is not configured");
  }

  const senderName = String(message.fromName || message.name || runtime.sender_name || "").trim();
  const replyTo = normalizeEmail_(message.replyTo || message.reply_to || "");
  const cc = normalizeAddressList_(message.cc);
  const bcc = normalizeAddressList_(message.bcc);
  const textBody = String(message.body || message.text || "").trim();
  const htmlBody = String(message.htmlBody || message.html || "").trim();
  const payload = {
    from: formatEmailFrom_(senderName, senderEmail),
    to: recipients,
    subject: String(message.subject || "").trim()
  };

  if (cc.length) payload.cc = cc;
  if (bcc.length) payload.bcc = bcc;
  if (replyTo) payload.reply_to = replyTo;
  if (htmlBody) payload.html = htmlBody;
  if (textBody || !htmlBody) payload.text = textBody;

  const response = UrlFetchApp.fetch("https://api.resend.com/emails", {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + runtime.resend_api_key,
      "User-Agent": "peptq-manual-lite/1.0"
    },
    payload: JSON.stringify(payload)
  });

  const status = Number(response.getResponseCode() || 0);
  if (status >= 200 && status < 300) {
    return response;
  }

  throw new Error("Resend email send failed (" + status + "): " + response.getContentText());
}

function sendPlatformEmail_(message) {
  const payload = message || {};
  const category = String(payload.category || "GENERAL").trim().toUpperCase() || "GENERAL";
  if (!isPlatformEmailCategoryEnabled_(category)) {
    return {
      skipped: true,
      category: category,
      reason: "EMAIL_AUTOMATION_DISABLED"
    };
  }

  const runtime = getEmailProviderRuntime_();

  if (runtime.active_provider === "RESEND") {
    const response = sendViaResendProvider_(payload, runtime);
    recordPlatformEmailUsage_(category, "RESEND");
    return response;
  }

  const response = sendViaGoogleProvider_(payload);
  recordPlatformEmailUsage_(category, "GOOGLE");
  return response;
}

function getGoogleRemainingDailyQuota_() {
  return Number(MailApp.getRemainingDailyQuota() || 0);
}

function getOrdersHeaders_() {
  return [
    "order_id",
    "timestamp",
    "member_email",
    "items_json",
    "total_amount",
    "shipping_data",
    "status",
    "tracking_num",
    "admin_notes",
    "payment_status",
    "invoice_id",
    "invoice_pdf_url",
    "paid_at"
  ];
}

function ensureHeaders_(sheet, expectedHeaders) {
  const headerState = getHeaderMap_(sheet, expectedHeaders.length);
  const currentHeaders = headerState.headers;

  const isEmpty = currentHeaders.every(function (header) {
    return !header;
  });

  if (isEmpty) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return;
  }

  const mismatches = [];
  for (var i = 0; i < expectedHeaders.length; i += 1) {
    if (String(currentHeaders[i] || "") !== String(expectedHeaders[i])) {
      mismatches.push(expectedHeaders[i]);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      "Schema mismatch in " +
        sheet.getName() +
        ". Update header row to locked schema before continuing."
    );
  }
}

function findRowByEmail_(sheet, emailHeaderName, email) {
  const normalizedEmail = normalizeEmail_(email);
  if (!normalizedEmail) return 0;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headerState = getHeaderMap_(sheet, lastColumn);
  const emailColumn = headerState.map[String(emailHeaderName || "email").toLowerCase()];

  if (!emailColumn) {
    throw new Error("Missing email header in sheet: " + sheet.getName());
  }

  const values = sheet.getRange(2, emailColumn, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i += 1) {
    if (normalizeEmail_(values[i][0]) === normalizedEmail) {
      return i + 2;
    }
  }

  return 0;
}

function findRowByColumnValue_(sheet, headerName, value) {
  if (!value) return 0;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headerState = getHeaderMap_(sheet, lastColumn);
  const valueColumn = headerState.map[String(headerName || "").toLowerCase()];

  if (!valueColumn) {
    throw new Error("Missing header in sheet: " + sheet.getName() + " column: " + headerName);
  }

  const values = sheet.getRange(2, valueColumn, lastRow - 1, 1).getValues();
  const searchValue = String(value || "").trim();

  for (var i = 0; i < values.length; i += 1) {
    if (String(values[i][0] || "").trim() === searchValue) {
      return i + 2;
    }
  }

  return 0;
}



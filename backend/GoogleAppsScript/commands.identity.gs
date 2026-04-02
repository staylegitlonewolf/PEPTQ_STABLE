const PORTAL_REQUEST_HEADERS_ = [
  "account_delete",
  "auth_provider",
  "email",
  "full_name",
  "internal_notes",
  "member_pin",
  "phone",
  "profile_photo_url",
  "requested_role",
  "request_type",
  "status",
  "timestamp"
];

const MEMBERS_HEADERS_ = [
  "account_delete",
  "auth_provider",
  "business_name",
  "email",
  "full_name",
  "internal_notes",
  "member_pin",
  "phone",
  "preferred_payment_method",
  "profile_photo_url",
  "research_focus",
  "role",
  "shipping_address",
  "shipping_city",
  "shipping_country",
  "shipping_state",
  "shipping_zip",
  "slug",
  "status",
  "tax_id",
  "timestamp"
];

const SUPPORT_HEADERS_ = [
  "timestamp",
  "email",
  "full_name",
  "issue_type",
  "message",
  "status",
  "source_page"
];

const OWNER_BOOTSTRAP_ANCHOR_EMAIL_ = "info@peptq.com";
const OWNER_CONFIG_HEADERS_IDENTITY_ = [
  "section_id",
  "is_visible",
  "header_text",
  "sub_text",
  "cta_label"
];

function buildRowFromHeaders_(headers, values) {
  return headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(values, header) ? values[header] : "";
  });
}

function readRowValueByHeader_(row, headers, headerName, defaultValue) {
  const idx = headers.indexOf(String(headerName || "").trim());
  return idx >= 0 ? row[idx] : defaultValue;
}

function buildWaitlistInternalNotes_(source, notes) {
  const parts = [];
  const safeSource = toTextOrEmpty_(source);
  const safeNotes = toTextOrEmpty_(notes);
  if (safeSource) parts.push("WAITLIST_SOURCE:" + safeSource);
  if (safeNotes) parts.push("WAITLIST_NOTES:" + safeNotes);
  return parts.join(" | ");
}

function sanitizeTaggedNoteValue_(value) {
  return toTextOrEmpty_(value).replace(/\s*\|\s*/g, " / ");
}

function buildPortalRequestInternalNotes_(payload, existingNotes) {
  const parts = [];
  const safeExistingNotes = toTextOrEmpty_(existingNotes);
  const sourcePage = sanitizeTaggedNoteValue_(payload.source_page || payload.sourcePage || payload.page || "");
  const institution = sanitizeTaggedNoteValue_(
    payload.institution
    || payload.company_name
    || payload.companyName
    || payload.business_name
    || payload.businessName
    || ""
  );
  const researchArea = sanitizeTaggedNoteValue_(payload.research_area || payload.researchArea || payload.intent || "");
  const scopeDescription = sanitizeTaggedNoteValue_(payload.scope_description || payload.scopeDescription || payload.message || "");
  const preferredContact = sanitizeTaggedNoteValue_(payload.preferred_contact || payload.preferredContact || "");
  const productInterest = sanitizeTaggedNoteValue_(payload.product_interest || payload.productInterest || "");
  const manifestCalculations = sanitizeTaggedNoteValue_(payload.manifest_calculations || payload.manifestCalculations || "");
  const productImages = Array.isArray(payload.product_images || payload.productImages)
    ? (payload.product_images || payload.productImages).map(sanitizeTaggedNoteValue_).filter(Boolean).join(", ")
    : sanitizeTaggedNoteValue_(payload.product_images || payload.productImages || "");

  if (safeExistingNotes) parts.push(safeExistingNotes);
  if (sourcePage) parts.push("SOURCE_PAGE:" + sourcePage);
  if (institution) parts.push("INSTITUTION:" + institution);
  if (researchArea) parts.push("RESEARCH_AREA:" + researchArea);
  if (scopeDescription) parts.push("SCOPE_DESCRIPTION:" + scopeDescription);
  if (preferredContact) parts.push("PREFERRED_CONTACT:" + preferredContact);
  if (productInterest) parts.push("PRODUCT_INTEREST:" + productInterest);
  if (manifestCalculations) parts.push("MANIFEST_CALCULATIONS:" + manifestCalculations);
  if (productImages) parts.push("PRODUCT_IMAGES:" + productImages);

  if (!parts.length) return "INTAKE:PORTAL_REQUEST";
  return parts.join(" | ");
}

function parseTaggedNoteValue_(text, tag) {
  const pattern = new RegExp(String(tag || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":([^|]+)", "i");
  const match = String(text || "").match(pattern);
  return match ? toTextOrEmpty_(match[1]) : "";
}

function escapeNotificationHtml_(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getInternalNotificationEmailMeta_(emailRaw) {
  const actual = normalizeEmail_(emailRaw);
  if (!actual) {
    return { actual: "", display: "", hint: "" };
  }

  const parts = actual.split("@");
  if (parts.length !== 2) {
    return { actual: actual, display: actual, hint: "" };
  }

  const local = parts[0];
  const domain = parts[1];
  const plusIndex = local.indexOf("+");
  const isGmailDomain = domain === "gmail.com" || domain === "googlemail.com";

  if (!isGmailDomain || plusIndex === -1 || plusIndex >= local.length - 1) {
    return { actual: actual, display: actual, hint: "" };
  }

  const aliasLocal = local.slice(plusIndex + 1);
  return {
    actual: actual,
    display: aliasLocal + "@" + domain,
    hint: "Routes to " + actual
  };
}

function buildInternalNotificationEmailHtml_(emailRaw) {
  const emailMeta = getInternalNotificationEmailMeta_(emailRaw);
  if (!emailMeta.actual) return "";

  let html =
    '<a href="mailto:' + escapeNotificationHtml_(emailMeta.actual) + '" style="color:#1d4ed8;text-decoration:underline;">'
    + escapeNotificationHtml_(emailMeta.display || emailMeta.actual)
    + "</a>";

  if (emailMeta.hint) {
    html += '<div style="font-size:11px;color:#64748b;margin-top:4px;">'
      + escapeNotificationHtml_(emailMeta.hint)
      + "</div>";
  }

  return html;
}

function buildInternalNotificationEmailText_(emailRaw) {
  const emailMeta = getInternalNotificationEmailMeta_(emailRaw);
  if (!emailMeta.actual) return "";
  return emailMeta.hint
    ? emailMeta.display + " (" + emailMeta.hint + ")"
    : emailMeta.actual;
}

function buildInternalNotificationRowHtml_(label, value, options) {
  const opts = options || {};
  const rawValue = value === undefined || value === null ? "" : value;
  const valueHtml = opts.rawHtml
    ? String(rawValue || "")
    : escapeNotificationHtml_(toTextOrEmpty_(rawValue));
  const valueStyles = ["padding:6px 0;"];

  if (opts.preWrap) valueStyles.push("white-space:pre-wrap;");
  if (opts.emphasis) valueStyles.push("font-weight:800;color:#f97316;");

  return '<tr>'
    + '<td style="padding:6px 0;font-weight:700;color:#334155;vertical-align:top;width:34%;">'
    + escapeNotificationHtml_(label)
    + "</td>"
    + '<td style="' + valueStyles.join("") + '">'
    + valueHtml
    + "</td>"
    + "</tr>";
}

function buildInternalNotificationText_(intro, rows, alertText) {
  const lines = [String(intro || "").trim(), ""];

  (rows || []).forEach(function (row) {
    if (!row) return;
    const label = String(row.label || "Field").trim();
    const valueText = Object.prototype.hasOwnProperty.call(row, "valueText")
      ? String(row.valueText || "").trim()
      : toTextOrEmpty_(row.value);
    if (!label || !valueText) return;
    lines.push(label + ": " + valueText);
  });

  if (alertText) {
    lines.push("", String(alertText || "").trim());
  }

  return lines.join("\n");
}

function buildInternalNotificationCardHtml_(config) {
  const options = config || {};
  const rowsHtml = (options.rows || [])
    .map(function (row) {
      if (!row) return "";
      const rawValue = Object.prototype.hasOwnProperty.call(row, "value") ? row.value : "";
      const hasValue = row.rawHtml
        ? String(rawValue || "").trim()
        : toTextOrEmpty_(rawValue);
      if (!hasValue) return "";
      return buildInternalNotificationRowHtml_(row.label || "Field", rawValue, row);
    })
    .join("");

  return '<div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a;line-height:1.6;background:#f8fafc;padding:12px;">'
    + '<div style="text-align:center;padding:8px 0 12px 0;">'
    + '<div style="font-size:12px;letter-spacing:2px;font-weight:700;color:#f97316;text-transform:uppercase;">'
    + escapeNotificationHtml_(options.eyebrow || "PEPTQ INTERNAL")
    + "</div>"
    + '<div style="font-size:20px;font-weight:800;margin-top:6px;color:#0f172a;">'
    + escapeNotificationHtml_(options.title || "Notification")
    + "</div>"
    + "</div>"
    + '<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;color:#0f172a;box-shadow:0 10px 24px rgba(15,23,42,0.08);">'
    + '<table style="width:100%;font-size:14px;border-collapse:collapse;">'
    + rowsHtml
    + "</table>"
    + (options.alertText
      ? '<div style="margin-top:14px;padding:12px;border-radius:10px;background:#f97316;color:#0f172a;font-weight:800;font-size:13px;text-align:center;">'
        + escapeNotificationHtml_(options.alertText)
        + "</div>"
      : "")
    + "</div>"
    + '<div style="text-align:center;font-size:11px;color:#64748b;margin-top:12px;">'
    + escapeNotificationHtml_(options.footerText || "PEPTQ Command Hub | Internal Notification")
    + "</div>"
    + "</div>";
}

function upsertOwnerConfigIdentityRow_(sheet, sectionId, value, actorEmail, detail) {
  const row = findRowByColumnValue_(sheet, "section_id", sectionId) || Math.max(sheet.getLastRow(), 1) + 1;
  sheet.getRange(row, 1, 1, OWNER_CONFIG_HEADERS_IDENTITY_.length).setValues([[
    sectionId,
    true,
    value,
    detail || ("Updated at " + new Date().toISOString() + " by " + actorEmail),
    "SYSTEM"
  ]]);
}

function getMemberIdentitySnapshotByRow_(sheet, rowIndex) {
  if (!sheet || !rowIndex || rowIndex < 2) return null;
  const lastColumn = Math.max(sheet.getLastColumn(), MEMBERS_HEADERS_.length);
  const row = sheet.getRange(rowIndex, 1, 1, lastColumn).getValues()[0];
  const headerState = getHeaderMap_(sheet, lastColumn);
  const headers = headerState.headers;
  const headerIndex = function (name) {
    return headers.indexOf(String(name || "").trim());
  };
  const read = function (name, fallbackIndex) {
    var idx = headerIndex(name);
    if (idx === -1 && typeof fallbackIndex === "number") idx = fallbackIndex;
    return idx >= 0 ? row[idx] : "";
  };
  const accountDelete = toBoolean_(read("account_delete", 0));
  const rawStatus = String(read("status", 18) || "UNKNOWN").trim().toUpperCase();
  const status = accountDelete ? "DELETE_REQUESTED" : rawStatus;

  return {
    email: normalizeEmail_(read("email", 3)),
    fullName: String(read("full_name", 4) || "").trim(),
    role: String(read("role", 11) || "MEMBER").trim().toUpperCase(),
    status: status,
    rawStatus: rawStatus,
    member_pin: String(read("member_pin", 6) || "").trim(),
    profilePhotoUrl: String(read("profile_photo_url", 9) || "").trim(),
    accountDelete: accountDelete,
    internalNotes: String(read("internal_notes", 5) || "").trim(),
    timestamp: read("timestamp", 20) ? new Date(read("timestamp", 20)).toISOString() : "",
    slug: String(read("slug", 17) || "").trim()
  };
}

function getPortalIdentitySnapshotByRow_(sheet, rowIndex) {
  if (!sheet || !rowIndex || rowIndex < 2) return null;
  const lastColumn = Math.max(sheet.getLastColumn(), PORTAL_REQUEST_HEADERS_.length);
  const row = sheet.getRange(rowIndex, 1, 1, lastColumn).getValues()[0];
  const headerState = getHeaderMap_(sheet, lastColumn);
  const headers = headerState.headers;
  const headerIndex = function (name) {
    return headers.indexOf(String(name || "").trim());
  };
  const read = function (name, fallbackIndex) {
    var idx = headerIndex(name);
    if (idx === -1 && typeof fallbackIndex === "number") idx = fallbackIndex;
    return idx >= 0 ? row[idx] : "";
  };
  const accountDelete = toBoolean_(read("account_delete", 0));
  const rawStatus = String(read("status", 10) || "PENDING").trim().toUpperCase();
  const status = accountDelete ? "DELETE_REQUESTED" : rawStatus;

  return {
    email: normalizeEmail_(read("email", 2)),
    fullName: String(read("full_name", 3) || "").trim(),
    role: String(read("requested_role", 8) || "GUEST").trim().toUpperCase(),
    requestType: String(read("request_type", 9) || "MEMBER_APP").trim().toUpperCase(),
    status: status,
    rawStatus: rawStatus,
    member_pin: String(read("member_pin", 5) || "").trim(),
    profilePhotoUrl: String(read("profile_photo_url", 7) || "").trim(),
    accountDelete: accountDelete,
    internalNotes: String(read("internal_notes", 4) || "").trim(),
    phone: String(read("phone", 6) || "").trim(),
    timestamp: read("timestamp", 11) ? new Date(read("timestamp", 11)).toISOString() : "",
    slug: ""
  };
}

function parseDeleteRequestTimestampFromNotes_(notes) {
  const text = String(notes || "");
  const match = text.match(/DELETE_REQUEST_AT:([0-9TZ:.\-]+)/i);
  return match ? String(match[1] || "").trim() : "";
}

function handleSubmitRequest_(payload) {
  const email = normalizeEmail_(payload.email);
  const fullName = toTextOrEmpty_(payload.full_name || payload.fullName);
  const authProvider = toTextOrEmpty_(payload.auth_provider || payload.authProvider || "Google");
  const memberPin = toTextOrEmpty_(payload.member_pin || payload.memberPin || "");
  const phone = toTextOrEmpty_(
    payload.phone || payload.phone_number || payload.phoneNumber || payload.mobile || ""
  );
  const profilePhotoUrl = toTextOrEmpty_(payload.profile_photo_url || payload.profilePhotoUrl || "");
  const accountDelete = toBoolean_(payload.account_delete || false);
  const requestedRole = canonicalizeAccessRole_(payload.requested_role || payload.requestedRole || "MEMBER");
  const institution = toTextOrEmpty_(
    payload.institution
    || payload.company_name
    || payload.companyName
    || payload.business_name
    || payload.businessName
    || ""
  );
  const researchArea = toTextOrEmpty_(payload.research_area || payload.researchArea || payload.intent || "");
  const scopeDescription = toTextOrEmpty_(payload.scope_description || payload.scopeDescription || payload.message || "");
  const preferredContact = toTextOrEmpty_(payload.preferred_contact || payload.preferredContact || "");
  const productInterest = toTextOrEmpty_(payload.product_interest || payload.productInterest || "");
  const manifestCalculations = toTextOrEmpty_(payload.manifest_calculations || payload.manifestCalculations || "");
  const productImages = Array.isArray(payload.product_images || payload.productImages)
    ? (payload.product_images || payload.productImages).map(toTextOrEmpty_).filter(Boolean).join(", ")
    : toTextOrEmpty_(payload.product_images || payload.productImages || "");

  if (!email) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_EMAIL",
      command: "SUBMIT_REQUEST",
      message: "email is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const portalSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.PORTAL_REQUEST);
    ensureHeaders_(portalSheet, PORTAL_REQUEST_HEADERS_);
    const now = new Date();

    const existingRow = findRowByEmail_(portalSheet, "email", email);
    if (existingRow) {
      const existingSnapshot = getPortalIdentitySnapshotByRow_(portalSheet, existingRow);
      if (existingSnapshot && existingSnapshot.requestType === "WAITLIST") {
        const requestInternalNotes = buildPortalRequestInternalNotes_(payload, existingSnapshot.internalNotes || "");
        const resolvedPin = memberPin || existingSnapshot.member_pin || generateMemberPin_();
        const upgradedRow = buildRowFromHeaders_(PORTAL_REQUEST_HEADERS_, {
          account_delete: accountDelete ? "TRUE" : "FALSE",
          auth_provider: authProvider,
          email: email,
          full_name: fullName,
          internal_notes: requestInternalNotes,
          member_pin: resolvedPin,
          phone: phone || existingSnapshot.phone || "",
          profile_photo_url: profilePhotoUrl,
          requested_role: requestedRole,
          request_type: "MEMBER_APP",
          status: "PENDING",
          timestamp: now
        });
        portalSheet.getRange(existingRow, 1, 1, PORTAL_REQUEST_HEADERS_.length).setValues([upgradedRow]);

        return jsonResponse_({
          status: "success",
          code: "SUCCESS_REQUEST_UPGRADED_FROM_WAITLIST",
          command: "SUBMIT_REQUEST",
          email: email,
          full_name: fullName,
          member_pin: resolvedPin,
          status: "PENDING",
          message: "Waitlist intake upgraded to full portal request"
        });
      }

      return jsonResponse_({
        status: "error",
        code: "ERR_REQUEST_EXISTS",
        command: "SUBMIT_REQUEST",
        message: "Request already submitted for this email"
      });
    }

    const requestInternalNotes = buildPortalRequestInternalNotes_(payload, "");
    const resolvedPin = memberPin || generateMemberPin_();
    const row = buildRowFromHeaders_(PORTAL_REQUEST_HEADERS_, {
      account_delete: accountDelete ? "TRUE" : "FALSE",
      auth_provider: authProvider,
      email: email,
      full_name: fullName,
      internal_notes: requestInternalNotes,
      member_pin: resolvedPin,
      phone: phone,
      profile_photo_url: profilePhotoUrl,
      requested_role: requestedRole,
      request_type: "MEMBER_APP",
      status: "PENDING",
      timestamp: now
    });

    const nextRow = Math.max(portalSheet.getLastRow(), 1) + 1;
    portalSheet.getRange(nextRow, 1, 1, PORTAL_REQUEST_HEADERS_.length).setValues([row]);

    try {
      const recipient = String(getNotificationRecipient_() || "").trim();
      if (recipient) {
        const emailMeta = getInternalNotificationEmailMeta_(email);
        const rows = [
          { label: "Name", value: fullName },
          {
            label: "Email",
            value: buildInternalNotificationEmailHtml_(email),
            valueText: buildInternalNotificationEmailText_(email),
            rawHtml: true
          },
          { label: "Phone", value: phone },
          { label: "Institution", value: institution },
          { label: "Research Area", value: researchArea },
          { label: "Preferred Contact", value: preferredContact },
          { label: "Requested Role", value: requestedRole },
          { label: "Auth Provider", value: authProvider },
          { label: "Status", value: "PENDING" },
          { label: "Delete Request", value: accountDelete ? "YES" : "NO" },
          { label: "Member PIN", value: resolvedPin },
          { label: "Scope", value: scopeDescription, preWrap: true },
          { label: "Product Interest", value: productInterest, preWrap: true },
          { label: "Manifest Calculations", value: manifestCalculations, preWrap: true },
          { label: "Product Images", value: productImages, preWrap: true }
        ];
        const alertText = "Review in the PortalRequest intake queue before approving access.";
        sendPlatformEmail_({
          to: recipient,
          subject: "PEPTQ New Portal Request: " + (emailMeta.display || email || "Unknown"),
          category: "COMING_SOON",
          body: buildInternalNotificationText_(
            "New portal access request received.",
            rows,
            alertText
          ),
          htmlBody: buildInternalNotificationCardHtml_({
            eyebrow: "PEPTQ | PORTAL ACCESS",
            title: "Portal Request Submitted",
            rows: rows,
            alertText: alertText
          })
        });
      }
    } catch (error) {
      console.warn("ALERT_EMAIL_FAILED", String(error));
    }

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_REQUEST_CREATED",
      command: "SUBMIT_REQUEST",
      email: email,
      full_name: fullName,
      member_pin: resolvedPin,
      status: "PENDING",
      message: "Request submitted for review"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleSubmitWaitlist_(payload) {
  const fullName = toTextOrEmpty_(payload.full_name || payload.fullName || "");
  const email = normalizeEmail_(payload.email || payload.google_email || payload.googleEmail || "");
  const phone = String(payload.phone || payload.google_phone || payload.googlePhone || "").replace(/\D/g, "");
  const source = toTextOrEmpty_(payload.source || "Website") || "Website";
  const notes = toTextOrEmpty_(payload.notes || "");
  const submittedPin = toTextOrEmpty_(payload.member_pin || payload.memberPin || "");

  if (!fullName) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_WAITLIST_NAME",
      command: "SUBMIT_WAITLIST",
      message: "full_name is required"
    });
  }

  if (!email && !phone) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_WAITLIST_IDENTITY",
      command: "SUBMIT_WAITLIST",
      message: "email or phone is required"
    });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse_({
      status: "error",
      code: "ERR_INVALID_WAITLIST_EMAIL",
      command: "SUBMIT_WAITLIST",
      message: "email format is invalid"
    });
  }

  if (phone && phone.length < 8) {
    return jsonResponse_({
      status: "error",
      code: "ERR_INVALID_WAITLIST_PHONE",
      command: "SUBMIT_WAITLIST",
      message: "phone must contain at least 8 digits"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const portalSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.WAITLIST);
    ensureHeaders_(portalSheet, PORTAL_REQUEST_HEADERS_);
    const lastRow = portalSheet.getLastRow();
    const now = new Date();
    const nextNotes = buildWaitlistInternalNotes_(source, notes);

    if (lastRow >= 2) {
      const rows = portalSheet.getRange(2, 1, lastRow - 1, PORTAL_REQUEST_HEADERS_.length).getValues();

      for (var i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const rowEmail = normalizeEmail_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "email", ""));
        const rowPhone = String(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "phone", "") || "").replace(/\D/g, "");
        const rowRequestType = String(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "request_type", "MEMBER_APP") || "MEMBER_APP").trim().toUpperCase();
        const isEmailMatch = Boolean(email) && rowEmail === email;
        const isPhoneMatch = Boolean(phone) && rowPhone === phone;

        if (!isEmailMatch && !isPhoneMatch) continue;

        const sheetRow = i + 2;
        if (rowRequestType !== "WAITLIST") {
          return jsonResponse_({
            status: "error",
            code: "ERR_REQUEST_EXISTS",
            command: "SUBMIT_WAITLIST",
            message: "A full portal request already exists for this identity"
          });
        }

        const currentPin = toTextOrEmpty_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "member_pin", ""));
        const memberPin = currentPin || submittedPin || generateMemberPin_();
        const refreshedRow = buildRowFromHeaders_(PORTAL_REQUEST_HEADERS_, {
          account_delete: "FALSE",
          auth_provider: "WAITLIST",
          email: email || rowEmail,
          full_name: fullName,
          internal_notes: nextNotes,
          member_pin: memberPin,
          phone: phone || rowPhone,
          profile_photo_url: "",
          requested_role: "MEMBER",
          request_type: "WAITLIST",
          status: "PENDING",
          timestamp: now
        });

        portalSheet.getRange(sheetRow, 1, 1, PORTAL_REQUEST_HEADERS_.length).setValues([refreshedRow]);

        notifyWaitlistSubmission_(getNotificationRecipient_(), {
          fullName: fullName,
          email: email || rowEmail,
          phone: phone || rowPhone,
          source: source,
          notes: notes,
          status: "PENDING",
          memberPin: memberPin,
          duplicate: true
        });

        return jsonResponse_({
          status: "success",
          code: "SUCCESS_WAITLIST_REFRESHED",
          command: "SUBMIT_WAITLIST",
          duplicate: true,
          full_name: fullName,
          email: email,
          phone: phone,
          member_pin: memberPin,
          waitlist_status: "PENDING",
          message: "Waitlist entry refreshed"
        });
      }
    }

    const memberPin = submittedPin || generateMemberPin_();
    const rowData = buildRowFromHeaders_(PORTAL_REQUEST_HEADERS_, {
      account_delete: "FALSE",
      auth_provider: "WAITLIST",
      email: email,
      full_name: fullName,
      internal_notes: nextNotes,
      member_pin: memberPin,
      phone: phone,
      profile_photo_url: "",
      requested_role: "MEMBER",
      request_type: "WAITLIST",
      status: "PENDING",
      timestamp: now
    });

    portalSheet.getRange(Math.max(portalSheet.getLastRow(), 1) + 1, 1, 1, PORTAL_REQUEST_HEADERS_.length).setValues([rowData]);

    notifyWaitlistSubmission_(getNotificationRecipient_(), {
      fullName: fullName,
      email: email,
      phone: phone,
      source: source,
      notes: notes,
      status: "PENDING",
      memberPin: memberPin,
      duplicate: false
    });

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_WAITLIST_CREATED",
      command: "SUBMIT_WAITLIST",
      duplicate: false,
      full_name: fullName,
      email: email,
      phone: phone,
      member_pin: memberPin,
      waitlist_status: "PENDING",
      message: "Waitlist entry saved"
    });
  } finally {
    lock.releaseLock();
  }
}

function generateMemberPin_() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
}

function notifyWaitlistSubmission_(recipientRaw, waitlistData) {
  try {
    const recipient = String(recipientRaw || getNotificationRecipient_() || "").trim();
    if (!recipient) return;
    const emailMeta = getInternalNotificationEmailMeta_(waitlistData.email);
    const rows = [
      { label: "Name", value: waitlistData.fullName },
      {
        label: "Email",
        value: buildInternalNotificationEmailHtml_(waitlistData.email),
        valueText: buildInternalNotificationEmailText_(waitlistData.email),
        rawHtml: true
      },
      { label: "Phone", value: waitlistData.phone },
      { label: "Status", value: waitlistData.status },
      { label: "Portal PIN", value: waitlistData.memberPin, emphasis: true },
      { label: "Source", value: waitlistData.source },
      { label: "Duplicate Refresh", value: waitlistData.duplicate ? "YES" : "NO" },
      { label: "Notes", value: waitlistData.notes, preWrap: true }
    ];
    const alertText = "Review in the Waitlist intake queue before promoting access.";
    const htmlBody = buildInternalNotificationCardHtml_({
      eyebrow: "PEPTQ | EARLY ACCESS",
      title: "Waitlist Submission",
      rows: rows,
      alertText: alertText
    });

    sendPlatformEmail_({
      to: recipient,
      subject: "PEPTQ Early Access Waitlist: " + (emailMeta.display || waitlistData.phone || "Unknown"),
      category: "COMING_SOON",
      body: buildInternalNotificationText_(
        "New early-access waitlist submission received.",
        rows,
        alertText
      ),
      htmlBody: htmlBody
    });
  } catch (error) {
    console.warn("WAITLIST_EMAIL_FAILED", String(error));
  }
}

function handleGetWaitlistEntries_(payload) {
  const portalSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.WAITLIST);
  ensureHeaders_(portalSheet, PORTAL_REQUEST_HEADERS_);
  const lastRow = portalSheet.getLastRow();
  const statusFilter = toTextOrEmpty_(payload.status || "").toUpperCase();
  const limitRaw = Number(payload.limit || 100);
  const limit = isNaN(limitRaw) ? 100 : Math.max(1, Math.min(500, limitRaw));

  if (lastRow < 2) {
    return jsonResponse_({
      status: "success",
      code: "SUCCESS_WAITLIST_ENTRIES",
      command: "GET_WAITLIST_ENTRIES",
      entries: [],
      count: 0,
      message: "No waitlist entries"
    });
  }

  const rows = portalSheet.getRange(2, 1, lastRow - 1, PORTAL_REQUEST_HEADERS_.length).getValues();
  const entries = [];

  for (var i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    const requestType = toTextOrEmpty_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "request_type", "MEMBER_APP")).toUpperCase();
    if (requestType !== "WAITLIST") continue;

    const status = toTextOrEmpty_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "status", "PENDING")).toUpperCase() || "PENDING";
    if (statusFilter && status !== statusFilter) continue;

    const internalNotes = toTextOrEmpty_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "internal_notes", ""));

    entries.push({
      row_id: i + 2,
      requested_at: toTextOrEmpty_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "timestamp", "")),
      full_name: toTextOrEmpty_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "full_name", "")),
      email: normalizeEmail_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "email", "")),
      phone: toTextOrEmpty_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "phone", "")),
      source: parseTaggedNoteValue_(internalNotes, "WAITLIST_SOURCE"),
      status: status,
      member_pin: toTextOrEmpty_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "member_pin", "")),
      notes: parseTaggedNoteValue_(internalNotes, "WAITLIST_NOTES")
    });

    if (entries.length >= limit) break;
  }

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_WAITLIST_ENTRIES",
    command: "GET_WAITLIST_ENTRIES",
    entries: entries,
    count: entries.length,
    message: "Waitlist entries loaded"
  });
}

function handlePromoteWaitlistEntry_(payload) {
  const actorEmail = normalizeEmail_(payload.actor_email || payload.actorEmail || "");
  const targetEmail = normalizeEmail_(payload.email || "");
  const targetPhone = String(payload.phone || "").replace(/\D/g, "");
  const targetRowId = Number(payload.row_id || payload.rowId || 0);
  const role = canonicalizeAccessRole_(payload.role || "MEMBER");

  if (!actorEmail) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_ACTOR_EMAIL",
      command: "PROMOTE_WAITLIST_ENTRY",
      message: "actor_email is required"
    });
  }

  if (!targetEmail && !targetPhone && !targetRowId) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_WAITLIST_TARGET",
      command: "PROMOTE_WAITLIST_ENTRY",
      message: "row_id, email, or phone is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const portalSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.WAITLIST);
    const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
    ensureHeaders_(portalSheet, PORTAL_REQUEST_HEADERS_);
    ensureHeaders_(membersSheet, MEMBERS_HEADERS_);

    const lastRow = portalSheet.getLastRow();
    if (lastRow < 2) {
      return jsonResponse_({
        status: "error",
        code: "ERR_WAITLIST_EMPTY",
        command: "PROMOTE_WAITLIST_ENTRY",
        message: "Waitlist is empty"
      });
    }

    var promotedRow = 0;
    var promotedData = null;
    var promotedStatus = "";
    const rows = portalSheet.getRange(2, 1, lastRow - 1, PORTAL_REQUEST_HEADERS_.length).getValues();
    for (var i = 0; i < rows.length; i += 1) {
      const sheetRow = i + 2;
      const row = rows[i];
      const rowRequestType = toTextOrEmpty_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "request_type", "MEMBER_APP")).toUpperCase();
      if (rowRequestType !== "WAITLIST") continue;

      const rowEmail = normalizeEmail_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "email", ""));
      const rowPhone = String(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "phone", "") || "").replace(/\D/g, "");
      const rowStatus = toTextOrEmpty_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "status", "PENDING")).toUpperCase() || "PENDING";
      const internalNotes = toTextOrEmpty_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "internal_notes", ""));

      const rowMatch = targetRowId > 1 && sheetRow === targetRowId;
      const emailMatch = targetEmail && rowEmail === targetEmail;
      const phoneMatch = targetPhone && rowPhone === targetPhone;
      if (!rowMatch && !emailMatch && !phoneMatch) continue;

      promotedRow = sheetRow;
      promotedData = {
        full_name: toTextOrEmpty_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "full_name", "")),
        email: rowEmail,
        phone: rowPhone,
        source: parseTaggedNoteValue_(internalNotes, "WAITLIST_SOURCE"),
        member_pin: toTextOrEmpty_(readRowValueByHeader_(row, PORTAL_REQUEST_HEADERS_, "member_pin", "")),
        notes: parseTaggedNoteValue_(internalNotes, "WAITLIST_NOTES")
      };
      promotedStatus = rowStatus;
      break;
    }

    if (!promotedRow || !promotedData) {
      return jsonResponse_({
        status: "error",
        code: "ERR_WAITLIST_ENTRY_NOT_FOUND",
        command: "PROMOTE_WAITLIST_ENTRY",
        message: "Waitlist entry not found"
      });
    }

    if (!promotedData.email) {
      return jsonResponse_({
        status: "error",
        code: "ERR_WAITLIST_EMAIL_REQUIRED",
        command: "PROMOTE_WAITLIST_ENTRY",
        message: "Waitlist entry must include an email before promotion"
      });
    }

    if (promotedStatus === "ACTIVE" || promotedStatus === "MEMBER") {
      return jsonResponse_({
        status: "error",
        code: "ERR_WAITLIST_ALREADY_PROMOTED",
        command: "PROMOTE_WAITLIST_ENTRY",
        email: promotedData.email,
        row_id: promotedRow,
        message: "Waitlist entry is already promoted"
      });
    }

    const memberRow = findRowByEmail_(membersSheet, "email", promotedData.email);
    const now = new Date();
    const generatedPin = generateMemberPin_();
    const memberPin = generatedPin;
    const profileNotes = [
      "Promoted from waitlist by " + actorEmail,
      promotedData.source ? "Source: " + promotedData.source : "",
      promotedData.notes ? "Notes: " + promotedData.notes : "",
      "PIN: " + memberPin
    ].filter(Boolean).join(" | ");

    const memberRecord = buildRowFromHeaders_(MEMBERS_HEADERS_, {
      account_delete: "FALSE",
      auth_provider: "Waitlist",
      business_name: "",
      email: promotedData.email,
      full_name: promotedData.full_name,
      internal_notes: profileNotes,
      member_pin: memberPin,
      phone: promotedData.phone,
      preferred_payment_method: "",
      profile_photo_url: "",
      research_focus: "",
      role: role,
      shipping_address: "",
      shipping_city: "",
      shipping_country: "",
      shipping_state: "",
      shipping_zip: "",
      slug: "",
      status: "ACTIVE",
      tax_id: "",
      timestamp: now
    });

    if (memberRow) {
      membersSheet.getRange(memberRow, 1, 1, MEMBERS_HEADERS_.length).setValues([memberRecord]);
    } else {
      const nextMemberRow = Math.max(membersSheet.getLastRow(), 1) + 1;
      membersSheet.getRange(nextMemberRow, 1, 1, MEMBERS_HEADERS_.length).setValues([memberRecord]);
    }

    const promotedPortalRow = buildRowFromHeaders_(PORTAL_REQUEST_HEADERS_, {
      account_delete: "FALSE",
      auth_provider: "WAITLIST",
      email: promotedData.email,
      full_name: promotedData.full_name,
      internal_notes: [
        buildWaitlistInternalNotes_(promotedData.source, promotedData.notes),
        "PROMOTED_BY:" + actorEmail,
        "PROMOTED_AT:" + now.toISOString(),
        "PROMOTED_PIN:" + memberPin
      ].filter(Boolean).join(" | "),
      member_pin: memberPin,
      phone: promotedData.phone,
      profile_photo_url: "",
      requested_role: role,
      request_type: "WAITLIST",
      status: "APPROVED",
      timestamp: now
    });
    portalSheet.getRange(promotedRow, 1, 1, PORTAL_REQUEST_HEADERS_.length).setValues([promotedPortalRow]);

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_WAITLIST_PROMOTED",
      command: "PROMOTE_WAITLIST_ENTRY",
      row_id: promotedRow,
      email: promotedData.email,
      role: role,
      member_status: "ACTIVE",
      member_pin: memberPin,
      message: "Waitlist entry promoted to member"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleApproveMember_(payload) {
  const email = normalizeEmail_(payload.email);
  const role = canonicalizeAccessRole_(payload.role || "MEMBER");
  const actorEmail = normalizeEmail_(payload.actor_email);

  if (!email) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_EMAIL",
      command: "APPROVE_MEMBER",
      message: "email is required"
    });
  }

  if (!actorEmail) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_ACTOR_EMAIL",
      command: "APPROVE_MEMBER",
      message: "actor_email is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const portalSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.PORTAL_REQUEST);
    const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
    ensureHeaders_(portalSheet, PORTAL_REQUEST_HEADERS_);
    ensureHeaders_(membersSheet, MEMBERS_HEADERS_);

    const reqRow = findRowByEmail_(portalSheet, "email", email);
    const portalStatusColumn = getColumnIndex_(portalSheet, "status");
    if (reqRow && portalStatusColumn) {
      portalSheet.getRange(reqRow, portalStatusColumn).setValue("APPROVED");
    }

    const memberRow = findRowByEmail_(membersSheet, "email", email);
    const memberRowData = reqRow ? portalSheet.getRange(reqRow, 1, 1, PORTAL_REQUEST_HEADERS_.length).getValues()[0] : [];
    const approvalTimestamp = new Date();
    const existingMemberNotes = reqRow ? toTextOrEmpty_(readRowValueByHeader_(memberRowData, PORTAL_REQUEST_HEADERS_, "internal_notes", "")) : "";
    const businessName = parseTaggedNoteValue_(existingMemberNotes, "INSTITUTION");
    const approvalNote = ["Approved by " + actorEmail, existingMemberNotes].filter(Boolean).join(" | ");

    const memberRecord = buildRowFromHeaders_(MEMBERS_HEADERS_, {
      account_delete: "FALSE",
      auth_provider: toTextOrEmpty_(readRowValueByHeader_(memberRowData, PORTAL_REQUEST_HEADERS_, "auth_provider", "Google")),
      business_name: businessName,
      email: email,
      full_name: toTextOrEmpty_(readRowValueByHeader_(memberRowData, PORTAL_REQUEST_HEADERS_, "full_name", "")),
      internal_notes: approvalNote,
      member_pin: toTextOrEmpty_(readRowValueByHeader_(memberRowData, PORTAL_REQUEST_HEADERS_, "member_pin", "")),
      phone: toTextOrEmpty_(readRowValueByHeader_(memberRowData, PORTAL_REQUEST_HEADERS_, "phone", "")),
      preferred_payment_method: "",
      profile_photo_url: toTextOrEmpty_(readRowValueByHeader_(memberRowData, PORTAL_REQUEST_HEADERS_, "profile_photo_url", "")),
      research_focus: "",
      role: role,
      shipping_address: "",
      shipping_city: "",
      shipping_country: "",
      shipping_state: "",
      shipping_zip: "",
      slug: "",
      status: "APPROVED",
      tax_id: "",
      timestamp: approvalTimestamp
    });

    if (memberRow) {
      membersSheet.getRange(memberRow, 1, 1, MEMBERS_HEADERS_.length).setValues([memberRecord]);
    } else {
      const nextRow = Math.max(membersSheet.getLastRow(), 1) + 1;
      membersSheet.getRange(nextRow, 1, 1, MEMBERS_HEADERS_.length).setValues([memberRecord]);
    }

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_MEMBER_APPROVED",
      command: "APPROVE_MEMBER",
      email: email,
      role: role,
      message: "Member approved"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateRole_(payload) {
  const email = normalizeEmail_(payload.email);
  const newRole = canonicalizeAccessRole_(payload.new_role || payload.newRole || "MEMBER");
  const actorEmail = normalizeEmail_(payload.actor_email);

  if (!email) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_EMAIL",
      command: "UPDATE_ROLE",
      message: "email is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
    ensureHeaders_(membersSheet, MEMBERS_HEADERS_);

    const memberRow = findRowByEmail_(membersSheet, "email", email);
    if (!memberRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_MEMBER_NOT_FOUND",
        command: "UPDATE_ROLE",
        message: "Member not found"
      });
    }

    const roleColumn = getColumnIndex_(membersSheet, "role");
    const notesColumn = getColumnIndex_(membersSheet, "internal_notes");
    if (roleColumn) {
      membersSheet.getRange(memberRow, roleColumn).setValue(newRole);
    }

    const notesCell = notesColumn ? membersSheet.getRange(memberRow, notesColumn) : null;
    const currentNotes = notesCell ? String(notesCell.getValue() || "") : "";
    const newNotes = currentNotes ? currentNotes + " | Role updated to " + newRole + " by " + actorEmail : "Role updated to " + newRole + " by " + actorEmail;
    if (notesCell) {
      notesCell.setValue(newNotes);
    }

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_ROLE_UPDATED",
      command: "UPDATE_ROLE",
      email: email,
      new_role: newRole,
      message: "Role updated"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleSuspendMember_(payload) {
  const email = normalizeEmail_(payload.email);
  const actorEmail = normalizeEmail_(payload.actor_email);
  const reason = toTextOrEmpty_(payload.reason || "");

  if (!email) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_EMAIL",
      command: "SUSPEND_MEMBER",
      message: "email is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
    ensureHeaders_(membersSheet, MEMBERS_HEADERS_);

    const memberRow = findRowByEmail_(membersSheet, "email", email);
    if (!memberRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_MEMBER_NOT_FOUND",
        command: "SUSPEND_MEMBER",
        message: "Member not found"
      });
    }

    const statusColumn = getColumnIndex_(membersSheet, "status");
    const notesColumn = getColumnIndex_(membersSheet, "internal_notes");
    if (statusColumn) {
      membersSheet.getRange(memberRow, statusColumn).setValue("SUSPENDED");
    }
    const notesCell = notesColumn ? membersSheet.getRange(memberRow, notesColumn) : null;
    const currentNotes = notesCell ? String(notesCell.getValue() || "") : "";
    const suspensionNote = "Suspended: " + reason + " (by " + actorEmail + ")";
    const newNotes = currentNotes ? currentNotes + " | " + suspensionNote : suspensionNote;
    if (notesCell) {
      notesCell.setValue(newNotes);
    }

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_MEMBER_SUSPENDED",
      command: "SUSPEND_MEMBER",
      email: email,
      message: "Member suspended"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateMemberProfile_(payload) {
  const email = normalizeEmail_(payload.email);
  const fullName = toTextOrEmpty_(payload.full_name || payload.fullName || "");
  const profilePhotoUrl = toTextOrEmpty_(payload.profile_photo_url || payload.profilePhotoUrl || "");
  const businessName = toTextOrEmpty_(payload.business_name || payload.businessName || "");
  const researchFocus = toTextOrEmpty_(payload.research_focus || payload.researchFocus || "");
  const taxId = toTextOrEmpty_(payload.tax_id || payload.taxId || "");
  const shippingAddress = toTextOrEmpty_(payload.shipping_address || payload.shippingAddress || "");
  const shippingCity = toTextOrEmpty_(payload.shipping_city || payload.shippingCity || "");
  const shippingCountry = toTextOrEmpty_(payload.shipping_country || payload.shippingCountry || "");
  const shippingState = toTextOrEmpty_(payload.shipping_state || payload.shippingState || "");
  const shippingZip = toTextOrEmpty_(payload.shipping_zip || payload.shippingZip || "");
  const businessShippingAddress = toTextOrEmpty_(payload.business_shipping_address || payload.businessShippingAddress || "");
  const businessShippingCity = toTextOrEmpty_(payload.business_shipping_city || payload.businessShippingCity || "");
  const businessShippingCountry = toTextOrEmpty_(payload.business_shipping_country || payload.businessShippingCountry || "");
  const businessShippingState = toTextOrEmpty_(payload.business_shipping_state || payload.businessShippingState || "");
  const businessShippingZip = toTextOrEmpty_(payload.business_shipping_zip || payload.businessShippingZip || "");
  const phone = toTextOrEmpty_(payload.phone || "");
  const preferredPaymentMethod = toTextOrEmpty_(payload.preferred_payment_method || payload.preferredPaymentMethod || "");
  const hasBusinessAccountEnabled = Object.prototype.hasOwnProperty.call(payload, "business_account_enabled")
    || Object.prototype.hasOwnProperty.call(payload, "businessAccountEnabled");
  const businessAccountEnabled = hasBusinessAccountEnabled
    ? toBoolean_(payload.business_account_enabled || payload.businessAccountEnabled)
    : null;
  const hasUseBusinessShipping = Object.prototype.hasOwnProperty.call(payload, "use_business_shipping")
    || Object.prototype.hasOwnProperty.call(payload, "useBusinessShipping");
  const useBusinessShipping = hasUseBusinessShipping
    ? toBoolean_(payload.use_business_shipping || payload.useBusinessShipping)
    : null;
  const hasEmailNotifications = Object.prototype.hasOwnProperty.call(payload, "email_notifications")
    || Object.prototype.hasOwnProperty.call(payload, "emailNotifications");
  const emailNotifications = hasEmailNotifications
    ? toBoolean_(payload.email_notifications || payload.emailNotifications)
    : null;

  if (!email) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_EMAIL",
      command: "UPDATE_MEMBER_PROFILE",
      message: "email is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
    ensureHeaders_(membersSheet, MEMBERS_HEADERS_);
    ensureMemberProfileHeaders_(membersSheet);

    const memberRow = findRowByEmail_(membersSheet, "email", email);
    if (!memberRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_MEMBER_NOT_FOUND",
        command: "UPDATE_MEMBER_PROFILE",
        message: "Member not found"
      });
    }

    upsertMemberProfileField_(membersSheet, memberRow, "full_name", fullName);
    upsertMemberProfileField_(membersSheet, memberRow, "profile_photo_url", profilePhotoUrl);
    upsertMemberProfileField_(membersSheet, memberRow, "phone", phone);

    upsertMemberProfileField_(membersSheet, memberRow, "business_name", businessName);
    upsertMemberProfileField_(membersSheet, memberRow, "research_focus", researchFocus);
    upsertMemberProfileField_(membersSheet, memberRow, "tax_id", taxId);
    upsertMemberProfileField_(membersSheet, memberRow, "shipping_address", shippingAddress);
    upsertMemberProfileField_(membersSheet, memberRow, "shipping_city", shippingCity);
    upsertMemberProfileField_(membersSheet, memberRow, "shipping_country", shippingCountry);
    upsertMemberProfileField_(membersSheet, memberRow, "shipping_state", shippingState);
    upsertMemberProfileField_(membersSheet, memberRow, "shipping_zip", shippingZip);
    upsertMemberProfileField_(membersSheet, memberRow, "business_shipping_address", businessShippingAddress);
    upsertMemberProfileField_(membersSheet, memberRow, "business_shipping_city", businessShippingCity);
    upsertMemberProfileField_(membersSheet, memberRow, "business_shipping_country", businessShippingCountry);
    upsertMemberProfileField_(membersSheet, memberRow, "business_shipping_state", businessShippingState);
    upsertMemberProfileField_(membersSheet, memberRow, "business_shipping_zip", businessShippingZip);
    upsertMemberProfileField_(membersSheet, memberRow, "preferred_payment_method", preferredPaymentMethod);

    if (hasBusinessAccountEnabled) {
      upsertMemberProfileField_(membersSheet, memberRow, "business_account_enabled", businessAccountEnabled ? "TRUE" : "FALSE");
    }
    if (hasUseBusinessShipping) {
      upsertMemberProfileField_(membersSheet, memberRow, "use_business_shipping", useBusinessShipping ? "TRUE" : "FALSE");
    }

    if (hasEmailNotifications) {
      upsertMemberProfileField_(membersSheet, memberRow, "email_notifications", emailNotifications ? "TRUE" : "FALSE");
    }

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_PROFILE_UPDATED",
      command: "UPDATE_MEMBER_PROFILE",
      email: email,
      message: "Profile updated"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleGetMemberProfile_(payload) {
  const email = normalizeEmail_(payload.email);
  const actorEmail = normalizeEmail_(payload.actor_email || payload.actorEmail || payload.email);

  if (!email) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_EMAIL",
      command: "GET_MEMBER_PROFILE",
      message: "email is required"
    });
  }

  if (!actorEmail) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_ACTOR",
      command: "GET_MEMBER_PROFILE",
      message: "actor_email is required"
    });
  }

  const actorRole = resolveMemberRoleByEmail_(actorEmail);
  if (actorEmail !== email && actorRole !== "OWNER") {
    return jsonResponse_({
      status: "error",
      code: "ERR_FORBIDDEN",
      command: "GET_MEMBER_PROFILE",
      message: "You can only read your own member profile."
    });
  }

  const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
  ensureHeaders_(membersSheet, MEMBERS_HEADERS_);
  ensureMemberProfileHeaders_(membersSheet);

  const memberRow = findRowByEmail_(membersSheet, "email", email);
  if (!memberRow) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MEMBER_NOT_FOUND",
      command: "GET_MEMBER_PROFILE",
      message: "Member not found"
    });
  }

  const lastColumn = Math.max(membersSheet.getLastColumn(), MEMBERS_HEADERS_.length);
  const headers = membersSheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });
  const row = membersSheet.getRange(memberRow, 1, 1, lastColumn).getValues()[0];

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_MEMBER_PROFILE",
    command: "GET_MEMBER_PROFILE",
    profile: {
      email: email,
      full_name: toTextOrEmpty_(readRowValueByHeader_(row, headers, "full_name", "")),
      phone: toTextOrEmpty_(readRowValueByHeader_(row, headers, "phone", "")),
      profile_photo_url: toTextOrEmpty_(readRowValueByHeader_(row, headers, "profile_photo_url", "")),
      business_account_enabled: toBoolean_(readRowValueByHeader_(row, headers, "business_account_enabled", "FALSE")),
      business_name: toTextOrEmpty_(readRowValueByHeader_(row, headers, "business_name", "")),
      research_focus: toTextOrEmpty_(readRowValueByHeader_(row, headers, "research_focus", "")),
      tax_id: toTextOrEmpty_(readRowValueByHeader_(row, headers, "tax_id", "")),
      shipping_address: toTextOrEmpty_(readRowValueByHeader_(row, headers, "shipping_address", "")),
      shipping_city: toTextOrEmpty_(readRowValueByHeader_(row, headers, "shipping_city", "")),
      shipping_state: toTextOrEmpty_(readRowValueByHeader_(row, headers, "shipping_state", "")),
      shipping_zip: toTextOrEmpty_(readRowValueByHeader_(row, headers, "shipping_zip", "")),
      shipping_country: toTextOrEmpty_(readRowValueByHeader_(row, headers, "shipping_country", "")),
      business_shipping_address: toTextOrEmpty_(readRowValueByHeader_(row, headers, "business_shipping_address", "")),
      business_shipping_city: toTextOrEmpty_(readRowValueByHeader_(row, headers, "business_shipping_city", "")),
      business_shipping_state: toTextOrEmpty_(readRowValueByHeader_(row, headers, "business_shipping_state", "")),
      business_shipping_zip: toTextOrEmpty_(readRowValueByHeader_(row, headers, "business_shipping_zip", "")),
      business_shipping_country: toTextOrEmpty_(readRowValueByHeader_(row, headers, "business_shipping_country", "")),
      use_business_shipping: toBoolean_(readRowValueByHeader_(row, headers, "use_business_shipping", "FALSE")),
      preferred_payment_method: toTextOrEmpty_(readRowValueByHeader_(row, headers, "preferred_payment_method", "")),
      email_notifications: toBoolean_(readRowValueByHeader_(row, headers, "email_notifications", "FALSE")),
      slug: toTextOrEmpty_(readRowValueByHeader_(row, headers, "slug", "")),
      status: toTextOrEmpty_(readRowValueByHeader_(row, headers, "status", "")),
      role: toTextOrEmpty_(readRowValueByHeader_(row, headers, "role", "")),
      account_delete: toBoolean_(readRowValueByHeader_(row, headers, "account_delete", "FALSE"))
    }
  });
}

function ensureMemberProfileHeaders_(membersSheet) {
  const optionalHeaders = [
    "business_account_enabled",
    "business_name",
    "research_focus",
    "tax_id",
    "shipping_address",
    "shipping_city",
    "shipping_state",
    "shipping_zip",
    "business_shipping_address",
    "business_shipping_city",
    "business_shipping_state",
    "business_shipping_zip",
    "business_shipping_country",
    "use_business_shipping",
    "preferred_payment_method",
    "email_notifications"
  ];

  const lastColumn = Math.max(membersSheet.getLastColumn(), MEMBERS_HEADERS_.length);
  const headers = membersSheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });

  const missing = optionalHeaders.filter(function (header) {
    return headers.indexOf(header) === -1;
  });

  if (!missing.length) return;

  const updatedHeaders = headers.concat(missing);
  membersSheet.getRange(1, 1, 1, updatedHeaders.length).setValues([updatedHeaders]);
}

function upsertMemberProfileField_(membersSheet, memberRow, headerName, value) {
  const col = getColumnIndex_(membersSheet, headerName);
  if (!col || value === "") return;
  membersSheet.getRange(memberRow, col).setValue(value);
}

function handleIssueTempMemberPin_(payload) {
  const email = normalizeEmail_(payload.email);
  const actorEmail = normalizeEmail_(payload.actor_email);

  if (!email) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_EMAIL",
      command: "ISSUE_TEMP_MEMBER_PIN",
      message: "email is required"
    });
  }

  const tempPin = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
    ensureHeaders_(membersSheet, MEMBERS_HEADERS_);

    const memberRow = findRowByEmail_(membersSheet, "email", email);
    if (!memberRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_MEMBER_NOT_FOUND",
        command: "ISSUE_TEMP_MEMBER_PIN",
        message: "Member not found"
      });
    }

    const pinColumn = getColumnIndex_(membersSheet, "member_pin");
    if (pinColumn) {
      membersSheet.getRange(memberRow, pinColumn).setValue(tempPin);
    }

    try {
      sendPlatformEmail_({
        to: email,
        subject: "PEPTQ Temporary PIN",
        body: "Your temporary PIN is: " + tempPin,
        category: "SECURITY"
      });
    } catch (error) {
      console.warn("PIN_EMAIL_FAILED", String(error));
    }

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_TEMP_PIN_ISSUED",
      command: "ISSUE_TEMP_MEMBER_PIN",
      email: email,
      temp_pin: tempPin,
      message: "Temporary PIN issued"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleRotateMemberPin_(payload) {
  const email = normalizeEmail_(payload.email);
  const newPin = toTextOrEmpty_(payload.new_pin || payload.newPin || "");

  if (!email) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_EMAIL",
      command: "ROTATE_MEMBER_PIN",
      message: "email is required"
    });
  }

  if (!newPin) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_NEW_PIN",
      command: "ROTATE_MEMBER_PIN",
      message: "new_pin is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
    ensureHeaders_(membersSheet, MEMBERS_HEADERS_);

    const memberRow = findRowByEmail_(membersSheet, "email", email);
    if (!memberRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_MEMBER_NOT_FOUND",
        command: "ROTATE_MEMBER_PIN",
        message: "Member not found"
      });
    }

    const pinColumn = getColumnIndex_(membersSheet, "member_pin");
    if (pinColumn) {
      membersSheet.getRange(memberRow, pinColumn).setValue(newPin);
    }

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_PIN_ROTATED",
      command: "ROTATE_MEMBER_PIN",
      email: email,
      message: "PIN rotated"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleRotateOwnerIdentity_(payload) {
  const actorEmail = normalizeEmail_(payload.actor_email || payload.actorEmail || payload.current_email || payload.currentEmail || "");
  const nextEmail = normalizeEmail_(payload.new_email || payload.newEmail || "");
  const nextPin = toTextOrEmpty_(payload.new_pin || payload.newPin || payload.member_pin || payload.memberPin || "");
  const masterPin = toTextOrEmpty_(payload.master_pin || payload.masterPin || "");
  const fullName = toTextOrEmpty_(payload.full_name || payload.fullName || "");
  const acceptedTerms = toBoolean_(payload.accept_terms || payload.acceptTerms || false);

  if (!actorEmail) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_ACTOR_EMAIL",
      command: "ROTATE_OWNER_IDENTITY",
      message: "actor_email is required"
    });
  }

  if (actorEmail !== OWNER_BOOTSTRAP_ANCHOR_EMAIL_) {
    return jsonResponse_({
      status: "error",
      code: "ERR_UNAUTHORIZED_ANCHOR",
      command: "ROTATE_OWNER_IDENTITY",
      message: "Only System Admin can rotate owner identity"
    });
  }

  if (!nextEmail) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_NEW_EMAIL",
      command: "ROTATE_OWNER_IDENTITY",
      message: "new_email is required"
    });
  }

  if (!nextPin) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_NEW_PIN",
      command: "ROTATE_OWNER_IDENTITY",
      message: "new_pin is required"
    });
  }

  if (!acceptedTerms) {
    return jsonResponse_({
      status: "error",
      code: "ERR_TERMS_REQUIRED",
      command: "ROTATE_OWNER_IDENTITY",
      message: "Terms acceptance is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
    const ownerConfigSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.OWNER);
    ensureHeaders_(membersSheet, MEMBERS_HEADERS_);
    ensureHeaders_(ownerConfigSheet, OWNER_CONFIG_HEADERS_IDENTITY_);

    const masterPinStatus = String(getOwnerConfigValue_("MASTER_PIN_STATUS", "ACTIVE") || "ACTIVE").trim().toUpperCase();

    if (masterPinStatus === "EXPIRED") {
      return jsonResponse_({
        status: "error",
        code: "ERR_MASTER_PIN_EXPIRED",
        command: "ROTATE_OWNER_IDENTITY",
        message: "Master PIN has already been rotated and is expired"
      });
    }

    const actorRow = findRowByEmail_(membersSheet, "email", actorEmail);
    if (!actorRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_MEMBER_NOT_FOUND",
        command: "ROTATE_OWNER_IDENTITY",
        message: "Bootstrap owner identity not found"
      });
    }

    const actorData = membersSheet.getRange(actorRow, 1, 1, MEMBERS_HEADERS_.length).getValues()[0];
    const actorRole = String(readRowValueByHeader_(actorData, MEMBERS_HEADERS_, "role", "") || "").trim().toUpperCase();
    const currentPin = toTextOrEmpty_(readRowValueByHeader_(actorData, MEMBERS_HEADERS_, "member_pin", ""));

    if (actorRole !== "OWNER" && actorRole !== "ADMIN") {
      return jsonResponse_({
        status: "error",
        code: "ERR_NOT_OWNER",
        command: "ROTATE_OWNER_IDENTITY",
        message: "Only OWNER/ADMIN bootstrap identities can rotate owner credentials"
      });
    }

    if (!masterPin || currentPin !== masterPin) {
      return jsonResponse_({
        status: "error",
        code: "ERR_INVALID_MASTER_PIN",
        command: "ROTATE_OWNER_IDENTITY",
        message: "Master PIN validation failed"
      });
    }

    const existingTargetRow = findRowByEmail_(membersSheet, "email", nextEmail);
    if (existingTargetRow && existingTargetRow !== actorRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_EMAIL_IN_USE",
        command: "ROTATE_OWNER_IDENTITY",
        message: "new_email is already in use"
      });
    }

    const emailColumn = getColumnIndex_(membersSheet, "email");
    const pinColumn = getColumnIndex_(membersSheet, "member_pin");
    const statusColumn = getColumnIndex_(membersSheet, "status");
    const roleColumn = getColumnIndex_(membersSheet, "role");
    const accountDeleteColumn = getColumnIndex_(membersSheet, "account_delete");
    const timestampColumn = getColumnIndex_(membersSheet, "timestamp");
    const fullNameColumn = getColumnIndex_(membersSheet, "full_name");
    const notesColumn = getColumnIndex_(membersSheet, "internal_notes");

    if (emailColumn) membersSheet.getRange(actorRow, emailColumn).setValue(nextEmail);
    if (pinColumn) membersSheet.getRange(actorRow, pinColumn).setValue(nextPin);
    if (statusColumn) membersSheet.getRange(actorRow, statusColumn).setValue("APPROVED");
    if (roleColumn) membersSheet.getRange(actorRow, roleColumn).setValue("OWNER");
    if (accountDeleteColumn) membersSheet.getRange(actorRow, accountDeleteColumn).setValue("FALSE");
    if (timestampColumn) membersSheet.getRange(actorRow, timestampColumn).setValue(new Date());

    if (fullName && fullNameColumn) {
      membersSheet.getRange(actorRow, fullNameColumn).setValue(fullName);
    }

    const notesCell = notesColumn ? membersSheet.getRange(actorRow, notesColumn) : null;
    const existingNotes = notesCell ? String(notesCell.getValue() || "").trim() : "";
    const rotationNote = "Owner identity rotated via onboarding flow.";
    if (notesCell) {
      notesCell.setValue(existingNotes ? existingNotes + " | " + rotationNote : rotationNote);
    }

    upsertOwnerConfigIdentityRow_(ownerConfigSheet, "MASTER_PIN_STATUS", "EXPIRED", actorEmail, "Owner identity rotation consumed the bootstrap master pin.");
    upsertOwnerConfigIdentityRow_(ownerConfigSheet, "MASTER_PIN_EXPIRED_REASON", "OWNER_IDENTITY_ROTATION", actorEmail, "Bootstrap identity rotated from " + actorEmail + " to " + nextEmail + ".");

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_OWNER_IDENTITY_ROTATED",
      command: "ROTATE_OWNER_IDENTITY",
      previous_email: actorEmail,
      new_email: nextEmail,
      message: "Owner identity rotated. Re-login required."
    });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteAccount_(payload) {
  const email = normalizeEmail_(payload.email);
  const actorEmail = normalizeEmail_(payload.actor_email || payload.actorEmail || email);

  if (!email) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_EMAIL",
      command: "DELETE_ACCOUNT",
      message: "email is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
    ensureHeaders_(membersSheet, MEMBERS_HEADERS_);

    const memberRow = findRowByEmail_(membersSheet, "email", email);
    if (!memberRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_MEMBER_NOT_FOUND",
        command: "DELETE_ACCOUNT",
        message: "Member not found"
      });
    }

    const accountDeleteColumn = getColumnIndex_(membersSheet, "account_delete");
    const statusColumn = getColumnIndex_(membersSheet, "status");
    const internalNotesColumn = getColumnIndex_(membersSheet, "internal_notes");
    const currentNotes = internalNotesColumn ? String(membersSheet.getRange(memberRow, internalNotesColumn).getValue() || "").trim() : "";
    const requestTimestamp = new Date().toISOString();
    const requestNote = "DELETE_REQUEST_AT:" + requestTimestamp + " by " + actorEmail;

    if (accountDeleteColumn) {
      membersSheet.getRange(memberRow, accountDeleteColumn).setValue("TRUE");
    }

    if (statusColumn) {
      membersSheet.getRange(memberRow, statusColumn).setValue("DELETE_REQUESTED");
    }

    if (internalNotesColumn) {
      membersSheet.getRange(memberRow, internalNotesColumn).setValue(currentNotes ? currentNotes + " | " + requestNote : requestNote);
    }

    try {
      const recipient = String(getNotificationRecipient_() || "").trim();
      if (recipient) {
        sendPlatformEmail_({
          to: recipient,
          subject: "PEPTQ Member Delete Request: " + email,
          category: "GENERAL",
          body: "A member has requested account deletion.\n\nEmail: " + email + "\nStatus: DELETE_REQUESTED\nRequested at: " + requestTimestamp + "\n\nReview the request in PEPTQ_Members."
        });
      }
    } catch (error) {
      console.warn("DELETE_REQUEST_ALERT_FAILED", String(error));
    }

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_ACCOUNT_DELETE_REQUESTED",
      command: "DELETE_ACCOUNT",
      email: email,
      account_delete: true,
      requested_at: requestTimestamp,
      identity_status: "DELETE_REQUESTED",
      message: "Account deletion requested"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleWithdrawRequest_(payload) {
  const email = normalizeEmail_(payload.email);

  if (!email) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_EMAIL",
      command: "WITHDRAW_REQUEST",
      message: "email is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const portalSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.PORTAL_REQUEST);
    ensureHeaders_(portalSheet, PORTAL_REQUEST_HEADERS_);

    const reqRow = findRowByEmail_(portalSheet, "email", email);
    if (reqRow) {
      portalSheet.deleteRow(reqRow);
    }

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_REQUEST_WITHDRAWN",
      command: "WITHDRAW_REQUEST",
      email: email,
      message: "Request withdrawn"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleGetDeleteRequests_(payload) {
  const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
  ensureHeaders_(membersSheet, MEMBERS_HEADERS_);

  const lastRow = membersSheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse_({
      status: "success",
      code: "SUCCESS_DELETE_REQUESTS",
      command: "GET_DELETE_REQUESTS",
      count: 0,
      requests: []
    });
  }

  const lastColumn = Math.max(membersSheet.getLastColumn(), MEMBERS_HEADERS_.length);
  const headerState = getHeaderMap_(membersSheet, lastColumn);
  const headers = headerState.headers;
  const accountDeleteIdx = headers.indexOf("account_delete");
  const statusIdx = headers.indexOf("status");
  const roleIdx = headers.indexOf("role");
  const internalNotesIdx = headers.indexOf("internal_notes");
  const rows = membersSheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();

  const requests = rows
    .map(function (_, index) {
      return getMemberIdentitySnapshotByRow_(membersSheet, index + 2);
    })
    .filter(function (entry, index) {
      if (!entry) return false;
      const row = rows[index];
      const accountDelete = accountDeleteIdx >= 0 ? toBoolean_(row[accountDeleteIdx]) : Boolean(entry.accountDelete);
      const status = statusIdx >= 0 ? String(row[statusIdx] || "").trim().toUpperCase() : entry.status;
      return accountDelete || status === "DELETE_REQUESTED";
    })
    .map(function (entry, index) {
      const row = rows[index];
      const internalNotes = internalNotesIdx >= 0 ? String(row[internalNotesIdx] || "").trim() : entry.internalNotes;
      return {
        email: entry.email,
        full_name: entry.fullName,
        status: entry.status,
        role: roleIdx >= 0 ? String(row[roleIdx] || entry.role || "MEMBER").trim().toUpperCase() : entry.role,
        requested_at: parseDeleteRequestTimestampFromNotes_(internalNotes) || entry.timestamp,
        internal_notes: internalNotes,
        account_delete: Boolean(entry.accountDelete)
      };
    })
    .sort(function (a, b) {
      return String(b.requested_at || "").localeCompare(String(a.requested_at || ""));
    });

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_DELETE_REQUESTS",
    command: "GET_DELETE_REQUESTS",
    count: requests.length,
    requests: requests
  });
}

function handleSubmitSupport_(payload) {
  const email = normalizeEmail_(payload.email);
  const fullName = toTextOrEmpty_(payload.full_name || payload.fullName || "");
  const issueType = toTextOrEmpty_(payload.issue_type || payload.issueType || "Portal Access");
  const message = toTextOrEmpty_(payload.message || "");
  const sourcePage = toTextOrEmpty_(payload.source_page || payload.sourcePage || "");

  if (!email) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_EMAIL",
      command: "SUBMIT_SUPPORT",
      message: "email is required"
    });
  }

  if (!message) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_MESSAGE",
      command: "SUBMIT_SUPPORT",
      message: "message is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const supportSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.SUPPORT);
    ensureHeaders_(supportSheet, SUPPORT_HEADERS_);

    const now = new Date();
    const row = [
      now,
      email,
      fullName,
      issueType,
      message,
      "PENDING",
      sourcePage
    ];

    const nextRow = Math.max(supportSheet.getLastRow(), 1) + 1;
    supportSheet.getRange(nextRow, 1, 1, SUPPORT_HEADERS_.length).setValues([row]);

    try {
      const recipient = String(getNotificationRecipient_() || "").trim();
      if (recipient) {
        const rows = [
          { label: "Name", value: fullName },
          {
            label: "Email",
            value: buildInternalNotificationEmailHtml_(email),
            valueText: buildInternalNotificationEmailText_(email),
            rawHtml: true
          },
          { label: "Issue", value: issueType },
          { label: "Status", value: "PENDING" },
          { label: "Source Page", value: sourcePage },
          { label: "Message", value: message, preWrap: true }
        ];
        const alertText = "Review in the Support queue and follow up manually if a response is needed.";
        sendPlatformEmail_({
          to: recipient,
          subject: "PEPTQ Support Request: " + issueType,
          category: "GENERAL",
          body: buildInternalNotificationText_(
            "New support request received.",
            rows,
            alertText
          ),
          htmlBody: buildInternalNotificationCardHtml_({
            eyebrow: "PEPTQ | SUPPORT DESK",
            title: "Support Request",
            rows: rows,
            alertText: alertText
          })
        });
      }
    } catch (error) {
      console.warn("SUPPORT_ALERT_FAILED", String(error));
    }

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_SUPPORT_SUBMITTED",
      command: "SUBMIT_SUPPORT",
      email: email,
      issue_type: issueType,
      message: "Support request submitted"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleGetIdentityStatus_(payload) {
  const email = normalizeEmail_(payload.email);

  if (!email) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_EMAIL",
      command: "GET_IDENTITY_STATUS",
      message: "email is required"
    });
  }

  const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
  const portalSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.PORTAL_REQUEST);
  ensureHeaders_(membersSheet, MEMBERS_HEADERS_);
  ensureHeaders_(portalSheet, PORTAL_REQUEST_HEADERS_);

  const memberRow = findRowByEmail_(membersSheet, "email", email);
  const portalRow = findRowByEmail_(portalSheet, "email", email);

  if (memberRow) {
    const identity = getMemberIdentitySnapshotByRow_(membersSheet, memberRow);
    return jsonResponse_({
      status: "success",
      code: "SUCCESS_MEMBER_STATUS",
      command: "GET_IDENTITY_STATUS",
      email: email,
      identity_status: identity.status,
      role: identity.role,
      full_name: identity.fullName,
      account_delete: Boolean(identity.accountDelete),
      profile_photo_url: identity.profilePhotoUrl,
      slug: identity.slug,
      identity: {
        role: identity.role,
        status: identity.status,
        account_delete: Boolean(identity.accountDelete),
        profile_photo_url: identity.profilePhotoUrl,
        slug: identity.slug
      },
      message: "Member status retrieved"
    });
  }

  if (portalRow) {
    const identity = getPortalIdentitySnapshotByRow_(portalSheet, portalRow);
    return jsonResponse_({
      status: "success",
      code: "SUCCESS_PENDING_STATUS",
      command: "GET_IDENTITY_STATUS",
      email: email,
      identity_status: identity.status,
      requested_role: identity.role,
      full_name: identity.fullName,
      account_delete: Boolean(identity.accountDelete),
      profile_photo_url: identity.profilePhotoUrl,
      identity: {
        role: identity.role,
        status: identity.status,
        account_delete: Boolean(identity.accountDelete),
        profile_photo_url: identity.profilePhotoUrl
      },
      message: "Portal request status retrieved"
    });
  }

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_GUEST_STATUS",
    command: "GET_IDENTITY_STATUS",
    email: email,
    identity_status: "GUEST",
    message: "Guest status"
  });
}

const AUTH_OTP_TTL_MS_ = 10 * 60 * 1000;
const AUTH_OTP_COOLDOWN_MS_ = 60 * 1000;
const AUTH_OTP_MAX_ATTEMPTS_ = 5;
const AUTH_QR_TTL_MS_ = 2 * 60 * 1000;
const AUTH_QR_MAX_ATTEMPTS_ = 5;
const AUTH_TOTP_ISSUER_ = "PEPTQ Secure Portal";
const AUTH_TOTP_PERIOD_SEC_ = 30;
const AUTH_TOTP_DIGITS_ = 6;
const AUTH_TOTP_WINDOW_ = 1;

function handleVerifyPortalPin_(payload) {
  const email = normalizeEmail_(payload.email || payload.id || payload.identity || "");
  const submittedPin = String(payload.member_pin || payload.memberPin || payload.portalPin || "").replace(/\D/g, "");

  if (!email) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_MISSING_EMAIL", message: "email is required" });
  }

  if (!submittedPin) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_MISSING_PIN", message: "Portal PIN is required." });
  }

  const identity = resolveBridgeIdentityByEmail_(email);
  if (!identity) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_IDENTITY_NOT_FOUND", message: "Identity not found." });
  }

  if (identity.accountDelete) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_ACCOUNT_DELETE_REQUESTED", message: "This account is pending deletion. Contact support to restore access." });
  }

  const expectedPin = String(identity.member_pin || "").replace(/\D/g, "");
  if (!expectedPin) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_PIN_NOT_CONFIGURED", message: "Portal PIN is not configured for this account." });
  }

  if (submittedPin !== expectedPin) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_INVALID_PIN", message: "Invalid Portal PIN." });
  }

  if (!isIdentityActiveForPortal_(identity.status)) {
    return jsonResponse_({
      success: false,
      status: "error",
      code: "ERR_IDENTITY_NOT_ACTIVE",
      identity_status: identity.status || "PENDING",
      message: "Portal access is " + (identity.status || "PENDING") + "."
    });
  }

  return jsonResponse_(buildBridgeSuccessIdentity_(identity, {
    code: "SUCCESS_PORTAL_PIN_VERIFIED",
    command: "VERIFY_PORTAL_PIN",
    portalVerified: true,
    message: "Portal PIN verified."
  }));
}

function handleSendAuthEmailCode_(payload) {
  const email = normalizeEmail_(payload.email || payload.id || payload.identity || "");
  if (!email) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_MISSING_EMAIL", message: "email is required" });
  }

  const identity = resolveBridgeIdentityByEmail_(email);
  if (!identity) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_IDENTITY_NOT_FOUND", message: "Identity not found." });
  }

  if (!isIdentityActiveForPortal_(identity.status)) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_IDENTITY_NOT_ACTIVE", message: "Identity must be ACTIVE before verification." });
  }

  const now = Date.now();
  const key = authOtpKey_(email);
  const current = getAuthRecord_(key);
  const emailRuntime = getEmailProviderRuntime_();

  if (emailRuntime.active_provider === "GOOGLE" && getGoogleRemainingDailyQuota_() <= 0) {
    return jsonResponse_({
      success: false,
      status: "error",
      code: "ERR_EMAIL_QUOTA_EXHAUSTED",
      provider: "GOOGLE",
      message: "Verification email system is temporarily at quota capacity. Please try again later or contact support."
    });
  }

  if (current && current.lastSentAt && now - Number(current.lastSentAt) < AUTH_OTP_COOLDOWN_MS_) {
    const waitSec = Math.ceil((AUTH_OTP_COOLDOWN_MS_ - (now - Number(current.lastSentAt))) / 1000);
    return jsonResponse_({
      success: false,
      status: "error",
      code: "ERR_OTP_COOLDOWN",
      retryAfterSec: waitSec,
      message: "Please wait before requesting another code."
    });
  }

  const otp = generateAuthCode_();
  setAuthRecord_(key, {
    hash: authHash_(otp),
    expiresAt: now + AUTH_OTP_TTL_MS_,
    attempts: 0,
    lastSentAt: now,
    user: identity
  });

  sendPlatformEmail_({
    to: email,
    subject: "Your PEPTQ Verification Code",
    category: "SECURITY",
    body: "Your verification code is: " + otp + "\n\nThis code expires in 10 minutes.",
    htmlBody:
      '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:560px">'
      + '<h2 style="margin:0 0 12px 0">PEPTQ Security</h2>'
      + '<p style="margin:0 0 10px 0">Use this verification code to continue sign-in:</p>'
      + '<div style="display:inline-block;padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;font-size:26px;font-weight:700;letter-spacing:0.18em">'
      + otp
      + '</div>'
      + '<p style="margin:12px 0 0 0">This code expires in <strong>10 minutes</strong>.</p>'
      + '<p style="margin:8px 0 0 0;color:#475569">If you did not request this code, you can ignore this email.</p>'
      + '</div>',
    name: "PEPTQ Security"
  });

  return jsonResponse_({
    success: true,
    status: "success",
    code: "SUCCESS_AUTH_CODE_SENT",
    command: "SEND_AUTH_EMAIL_CODE",
    email: email,
    maskedEmail: maskEmailForAuth_(email),
    expiresInSec: Math.floor(AUTH_OTP_TTL_MS_ / 1000),
    message: "Verification code sent."
  });
}

function handleVerifyAuthEmailCode_(payload) {
  const email = normalizeEmail_(payload.email || payload.id || payload.identity || "");
  const code = String(payload.code || "").replace(/\D/g, "");

  if (!email) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_MISSING_EMAIL", message: "email is required" });
  }

  if (!code) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_MISSING_CODE", message: "code is required" });
  }

  const key = authOtpKey_(email);
  const record = getAuthRecord_(key);
  if (!record) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_NO_ACTIVE_CODE", message: "No active code. Request a new code." });
  }

  const now = Date.now();
  if (now > Number(record.expiresAt || 0)) {
    deleteAuthRecord_(key);
    return jsonResponse_({ success: false, status: "error", code: "ERR_CODE_EXPIRED", message: "Code expired. Request a new one." });
  }

  const attempts = Number(record.attempts || 0);
  if (attempts >= AUTH_OTP_MAX_ATTEMPTS_) {
    deleteAuthRecord_(key);
    return jsonResponse_({ success: false, status: "error", code: "ERR_TOO_MANY_ATTEMPTS", message: "Too many attempts. Request a new code." });
  }

  if (authHash_(code) !== String(record.hash || "")) {
    record.attempts = attempts + 1;
    setAuthRecord_(key, record);
    return jsonResponse_({
      success: false,
      status: "error",
      code: "ERR_INVALID_CODE",
      attemptsRemaining: Math.max(0, AUTH_OTP_MAX_ATTEMPTS_ - record.attempts),
      message: "Invalid verification code."
    });
  }

  deleteAuthRecord_(key);
  const identity = resolveBridgeIdentityByEmail_(email) || record.user;
  if (!identity) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_IDENTITY_NOT_FOUND", message: "Identity not found." });
  }

  if (!isIdentityActiveForPortal_(identity.status)) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_IDENTITY_NOT_ACTIVE", message: "Identity must be ACTIVE before verification." });
  }

  return jsonResponse_(buildBridgeSuccessIdentity_(identity, {
    code: "SUCCESS_AUTH_CODE_VERIFIED",
    command: "VERIFY_AUTH_EMAIL_CODE",
    otpVerified: true,
    message: "Verification code accepted."
  }));
}

function handleInitTotpSetup_(payload) {
  const email = normalizeEmail_(payload.email || payload.id || payload.identity || "");
  if (!email) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_MISSING_EMAIL", message: "email is required" });
  }

  const identity = resolveBridgeIdentityByEmail_(email);
  if (!identity) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_IDENTITY_NOT_FOUND", message: "Identity not found." });
  }

  if (!isIdentityActiveForPortal_(identity.status)) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_IDENTITY_NOT_ACTIVE", message: "Identity must be ACTIVE before TOTP setup." });
  }

  const key = authTotpKey_(email);
  var record = getAuthRecord_(key);
  if (!record || !record.secret) {
    const secret = generateBase32Secret_(20);
    const account = email;
    const label = AUTH_TOTP_ISSUER_ + ":" + account;
    const otpauthUrl = "otpauth://totp/" + encodeURIComponent(label)
      + "?secret=" + secret
      + "&issuer=" + encodeURIComponent(AUTH_TOTP_ISSUER_)
      + "&algorithm=SHA1&digits=" + AUTH_TOTP_DIGITS_
      + "&period=" + AUTH_TOTP_PERIOD_SEC_;

    record = {
      secret: secret,
      account: account,
      issuer: AUTH_TOTP_ISSUER_,
      otpauthUrl: otpauthUrl,
      enabled: false,
      createdAt: Date.now(),
      verifiedAt: 0
    };
    setAuthRecord_(key, record);
  }

  return jsonResponse_({
    success: true,
    status: "success",
    code: "SUCCESS_TOTP_SETUP",
    command: "INIT_TOTP_SETUP",
    account: record.account,
    issuer: record.issuer,
    secret: record.secret,
    otpauthUrl: record.otpauthUrl,
    qrUrl: "https://quickchart.io/qr?size=220&text=" + encodeURIComponent(record.otpauthUrl),
    alreadyEnabled: Boolean(record.enabled)
  });
}

function handleVerifyTotpCode_(payload) {
  const email = normalizeEmail_(payload.email || payload.id || payload.identity || "");
  const code = String(payload.code || "").replace(/\D/g, "");

  if (!email) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_MISSING_EMAIL", message: "email is required" });
  }

  if (!code) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_MISSING_CODE", message: "code is required" });
  }

  if (code.length !== AUTH_TOTP_DIGITS_) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_INVALID_CODE", message: "Enter a valid " + AUTH_TOTP_DIGITS_ + "-digit authenticator code." });
  }

  const identity = resolveBridgeIdentityByEmail_(email);
  if (!identity) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_IDENTITY_NOT_FOUND", message: "Identity not found." });
  }

  if (!isIdentityActiveForPortal_(identity.status)) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_IDENTITY_NOT_ACTIVE", message: "Identity must be ACTIVE before TOTP verification." });
  }

  const key = authTotpKey_(email);
  const record = getAuthRecord_(key);
  if (!record || !record.secret) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_TOTP_NOT_SETUP", message: "Authenticator setup not found for this identity." });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!verifyTotpToken_(record.secret, code, nowSec, AUTH_TOTP_WINDOW_)) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_INVALID_CODE", message: "Invalid authenticator code." });
  }

  record.enabled = true;
  record.verifiedAt = Date.now();
  setAuthRecord_(key, record);

  return jsonResponse_(buildBridgeSuccessIdentity_(identity, {
    code: "SUCCESS_TOTP_VERIFIED",
    command: "VERIFY_TOTP_CODE",
    totpVerified: true,
    message: "Authenticator verified."
  }));
}

function handleInitQrLogin_(payload) {
  const email = normalizeEmail_(payload.email || payload.id || payload.identity || "");
  const appUrl = String(payload.app_url || payload.appUrl || "").trim();

  if (!email) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_MISSING_EMAIL", message: "email is required" });
  }

  const identity = resolveBridgeIdentityByEmail_(email);
  if (!identity) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_IDENTITY_NOT_FOUND", message: "Identity not found." });
  }

  if (!isIdentityActiveForPortal_(identity.status)) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_IDENTITY_NOT_ACTIVE", message: "Identity must be ACTIVE before QR login." });
  }

  const token = generateAuthToken_();
  const approvalCode = generateAuthCode_();
  const now = Date.now();
  const record = {
    token: token,
    status: "pending",
    createdAt: now,
    expiresAt: now + AUTH_QR_TTL_MS_,
    approvalCode: approvalCode,
    approvalAttempts: 0,
    user: identity
  };

  setAuthRecord_(authQrKey_(token), record);

  const approvalUrl = buildQrApprovalUrl_(appUrl, token);
  return jsonResponse_({
    success: true,
    status: "success",
    code: "SUCCESS_QR_SESSION_CREATED",
    command: "INIT_QR_LOGIN",
    token: token,
    approvalCode: approvalCode,
    expiresInSec: Math.floor(AUTH_QR_TTL_MS_ / 1000),
    approvalUrl: approvalUrl,
    qrUrl: "https://quickchart.io/qr?size=220&text=" + encodeURIComponent(approvalUrl)
  });
}

function handleGetQrLoginStatus_(payload) {
  const token = String(payload.token || "").trim();
  if (!token) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_MISSING_TOKEN", message: "token is required" });
  }

  const key = authQrKey_(token);
  const record = getAuthRecord_(key);
  if (!record) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_QR_NOT_FOUND", message: "QR session not found." });
  }

  const now = Date.now();
  if (now > Number(record.expiresAt || 0)) {
    deleteAuthRecord_(key);
    return jsonResponse_({ success: false, status: "error", expired: true, code: "ERR_QR_EXPIRED", message: "QR session expired." });
  }

  if (record.status === "approved") {
    deleteAuthRecord_(key);
    return jsonResponse_(buildBridgeSuccessIdentity_(record.user || {}, {
      code: "SUCCESS_QR_APPROVED",
      command: "GET_QR_LOGIN_STATUS",
      approved: true,
      message: "QR approval confirmed."
    }));
  }

  return jsonResponse_({
    success: true,
    status: "success",
    code: "SUCCESS_QR_PENDING",
    command: "GET_QR_LOGIN_STATUS",
    approved: false,
    expiresInSec: Math.max(0, Math.floor((Number(record.expiresAt || 0) - now) / 1000))
  });
}

function handleApproveQrLogin_(payload) {
  const token = String(payload.token || "").trim();
  const submittedCode = String(payload.code || "").replace(/\D/g, "");

  if (!token) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_MISSING_TOKEN", message: "token is required" });
  }

  if (!submittedCode) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_MISSING_CODE", message: "code is required" });
  }

  const key = authQrKey_(token);
  const record = getAuthRecord_(key);
  if (!record) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_QR_NOT_FOUND", message: "QR session not found." });
  }

  const now = Date.now();
  if (now > Number(record.expiresAt || 0)) {
    deleteAuthRecord_(key);
    return jsonResponse_({ success: false, status: "error", expired: true, code: "ERR_QR_EXPIRED", message: "QR session expired." });
  }

  if (submittedCode.length !== 6) {
    return jsonResponse_({ success: false, status: "error", code: "ERR_INVALID_CODE", message: "Enter the 6-digit approval code from desktop." });
  }

  const attempts = Number(record.approvalAttempts || 0);
  if (attempts >= AUTH_QR_MAX_ATTEMPTS_) {
    deleteAuthRecord_(key);
    return jsonResponse_({ success: false, status: "error", code: "ERR_QR_ATTEMPTS", message: "Too many invalid code attempts. Start QR login again." });
  }

  if (submittedCode !== String(record.approvalCode || "")) {
    record.approvalAttempts = attempts + 1;
    setAuthRecord_(key, record);
    return jsonResponse_({
      success: false,
      status: "error",
      code: "ERR_INVALID_CODE",
      attemptsRemaining: Math.max(0, AUTH_QR_MAX_ATTEMPTS_ - record.approvalAttempts),
      message: "Invalid approval code."
    });
  }

  record.status = "approved";
  record.approvedAt = now;
  setAuthRecord_(key, record);

  return jsonResponse_({
    success: true,
    status: "success",
    code: "SUCCESS_QR_APPROVE",
    command: "APPROVE_QR_LOGIN",
    approved: true,
    message: "Desktop login approved. You can return to your computer."
  });
}

function resolveBridgeIdentityByEmail_(emailRaw) {
  const email = normalizeEmail_(emailRaw);
  if (!email) return null;

  const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
  const portalSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.PORTAL_REQUEST);
  ensureHeaders_(membersSheet, MEMBERS_HEADERS_);
  ensureHeaders_(portalSheet, PORTAL_REQUEST_HEADERS_);

  const memberRow = findRowByEmail_(membersSheet, "email", email);
  if (memberRow) {
    return getMemberIdentitySnapshotByRow_(membersSheet, memberRow);
  }

  const portalRow = findRowByEmail_(portalSheet, "email", email);
  if (portalRow) {
    return getPortalIdentitySnapshotByRow_(portalSheet, portalRow);
  }

  return null;
}

function buildBridgeSuccessIdentity_(identity, extras) {
  const user = {
    email: normalizeEmail_(identity.email || ""),
    fullName: String(identity.fullName || "").trim(),
    role: String(identity.role || "GUEST").trim().toUpperCase(),
    status: String(identity.status || "UNKNOWN").trim().toUpperCase(),
    profilePhotoUrl: String(identity.profilePhotoUrl || "").trim(),
    accountDelete: Boolean(identity.accountDelete)
  };

  const payload = {
    success: true,
    status: "success",
    user: user,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    statusText: user.status,
    profilePhotoUrl: user.profilePhotoUrl,
    accountDelete: user.accountDelete,
    identity_status: user.status
  };

  return Object.assign(payload, extras || {});
}

function isIdentityActiveForPortal_(statusRaw) {
  const status = String(statusRaw || "").trim().toUpperCase();
  return status === "ACTIVE" || status === "APPROVED";
}

function authHash_(text) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text || ""), Utilities.Charset.UTF_8);
  return Utilities.base64Encode(digest);
}

function authOtpKey_(email) {
  return "auth:otp:" + authHash_(String(email || "").trim().toLowerCase());
}

function authTotpKey_(email) {
  return "auth:totp:" + authHash_(String(email || "").trim().toLowerCase());
}

function authQrKey_(token) {
  return "auth:qr:" + authHash_(String(token || "").trim());
}

function getAuthRecord_(key) {
  const raw = PropertiesService.getScriptProperties().getProperty(key);
  return raw ? JSON.parse(raw) : null;
}

function setAuthRecord_(key, record) {
  PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(record));
}

function deleteAuthRecord_(key) {
  PropertiesService.getScriptProperties().deleteProperty(key);
}

function generateAuthCode_() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateAuthToken_() {
  return Utilities.getUuid().replace(/-/g, "") + String(Date.now());
}

function buildQrApprovalUrl_(appUrl, token) {
  const fallback = "https://peptq.com/";
  const base = String(appUrl || "").trim() || fallback;
  const separator = base.indexOf("?") >= 0 ? "&" : "?";
  return base + separator + "qrToken=" + encodeURIComponent(token);
}

function maskEmailForAuth_(email) {
  const parts = String(email || "").split("@");
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return name.charAt(0) + "***@" + domain;
  return name.slice(0, 2) + "***@" + domain;
}

function generateBase32Secret_(lengthBytes) {
  const bytes = Utilities.getUuid().replace(/-/g, "");
  const randomBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    bytes + String(Date.now()),
    Utilities.Charset.UTF_8
  ).slice(0, lengthBytes);
  return base32Encode_(randomBytes);
}

function base32Encode_(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  var bits = 0;
  var value = 0;
  var output = "";

  for (var i = 0; i < bytes.length; i += 1) {
    value = (value << 8) | (bytes[i] & 255);
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode_(base32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = String(base32 || "").replace(/=+$/g, "").toUpperCase();
  var bits = 0;
  var value = 0;
  const bytes = [];

  for (var i = 0; i < clean.length; i += 1) {
    const idx = alphabet.indexOf(clean.charAt(i));
    if (idx < 0) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return bytes;
}

function verifyTotpToken_(secretBase32, token, nowSec, window) {
  for (var w = -window; w <= window; w += 1) {
    const candidate = generateTotpToken_(secretBase32, nowSec + w * AUTH_TOTP_PERIOD_SEC_);
    if (candidate === token) return true;
  }
  return false;
}

function generateTotpToken_(secretBase32, epochSec) {
  const keyBytes = base32Decode_(secretBase32);
  const counter = Math.floor(epochSec / AUTH_TOTP_PERIOD_SEC_);
  const counterBytes = [];
  var tmp = counter;

  for (var i = 0; i < 8; i += 1) {
    counterBytes.unshift(tmp & 255);
    tmp = Math.floor(tmp / 256);
  }

  const signature = Utilities.computeHmacSignature(
    Utilities.MacAlgorithm.HMAC_SHA_1,
    counterBytes,
    keyBytes
  );
  const offset = signature[signature.length - 1] & 15;
  const codeInt =
    ((signature[offset] & 127) << 24)
    | ((signature[offset + 1] & 255) << 16)
    | ((signature[offset + 2] & 255) << 8)
    | (signature[offset + 3] & 255);

  const mod = Math.pow(10, AUTH_TOTP_DIGITS_);
  const token = String(codeInt % mod);
  return token.padStart(AUTH_TOTP_DIGITS_, "0");
}


function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const command = String(payload.command || "").trim().toUpperCase();

    if (!command) {
      return jsonResponse_({ status: "error", message: "Missing command" });
    }

    const handlers = {
      SUBMIT_REQUEST: handleSubmitRequest_,
      SUBMIT_WAITLIST: handleSubmitWaitlist_,
      APPROVE_MEMBER: handleApproveMember_,
      UPDATE_ROLE: handleUpdateRole_,
      SUSPEND_MEMBER: handleSuspendMember_,
      UPDATE_MEMBER_PROFILE: handleUpdateMemberProfile_,
      ISSUE_TEMP_MEMBER_PIN: handleIssueTempMemberPin_,
      ROTATE_MEMBER_PIN: handleRotateMemberPin_,
      ROTATE_OWNER_IDENTITY: handleRotateOwnerIdentity_,
      DELETE_ACCOUNT: handleDeleteAccount_,
      WITHDRAW_REQUEST: handleWithdrawRequest_,
      SUBMIT_SUPPORT: handleSubmitSupport_,
      GET_IDENTITY_STATUS: handleGetIdentityStatus_,
      GET_MEMBER_PROFILE: handleGetMemberProfile_,
      SUBMIT_ORDER: handleSubmitOrder_,
      SUBMIT_PREORDER: handleSubmitPreorder_,
      ALERT_ORDER: handleAlertOrder_,
      UPDATE_ORDER: handleUpdateOrder_,
      UPDATE_PREORDER_STATUS: handleUpdatePreorderStatus_,
      SEARCH_MEMBER_ORDERS: handleSearchMemberOrders_,
      GET_PREORDERS: handleGetPreorders_,
      GET_ORDER_STATUS_SUMMARY: handleGetOrderStatusSummary_,
      GET_LOT_METADATA: handleGetLotMetadata_,
      UPSERT_LOT_METADATA: handleUpsertLotMetadata_,
      MAP_ORDER_COA: handleMapOrderCoa_,
      GET_QR_COA: handleGetQrCoa_,
      GET_LOW_STOCK_DASHBOARD: handleGetLowStockDashboard_,
      GET_PROCUREMENT_INSIGHTS: handleGetProcurementInsights_,
      GET_INVENTORY_MOVEMENT_HISTORY: handleGetInventoryMovementHistory_,
      GET_PROVIDER_STATUS: handleGetProviderStatus_,
      UPDATE_SYSTEM_SETTINGS: handleUpdateSystemSettings_,
      SAVE_EMAIL_PROVIDER_SECRET: handleSaveEmailProviderSecret_,
      CLEAR_EMAIL_PROVIDER_SECRET: handleClearEmailProviderSecret_,
      SEND_LOW_STOCK_ALERTS: handleSendLowStockAlerts_,
      CONFIGURE_LOW_STOCK_ALERT_SCHEDULE: handleConfigureLowStockAlertSchedule_,
      GET_ADMIN_QUICK_LINKS: handleGetAdminQuickLinks_,
      GET_SITE_LAYOUT: handleGetSiteLayout_,
      UPSERT_SITE_LAYOUT: handleUpsertSiteLayout_,
      SAVE_SITE_ASSET: handleSaveSiteAsset_,
      GET_CATALOG: handleGetCatalog_,
      FETCH_PUBCHEM_PROXY: handleFetchPubChemProxy_,
      GET_PUBCHEM_STRUCTURE_PROXY: handleGetPubChemStructureProxy_,
      GET_WAITLIST_ENTRIES: handleGetWaitlistEntries_,
      GET_DELETE_REQUESTS: handleGetDeleteRequests_,
      GET_DISCOUNT_CODES: handleGetDiscountCodes_,
      PROMOTE_WAITLIST_ENTRY: handlePromoteWaitlistEntry_,
      UPSERT_DISCOUNT_CODE: handleUpsertDiscountCode_,
      VALIDATE_DISCOUNT_CODE: handleValidateDiscountCode_,
      CREATE_CATALOG_PRODUCT: handleCreateCatalogProduct_,
      UPDATE_CATALOG_VISIBILITY: handleUpdateCatalogVisibility_,
      UPDATE_CATALOG_PRICE: handleUpdateCatalogPrice_,
      DELETE_CATALOG_PRODUCT: handleDeleteCatalogProduct_,
      MANUAL_STOCK_ADJUSTMENT: handleManualStockAdjustment_,
      SYNC_CATALOG_TO_FIRESTORE: handleSyncCatalogToFirestore_,
      CREATE_ASSET: handleCreateAsset_,
      GET_ASSETS: handleGetAssets_,
      ACCEPT_ORDER: handleAcceptOrder_,
      UPDATE_TRACKING: handleUpdateTracking_,
      SHIP_ORDER: handleShipOrder_,
      MARK_DELIVERED: handleMarkDelivered_,
      SEND_DELIVERY_CONFIRMATION: handleSendDeliveryConfirmation_,
      COMPLETE_ORDER: handleCompleteOrder_,
      CANCEL_ORDER: handleCancelOrder_,
      GET_ORDER_HISTORY: handleGetOrderHistory_,
      VERIFY_PORTAL_PIN: handleVerifyPortalPin_,
      SEND_AUTH_EMAIL_CODE: handleSendAuthEmailCode_,
      VERIFY_AUTH_EMAIL_CODE: handleVerifyAuthEmailCode_,
      INIT_TOTP_SETUP: handleInitTotpSetup_,
      VERIFY_TOTP_CODE: handleVerifyTotpCode_,
      INIT_QR_LOGIN: handleInitQrLogin_,
      GET_QR_LOGIN_STATUS: handleGetQrLoginStatus_,
      APPROVE_QR_LOGIN: handleApproveQrLogin_
    };

    const handler = handlers[command];
    if (!handler) {
      return jsonResponse_({ status: "error", message: "Unknown command" });
    }

    if (isPrivilegedCommand_(command)) {
      const accessError = assertPrivilegedAccess_(payload, command);
      if (accessError) {
        return accessError;
      }
    }

    return handler(payload);
  } catch (error) {
    console.error("PEPTQ_ERROR", String(error));
    return jsonResponse_({ status: "error", message: "Internal error" });
  }
}

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || "").trim();
    if (action) {
      return routeBridgeAction_(e.parameter || {}, action);
    }

    const command = String((e && e.parameter && e.parameter.command) || "").trim().toUpperCase();
    if (!command) {
      return jsonResponse_({ status: "ok", service: "peptq-v1" });
    }

    const readHandlers = {
      GET_IDENTITY_STATUS: handleGetIdentityStatus_,
      GET_MEMBER_PROFILE: handleGetMemberProfile_,
      GET_PREORDERS: handleGetPreorders_,
      GET_ADMIN_QUICK_LINKS: handleGetAdminQuickLinks_,
      GET_QR_COA: handleGetQrCoa_,
      GET_SITE_LAYOUT: handleGetSiteLayout_,
      GET_LOW_STOCK_DASHBOARD: handleGetLowStockDashboard_,
      GET_PROCUREMENT_INSIGHTS: handleGetProcurementInsights_,
      GET_INVENTORY_MOVEMENT_HISTORY: handleGetInventoryMovementHistory_,
      GET_PROVIDER_STATUS: handleGetProviderStatus_,
      GET_ORDER_HISTORY: handleGetOrderHistory_,
      FETCH_PUBCHEM_PROXY: handleFetchPubChemProxy_,
      GET_PUBCHEM_STRUCTURE_PROXY: handleGetPubChemStructureProxy_,
      GET_ORDER_STATUS_SUMMARY: handleGetOrderStatusSummary_,
      GET_WAITLIST_ENTRIES: handleGetWaitlistEntries_,
      GET_DELETE_REQUESTS: handleGetDeleteRequests_,
      GET_DISCOUNT_CODES: handleGetDiscountCodes_,
      GET_QR_LOGIN_STATUS: handleGetQrLoginStatus_,
      GET_ASSETS: handleGetAssets_,
      GET_CATALOG: handleGetCatalog_
    };

    const handler = readHandlers[command];
    if (!handler) {
      return jsonResponse_({ status: "error", message: "Unknown command" });
    }

    if (isPrivilegedCommand_(command)) {
      const accessError = assertPrivilegedAccess_(e.parameter || {}, command);
      if (accessError) {
        return accessError;
      }
    }

    return handler(e.parameter || {});
  } catch (error) {
    console.error("PEPTQ_GET_ERROR", String(error));
    return jsonResponse_({ status: "error", message: "Internal error" });
  }
}

function routeBridgeAction_(params, actionRaw) {
  const action = String(actionRaw || "").trim().toLowerCase();
  const id = String(params.id || "").trim();

  if (action === "portalLogin") {
    return handleVerifyPortalPin_({ email: id, member_pin: params.portalPin || "" });
  }

  if (action === "requestOtp") {
    return handleSendAuthEmailCode_({ email: id });
  }

  if (action === "verifyOtp") {
    return handleVerifyAuthEmailCode_({ email: id, code: params.code || "" });
  }

  if (action === "totpSetup") {
    return handleInitTotpSetup_({ email: id });
  }

  if (action === "totpVerify") {
    return handleVerifyTotpCode_({ email: id, code: params.code || "" });
  }

  if (action === "qrInit") {
    return handleInitQrLogin_({ email: id, app_url: params.appUrl || "" });
  }

  if (action === "qrStatus") {
    return handleGetQrLoginStatus_({ token: params.token || "" });
  }

  if (action === "qrApprove") {
    return handleApproveQrLogin_({ token: params.token || "", code: params.code || "" });
  }

  if (action === "lookup") {
    return handleGetIdentityStatus_({ email: id });
  }

  return jsonResponse_({
    success: false,
    status: "error",
    code: "ERR_UNSUPPORTED_ACTION",
    action: actionRaw,
    message: "This portal verification method is not enabled on the active Apps Script deployment yet."
  });
}

const PRIVILEGED_COMMANDS_ = {
  APPROVE_MEMBER: true,
  UPDATE_ROLE: true,
  SUSPEND_MEMBER: true,
  SEARCH_MEMBER_ORDERS: true,
  GET_PREORDERS: true,
  GET_ORDER_STATUS_SUMMARY: true,
  MAP_ORDER_COA: true,
  UPSERT_LOT_METADATA: true,
  GET_WAITLIST_ENTRIES: true,
  GET_DELETE_REQUESTS: true,
  GET_DISCOUNT_CODES: true,
  PROMOTE_WAITLIST_ENTRY: true,
  UPSERT_DISCOUNT_CODE: true,
  GET_LOW_STOCK_DASHBOARD: true,
  GET_PROCUREMENT_INSIGHTS: true,
  GET_INVENTORY_MOVEMENT_HISTORY: true,
  GET_PROVIDER_STATUS: true,
  UPDATE_SYSTEM_SETTINGS: true,
  SAVE_EMAIL_PROVIDER_SECRET: true,
  CLEAR_EMAIL_PROVIDER_SECRET: true,
  SEND_LOW_STOCK_ALERTS: true,
  CONFIGURE_LOW_STOCK_ALERT_SCHEDULE: true,
  GET_ADMIN_QUICK_LINKS: true,
  UPSERT_SITE_LAYOUT: true,
  SAVE_SITE_ASSET: true,
  CREATE_CATALOG_PRODUCT: true,
  FETCH_PUBCHEM_PROXY: true,
  UPDATE_CATALOG_VISIBILITY: true,
  UPDATE_CATALOG_PRICE: true,
  DELETE_CATALOG_PRODUCT: true,
  MANUAL_STOCK_ADJUSTMENT: true,
  SYNC_CATALOG_TO_FIRESTORE: true,
  CREATE_ASSET: true,
  ACCEPT_ORDER: true,
  UPDATE_TRACKING: true,
  SHIP_ORDER: true,
  MARK_DELIVERED: true,
  SEND_DELIVERY_CONFIRMATION: true,
  COMPLETE_ORDER: true,
  CANCEL_ORDER: true,
  GENERATE_INVOICE: true,
  SEND_INVOICE: true,
  MARK_PAID: true,
  ARCHIVE_FULFILLED: true,
  ALERT_ORDER: true,
  UPDATE_ORDER: true,
  UPDATE_PREORDER_STATUS: true,
  ISSUE_TEMP_MEMBER_PIN: true
};

const OWNER_BOOTSTRAP_EMAIL_ = "info@peptq.com";
const ACCESS_ROLES_ = {
  GUEST: true,
  MEMBER: true,
  OWNER: true
};

const PRIVILEGED_ROLES_ = {
  OWNER: true
};

function canonicalizeAccessRole_(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "GUEST";
  if (raw === "ADMIN") return "OWNER";
  if (raw === "USER") return "MEMBER";
  if (ACCESS_ROLES_[raw]) return raw;
  return "GUEST";
}

function isPrivilegedCommand_(command) {
  return Boolean(PRIVILEGED_COMMANDS_[String(command || "").trim().toUpperCase()]);
}

function assertPrivilegedAccess_(payload, command) {
  const actorEmail = normalizeEmail_(
    payload.actor_email
    || payload.actorEmail
    || payload.admin_email
    || payload.adminEmail
    || payload.requested_by
    || payload.requestedBy
    || ""
  );

  if (!actorEmail) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_ACTOR",
      command: command,
      message: "Privileged command requires actor_email"
    });
  }

  const actorRole = resolveMemberRoleByEmail_(actorEmail);
  if (!PRIVILEGED_ROLES_[actorRole]) {
    return jsonResponse_({
      status: "error",
      code: "ERR_FORBIDDEN",
      command: command,
      actor_email: actorEmail,
      message: "Privileged command requires OWNER role"
    });
  }

  return null;
}

function resolveMemberRoleByEmail_(email) {
  const normalizedEmail = normalizeEmail_(email);
  if (!normalizedEmail) return "GUEST";

  const roleFromMembers = resolveRoleByEmailFromSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS, normalizedEmail);
  if (roleFromMembers) return roleFromMembers;

  // Fallback for bootstrap identities currently maintained in the Owner sheet.
  const roleFromLegacy = resolveRoleByEmailFromSheet_(PEPTQ_CONFIG.SHEETS.OWNER_META, normalizedEmail);
  if (roleFromLegacy) return roleFromLegacy;

  if (normalizedEmail === OWNER_BOOTSTRAP_EMAIL_) {
    return "OWNER";
  }

  return "GUEST";
}

function resolveRoleByEmailFromSheet_(sheetName, normalizedEmail) {
  try {
    const sheet = getSheet_(sheetName);
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow < 2 || lastColumn < 1) return "";

    const rows = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
    const headers = rows[0].map(function (value) {
      return String(value || "").trim().toLowerCase();
    });

    const emailIndex = headers.indexOf("email");
    const roleIndex = headers.indexOf("role");
    const accountDeleteIndex = headers.indexOf("account_delete");
    const deleteStateIndex = headers.indexOf("delete");

    if (emailIndex === -1 || roleIndex === -1) return "";

    for (var i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      if (normalizeEmail_(row[emailIndex]) !== normalizedEmail) continue;

      if (accountDeleteIndex !== -1 && toBoolean_(row[accountDeleteIndex])) {
        return "";
      }

      if (deleteStateIndex !== -1) {
        const deleteState = String(row[deleteStateIndex] || "").trim().toUpperCase();
        if (deleteState === "DEACTIVE" || deleteState === "DELETE") {
          return "";
        }
      }

      return canonicalizeAccessRole_(row[roleIndex]);
    }

    return "";
  } catch (error) {
    console.warn("ROLE_RESOLUTION_FALLBACK_ERROR", String(error));
    return "";
  }
}

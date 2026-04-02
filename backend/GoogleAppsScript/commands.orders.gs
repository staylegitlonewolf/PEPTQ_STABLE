function handleSubmitOrder_(payload) {
  const memberEmail = normalizeEmail_(payload.member_email || payload.email);
  if (!memberEmail) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_MEMBER_EMAIL",
      command: "SUBMIT_ORDER",
      message: "member_email is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const ordersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ORDERS);
    const orderHeaders = getOrdersHeaders_();
    ensureHeaders_(ordersSheet, orderHeaders);

    const items = parseItemsJson_(payload.items_json);
    if (!items.length) {
      return jsonResponse_({
        status: "error",
        code: "ERR_EMPTY_ITEMS",
        command: "SUBMIT_ORDER",
        message: "items_json must include at least one item"
      });
    }

    const orderId = toTextOrEmpty_(payload.order_id) || createOrderId_(new Date());
    const shippingData = toTextOrEmpty_(payload.shipping_data || payload.shippingData);
    const researchPurpose = toTextOrEmpty_(payload.research_purpose || payload.researchPurpose);
    const discountCode = normalizeDiscountCode_(payload.discount_code || payload.discountCode);
    const discountPct = Number(payload.discount_pct || payload.discountPct || 0);
    const discountScope = normalizeDiscountScope_(payload.discount_scope || payload.discountScope);
    const discountProductHandle = toTextOrEmpty_(payload.discount_product_handle || payload.discountProductHandle).toLowerCase();
    if (!researchPurpose) {
      return jsonResponse_({
        status: "error",
        code: "ERR_MISSING_RESEARCH_PURPOSE",
        command: "SUBMIT_ORDER",
        message: "research_purpose is required"
      });
    }
    const totalAmount = resolveTotalAmount_(payload.total_amount, items);
    const now = new Date();
    const actorEmail = normalizeEmail_(payload.actor_email || payload.actor || memberEmail);
    const itemHandles = items
      .map(function (item) { return toTextOrEmpty_(item.handle || item.id || item.name).toLowerCase(); })
      .filter(Boolean);
    var consumedDiscount = null;
    if (discountCode) {
      const discountValidation = handleValidateDiscountCode_({
        code: discountCode,
        product_handles: itemHandles
      });
      if (discountValidation && typeof discountValidation.getContent === "function") {
        const parsedValidation = JSON.parse(discountValidation.getContent());
        if (parsedValidation.status !== "success") {
          return jsonResponse_(parsedValidation);
        }
      }
    }

    const inventoryValidation = validateCatalogInventoryAvailability_(items);
    if (!inventoryValidation.ok) {
      return jsonResponse_({
        status: "error",
        code: "ERR_INSUFFICIENT_STOCK",
        command: "SUBMIT_ORDER",
        shortages: inventoryValidation.shortages,
        message: "Insufficient tracked stock for one or more requested items."
      });
    }

    if (discountCode) {
      const consumeResult = consumeDiscountCode_(discountCode, memberEmail, orderId, payload.actor_email || memberEmail);
      if (!consumeResult || !consumeResult.ok) {
        return jsonResponse_({
          status: "error",
          code: consumeResult && consumeResult.code ? consumeResult.code : "ERR_DISCOUNT_CONSUME_FAILED",
          command: "SUBMIT_ORDER",
          message: consumeResult && consumeResult.message ? consumeResult.message : "Unable to apply discount code."
        });
      }
      consumedDiscount = consumeResult.record || null;
    }

    const noteParts = [];
    if (researchPurpose) {
      noteParts.push("Research Purpose: " + researchPurpose);
    }
    if (consumedDiscount || discountCode) {
      var effectiveDiscountCode = consumedDiscount ? consumedDiscount.code : discountCode;
      var effectiveDiscountPct = consumedDiscount ? consumedDiscount.discount_pct : discountPct;
      var effectiveScope = consumedDiscount ? consumedDiscount.scope : discountScope;
      var effectiveProductHandle = consumedDiscount ? consumedDiscount.product_handle : discountProductHandle;
      var discountDescriptor = "Discount Code: " + effectiveDiscountCode + " (" + Number(effectiveDiscountPct || 0).toFixed(2).replace(/\.00$/, "") + "% off";
      if (effectiveScope === "PRODUCT" && effectiveProductHandle) {
        discountDescriptor += " on " + effectiveProductHandle;
      }
      if (consumedDiscount && consumedDiscount.is_single_use) {
        discountDescriptor += ", one-time";
      }
      discountDescriptor += ")";
      noteParts.push(discountDescriptor);
    }

    const row = [
      orderId,
      now,
      memberEmail,
      JSON.stringify(items),
      totalAmount,
      shippingData,
      "PENDING",
      "",
      noteParts.join(" | "),
      "UNPAID",
      "",
      "",
      ""
    ];

    const nextRow = Math.max(ordersSheet.getLastRow(), 1) + 1;
    ordersSheet.getRange(nextRow, 1, 1, orderHeaders.length).setValues([row]);
    const inventoryColumn = ensureOrderInventoryProcessedColumn_(ordersSheet);
    const inventoryResult = decrementCatalogInventory_(items);
    const inventoryReserved = Number(inventoryResult.processed_rows || 0) > 0;
    ordersSheet.getRange(nextRow, inventoryColumn).setValue(inventoryReserved);

    appendInventoryMovementLog_(inventoryResult.changes, {
      direction: "OUT",
      command: "SUBMIT_ORDER",
      actor_email: actorEmail,
      order_id: orderId
    });

    if (inventoryReserved || inventoryResult.warnings.length) {
      appendOrderNote_(
        ordersSheet,
        nextRow,
        formatInventoryMutationNote_("Inventory reserved on order submit", inventoryResult),
        actorEmail
      );
    }

    if (payload.send_alert !== false) {
      sendOrderAlertEmail_(orderId, memberEmail, totalAmount, items);
    }

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_ORDER_CREATED",
      command: "SUBMIT_ORDER",
      order_id: orderId,
      member_email: memberEmail,
      order_status: "PENDING",
      payment_status: "UNPAID",
      total_amount: totalAmount,
      reserved_inventory_rows: Number(inventoryResult.processed_rows || 0),
      created_at: now.toISOString(),
      message: "Order created"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleSubmitPreorder_(payload) {
  const memberEmail = normalizeEmail_(payload.member_email || payload.email);
  const productHandle = toTextOrEmpty_(payload.product_handle || payload.handle).toLowerCase();
  const requestedQty = Math.max(1, Math.round(Number(payload.requested_qty || payload.quantity || 1)));
  const catalogSource = toTextOrEmpty_(payload.catalog_source || payload.catalogSource || "").toUpperCase();

  if (!memberEmail) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_MEMBER_EMAIL",
      command: "SUBMIT_PREORDER",
      message: "member_email is required"
    });
  }

  if (!productHandle) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_PRODUCT_HANDLE",
      command: "SUBMIT_PREORDER",
      message: "product_handle is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const memberProfile = resolvePreorderMemberRecord_(memberEmail);
    if (!memberProfile) {
      return jsonResponse_({
        status: "error",
        code: "ERR_PREORDER_MEMBER_NOT_APPROVED",
        command: "SUBMIT_PREORDER",
        member_email: memberEmail,
        message: "Approved member record not found for preorder."
      });
    }

    const catalogState = resolvePreorderCatalogStateByHandle_(productHandle, catalogSource);
    if (!catalogState.found) {
      return jsonResponse_({
        status: "error",
        code: "ERR_PREORDER_PRODUCT_NOT_FOUND",
        command: "SUBMIT_PREORDER",
        product_handle: productHandle,
        message: "Catalog product not found."
      });
    }

    if (!catalogState.out_of_stock) {
      return jsonResponse_({
        status: "error",
        code: "ERR_PREORDER_PRODUCT_AVAILABLE",
        command: "SUBMIT_PREORDER",
        product_handle: productHandle,
        message: "Product is currently in stock. Use the regular order flow instead."
      });
    }

    const preordersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.PREORDERS);
    const preorderHeaders = getPreorderHeaders_();
    ensureHeaders_(preordersSheet, preorderHeaders);

    const existingOpenPreorder = findOpenPreorderByMemberAndHandle_(preordersSheet, preorderHeaders, memberEmail, productHandle);
    if (existingOpenPreorder) {
      return jsonResponse_({
        status: "error",
        code: "ERR_PREORDER_ALREADY_OPEN",
        command: "SUBMIT_PREORDER",
        preorder_id: existingOpenPreorder.preorder_id,
        member_email: memberEmail,
        product_handle: productHandle,
        preorder_status: existingOpenPreorder.status,
        message: "An open preorder already exists for this member and product."
      });
    }

    const now = new Date();
    const preorderId = createPreorderId_(now);
    const resolvedFullName = toTextOrEmpty_(
      memberProfile.full_name || payload.full_name || payload.fullName || ""
    );
    const resolvedBusinessName = toTextOrEmpty_(
      memberProfile.business_name || payload.business_name || payload.businessName || ""
    );
    const resolvedPhone = toTextOrEmpty_(
      memberProfile.phone || payload.phone || payload.phone_number || payload.phoneNumber || ""
    );
    const row = [
      now,
      preorderId,
      memberEmail,
      resolvedFullName,
      resolvedBusinessName,
      resolvedPhone,
      productHandle,
      toTextOrEmpty_(catalogState.title || payload.product_title || payload.title || productHandle),
      requestedQty,
      "PENDING",
      "",
      "",
      "",
      now
    ];

    const nextRow = Math.max(preordersSheet.getLastRow(), 1) + 1;
    preordersSheet.getRange(nextRow, 1, 1, preorderHeaders.length).setValues([row]);

    sendPreorderAlertEmail_({
      preorder_id: preorderId,
      member_email: memberEmail,
      full_name: resolvedFullName,
      business_name: resolvedBusinessName,
      phone: resolvedPhone,
      product_handle: productHandle,
      product_title: catalogState.title || payload.product_title || payload.title || productHandle,
      requested_qty: requestedQty
    });

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_PREORDER_CREATED",
      command: "SUBMIT_PREORDER",
      preorder_id: preorderId,
      member_email: memberEmail,
      product_handle: productHandle,
      requested_qty: requestedQty,
      preorder_status: "PENDING",
      created_at: now.toISOString(),
      message: "Preorder created"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleGetPreorders_(payload) {
  const sheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.PREORDERS);
  const headers = getPreorderHeaders_();
  ensureHeaders_(sheet, headers);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse_({
      status: "success",
      code: "SUCCESS_PREORDERS",
      command: "GET_PREORDERS",
      count: 0,
      preorders: []
    });
  }

  const statusFilter = toTextOrEmpty_(payload.status || "").toUpperCase();
  const handleFilter = toTextOrEmpty_(payload.product_handle || payload.handle || "").toLowerCase();
  const memberEmailFilter = normalizeEmail_(payload.member_email || payload.email || "");
  const limitRaw = Number(payload.limit || 200);
  const limit = isNaN(limitRaw) ? 200 : Math.max(1, Math.min(500, limitRaw));

  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const preorders = rows
    .map(function (row) {
      return {
        timestamp: row[0] ? new Date(row[0]).toISOString() : "",
        preorder_id: toTextOrEmpty_(row[1]),
        member_email: normalizeEmail_(row[2]),
        full_name: toTextOrEmpty_(row[3]),
        business_name: toTextOrEmpty_(row[4]),
        phone: toTextOrEmpty_(row[5]),
        product_handle: toTextOrEmpty_(row[6]).toLowerCase(),
        product_title: toTextOrEmpty_(row[7]),
        requested_qty: Number(row[8] || 0),
        status: toTextOrEmpty_(row[9]).toUpperCase(),
        owner_notes: toTextOrEmpty_(row[10]),
        notified_at: row[11] ? new Date(row[11]).toISOString() : "",
        converted_order_id: toTextOrEmpty_(row[12]),
        last_updated: row[13] ? new Date(row[13]).toISOString() : ""
      };
    })
    .filter(function (entry) {
      if (statusFilter && entry.status !== statusFilter) return false;
      if (handleFilter && entry.product_handle !== handleFilter) return false;
      if (memberEmailFilter && entry.member_email !== memberEmailFilter) return false;
      return true;
    })
    .sort(function (a, b) {
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    })
    .slice(0, limit);

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_PREORDERS",
    command: "GET_PREORDERS",
    count: preorders.length,
    preorders: preorders
  });
}

function handleUpdatePreorderStatus_(payload) {
  const preorderId = toTextOrEmpty_(payload.preorder_id);
  const nextStatus = toTextOrEmpty_(payload.status).toUpperCase();
  const actorEmail = normalizeEmail_(payload.actor_email || payload.actorEmail || payload.actor || "");
  const ownerNotes = toTextOrEmpty_(payload.owner_notes || payload.note || "");
  const convertedOrderId = toTextOrEmpty_(payload.converted_order_id || payload.order_id || "");

  if (!preorderId) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_PREORDER_ID",
      command: "UPDATE_PREORDER_STATUS",
      message: "preorder_id is required"
    });
  }

  if (!isValidPreorderStatus_(nextStatus)) {
    return jsonResponse_({
      status: "error",
      code: "ERR_INVALID_PREORDER_STATUS",
      command: "UPDATE_PREORDER_STATUS",
      message: "Unsupported preorder status"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.PREORDERS);
    const headers = getPreorderHeaders_();
    ensureHeaders_(sheet, headers);

    const rowIndex = findRowByColumnValue_(sheet, "preorder_id", preorderId);
    if (!rowIndex) {
      return jsonResponse_({
        status: "error",
        code: "ERR_PREORDER_NOT_FOUND",
        command: "UPDATE_PREORDER_STATUS",
        preorder_id: preorderId,
        message: "Preorder not found"
      });
    }

    const headerMap = getHeaderMap_(sheet, Math.max(sheet.getLastColumn(), headers.length)).map;
    const currentStatus = toTextOrEmpty_(sheet.getRange(rowIndex, headerMap.status || 10).getValue()).toUpperCase();
    const now = new Date();

    sheet.getRange(rowIndex, headerMap.status || 10).setValue(nextStatus);
    if (ownerNotes) {
      sheet.getRange(rowIndex, headerMap.owner_notes || 11).setValue(ownerNotes);
    }
    if (nextStatus === "CONTACTED") {
      sheet.getRange(rowIndex, headerMap.notified_at || 12).setValue(now);
    }
    if (convertedOrderId) {
      sheet.getRange(rowIndex, headerMap.converted_order_id || 13).setValue(convertedOrderId);
    }
    sheet.getRange(rowIndex, headerMap.last_updated || 14).setValue(now);

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_PREORDER_UPDATED",
      command: "UPDATE_PREORDER_STATUS",
      preorder_id: preorderId,
      previous_status: currentStatus,
      preorder_status: nextStatus,
      last_updated: now.toISOString(),
      message: "Preorder updated"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleAlertOrder_(payload) {
  const orderId = toTextOrEmpty_(payload.order_id);
  if (!orderId) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_ORDER_ID",
      command: "ALERT_ORDER",
      message: "order_id is required"
    });
  }

  const ordersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ORDERS);
  const orderHeaders = getOrdersHeaders_();
  ensureHeaders_(ordersSheet, orderHeaders);

  const orderRow = findRowByColumnValue_(ordersSheet, "order_id", orderId);
  if (!orderRow) {
    return jsonResponse_({
      status: "error",
      code: "ERR_ORDER_NOT_FOUND",
      command: "ALERT_ORDER",
      order_id: orderId,
      message: "Order not found"
    });
  }

  const values = ordersSheet.getRange(orderRow, 1, 1, orderHeaders.length).getValues()[0];
  const items = parseItemsJson_(values[3]);
  sendOrderAlertEmail_(String(values[0] || orderId), normalizeEmail_(values[2]), Number(values[4] || 0), items);
  appendOrderNote_(ordersSheet, orderRow, "Order alert sent", payload.actor_email || payload.actor || "SYSTEM");

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_ORDER_ALERT_SENT",
    command: "ALERT_ORDER",
    order_id: String(values[0] || orderId),
    message: "Order alert sent"
  });
}

function handleUpdateOrder_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const ordersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ORDERS);
    const orderHeaders = getOrdersHeaders_();
    ensureHeaders_(ordersSheet, orderHeaders);

    const orderRow = findOrderRow_(ordersSheet, payload);
    if (!orderRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_ORDER_NOT_FOUND",
        command: "UPDATE_ORDER",
        message: "Order not found"
      });
    }

    const applied = [];
    const orderValues = ordersSheet.getRange(orderRow, 1, 1, orderHeaders.length).getValues()[0];
    const inventoryColumn = ensureOrderInventoryProcessedColumn_(ordersSheet);
    const inventoryProcessed = toBoolean_(ordersSheet.getRange(orderRow, inventoryColumn).getValue());
    if ("items_json" in payload) {
      const nextItems = parseItemsJson_(payload.items_json);
      if (!nextItems.length) {
        return jsonResponse_({
          status: "error",
          code: "ERR_EMPTY_ITEMS",
          command: "UPDATE_ORDER",
          message: "items_json must include at least one item"
        });
      }

      const currentItems = parseItemsJson_(orderValues[3]);
      const itemsChanged = !orderItemsEqual_(currentItems, nextItems);
      if (itemsChanged) {
        let releaseResult = { processed_rows: 0, warnings: [], changes: [] };
        let reserveResult = { processed_rows: 0, warnings: [], changes: [] };

        if (inventoryProcessed) {
          releaseResult = restoreCatalogInventory_(currentItems);
        }

        const inventoryValidation = validateCatalogInventoryAvailability_(nextItems);
        if (!inventoryValidation.ok) {
          if (inventoryProcessed) {
            decrementCatalogInventory_(currentItems);
          }

          return jsonResponse_({
            status: "error",
            code: "ERR_INSUFFICIENT_STOCK",
            command: "UPDATE_ORDER",
            order_id: String(orderValues[0] || ""),
            shortages: inventoryValidation.shortages,
            message: "Insufficient tracked stock for the updated item set."
          });
        }

        reserveResult = decrementCatalogInventory_(nextItems);
        ordersSheet.getRange(orderRow, inventoryColumn).setValue(Number(reserveResult.processed_rows || 0) > 0);

        if (releaseResult.changes && releaseResult.changes.length) {
          appendInventoryMovementLog_(releaseResult.changes, {
            direction: "IN",
            command: "UPDATE_ORDER",
            actor_email: payload.actor_email || payload.actor || "SYSTEM",
            order_id: String(orderValues[0] || "")
          });
        }

        if (reserveResult.changes && reserveResult.changes.length) {
          appendInventoryMovementLog_(reserveResult.changes, {
            direction: "OUT",
            command: "UPDATE_ORDER",
            actor_email: payload.actor_email || payload.actor || "SYSTEM",
            order_id: String(orderValues[0] || "")
          });
        }

        if ((releaseResult.processed_rows || 0) > 0 || (reserveResult.processed_rows || 0) > 0 || releaseResult.warnings.length || reserveResult.warnings.length) {
          appendOrderNote_(
            ordersSheet,
            orderRow,
            "Inventory rebalanced for order update"
              + " | released_rows=" + Number(releaseResult.processed_rows || 0)
              + " | reserved_rows=" + Number(reserveResult.processed_rows || 0)
              + (releaseResult.warnings.length ? " | release_warnings=" + releaseResult.warnings.join("; ") : "")
              + (reserveResult.warnings.length ? " | reserve_warnings=" + reserveResult.warnings.join("; ") : ""),
            payload.actor_email || payload.actor || "SYSTEM"
          );
        }
      }

      ordersSheet.getRange(orderRow, 4).setValue(JSON.stringify(nextItems));
      if (!("total_amount" in payload)) {
        ordersSheet.getRange(orderRow, 5).setValue(resolveTotalAmount_("", nextItems));
      }
      applied.push("items_json");
    }

    if ("shipping_data" in payload) {
      ordersSheet.getRange(orderRow, 6).setValue(toTextOrEmpty_(payload.shipping_data));
      applied.push("shipping_data");
    }

    if ("total_amount" in payload) {
      const total = Number(payload.total_amount || 0);
      ordersSheet.getRange(orderRow, 5).setValue(isNaN(total) ? 0 : Number(total.toFixed(2)));
      applied.push("total_amount");
    }

    appendOrderNote_(ordersSheet, orderRow, "Order updated fields=" + applied.join(","), payload.actor_email || payload.actor || "SYSTEM");

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_ORDER_UPDATED",
      command: "UPDATE_ORDER",
      order_id: String(ordersSheet.getRange(orderRow, 1).getValue() || ""),
      updated_fields: applied,
      message: "Order updated"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleSearchMemberOrders_(payload) {
  const query = String(payload.query || payload.search || "").trim().toLowerCase();
  if (!query) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_QUERY",
      command: "SEARCH_MEMBER_ORDERS",
      message: "query is required"
    });
  }

  const membersSheet = getSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
  const ordersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ORDERS);
  const orderHeaders = getOrdersHeaders_();
  ensureHeaders_(ordersSheet, orderHeaders);

  const members = [];
  const memberLastRow = membersSheet.getLastRow();
  if (memberLastRow >= 2) {
    const rows = membersSheet.getRange(2, 1, memberLastRow - 1, 20).getValues();
    rows.forEach(function (row) {
      const email = normalizeEmail_(row[1]);
      const fullName = String(row[2] || "").trim();
      const role = String(row[3] || "").trim();
      const combined = (email + " " + fullName + " " + role).toLowerCase();
      if (combined.indexOf(query) === -1) return;
      members.push({
        uid: String(row[0] || ""),
        email: email,
        full_name: fullName,
        role: role
      });
    });
  }

  const orders = [];
  const orderLastRow = ordersSheet.getLastRow();
  if (orderLastRow >= 2) {
    const rows = ordersSheet.getRange(2, 1, orderLastRow - 1, orderHeaders.length).getValues();
    rows.forEach(function (row) {
      const combined = (
        String(row[0] || "") + " " +
        String(row[2] || "") + " " +
        String(row[6] || "") + " " +
        String(row[8] || "")
      ).toLowerCase();
      if (combined.indexOf(query) === -1) return;
      orders.push({
        order_id: String(row[0] || ""),
        member_email: normalizeEmail_(row[2]),
        status: String(row[6] || ""),
        payment_status: String(row[9] || ""),
        total_amount: Number(row[4] || 0)
      });
    });
  }

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_SEARCH_RESULTS",
    command: "SEARCH_MEMBER_ORDERS",
    query: query,
    members: members,
    orders: orders,
    member_count: members.length,
    order_count: orders.length
  });
}

function handleGetOrderStatusSummary_(payload) {
  const ordersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ORDERS);
  const orderHeaders = getOrdersHeaders_();
  ensureHeaders_(ordersSheet, orderHeaders);

  const lastRow = ordersSheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse_({
      status: "success",
      code: "SUCCESS_ORDER_STATUS_SUMMARY",
      command: "GET_ORDER_STATUS_SUMMARY",
      total_orders: 0,
      unique_status_count: 0,
      status_breakdown: {},
      normalized_status_breakdown: {},
      message: "No orders available"
    });
  }

  const rows = ordersSheet.getRange(2, 1, lastRow - 1, orderHeaders.length).getValues();
  const rawBreakdown = {};
  const normalizedBreakdown = {};

  rows.forEach(function (row) {
    const rawStatus = String(row[6] || "").trim();
    const normalizedStatus = rawStatus.toUpperCase();

    const rawKey = rawStatus || "(blank)";
    const normalizedKey = normalizedStatus || "(BLANK)";

    rawBreakdown[rawKey] = (rawBreakdown[rawKey] || 0) + 1;
    normalizedBreakdown[normalizedKey] = (normalizedBreakdown[normalizedKey] || 0) + 1;
  });

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_ORDER_STATUS_SUMMARY",
    command: "GET_ORDER_STATUS_SUMMARY",
    total_orders: rows.length,
    unique_status_count: Object.keys(rawBreakdown).length,
    status_breakdown: rawBreakdown,
    normalized_status_breakdown: normalizedBreakdown,
    message: "Order status summary generated"
  });
}

function sendOrderAlertEmail_(orderId, memberEmail, totalAmount, items) {
  try {
    const recipient = String(getNotificationRecipient_() || "").trim();
    if (!recipient) return;

    const itemSummary = (items || []).map(function (item) {
      return String(item.name || item.handle || "Item") + " x" + String(item.quantity || 1);
    }).join(", ");

    sendPlatformEmail_({
      to: recipient,
      subject: "PEPTQ Procurement Alert: " + orderId,
      category: "ORDER",
      body:
        "New procurement request submitted.\n\n" +
        "Order ID: " + orderId + "\n" +
        "Member Email: " + memberEmail + "\n" +
        "Total Amount: " + totalAmount + "\n" +
        "Items: " + itemSummary + "\n"
    });
  } catch (error) {
    console.warn("ORDER_ALERT_EMAIL_FAILED", String(error));
  }
}

function handleAcceptOrder_(payload) {
  return updateOrderStatus_(payload, {
    command: "ACCEPT_ORDER",
    nextStatus: "ORDER RECEIVED",
    successCode: "SUCCESS_ORDER_ACCEPTED",
    notePrefix: "Order accepted",
    beforeStatusChange: function (context) {
      const inventoryColumn = ensureOrderInventoryProcessedColumn_(context.ordersSheet);
      const alreadyProcessed = toBoolean_(context.ordersSheet.getRange(context.orderRow, inventoryColumn).getValue());
      if (alreadyProcessed) return null;

      const items = parseItemsJson_(context.orderValues[3]);
      if (!items.length) return null;

      const inventoryValidation = validateCatalogInventoryAvailability_(items);
      if (!inventoryValidation.ok) {
        return {
          status: "error",
          code: "ERR_INSUFFICIENT_STOCK",
          command: "ACCEPT_ORDER",
          order_id: context.orderId,
          shortages: inventoryValidation.shortages,
          message: "Insufficient tracked stock for one or more requested items."
        };
      }

      const inventoryResult = decrementCatalogInventory_(items);
      if (inventoryResult.processed_rows > 0) {
        context.ordersSheet.getRange(context.orderRow, inventoryColumn).setValue(true);
      }
      appendInventoryMovementLog_(inventoryResult.changes, {
        direction: "OUT",
        command: "ACCEPT_ORDER",
        actor_email: context.actorEmail,
        order_id: context.orderId
      });

      if (inventoryResult.processed_rows > 0 || inventoryResult.warnings.length) {
        appendOrderNote_(
          context.ordersSheet,
          context.orderRow,
          formatInventoryMutationNote_("Inventory decremented", inventoryResult),
          context.actorEmail
        );
      }

      payload._inventory_decrement_result = inventoryResult;
      return null;
    }
  });
}

function handleUpdateTracking_(payload) {
  const trackingNum = toTextOrEmpty_(payload.tracking_num || payload.trackingNumber);
  if (!trackingNum) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_TRACKING",
      command: "UPDATE_TRACKING",
      message: "tracking_num is required"
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const ordersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ORDERS);
    const orderHeaders = getOrdersHeaders_();
    ensureHeaders_(ordersSheet, orderHeaders);

    const orderRow = findOrderRow_(ordersSheet, payload);
    if (!orderRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_ORDER_NOT_FOUND",
        command: "UPDATE_TRACKING",
        message: "Order not found"
      });
    }

    ordersSheet.getRange(orderRow, 8).setValue(trackingNum);

    const currentStatus = String(ordersSheet.getRange(orderRow, 7).getValue() || "").trim().toUpperCase();
    if (!currentStatus || currentStatus === "PENDING") {
      ordersSheet.getRange(orderRow, 7).setValue("PROCESSING");
    }

    appendOrderNote_(ordersSheet, orderRow, "Tracking updated", payload.actor_email || payload.actor || "SYSTEM");

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_TRACKING_UPDATED",
      command: "UPDATE_TRACKING",
      order_id: String(ordersSheet.getRange(orderRow, 1).getValue() || ""),
      tracking_num: trackingNum,
      message: "Tracking updated"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleShipOrder_(payload) {
  const trackingNum = toTextOrEmpty_(payload.tracking_num || payload.trackingNumber);
  if (!trackingNum) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_TRACKING",
      command: "SHIP_ORDER",
      message: "tracking_num is required before shipping"
    });
  }

  payload.tracking_num = trackingNum;

  return updateOrderStatus_(payload, {
    command: "SHIP_ORDER",
    nextStatus: "SHIPPED",
    successCode: "SUCCESS_ORDER_SHIPPED",
    notePrefix: "Order shipped"
  });
}

function handleMarkDelivered_(payload) {
  return updateOrderStatus_(payload, {
    command: "MARK_DELIVERED",
    nextStatus: "DELIVERED",
    successCode: "SUCCESS_ORDER_DELIVERED",
    notePrefix: "Order marked delivered"
  });
}

function handleSendDeliveryConfirmation_(payload) {
  const orderId = toTextOrEmpty_(payload.order_id);
  if (!orderId) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_ORDER_ID",
      command: "SEND_DELIVERY_CONFIRMATION",
      message: "order_id is required"
    });
  }

  const ordersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ORDERS);
  const orderHeaders = getOrdersHeaders_();
  ensureHeaders_(ordersSheet, orderHeaders);

  const orderRow = findRowByColumnValue_(ordersSheet, "order_id", orderId);
  if (!orderRow) {
    return jsonResponse_({
      status: "error",
      code: "ERR_ORDER_NOT_FOUND",
      command: "SEND_DELIVERY_CONFIRMATION",
      order_id: orderId,
      message: "Order not found"
    });
  }

  const orderValues = ordersSheet.getRange(orderRow, 1, 1, orderHeaders.length).getValues()[0];
  const memberEmail = normalizeEmail_(orderValues[2]);
  const status = toTextOrEmpty_(orderValues[6]).toUpperCase();
  const trackingNum = toTextOrEmpty_(orderValues[7]);
  const actorEmail = toTextOrEmpty_(payload.actor_email || payload.actor || "SYSTEM");

  if (status !== "DELIVERED" && status !== "COMPLETED") {
    return jsonResponse_({
      status: "error",
      code: "ERR_DELIVERY_CONFIRMATION_STATUS",
      command: "SEND_DELIVERY_CONFIRMATION",
      order_id: orderId,
      order_status: status || "PENDING",
      message: "Delivery confirmation can only be sent after the order is marked delivered."
    });
  }

  if (!shouldSendMemberNotification_(memberEmail)) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MEMBER_EMAIL_NOT_AVAILABLE",
      command: "SEND_DELIVERY_CONFIRMATION",
      order_id: orderId,
      message: "Member email notifications are unavailable for this order."
    });
  }

  const shipping = parseOrderShippingData_(orderValues[5]);
  const recipientName = toTextOrEmpty_(shipping && shipping.recipient_name) || memberEmail || "Research Member";
  const addressSummary = buildShippingAddressSummary_(shipping);
  const deliveryInstructions = extractDeliveryInstructionText_(shipping);

  const lines = [
    "Hi " + recipientName + ",",
    "",
    "Your PEPTQ order " + orderId + " was marked delivered.",
    addressSummary ? "Delivered to: " + addressSummary : "Delivered to the shipping address on file.",
    trackingNum ? "Tracking: " + trackingNum : ""
  ];

  if (deliveryInstructions) {
    lines.push("Recorded delivery notes: " + deliveryInstructions);
  }

  lines.push(
    "",
    "Thank you for ordering with PEPTQ.",
    "If you need verification documents, visit the member portal document vault for your recorded order files.",
    "We appreciate your research partnership."
  );

  try {
    sendPlatformEmail_({
      to: memberEmail,
      subject: "PEPTQ Delivery Confirmation: " + orderId,
      body: lines.filter(Boolean).join("\n"),
      category: "ORDER"
    });
  } catch (error) {
    return jsonResponse_({
      status: "error",
      code: "ERR_DELIVERY_CONFIRMATION_FAILED",
      command: "SEND_DELIVERY_CONFIRMATION",
      order_id: orderId,
      message: String(error)
    });
  }

  appendOrderNote_(ordersSheet, orderRow, "Delivery confirmation email sent", actorEmail);

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_DELIVERY_CONFIRMATION_SENT",
    command: "SEND_DELIVERY_CONFIRMATION",
    order_id: orderId,
    member_email: memberEmail,
    order_status: status,
    message: "Delivery confirmation email sent"
  });
}

function handleCompleteOrder_(payload) {
  return updateOrderStatus_(payload, {
    command: "COMPLETE_ORDER",
    nextStatus: "COMPLETED",
    successCode: "SUCCESS_ORDER_COMPLETED",
    notePrefix: "Order marked completed"
  });
}

function handleMapOrderCoa_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const ordersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ORDERS);
    const orderHeaders = getOrdersHeaders_();
    ensureHeaders_(ordersSheet, orderHeaders);

    const orderRow = findOrderRow_(ordersSheet, payload);
    if (!orderRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_ORDER_NOT_FOUND",
        command: "MAP_ORDER_COA",
        message: "Order not found"
      });
    }

    var rawMap = payload.coa_map || payload.coaMap;
    if (typeof rawMap === "string") {
      try {
        rawMap = JSON.parse(rawMap);
      } catch (error) {
        rawMap = [];
      }
    }

    if (!Array.isArray(rawMap) || !rawMap.length) {
      return jsonResponse_({
        status: "error",
        code: "ERR_MISSING_COA_MAP",
        command: "MAP_ORDER_COA",
        message: "coa_map array is required"
      });
    }

    const mapped = rawMap
      .map(function (entry) {
        if (!entry || typeof entry !== "object") return null;
        const handle = toTextOrEmpty_(entry.handle || entry.item_handle || "");
        const lotId = toTextOrEmpty_(entry.lot_id || entry.lotId || "");
        const coaUrl = toTextOrEmpty_(entry.coa_url || entry.coaUrl || "");
        if (!handle || !coaUrl) return null;
        return {
          handle: handle,
          lot_id: lotId,
          coa_url: coaUrl
        };
      })
      .filter(Boolean);

    if (!mapped.length) {
      return jsonResponse_({
        status: "error",
        code: "ERR_INVALID_COA_MAP",
        command: "MAP_ORDER_COA",
        message: "coa_map must include handle and coa_url"
      });
    }

    const noteText = "CoA mapped: " + JSON.stringify(mapped);
    appendOrderNote_(ordersSheet, orderRow, noteText, payload.actor_email || payload.actor || "SYSTEM");

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_ORDER_COA_MAPPED",
      command: "MAP_ORDER_COA",
      order_id: String(ordersSheet.getRange(orderRow, 1).getValue() || ""),
      mapped_count: mapped.length,
      message: "Order CoA mapping saved"
    });
  } finally {
    lock.releaseLock();
  }
}

function getLotRegistryHeaders_() {
  return [
    "lot_id",
    "product_id",
    "coa_url",
    "purity_pct",
    "test_date",
    "expiry_date",
    "verification_state",
    "updated_at",
    "updated_by"
  ];
}

function ensureLotRegistryHeaders_(sheet) {
  const required = getLotRegistryHeaders_();
  const currentWidth = Math.max(sheet.getLastColumn(), required.length);
  const currentHeaders = sheet
    .getRange(1, 1, 1, currentWidth)
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });

  const nextHeaders = currentHeaders.slice();
  required.forEach(function (header) {
    if (nextHeaders.indexOf(header) === -1) {
      nextHeaders.push(header);
    }
  });

  sheet.getRange(1, 1, 1, nextHeaders.length).setValues([nextHeaders]);

  const indexMap = {};
  required.forEach(function (header) {
    indexMap[header] = nextHeaders.indexOf(header);
  });

  return indexMap;
}

function findCatalogProductForLot_(productIdRaw) {
  const productId = toTextOrEmpty_(productIdRaw).toLowerCase();
  if (!productId) return null;

  const catalogSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.CATALOG);
  const lastRow = catalogSheet.getLastRow();
  if (lastRow < 2) return null;

  const handleColumn = getColumnIndex_(catalogSheet, "handle") || 1;
  const skuColumn = getColumnIndex_(catalogSheet, "internal_sku") || 16;
  const titleColumn = getColumnIndex_(catalogSheet, "title") || 2;
  const width = Math.max(catalogSheet.getLastColumn(), handleColumn, skuColumn, titleColumn);
  const rows = catalogSheet.getRange(2, 1, lastRow - 1, width).getValues();

  for (var i = 0; i < rows.length; i += 1) {
    const handle = toTextOrEmpty_(rows[i][handleColumn - 1]).toLowerCase();
    const sku = toTextOrEmpty_(rows[i][skuColumn - 1]).toLowerCase();
    if (handle !== productId && sku !== productId) continue;

    return {
      product_id: handle || sku,
      internal_sku: toTextOrEmpty_(rows[i][skuColumn - 1]),
      title: toTextOrEmpty_(rows[i][titleColumn - 1])
    };
  }

  return null;
}

function handleUpsertLotMetadata_(payload) {
  const lotId = toTextOrEmpty_(payload.lot_id || payload.lotId);
  const productId = toTextOrEmpty_(payload.product_id || payload.productId || payload.sku || payload.handle);
  const coaUrl = toTextOrEmpty_(payload.coa_url || payload.coaUrl || "");
  const testDate = toTextOrEmpty_(payload.test_date || payload.testDate || "");
  const expiryDate = toTextOrEmpty_(payload.expiry_date || payload.expiryDate || "");
  const actorEmail = normalizeEmail_(payload.actor_email || payload.actorEmail || payload.actor || "");
  const requestedVerificationState = toTextOrEmpty_(payload.verification_state || payload.verificationState || "").toUpperCase();
  const isVerifiedFlag = toBoolean_(payload.verified || false);

  if (!lotId) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_LOT_ID",
      command: "UPSERT_LOT_METADATA",
      message: "lot_id is required"
    });
  }

  if (!productId) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_PRODUCT_ID",
      command: "UPSERT_LOT_METADATA",
      message: "product_id (SKU/handle) is required"
    });
  }

  const catalogProduct = findCatalogProductForLot_(productId);
  if (!catalogProduct) {
    return jsonResponse_({
      status: "error",
      code: "ERR_PRODUCT_NOT_FOUND",
      command: "UPSERT_LOT_METADATA",
      product_id: productId,
      message: "product_id must match a catalog handle or internal_sku"
    });
  }

  const purityRaw = Number(payload.purity_pct || payload.purityPct || 0);
  if (isNaN(purityRaw) || purityRaw < 0 || purityRaw > 100) {
    return jsonResponse_({
      status: "error",
      code: "ERR_INVALID_PURITY",
      command: "UPSERT_LOT_METADATA",
      message: "purity_pct must be a number between 0 and 100"
    });
  }

  const verificationState = requestedVerificationState === "VERIFIED"
    || isVerifiedFlag
    ? "VERIFIED"
    : "PENDING";

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const lotSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.LOT_REGISTRY);
    const lotHeaderMap = ensureLotRegistryHeaders_(lotSheet);
    const lastRow = lotSheet.getLastRow();
    const nowIso = new Date().toISOString();
    const normalizedLotId = lotId.toUpperCase();

    var targetRow = 0;
    if (lastRow >= 2) {
      const rows = lotSheet.getRange(2, 1, lastRow - 1, lotSheet.getLastColumn()).getValues();
      for (var i = 0; i < rows.length; i += 1) {
        const rowLotId = toTextOrEmpty_(rows[i][lotHeaderMap.lot_id]).toUpperCase();
        if (rowLotId === normalizedLotId) {
          targetRow = i + 2;
          break;
        }
      }
    }

    const rowData = new Array(lotSheet.getLastColumn()).fill("");
    rowData[lotHeaderMap.lot_id] = normalizedLotId;
    rowData[lotHeaderMap.product_id] = catalogProduct.product_id;
    rowData[lotHeaderMap.coa_url] = coaUrl;
    rowData[lotHeaderMap.purity_pct] = Number(purityRaw.toFixed(2));
    rowData[lotHeaderMap.test_date] = testDate;
    rowData[lotHeaderMap.expiry_date] = expiryDate;
    rowData[lotHeaderMap.verification_state] = verificationState;
    rowData[lotHeaderMap.updated_at] = nowIso;
    rowData[lotHeaderMap.updated_by] = actorEmail || "SYSTEM";

    if (!targetRow) {
      lotSheet.appendRow(rowData);
    } else {
      lotSheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    }

    return jsonResponse_({
      status: "success",
      code: targetRow ? "SUCCESS_LOT_UPDATED" : "SUCCESS_LOT_CREATED",
      command: "UPSERT_LOT_METADATA",
      upserted: true,
      created: !targetRow,
      lot_id: normalizedLotId,
      product_id: catalogProduct.product_id,
      internal_sku: catalogProduct.internal_sku,
      product_title: catalogProduct.title,
      verification_state: verificationState,
      message: targetRow ? "Lot metadata updated" : "Lot metadata created"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleGetLotMetadata_(payload) {
  const lotId = toTextOrEmpty_(payload.lot_id || payload.lotId);
  const productId = toTextOrEmpty_(payload.product_id || payload.productId);
  const normalizedLotId = lotId.toUpperCase();
  const normalizedProductId = productId.toLowerCase();

  if (!lotId) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_LOT_ID",
      command: "GET_LOT_METADATA",
      message: "lot_id is required"
    });
  }

  const lotSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.LOT_REGISTRY);
  const lotHeaderMap = ensureLotRegistryHeaders_(lotSheet);

  const lastRow = lotSheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse_({
      status: "error",
      code: "ERR_LOT_NOT_FOUND",
      command: "GET_LOT_METADATA",
      lot_id: lotId,
      verification_status: "Pending Verification",
      order_allowed: false,
      message: "Lot not found"
    });
  }

  const rows = lotSheet.getRange(2, 1, lastRow - 1, lotSheet.getLastColumn()).getValues();
  let matched = null;

  for (var i = 0; i < rows.length; i += 1) {
    const rowLotId = toTextOrEmpty_(rows[i][lotHeaderMap.lot_id]).toUpperCase();
    if (rowLotId === normalizedLotId) {
      matched = rows[i];
      break;
    }
  }

  if (!matched) {
    return jsonResponse_({
      status: "error",
      code: "ERR_LOT_NOT_FOUND",
      command: "GET_LOT_METADATA",
      lot_id: lotId,
      verification_status: "Pending Verification",
      order_allowed: false,
      message: "Lot not found"
    });
  }

  const response = {
    lot_id: toTextOrEmpty_(matched[lotHeaderMap.lot_id]),
    product_id: toTextOrEmpty_(matched[lotHeaderMap.product_id]),
    coa_url: toTextOrEmpty_(matched[lotHeaderMap.coa_url]),
    purity_pct: Number(matched[lotHeaderMap.purity_pct] || 0),
    test_date: toTextOrEmpty_(matched[lotHeaderMap.test_date]),
    expiry_date: toTextOrEmpty_(matched[lotHeaderMap.expiry_date]),
    verification_state: toTextOrEmpty_(matched[lotHeaderMap.verification_state] || "PENDING").toUpperCase()
  };

  const productMatches = !normalizedProductId || response.product_id.toLowerCase() === normalizedProductId;
  const hasCoa = Boolean(response.coa_url);
  const purityValid = !isNaN(response.purity_pct) && response.purity_pct > 98;
  const explicitVerification = response.verification_state === "VERIFIED";
  const verified = explicitVerification || (productMatches && hasCoa && purityValid);

  response.verification_status = verified ? "Verified Research Grade" : "Pending Verification";
  response.order_allowed = verified;

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_LOT_METADATA",
    command: "GET_LOT_METADATA",
    lot_metadata: response,
    message: "Lot metadata resolved"
  });
}

function handleGetLowStockDashboard_(payload) {
  const thresholdRaw = Number(payload.par_level || payload.threshold || 5);
  const threshold = isNaN(thresholdRaw) ? 5 : Math.max(0, thresholdRaw);

  const catalogSheet = getSheet_(PEPTQ_CONFIG.SHEETS.CATALOG);
  const lastRow = catalogSheet.getLastRow();

  const handleColumn = getColumnIndex_(catalogSheet, "handle") || 1;
  const titleColumn = getColumnIndex_(catalogSheet, "title") || 2;
  const bulkStockColumn = getColumnIndex_(catalogSheet, "bulk_stock");
  const visibleColumn = getColumnIndex_(catalogSheet, "visible") || 9;

  if (!bulkStockColumn) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_BULK_STOCK_COLUMN",
      command: "GET_LOW_STOCK_DASHBOARD",
      message: "bulk_stock column is required in catalog sheet"
    });
  }

  const lowStock = [];
  if (lastRow >= 2) {
    const width = Math.max(catalogSheet.getLastColumn(), bulkStockColumn, titleColumn, handleColumn, visibleColumn);
    const rows = catalogSheet.getRange(2, 1, lastRow - 1, width).getValues();
    rows.forEach(function (row) {
      const stock = Number(row[bulkStockColumn - 1] || 0);
      const visible = String(row[visibleColumn - 1] || "").trim().toUpperCase();
      if (stock > threshold) return;
      if (visible && visible !== "TRUE") return;

      lowStock.push({
        handle: String(row[handleColumn - 1] || ""),
        title: String(row[titleColumn - 1] || ""),
        bulk_stock: stock
      });
    });
  }

  lowStock.sort(function (a, b) {
    return Number(a.bulk_stock || 0) - Number(b.bulk_stock || 0);
  });

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_LOW_STOCK_DASHBOARD",
    command: "GET_LOW_STOCK_DASHBOARD",
    par_level: threshold,
    low_stock_count: lowStock.length,
    low_stock_items: lowStock
  });
}

function handleGetProcurementInsights_(payload) {
  const ordersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ORDERS);
  const orderHeaders = getOrdersHeaders_();
  ensureHeaders_(ordersSheet, orderHeaders);

  const lastRow = ordersSheet.getLastRow();
  const byCompound = {};
  const byMember = {};
  let totalOrders = 0;
  let totalAmount = 0;
  let pending = 0;
  let shipped = 0;

  if (lastRow >= 2) {
    const rows = ordersSheet.getRange(2, 1, lastRow - 1, orderHeaders.length).getValues();
    rows.forEach(function (row) {
      totalOrders += 1;
      totalAmount += Number(row[4] || 0);

      const status = String(row[6] || "").trim().toUpperCase();
      if (status === "PENDING") pending += 1;
      if (status === "SHIPPED") shipped += 1;

      const memberEmail = normalizeEmail_(row[2]);
      if (memberEmail) {
        if (!byMember[memberEmail]) byMember[memberEmail] = { member_email: memberEmail, order_count: 0, total_amount: 0 };
        byMember[memberEmail].order_count += 1;
        byMember[memberEmail].total_amount += Number(row[4] || 0);
      }

      parseItemsJson_(row[3]).forEach(function (item) {
        const handle = String(item.handle || item.name || "UNKNOWN").toLowerCase();
        if (!byCompound[handle]) {
          byCompound[handle] = { handle: handle, quantity: 0, line_total: 0 };
        }
        byCompound[handle].quantity += Number(item.quantity || 0);
        byCompound[handle].line_total += Number(item.line_total || 0);
      });
    });
  }

  const topCompounds = Object.keys(byCompound)
    .map(function (key) {
      const row = byCompound[key];
      return {
        handle: row.handle,
        quantity: row.quantity,
        line_total: Number(row.line_total.toFixed(2))
      };
    })
    .sort(function (a, b) {
      return b.quantity - a.quantity;
    })
    .slice(0, Number(payload.top || 5));

  const topMembers = Object.keys(byMember)
    .map(function (key) {
      const row = byMember[key];
      return {
        member_email: row.member_email,
        order_count: row.order_count,
        total_amount: Number(row.total_amount.toFixed(2))
      };
    })
    .sort(function (a, b) {
      return b.order_count - a.order_count;
    })
    .slice(0, Number(payload.top || 5));

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_PROCUREMENT_INSIGHTS",
    command: "GET_PROCUREMENT_INSIGHTS",
    totals: {
      orders: totalOrders,
      amount: Number(totalAmount.toFixed(2)),
      pending: pending,
      shipped: shipped
    },
    top_compounds: topCompounds,
    top_members: topMembers
  });
}

function handleUpdateSystemSettings_(payload) {
  const adminSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ADMIN);
  const adminHeaders = ["section_id", "is_visible", "header_text", "sub_text", "cta_label"];
  ensureHeaders_(adminSheet, adminHeaders);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const settings = payload.settings && typeof payload.settings === "object" ? payload.settings : {};
    const actor = toTextOrEmpty_(payload.actor_email || payload.actor || "SYSTEM");
    const now = new Date().toISOString();

    const updates = [
      {
        section_id: "LOW_STOCK_THRESHOLD",
        is_visible: true,
        header_text: toTextOrEmpty_(settings.low_stock_threshold || payload.low_stock_threshold || "5"),
        sub_text: "Updated at " + now + " by " + actor,
        cta_label: "threshold"
      },
      {
        section_id: "ALERT_CADENCE",
        is_visible: true,
        header_text: toTextOrEmpty_(settings.alert_cadence || payload.alert_cadence || "WEEKLY_MONDAY"),
        sub_text: "Updated at " + now + " by " + actor,
        cta_label: "cadence"
      },
      {
        section_id: "PORTAL_REDIRECT",
        is_visible: true,
        header_text: toTextOrEmpty_(settings.portal_redirect || payload.portal_redirect || "/"),
        sub_text: "Updated at " + now + " by " + actor,
        cta_label: "redirect"
      },
      {
        section_id: "NOTIFICATION_EMAIL",
        is_visible: true,
        header_text: toTextOrEmpty_(settings.notification_email || payload.notification_email || String(getNotificationRecipient_() || PEPTQ_CONFIG.NOTIFICATION_EMAIL || "")),
        sub_text: "Updated at " + now + " by " + actor,
        cta_label: "notify"
      }
    ];

    updates.forEach(function (entry) {
      upsertAdminSettingRow_(adminSheet, entry, adminHeaders.length);
    });

    return jsonResponse_({
      status: "success",
      code: "SUCCESS_SYSTEM_SETTINGS_UPDATED",
      command: "UPDATE_SYSTEM_SETTINGS",
      updated_count: updates.length,
      message: "System settings updated"
    });
  } finally {
    lock.releaseLock();
  }
}

function handleGetProviderStatus_() {
  const runtime = getEmailProviderRuntime_();
  const resendConnected = Boolean(getResendApiKey_());
  const brevoConnected = Boolean(String(getScriptPropertyValue_("PEPTQ_BREVO_API_KEY", "") || "").trim());
  var googleQuota = -1;
  const emailUsage = getTodayEmailUsageStats_();

  try {
    googleQuota = Number(MailApp.getRemainingDailyQuota());
  } catch (error) {
    console.warn("GOOGLE_PROVIDER_QUOTA_LOOKUP_FAILED", String(error));
  }

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_PROVIDER_STATUS",
    command: "GET_PROVIDER_STATUS",
    selected_provider: runtime.selected_provider,
    active_provider: runtime.active_provider,
    sender_email: runtime.sender_email,
    sender_name: runtime.sender_name,
    google_remaining_quota: googleQuota,
    email_usage_today: emailUsage,
    providers: {
      google: {
        connected: true,
        remaining_quota: googleQuota
      },
      resend: {
        connected: resendConnected,
        status: resendConnected ? "CONNECTED" : "NOT_LINKED"
      },
      brevo: {
        connected: brevoConnected,
        status: brevoConnected ? "CONNECTED" : "NOT_LINKED"
      }
    }
  });
}

function handleSaveEmailProviderSecret_(payload) {
  const provider = String(payload.provider || "RESEND").trim().toUpperCase();
  if (provider !== "RESEND") {
    return jsonResponse_({
      status: "error",
      code: "ERR_UNSUPPORTED_EMAIL_PROVIDER",
      command: "SAVE_EMAIL_PROVIDER_SECRET",
      message: "Only RESEND is supported in this secure connection flow right now"
    });
  }

  const apiKey = String(payload.api_key || payload.apiKey || "").trim();
  if (!apiKey) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_EMAIL_PROVIDER_SECRET",
      command: "SAVE_EMAIL_PROVIDER_SECRET",
      message: "api_key is required"
    });
  }

  const senderEmail = normalizeEmail_(payload.sender_email || payload.senderEmail || getEmailSenderEmail_() || "");
  const actor = toTextOrEmpty_(payload.actor_email || payload.actor || "SYSTEM");
  const ownerSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.OWNER);
  const ownerHeaders = ["section_id", "is_visible", "header_text", "sub_text", "cta_label"];
  ensureHeaders_(ownerSheet, ownerHeaders);

  setScriptPropertyValue_("PEPTQ_RESEND_API_KEY", apiKey);
  setScriptPropertyValue_("PEPTQ_RESEND_API_KEY_LAST4", apiKey.slice(-4));

  upsertAdminSettingRow_(ownerSheet, {
    section_id: "EMAIL_PROVIDER_STATUS",
    is_visible: true,
    header_text: "RESEND_KEY_SAVED",
    sub_text: "Updated by " + actor,
    cta_label: "provider"
  }, ownerHeaders.length);

  if (senderEmail) {
    upsertAdminSettingRow_(ownerSheet, {
      section_id: "EMAIL_SENDER_EMAIL",
      is_visible: true,
      header_text: senderEmail,
      sub_text: "Updated by " + actor,
      cta_label: "sender"
    }, ownerHeaders.length);
  }

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_EMAIL_PROVIDER_SECRET_SAVED",
    command: "SAVE_EMAIL_PROVIDER_SECRET",
    provider: provider,
    key_last4: apiKey.slice(-4),
    sender_email: senderEmail,
    message: "Email provider secret saved securely"
  });
}

function handleClearEmailProviderSecret_(payload) {
  const provider = String(payload.provider || "RESEND").trim().toUpperCase();
  if (provider !== "RESEND") {
    return jsonResponse_({
      status: "error",
      code: "ERR_UNSUPPORTED_EMAIL_PROVIDER",
      command: "CLEAR_EMAIL_PROVIDER_SECRET",
      message: "Only RESEND is supported in this secure connection flow right now"
    });
  }

  const actor = toTextOrEmpty_(payload.actor_email || payload.actor || "SYSTEM");
  const ownerSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.OWNER);
  const ownerHeaders = ["section_id", "is_visible", "header_text", "sub_text", "cta_label"];
  ensureHeaders_(ownerSheet, ownerHeaders);

  deleteScriptPropertyValue_("PEPTQ_RESEND_API_KEY");
  deleteScriptPropertyValue_("PEPTQ_RESEND_API_KEY_LAST4");

  upsertAdminSettingRow_(ownerSheet, {
    section_id: "EMAIL_PROVIDER_STATUS",
    is_visible: true,
    header_text: "RESEND_KEY_REMOVED",
    sub_text: "Updated by " + actor,
    cta_label: "provider"
  }, ownerHeaders.length);

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_EMAIL_PROVIDER_SECRET_CLEARED",
    command: "CLEAR_EMAIL_PROVIDER_SECRET",
    provider: provider,
    message: "Email provider secret cleared"
  });
}

function handleSendLowStockAlerts_(payload) {
  const thresholdRaw = Number(payload.par_level || payload.threshold || 5);
  const threshold = isNaN(thresholdRaw) ? 5 : Math.max(0, thresholdRaw);

  const dashboard = JSON.parse(handleGetLowStockDashboard_({ par_level: threshold }).getContent());
  if (dashboard.status !== "success") {
    return jsonResponse_({
      status: "error",
      code: "ERR_LOW_STOCK_LOOKUP_FAILED",
      command: "SEND_LOW_STOCK_ALERTS",
      message: "Failed to resolve low stock dashboard"
    });
  }

  const recipient = String(getNotificationRecipient_() || "").trim();
  if (!recipient) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_NOTIFICATION_EMAIL",
      command: "SEND_LOW_STOCK_ALERTS",
      message: "Notification recipient is empty"
    });
  }

  const lines = (dashboard.low_stock_items || []).map(function (item) {
    return "- " + String(item.title || item.handle || "Unknown") + " | stock=" + String(item.bulk_stock || 0);
  });

  try {
    sendPlatformEmail_({
      to: recipient,
      subject: "PEPTQ Low-Stock Alert Digest",
      category: "ORDER",
      body:
        "Low-stock report generated.\n\n" +
        "Par Level: " + threshold + "\n" +
        "Items: " + Number(dashboard.low_stock_count || 0) + "\n\n" +
        (lines.length ? lines.join("\n") : "No low-stock items at this threshold.")
    });
  } catch (error) {
    return jsonResponse_({
      status: "error",
      code: "ERR_LOW_STOCK_EMAIL_FAILED",
      command: "SEND_LOW_STOCK_ALERTS",
      message: String(error)
    });
  }

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_LOW_STOCK_ALERT_SENT",
    command: "SEND_LOW_STOCK_ALERTS",
    par_level: threshold,
    low_stock_count: Number(dashboard.low_stock_count || 0),
    message: "Low-stock alert sent"
  });
}

function handleConfigureLowStockAlertSchedule_(payload) {
  const cadence = String(payload.alert_cadence || payload.cadence || "WEEKLY_MONDAY").trim().toUpperCase();
  const hourRaw = Number(payload.hour || payload.run_hour || 9);
  const hour = isNaN(hourRaw) ? 9 : Math.min(23, Math.max(0, hourRaw));
  const thresholdRaw = Number(payload.par_level || payload.threshold || 5);
  const threshold = isNaN(thresholdRaw) ? 5 : Math.max(0, thresholdRaw);
  const weeklyDayMap = {
    MONDAY: ScriptApp.WeekDay.MONDAY,
    TUESDAY: ScriptApp.WeekDay.TUESDAY,
    WEDNESDAY: ScriptApp.WeekDay.WEDNESDAY,
    THURSDAY: ScriptApp.WeekDay.THURSDAY,
    FRIDAY: ScriptApp.WeekDay.FRIDAY,
    SATURDAY: ScriptApp.WeekDay.SATURDAY,
    SUNDAY: ScriptApp.WeekDay.SUNDAY
  };
  const cadenceParts = cadence.split("_");
  const weeklyDayKey = cadenceParts.length > 1 ? cadenceParts[1] : "MONDAY";
  const weeklyDay = weeklyDayMap[weeklyDayKey] || ScriptApp.WeekDay.MONDAY;

  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty("PEPTQ_LOW_STOCK_THRESHOLD", String(threshold));
  scriptProperties.setProperty("PEPTQ_LOW_STOCK_CADENCE", cadence);

  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === "runLowStockAlertDigest_") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  var triggerBuilder = ScriptApp.newTrigger("runLowStockAlertDigest_").timeBased().atHour(hour);
  if (cadence.indexOf("WEEKLY") === 0) {
    triggerBuilder = triggerBuilder.onWeekDay(weeklyDay).everyWeeks(1);
  } else {
    triggerBuilder = triggerBuilder.everyDays(1);
  }

  const trigger = triggerBuilder.create();

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_LOW_STOCK_SCHEDULE_CONFIGURED",
    command: "CONFIGURE_LOW_STOCK_ALERT_SCHEDULE",
    cadence: cadence,
    hour: hour,
    par_level: threshold,
    trigger_id: trigger.getUniqueId(),
    message: "Low-stock alert schedule configured"
  });
}

function runLowStockAlertDigest_() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const thresholdRaw = Number(scriptProperties.getProperty("PEPTQ_LOW_STOCK_THRESHOLD") || 5);
  const threshold = isNaN(thresholdRaw) ? 5 : Math.max(0, thresholdRaw);
  return handleSendLowStockAlerts_({ par_level: threshold });
}

function handleGetAdminQuickLinks_() {
  const quickLinksSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ADMIN_QUICK_LINKS);
  const headers = ["link_id", "link_label", "link_url", "is_visible", "sort_order"];
  ensureHeaders_(quickLinksSheet, headers);

  const lastRow = quickLinksSheet.getLastRow();
  const links = [];

  if (lastRow >= 2) {
    const rows = quickLinksSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    rows.forEach(function (row) {
      if (!toBoolean_(row[3])) return;
      links.push({
        link_id: String(row[0] || ""),
        link_label: String(row[1] || ""),
        link_url: String(row[2] || ""),
        is_visible: toBoolean_(row[3]),
        sort_order: Number(row[4] || 0)
      });
    });
  }

  links.sort(function (a, b) {
    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  });

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_ADMIN_QUICK_LINKS",
    command: "GET_ADMIN_QUICK_LINKS",
    count: links.length,
    links: links
  });
}

function handleCancelOrder_(payload) {
  const reason = toTextOrEmpty_(payload.reason || payload.cancel_reason);
  if (!reason) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_CANCEL_REASON",
      command: "CANCEL_ORDER",
      message: "reason is required"
    });
  }

  const ordersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ORDERS);
  const orderHeaders = getOrdersHeaders_();
  ensureHeaders_(ordersSheet, orderHeaders);

  const orderRow = findOrderRow_(ordersSheet, payload);
  if (!orderRow) {
    return jsonResponse_({
      status: "error",
      code: "ERR_ORDER_NOT_FOUND",
      command: "CANCEL_ORDER",
      message: "Order not found"
    });
  }

  const orderValues = ordersSheet.getRange(orderRow, 1, 1, orderHeaders.length).getValues()[0];
  const orderId = String(orderValues[0] || "");
  const memberEmail = normalizeEmail_(orderValues[2]);

  payload.cancel_reason = reason;
  const result = updateOrderStatus_(payload, {
    command: "CANCEL_ORDER",
    nextStatus: "CANCELLED",
    successCode: "SUCCESS_ORDER_CANCELLED",
    notePrefix: "Order cancelled | reason=" + reason,
    beforeStatusChange: function (context) {
      const inventoryColumn = ensureOrderInventoryProcessedColumn_(context.ordersSheet);
      const inventoryProcessed = toBoolean_(context.ordersSheet.getRange(context.orderRow, inventoryColumn).getValue());
      if (payload.restore_inventory === false || !inventoryProcessed) {
        payload._inventory_restore_result = { processed_rows: 0, warnings: [] };
        return null;
      }

      const items = parseItemsJson_(context.orderValues[3]);
      const inventoryResult = restoreCatalogInventory_(items);
      if (inventoryResult.processed_rows > 0) {
        context.ordersSheet.getRange(context.orderRow, inventoryColumn).setValue(false);
      }
      appendInventoryMovementLog_(inventoryResult.changes, {
        direction: "IN",
        command: "CANCEL_ORDER",
        actor_email: context.actorEmail,
        order_id: context.orderId
      });

      if (inventoryResult.processed_rows > 0 || inventoryResult.warnings.length) {
        appendOrderNote_(
          context.ordersSheet,
          context.orderRow,
          formatInventoryMutationNote_("Inventory restored", inventoryResult),
          context.actorEmail
        );
      }

      payload._inventory_restore_result = inventoryResult;
      return null;
    }
  });

  let parsed = null;
  try {
    parsed = JSON.parse(result.getContent());
  } catch (error) {
    parsed = null;
  }

  if (parsed && parsed.status === "success" && shouldSendMemberNotification_(memberEmail)) {
    sendCancelNotificationEmail_(orderId, memberEmail, reason);
  }

  if (!parsed || parsed.status !== "success") {
    return result;
  }

  parsed.restored_inventory_rows = Number((payload._inventory_restore_result && payload._inventory_restore_result.processed_rows) || 0);
  return jsonResponse_(parsed);
}

function handleGetOrderHistory_(payload) {
  const memberEmail = normalizeEmail_(payload.member_email || payload.email);
  const includeArchives = (payload && payload.include_archives != null)
    ? toBoolean_(payload.include_archives)
    : true;
  const includeAll = toBoolean_(payload.include_all);

  if (!memberEmail && !includeAll) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_MEMBER_EMAIL",
      command: "GET_ORDER_HISTORY",
      message: "member_email is required unless include_all is true"
    });
  }

  const orderHeaders = getOrdersHeaders_();
  const history = [];

  const ordersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ORDERS);
  ensureHeaders_(ordersSheet, orderHeaders);
  collectOrdersFromSheet_(ordersSheet, orderHeaders, memberEmail, includeAll, history);

  if (includeArchives) {
    const spreadsheet = getSpreadsheet_();
    const archiveSheets = spreadsheet.getSheets().filter(function (sheet) {
      return /^Archive_\d{4}$/.test(sheet.getName());
    });

    archiveSheets.forEach(function (sheet) {
      ensureHeaders_(sheet, orderHeaders);
      collectOrdersFromSheet_(sheet, orderHeaders, memberEmail, includeAll, history);
    });
  }

  history.sort(function (a, b) {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_ORDER_HISTORY",
    command: "GET_ORDER_HISTORY",
    member_email: memberEmail,
    count: history.length,
    orders: history
  });
}

function collectOrdersFromSheet_(sheet, headers, memberEmail, includeAll, targetList) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  rows.forEach(function (row) {
    const rowEmail = normalizeEmail_(row[2]);
    if (!includeAll && rowEmail !== memberEmail) return;

    targetList.push({
      order_id: String(row[0] || ""),
      timestamp: row[1] ? new Date(row[1]).toISOString() : "",
      member_email: rowEmail,
      items_json: String(row[3] || ""),
      total_amount: Number(row[4] || 0),
      shipping_data: String(row[5] || ""),
      status: String(row[6] || ""),
      tracking_num: String(row[7] || ""),
      admin_notes: String(row[8] || ""),
      payment_status: String(row[9] || ""),
      invoice_id: String(row[10] || ""),
      invoice_pdf_url: String(row[11] || ""),
      paid_at: row[12] ? new Date(row[12]).toISOString() : "",
      source_sheet: sheet.getName()
    });
  });
}

function handleGetInventoryMovementHistory_(payload) {
  const logSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.INVENTORY);
  const headers = getInventoryLogHeaders_();
  ensureHeaders_(logSheet, headers);

  const lastRow = logSheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse_({
      status: "success",
      code: "SUCCESS_INVENTORY_MOVEMENT_HISTORY",
      command: "GET_INVENTORY_MOVEMENT_HISTORY",
      count: 0,
      movements: []
    });
  }

  const limitRaw = Number(payload.limit || 100);
  const limit = isNaN(limitRaw) ? 100 : Math.max(1, Math.min(500, limitRaw));
  const handleFilter = String(payload.handle || "").trim().toLowerCase();
  const orderIdFilter = String(payload.order_id || "").trim();

  const rows = logSheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const movements = rows
    .map(function (row) {
      return {
        timestamp: row[0] ? new Date(row[0]).toISOString() : "",
        handle: String(row[1] || "").trim().toLowerCase(),
        title: String(row[2] || "").trim(),
        direction: String(row[3] || "").trim().toUpperCase(),
        delta: Number(row[4] || 0),
        quantity: Number(row[5] || 0),
        previous_stock: Number(row[6] || 0),
        next_stock: Number(row[7] || 0),
        order_id: String(row[8] || "").trim(),
        actor_email: normalizeEmail_(row[9]),
        command: String(row[10] || "").trim().toUpperCase(),
        note: String(row[11] || "").trim()
      };
    })
    .filter(function (entry) {
      if (handleFilter && entry.handle !== handleFilter) return false;
      if (orderIdFilter && entry.order_id !== orderIdFilter) return false;
      return true;
    })
    .sort(function (a, b) {
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    })
    .slice(0, limit);

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_INVENTORY_MOVEMENT_HISTORY",
    command: "GET_INVENTORY_MOVEMENT_HISTORY",
    count: movements.length,
    movements: movements
  });
}

function updateOrderStatus_(payload, options) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const ordersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ORDERS);
    const orderHeaders = getOrdersHeaders_();
    ensureHeaders_(ordersSheet, orderHeaders);

    const orderRow = findOrderRow_(ordersSheet, payload);
    if (!orderRow) {
      return jsonResponse_({
        status: "error",
        code: "ERR_ORDER_NOT_FOUND",
        command: options.command,
        message: "Order not found"
      });
    }

    const orderValues = ordersSheet.getRange(orderRow, 1, 1, orderHeaders.length).getValues()[0];
    const memberEmail = normalizeEmail_(orderValues[2]);
    const orderId = String(orderValues[0] || "");
    const currentStatus = String(orderValues[6] || "").trim().toUpperCase();
    const nextStatus = String(options.nextStatus || "").trim().toUpperCase();
    const actorEmail = payload.actor_email || payload.actor || "SYSTEM";

    if (!isValidOrderStatusTransition_(currentStatus, nextStatus)) {
      return jsonResponse_({
        status: "error",
        code: "ERR_INVALID_STATUS_TRANSITION",
        command: options.command,
        order_id: orderId,
        from_status: currentStatus || "(blank)",
        to_status: nextStatus,
        message: "Invalid order status transition"
      });
    }

    if (typeof options.beforeStatusChange === "function") {
      const beforeResult = options.beforeStatusChange({
        ordersSheet: ordersSheet,
        orderHeaders: orderHeaders,
        orderRow: orderRow,
        orderValues: orderValues,
        memberEmail: memberEmail,
        orderId: orderId,
        currentStatus: currentStatus,
        nextStatus: nextStatus,
        actorEmail: actorEmail
      });
      if (beforeResult && beforeResult.status === "error") {
        return jsonResponse_(beforeResult);
      }
    }

    if (options.command === "SHIP_ORDER") {
      const archiveSheetName = PEPTQ_CONFIG.SHEETS.ARCHIVE || "Archive_2026";
      const archiveSheet = getOrCreateSheet_(archiveSheetName);
      ensureHeaders_(archiveSheet, orderHeaders);

      orderValues[6] = nextStatus; // Update status to SHIPPED

      const archiveTargetRow = Math.max(archiveSheet.getLastRow(), 1) + 1;
      archiveSheet.getRange(archiveTargetRow, 1, 1, orderHeaders.length).setValues([orderValues]);
      SpreadsheetApp.flush();

      // Verify Archive Success
      const verifiedArchivedRow = findRowByColumnValue_(archiveSheet, "order_id", orderId);
      if (!verifiedArchivedRow) {
        return jsonResponse_({
          status: "error",
          code: "ERR_ARCHIVE_VERIFICATION_FAILED",
          command: options.command,
          order_id: orderId,
          message: "Archive verification failed. Source row retained."
        });
      }

      // Safe Delete from Source
      ordersSheet.deleteRow(orderRow);
      SpreadsheetApp.flush();

      // Send Shipped Notification BEFORE returning
      if (shouldSendMemberNotification_(memberEmail)) {
        const trackingNumStr = String(orderValues[7] || "");
        const coaSummaryStr = extractCoaSummaryFromNotes_(String(orderValues[8] || ""));
        sendShipNotificationEmail_(orderId, memberEmail, trackingNumStr, coaSummaryStr);
      }

      return jsonResponse_({
        status: "success",
        code: options.successCode || "SUCCESS_ORDER_SHIPPED",
        command: options.command,
        order_id: orderId,
        previous_status: currentStatus,
        order_status: nextStatus,
        archive_sheet: archiveSheetName,
        archived: true,
        message: "Order finalized and archived"
      });
    }

    // Persist status update for non-archived transitions (PENDING -> PROCESSING, etc.)
    orderValues[6] = nextStatus;
    ordersSheet.getRange(orderRow, 1, 1, orderHeaders.length).setValues([orderValues]);

    return jsonResponse_({
      status: "success",
      code: options.successCode || "SUCCESS_ORDER_UPDATED",
      command: options.command,
      order_id: orderId,
      previous_status: currentStatus,
      order_status: nextStatus,
      message: "Order updated"
    });
  } finally {
    lock.releaseLock();
  }
}

function isTerminalOrderStatus_(status) {
  const normalized = String(status || "").trim().toUpperCase();
  return normalized === "COMPLETED" || normalized === "CANCELLED";
}

function isValidOrderStatusTransition_(currentStatus, nextStatus) {
  const current = String(currentStatus || "").trim().toUpperCase() || "PENDING";
  const next = String(nextStatus || "").trim().toUpperCase();
  if (!next) return false;
  if (current === next) return true;

  const allowed = {
    PENDING: { "ORDER RECEIVED": true, PROCESSING: true, SHIPPED: true, CANCELLED: true },
    "ORDER RECEIVED": { PROCESSING: true, SHIPPED: true, CANCELLED: true },
    PROCESSING: { SHIPPED: true, CANCELLED: true },
    SHIPPED: { DELIVERED: true, COMPLETED: true, CANCELLED: true },
    DELIVERED: { COMPLETED: true, CANCELLED: true },
    COMPLETED: {},
    CANCELLED: {},
    ARCHIVED: {}
  };

  return Boolean(allowed[current] && allowed[current][next]);
}

function appendOrderStatusAuditLog_(orderId, fromStatus, toStatus, actorEmail, commandName) {
  console.info("ORDER_STATUS_AUDIT", JSON.stringify({
    order_id: toTextOrEmpty_(orderId),
    from_status: toTextOrEmpty_(fromStatus),
    to_status: toTextOrEmpty_(toStatus),
    operator_email: toTextOrEmpty_(actorEmail || "SYSTEM"),
    command: toTextOrEmpty_(commandName || "UPDATE_ORDER_STATUS")
  }));
}

function getPreorderHeaders_() {
  return [
    "timestamp",
    "preorder_id",
    "member_email",
    "full_name",
    "business_name",
    "phone",
    "product_handle",
    "product_title",
    "requested_qty",
    "status",
    "owner_notes",
    "notified_at",
    "converted_order_id",
    "last_updated"
  ];
}

function createPreorderId_(dateObj) {
  const d = dateObj || new Date();
  const yyyy = d.getFullYear();
  const seed = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return "PRE-" + yyyy + "-" + seed;
}

function isValidPreorderStatus_(status) {
  const normalized = String(status || "").trim().toUpperCase();
  return normalized === "PENDING"
    || normalized === "CONTACTED"
    || normalized === "READY"
    || normalized === "CONVERTED"
    || normalized === "CANCELLED";
}

function isOpenPreorderStatus_(status) {
  const normalized = String(status || "").trim().toUpperCase();
  return normalized === "PENDING"
    || normalized === "CONTACTED"
    || normalized === "READY";
}

function findOpenPreorderByMemberAndHandle_(sheet, headers, memberEmail, productHandle) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (var index = rows.length - 1; index >= 0; index -= 1) {
    var row = rows[index];
    var rowEmail = normalizeEmail_(row[2]);
    var rowHandle = toTextOrEmpty_(row[6]).toLowerCase();
    var rowStatus = toTextOrEmpty_(row[9]).toUpperCase();
    if (rowEmail !== memberEmail || rowHandle !== productHandle) continue;
    if (!isOpenPreorderStatus_(rowStatus)) continue;

    return {
      preorder_id: toTextOrEmpty_(row[1]),
      status: rowStatus
    };
  }

  return null;
}

function resolvePreorderMemberRecord_(memberEmail) {
  const email = normalizeEmail_(memberEmail);
  if (!email) return null;

  try {
    const membersSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
    const rowIndex = findRowByEmail_(membersSheet, "email", email);
    if (!rowIndex) return null;

    const headerMap = getHeaderMap_(membersSheet, Math.max(membersSheet.getLastColumn(), 1)).map;
    return {
      email: email,
      full_name: toTextOrEmpty_(membersSheet.getRange(rowIndex, headerMap.full_name || 5).getValue()),
      business_name: headerMap.business_name ? toTextOrEmpty_(membersSheet.getRange(rowIndex, headerMap.business_name).getValue()) : "",
      phone: headerMap.phone ? toTextOrEmpty_(membersSheet.getRange(rowIndex, headerMap.phone).getValue()) : ""
    };
  } catch (error) {
    return null;
  }
}

function resolvePrimaryPreorderCatalogStateByHandle_(key) {
  try {
    const catalogSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.CATALOG);
    const rowIndex = findRowByColumnValue_(catalogSheet, "handle", key)
      || findRowByColumnValue_(catalogSheet, "slug", key);
    if (!rowIndex) {
      return { found: false, out_of_stock: false, title: "" };
    }

    const titleColumn = getColumnIndex_(catalogSheet, "title");
    const stockColumn = getColumnIndex_(catalogSheet, "bulk_stock") || getColumnIndex_(catalogSheet, "inventory");
    const rawStock = stockColumn ? catalogSheet.getRange(rowIndex, stockColumn).getValue() : "";
    const numericStock = Number(rawStock);

    return {
      found: true,
      title: titleColumn ? toTextOrEmpty_(catalogSheet.getRange(rowIndex, titleColumn).getValue()) : key,
      out_of_stock: !isNaN(numericStock) && numericStock <= 0
    };
  } catch (error) {
    return { found: false, out_of_stock: false, title: "" };
  }
}

function resolveBetaPreorderCatalogStateByHandle_(key) {
  try {
    const catalogSheet = getSheet_("CatalogBeta");
    const lastRow = catalogSheet.getLastRow();
    if (lastRow < 2) {
      return { found: false, out_of_stock: false, title: "" };
    }

    const headerState = getHeaderMap_(catalogSheet, Math.max(catalogSheet.getLastColumn(), 1));
    const headerMap = headerState.map || {};
    if (!isBetaCatalogHeaderMap_(headerState)) {
      return { found: false, out_of_stock: false, title: "" };
    }

    const width = Math.max(catalogSheet.getLastColumn(), 1);
    const rows = catalogSheet.getRange(2, 1, lastRow - 1, width).getValues();

    for (var i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const statusColumn = headerMap.status || headerMap.statis;
      const isLive = statusColumn ? toBoolean_(row[statusColumn - 1]) : true;
      if (!isLive) continue;

      const product = toTextOrEmpty_(row[headerMap.product - 1]);
      const strength = toTextOrEmpty_(row[headerMap.strength - 1]);
      const rowHandle = buildCatalogHandleFromParts_(product, strength);
      if (rowHandle !== key) continue;

      return {
        found: true,
        title: [product, strength].filter(Boolean).join(" "),
        out_of_stock: true
      };
    }

    return { found: false, out_of_stock: false, title: "" };
  } catch (error) {
    return { found: false, out_of_stock: false, title: "" };
  }
}

function resolvePreorderCatalogStateByHandle_(handle, catalogSource) {
  const key = toTextOrEmpty_(handle).toLowerCase();
  if (!key) {
    return { found: false, out_of_stock: false, title: "" };
  }

  if (String(catalogSource || "").trim().toUpperCase() === "BETA") {
    const betaState = resolveBetaPreorderCatalogStateByHandle_(key);
    if (betaState.found) {
      return betaState;
    }
  }

  const primaryState = resolvePrimaryPreorderCatalogStateByHandle_(key);
  if (primaryState.found) {
    return primaryState;
  }

  return { found: false, out_of_stock: false, title: "" };
}

function sendPreorderAlertEmail_(preorder) {
  try {
    const recipient = String(getNotificationRecipient_() || "").trim();
    if (!recipient) return;
    const preorderId = toTextOrEmpty_(preorder.preorder_id);
    const rows = [
      { label: "Preorder ID", value: preorderId, emphasis: true },
      { label: "Member", value: toTextOrEmpty_(preorder.full_name || preorder.member_email) },
      {
        label: "Email",
        value: buildInternalNotificationEmailHtml_(preorder.member_email),
        valueText: buildInternalNotificationEmailText_(preorder.member_email),
        rawHtml: true
      },
      { label: "Business", value: toTextOrEmpty_(preorder.business_name || "") },
      { label: "Phone", value: toTextOrEmpty_(preorder.phone || "") },
      { label: "Product", value: toTextOrEmpty_(preorder.product_title || preorder.product_handle) },
      { label: "Handle", value: toTextOrEmpty_(preorder.product_handle) },
      { label: "Requested Qty", value: String(Number(preorder.requested_qty || 0)), emphasis: true }
    ];
    const alertText = "Review in the Preorders queue before converting this request into an order.";

    sendPlatformEmail_({
      to: recipient,
      subject: "PEPTQ Preorder Alert: " + preorderId,
      body: buildInternalNotificationText_(
        "New PEPTQ preorder request submitted.",
        rows,
        alertText
      ),
      htmlBody: buildInternalNotificationCardHtml_({
        eyebrow: "PEPTQ | PREORDERS",
        title: "Preorder Request",
        rows: rows,
        alertText: alertText
      }),
      category: "ORDER"
    });
  } catch (error) {
    console.warn("PREORDER_ALERT_EMAIL_FAILED", String(error));
  }
}

function getInventoryLogHeaders_() {
  return [
    "timestamp",
    "handle",
    "title",
    "direction",
    "delta",
    "quantity",
    "previous_stock",
    "next_stock",
    "order_id",
    "actor_email",
    "command",
    "note"
  ];
}

function appendInventoryMovementLog_(changes, meta) {
  if (!Array.isArray(changes) || !changes.length) return 0;

  const logSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.INVENTORY);
  const headers = getInventoryLogHeaders_();
  ensureHeaders_(logSheet, headers);

  const rows = changes.map(function (change) {
    return [
      new Date(),
      toTextOrEmpty_(change.handle || "").toLowerCase(),
      toTextOrEmpty_(change.title || ""),
      toTextOrEmpty_(meta && meta.direction || ""),
      Number(change.delta || 0),
      Number(change.quantity || 0),
      Number(change.previous_stock || 0),
      Number(change.next_stock || 0),
      toTextOrEmpty_(meta && meta.order_id || ""),
      normalizeEmail_(meta && meta.actor_email || ""),
      toTextOrEmpty_(meta && meta.command || ""),
      toTextOrEmpty_(change.note || "")
    ];
  });

  const nextRow = Math.max(logSheet.getLastRow(), 1) + 1;
  logSheet.getRange(nextRow, 1, rows.length, headers.length).setValues(rows);
  return rows.length;
}

function findOrderRow_(ordersSheet, payload) {
  const orderId = toTextOrEmpty_(payload.order_id);
  if (orderId) {
    return findRowByColumnValue_(ordersSheet, "order_id", orderId);
  }

  const memberEmail = normalizeEmail_(payload.member_email || payload.email);
  if (!memberEmail) return 0;
  return findRowByEmail_(ordersSheet, "member_email", memberEmail);
}

function ensureOrderInventoryProcessedColumn_(ordersSheet) {
  let column = getColumnIndex_(ordersSheet, "inventory_processed");
  if (column) return column;

  column = Math.max(ordersSheet.getLastColumn(), getOrdersHeaders_().length) + 1;
  ordersSheet.getRange(1, column).setValue("inventory_processed");
  return column;
}

function formatInventoryMutationNote_(label, inventoryResult) {
  const result = inventoryResult || {};
  const noteParts = [label + " rows=" + Number(result.processed_rows || 0)];
  if (result.warnings && result.warnings.length) {
    noteParts.push("warnings=" + result.warnings.join("; "));
  }
  return noteParts.join(" | ");
}

function appendOrderNote_(ordersSheet, rowIndex, text, actor) {
  const notesCell = ordersSheet.getRange(rowIndex, 9);
  const existing = String(notesCell.getValue() || "").trim();
  const line = text + " | actor=" + toTextOrEmpty_(actor || "SYSTEM") + " | at=" + new Date().toISOString();
  notesCell.setValue(existing ? existing + " | " + line : line);
}

function shouldSendMemberNotification_(memberEmail) {
  const email = normalizeEmail_(memberEmail);
  if (!email) return false;

  try {
    const membersSheet = getSheet_(PEPTQ_CONFIG.SHEETS.MEMBERS);
    const row = findRowByEmail_(membersSheet, "email", email);
    if (!row) return true;

    const prefCol = getColumnIndex_(membersSheet, "email_notifications");
    if (!prefCol) return true;
    return toBoolean_(membersSheet.getRange(row, prefCol).getValue());
  } catch (error) {
    return true;
  }
}

function sendShipNotificationEmail_(orderId, memberEmail, trackingNum, coaSummary) {
  try {
    if (!memberEmail) return;
    const lines = [
      "Your PEPTQ procurement request has been shipped.",
      "",
      "Order ID: " + orderId,
      "Tracking: " + (trackingNum || "Pending carrier update")
    ];
    if (coaSummary) {
      lines.push("CoA Mapping: " + coaSummary);
    }
    lines.push("", "Research Use Only.");

    sendPlatformEmail_({
      to: memberEmail,
      subject: "PEPTQ Shipment Update: " + orderId,
      body: lines.join("\n"),
      category: "ORDER"
    });
  } catch (error) {
    console.warn("SHIP_NOTIFY_FAILED", String(error));
  }
}

function sendCancelNotificationEmail_(orderId, memberEmail, reason) {
  try {
    if (!memberEmail) return;
    sendPlatformEmail_({
      to: memberEmail,
      subject: "PEPTQ Order Cancellation: " + orderId,
      category: "ORDER",
      body:
        "Your PEPTQ procurement request was cancelled.\n\n" +
        "Order ID: " + orderId + "\n" +
        "Reason: " + reason + "\n\n" +
        "If this requires review, contact portal support."
    });
  } catch (error) {
    console.warn("CANCEL_NOTIFY_FAILED", String(error));
  }
}

function parseOrderShippingData_(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    return null;
  }
}

function buildShippingAddressSummary_(shipping) {
  if (!shipping || typeof shipping !== "object") return "";

  return [
    toTextOrEmpty_(shipping.business_name),
    toTextOrEmpty_(shipping.recipient_name),
    toTextOrEmpty_(shipping.address),
    [shipping.city, shipping.state, shipping.zip].filter(Boolean).join(", "),
    toTextOrEmpty_(shipping.country)
  ].filter(Boolean).join(" | ");
}

function extractDeliveryInstructionText_(shipping) {
  if (!shipping || typeof shipping !== "object") return "";

  return toTextOrEmpty_(
    shipping.delivery_notes
    || shipping.delivery_note
    || shipping.delivery_instructions
    || shipping.instructions
    || shipping.notes
  );
}

function extractCoaSummaryFromNotes_(notesText) {
  const text = String(notesText || "");
  const marker = "CoA mapped:";
  const index = text.indexOf(marker);
  if (index === -1) return "";
  return text.slice(index + marker.length).split("| actor=")[0].trim();
}

function parseItemsJson_(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map(normalizeOrderItem_).filter(Boolean);
  }

  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeOrderItem_).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function normalizeOrderItem_(item) {
  if (!item || typeof item !== "object") return null;

  const handle = toTextOrEmpty_(item.handle || item.id || item.internal_sku);
  const quantity = Math.max(1, Number(item.quantity || item.qty || 1));
  const unitPrice = Number(item.unit_price || item.price || 0);

  return {
    handle: handle,
    name: toTextOrEmpty_(item.name),
    quantity: quantity,
    unit_price: unitPrice,
    line_total: Number((quantity * unitPrice).toFixed(2))
  };
}

function resolveTotalAmount_(rawTotal, items) {
  const numeric = Number(rawTotal);
  if (!isNaN(numeric) && numeric > 0) return Number(numeric.toFixed(2));

  const computed = items.reduce(function (sum, item) {
    return sum + Number(item.line_total || 0);
  }, 0);
  return Number(computed.toFixed(2));
}

function createOrderId_(dateObj) {
  const d = dateObj || new Date();
  const yyyy = d.getFullYear();
  const seed = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return "ORD-" + yyyy + "-" + seed;
}

function decrementCatalogInventory_(items) {
  return mutateCatalogInventory_(items, "DECREMENT");
}

function orderItemsEqual_(leftItems, rightItems) {
  return buildOrderItemsFingerprint_(leftItems) === buildOrderItemsFingerprint_(rightItems);
}

function buildOrderItemsFingerprint_(items) {
  const normalized = parseItemsJson_(items);
  return normalized
    .map(function (item) {
      return {
        handle: toTextOrEmpty_(item.handle).toLowerCase(),
        name: toTextOrEmpty_(item.name),
        quantity: Math.max(1, Number(item.quantity || 1)),
        unit_price: Number(Number(item.unit_price || 0).toFixed(2))
      };
    })
    .sort(function (a, b) {
      const handleDiff = String(a.handle || "").localeCompare(String(b.handle || ""));
      if (handleDiff !== 0) return handleDiff;
      const nameDiff = String(a.name || "").localeCompare(String(b.name || ""));
      if (nameDiff !== 0) return nameDiff;
      const qtyDiff = Number(a.quantity || 0) - Number(b.quantity || 0);
      if (qtyDiff !== 0) return qtyDiff;
      return Number(a.unit_price || 0) - Number(b.unit_price || 0);
    })
    .map(function (item) {
      return [item.handle, item.name, item.quantity, item.unit_price].join("::");
    })
    .join("||");
}

function restoreCatalogInventory_(items) {
  return mutateCatalogInventory_(items, "RESTORE");
}

function validateCatalogInventoryAvailability_(items) {
  if (!items || !items.length) {
    return { ok: true, shortages: [] };
  }

  const catalogSheet = getSheet_(PEPTQ_CONFIG.SHEETS.CATALOG);
  const bulkStockColumn = getColumnIndex_(catalogSheet, "bulk_stock");
  const handleColumn = getColumnIndex_(catalogSheet, "handle") || 1;
  const titleColumn = getColumnIndex_(catalogSheet, "title") || 0;
  if (!bulkStockColumn || !handleColumn) {
    return { ok: true, shortages: [] };
  }

  const lastRow = catalogSheet.getLastRow();
  if (lastRow < 2) {
    return { ok: true, shortages: [] };
  }

  const handles = catalogSheet.getRange(2, handleColumn, lastRow - 1, 1).getValues();
  const stocks = catalogSheet.getRange(2, bulkStockColumn, lastRow - 1, 1).getValues();
  const titles = titleColumn ? catalogSheet.getRange(2, titleColumn, lastRow - 1, 1).getValues() : [];
  const inventoryMap = {};

  for (var rowIndex = 0; rowIndex < handles.length; rowIndex += 1) {
    var handleKey = String(handles[rowIndex][0] || "").trim().toLowerCase();
    if (!handleKey) continue;

    inventoryMap[handleKey] = {
      title: String((titles[rowIndex] && titles[rowIndex][0]) || "").trim(),
      raw_stock: stocks[rowIndex] ? stocks[rowIndex][0] : ""
    };
  }

  const requestedByHandle = {};
  items.forEach(function (item) {
    var key = String(item.handle || "").trim().toLowerCase();
    if (!key) return;
    requestedByHandle[key] = Number(requestedByHandle[key] || 0) + Math.max(1, Number(item.quantity || 1));
  });

  const shortages = [];
  Object.keys(requestedByHandle).forEach(function (key) {
    var inventoryRow = inventoryMap[key];
    if (!inventoryRow) return;

    var rawStock = inventoryRow.raw_stock;
    if (rawStock === "" || rawStock == null) return;

    var currentStock = Number(rawStock);
    if (isNaN(currentStock)) return;

    var requestedQty = Number(requestedByHandle[key] || 0);
    if (requestedQty <= currentStock) return;

    shortages.push({
      handle: key,
      title: inventoryRow.title || key,
      available_stock: currentStock,
      requested_qty: requestedQty,
      shortage_qty: requestedQty - currentStock
    });
  });

  return {
    ok: shortages.length === 0,
    shortages: shortages
  };
}

function mutateCatalogInventory_(items, mode) {
  if (!items.length) {
    return { processed_rows: 0, warnings: [], changes: [] };
  }

  const catalogSheet = getSheet_(PEPTQ_CONFIG.SHEETS.CATALOG);
  const bulkStockColumn = getColumnIndex_(catalogSheet, "bulk_stock");
  const handleColumn = getColumnIndex_(catalogSheet, "handle") || 1;
  const titleColumn = getColumnIndex_(catalogSheet, "title") || 0;
  if (!bulkStockColumn || !handleColumn) {
    return { processed_rows: 0, warnings: [], changes: [] };
  }

  const lastRow = catalogSheet.getLastRow();
  if (lastRow < 2) {
    return { processed_rows: 0, warnings: [], changes: [] };
  }

  const handles = catalogSheet.getRange(2, handleColumn, lastRow - 1, 1).getValues();
  const titles = titleColumn ? catalogSheet.getRange(2, titleColumn, lastRow - 1, 1).getValues() : [];
  const map = {};
  for (var i = 0; i < handles.length; i += 1) {
    map[String(handles[i][0] || "").trim().toLowerCase()] = {
      row: i + 2,
      title: String((titles[i] && titles[i][0]) || "").trim()
    };
  }

  const direction = String(mode || "").trim().toUpperCase() === "RESTORE" ? 1 : -1;
  let processed = 0;
  const warnings = [];
  const changes = [];
  items.forEach(function (item) {
    const key = String(item.handle || "").trim().toLowerCase();
    if (!key || !map[key]) return;

    const entry = map[key];
    const row = entry.row;
    const stockCell = catalogSheet.getRange(row, bulkStockColumn);
    const rawValue = stockCell.getValue();
    if (rawValue === "" || rawValue == null) return;

    const current = Number(rawValue);
    if (isNaN(current)) return;

    const quantity = Math.max(1, Number(item.quantity || 1));
    let nextValue = current + direction * quantity;
    if (direction < 0 && nextValue < 0) {
      warnings.push(key + " below zero (" + current + " - " + quantity + ")");
      nextValue = 0;
    }

    stockCell.setValue(nextValue);
    processed += 1;
    changes.push({
      handle: key,
      title: entry.title || String(item.name || "").trim(),
      quantity: quantity,
      delta: direction * quantity,
      previous_stock: current,
      next_stock: nextValue,
      note: direction < 0 && nextValue === 0 && current < quantity
        ? "Capped at zero after depletion."
        : ""
    });
  });

  return {
    processed_rows: processed,
    warnings: warnings,
    changes: changes
  };
}

function upsertAdminSettingRow_(adminSheet, entry, width) {
  const sectionId = String(entry.section_id || "").trim();
  if (!sectionId) return;

  const existingRow = findRowByColumnValue_(adminSheet, "section_id", sectionId);
  const row = [
    sectionId,
    toBoolean_(entry.is_visible),
    toTextOrEmpty_(entry.header_text),
    toTextOrEmpty_(entry.sub_text),
    toTextOrEmpty_(entry.cta_label)
  ];

  if (existingRow) {
    adminSheet.getRange(existingRow, 1, 1, width).setValues([row]);
    return;
  }

  const nextRow = Math.max(adminSheet.getLastRow(), 1) + 1;
  adminSheet.getRange(nextRow, 1, 1, width).setValues([row]);
}

function handleGetAssets_(payload) {
  const assetSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ASSET);
  if (!assetSheet) {
    return jsonResponse_({
      status: "error",
      code: "ERR_ASSET_SHEET_UNAVAILABLE",
      command: "GET_ASSETS",
      message: "Asset sheet is not available"
    });
  }

  const lastRow = assetSheet.getLastRow();
  const lastCol = assetSheet.getLastColumn();
  
  if (lastRow < 2 || lastCol < 4) {
    return jsonResponse_({
      status: "success",
      code: "SUCCESS_ASSETS",
      command: "GET_ASSETS",
      count: 0,
      items: []
    });
  }

  const rows = assetSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const items = rows.map(function(row) {
    return {
      asset_id: String(row[0] || "").trim(),
      url: String(row[1] || "").trim(),
      original_name: String(row[2] || "").trim(),
      category: String(row[3] || "").trim(),
      created_at: String(row[4] || "").trim()
    };
  }).filter(function(item) {
    return item.asset_id !== "";
  });

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_ASSETS",
    command: "GET_ASSETS",
    count: items.length,
    items: items
  });
}

function handleCreateAsset_(payload) {
  const directUrl = toTextOrEmpty_(payload.url || payload.image_url || payload.image_path || "");
  const base64Content = String(payload.base64 || payload.image_file_base64 || "").trim();
  const fileName = toTextOrEmpty_(payload.original_name || payload.image_file_name || "asset.png");
  const category = toTextOrEmpty_(payload.category || "General");
  const mimeType = toTextOrEmpty_(payload.mime_type || payload.image_mime_type || "image/png");

  let finalUrl = directUrl;

  if (!finalUrl && base64Content) {
    try {
      finalUrl = uploadCatalogImageToDrive_(base64Content, fileName, mimeType);
    } catch (e) {
      console.error("PEPTQ_ASSET_UPLOAD_ERROR", String(e));
      return jsonResponse_({
        status: "error",
        code: "ERR_ASSET_UPLOAD_FAILED",
        command: "CREATE_ASSET",
        message: "Failed to upload file to Google Drive"
      });
    }
  }

  if (!finalUrl) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_ASSET_SOURCE",
      command: "CREATE_ASSET",
      message: "Provide either a 'url' or 'base64' payload"
    });
  }

  // Duplicate check
  const existing = findAssetByUrl_(finalUrl);
  if (existing) {
    return jsonResponse_({
      status: "success",
      code: "SUCCESS_ASSET_EXISTS",
      command: "CREATE_ASSET",
      asset_id: existing.asset_id,
      url: existing.url,
      original_name: existing.original_name,
      category: existing.category,
      created_at: existing.created_at,
      message: "Asset already registered"
    });
  }

  const asset = registerAssetRow_(finalUrl, fileName, category);

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_ASSET_CREATED",
    command: "CREATE_ASSET",
    asset_id: asset.asset_id,
    url: asset.url,
    original_name: asset.original_name,
    category: asset.category,
    created_at: asset.created_at
  });
}

function registerAssetRow_(url, fileName, category) {
  const assetSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ASSET);
  const headers = ["asset_id", "url", "original_name", "category", "created_at"];
  ensureHeaders_(assetSheet, headers);

  const assetId = "ASSET-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
  const createdAt = new Date().toISOString();

  assetSheet.appendRow([
    assetId,
    url,
    fileName,
    category || "General",
    createdAt
  ]);

  return {
    asset_id: assetId,
    url: url,
    original_name: fileName,
    category: category || "General",
    created_at: createdAt
  };
}

function findAssetByUrl_(url) {
  const assetSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ASSET);
  const lastRow = assetSheet.getLastRow();
  if (lastRow < 2) return null;

  const values = assetSheet.getRange(2, 1, lastRow - 1, 5).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][1]).trim() === String(url).trim()) {
      return {
        asset_id: values[i][0],
        url: values[i][1],
        original_name: values[i][2],
        category: values[i][3],
        created_at: values[i][4]
      };
    }
  }
  return null;
}

function handleDeleteAsset_(payload) {
  const assetId = toTextOrEmpty_(payload.asset_id || payload.id);
  if (!assetId) {
    return jsonResponse_({
      status: "error",
      code: "ERR_MISSING_ASSET_ID",
      command: "DELETE_ASSET",
      message: "asset_id is required"
    });
  }

  const assetSheet = getOrCreateSheet_(PEPTQ_CONFIG.SHEETS.ASSET);
  const lastRow = assetSheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse_({
      status: "error",
      code: "ERR_ASSET_NOT_FOUND",
      command: "DELETE_ASSET",
      message: "Asset not found"
    });
  }

  const values = assetSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let targetRow = 0;
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === assetId) {
      targetRow = i + 2;
      break;
    }
  }

  if (!targetRow) {
    return jsonResponse_({
      status: "error",
      code: "ERR_ASSET_NOT_FOUND",
      command: "DELETE_ASSET",
      message: "Asset not found"
    });
  }

  // Optional: Delete from Drive if it's a Drive URL?
  // For now, just remove from sheet to keep it safe.
  
  assetSheet.deleteRow(targetRow);

  return jsonResponse_({
    status: "success",
    code: "SUCCESS_ASSET_DELETED",
    command: "DELETE_ASSET",
    asset_id: assetId,
    message: "Asset registry entry removed"
  });
}

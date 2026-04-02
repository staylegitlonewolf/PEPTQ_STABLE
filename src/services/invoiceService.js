import { jsPDF } from 'jspdf';

const BRAND_NAME = 'PEPTQ Research Portal';

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const toCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

const parseJsonObject = (value) => {
  const raw = normalizeText(value);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const parseJsonArray = (value) => {
  const raw = normalizeText(value);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatDateTime = (value) => {
  if (!value) return new Date().toLocaleString();
  const next = new Date(value);
  return Number.isNaN(next.getTime()) ? new Date().toLocaleString() : next.toLocaleString();
};

const buildShippingLines = (shipping = {}) => {
  const locationLine = [shipping.city, shipping.state, shipping.zip].filter(Boolean).join(', ');
  return [
    normalizeText(shipping.business_name),
    normalizeText(shipping.recipient_name),
    normalizeText(shipping.address),
    locationLine,
    normalizeText(shipping.country),
    shipping.phone ? `Phone: ${normalizeText(shipping.phone)}` : '',
  ].filter(Boolean);
};

export const createInvoiceSnapshot = (order, { paymentInstructions = '' } = {}) => {
  const safeOrder = order || {};
  const shipping = parseJsonObject(safeOrder.shipping_data || '');
  const items = parseJsonArray(safeOrder.items_json || '').map((item) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const unitPrice = Number(item.unit_price ?? item.price ?? item.line_total ?? 0);
    const lineTotal = Number(item.line_total ?? quantity * unitPrice);

    return {
      name: normalizeText(item.name || item.handle || 'Item'),
      quantity,
      unitPrice: Number(unitPrice.toFixed(2)),
      lineTotal: Number(lineTotal.toFixed(2)),
    };
  });

  const computedTotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const totalAmount = Number(safeOrder.total_amount || computedTotal || 0);
  const addressType = normalizeText(shipping?.address_type).toUpperCase() || 'PERSONAL';

  return {
    brandName: BRAND_NAME,
    invoiceId: normalizeText(safeOrder.invoice_id) || `INV-${normalizeText(safeOrder.order_id || 'ORDER')}`,
    orderId: normalizeText(safeOrder.order_id),
    memberEmail: normalizeText(safeOrder.member_email),
    createdAtLabel: formatDateTime(safeOrder.timestamp),
    paymentStatus: normalizeText(safeOrder.payment_status) || 'UNPAID',
    orderStatus: normalizeText(safeOrder.status) || 'PENDING',
    trackingNumber: normalizeText(safeOrder.tracking_num),
    businessName: normalizeText(shipping?.business_name),
    recipientName: normalizeText(shipping?.recipient_name),
    addressType,
    shippingLines: buildShippingLines(shipping || {}),
    items,
    totalAmount: Number(totalAmount.toFixed(2)),
    paymentInstructions: normalizeText(paymentInstructions),
  };
};

export const createInvoiceDocumentHtml = (snapshot) => {
  const safeSnapshot = snapshot || {};
  const itemRows = (safeSnapshot.items || []).map((item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${item.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${toCurrency(item.unitPrice)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${toCurrency(item.lineTotal)}</td>
    </tr>
  `).join('');

  const shippingBlock = (safeSnapshot.shippingLines || []).map((line) => `<p style="margin:0 0 6px 0;">${line}</p>`).join('');

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${safeSnapshot.invoiceId || 'Invoice Preview'}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 32px; }
        .page { max-width: 880px; margin: 0 auto; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
        .card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; }
        .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: #c24a00; font-weight: 700; margin: 0 0 8px 0; }
        h1 { margin: 0; font-size: 28px; }
        h2 { margin: 6px 0 0 0; font-size: 18px; color: #c24a00; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { text-align: left; padding: 10px 12px; border-bottom: 2px solid #111827; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
        .totals { margin-top: 20px; display: flex; justify-content: flex-end; }
        .totals-card { min-width: 240px; border: 1px solid #e5e7eb; border-radius: 16px; padding: 16px; }
        .totals-row { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
        .footer { margin-top: 28px; font-size: 12px; color: #4b5563; }
      </style>
    </head>
    <body>
      <div class="page">
        <p class="eyebrow">PEPTQ Fulfillment Artifact</p>
        <h1>${safeSnapshot.brandName || BRAND_NAME}</h1>
        <h2>Invoice Preview</h2>

        <div class="meta-grid">
          <div class="card">
            <p class="eyebrow">Invoice Details</p>
            <p><strong>Invoice ID:</strong> ${safeSnapshot.invoiceId || '--'}</p>
            <p><strong>Order ID:</strong> ${safeSnapshot.orderId || '--'}</p>
            <p><strong>Created:</strong> ${safeSnapshot.createdAtLabel || '--'}</p>
            <p><strong>Order Status:</strong> ${safeSnapshot.orderStatus || '--'}</p>
            <p><strong>Payment Status:</strong> ${safeSnapshot.paymentStatus || '--'}</p>
            <p><strong>Tracking:</strong> ${safeSnapshot.trackingNumber || 'Not assigned'}</p>
          </div>
          <div class="card">
            <p class="eyebrow">Ship To</p>
            ${shippingBlock || '<p style="margin:0;">No shipping snapshot saved.</p>'}
            <p style="margin:12px 0 0 0;"><strong>Identity:</strong> ${safeSnapshot.addressType || 'PERSONAL'}</p>
            <p style="margin:6px 0 0 0;"><strong>Member:</strong> ${safeSnapshot.memberEmail || '--'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || '<tr><td colspan="4" style="padding:12px;">No itemized rows available.</td></tr>'}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-card">
            <div class="totals-row"><strong>Total</strong><strong>${toCurrency(safeSnapshot.totalAmount)}</strong></div>
            ${safeSnapshot.paymentInstructions ? `<div style="margin-top:14px;font-size:12px;color:#4b5563;"><strong>Payment Instructions:</strong><br />${safeSnapshot.paymentInstructions}</div>` : ''}
          </div>
        </div>

        <p class="footer">Research use only. This invoice preview reflects the frozen order snapshot stored at submission time.</p>
      </div>
    </body>
  </html>`;
};

export const openInvoicePrintWindow = (snapshot) => {
  if (typeof window === 'undefined') return false;
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=980,height=760');
  if (!printWindow) return false;

  printWindow.document.write(createInvoiceDocumentHtml(snapshot));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
};

export const downloadInvoicePdf = (snapshot) => {
  const safeSnapshot = snapshot || {};
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const usableWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 48;
  let cursorY = margin;

  const ensureSpace = (neededHeight = 24) => {
    if (cursorY + neededHeight <= bottomLimit) return;
    doc.addPage();
    cursorY = margin;
  };

  const drawLabelValue = (label, value, { indent = 0, color = [17, 24, 39] } = {}) => {
    const text = `${label}${value}`;
    const lines = doc.splitTextToSize(text, usableWidth - indent);
    ensureSpace(lines.length * 14 + 4);
    doc.setTextColor(...color);
    doc.text(lines, margin + indent, cursorY);
    cursorY += lines.length * 14 + 4;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(194, 74, 0);
  doc.text('PEPTQ FULFILLMENT ARTIFACT', margin, cursorY);
  cursorY += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(17, 24, 39);
  doc.text(safeSnapshot.brandName || BRAND_NAME, margin, cursorY);
  cursorY += 22;

  doc.setFontSize(16);
  doc.setTextColor(194, 74, 0);
  doc.text('Invoice Preview', margin, cursorY);
  cursorY += 26;

  doc.setDrawColor(229, 231, 235);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  drawLabelValue('Invoice ID: ', safeSnapshot.invoiceId || '--');
  drawLabelValue('Order ID: ', safeSnapshot.orderId || '--');
  drawLabelValue('Created: ', safeSnapshot.createdAtLabel || '--');
  drawLabelValue('Order Status: ', safeSnapshot.orderStatus || '--');
  drawLabelValue('Payment Status: ', safeSnapshot.paymentStatus || '--');
  drawLabelValue('Tracking: ', safeSnapshot.trackingNumber || 'Not assigned');
  drawLabelValue('Member: ', safeSnapshot.memberEmail || '--');
  drawLabelValue('Identity: ', safeSnapshot.addressType || 'PERSONAL');

  cursorY += 8;
  ensureSpace(32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text('Ship To', margin, cursorY);
  cursorY += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  if ((safeSnapshot.shippingLines || []).length) {
    safeSnapshot.shippingLines.forEach((line) => drawLabelValue('', line));
  } else {
    drawLabelValue('', 'No shipping snapshot saved.');
  }

  cursorY += 10;
  ensureSpace(28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Items', margin, cursorY);
  cursorY += 16;

  const tableColumns = [
    { key: 'name', label: 'Item', width: usableWidth * 0.45, align: 'left' },
    { key: 'quantity', label: 'Qty', width: usableWidth * 0.12, align: 'right' },
    { key: 'unitPrice', label: 'Unit', width: usableWidth * 0.18, align: 'right' },
    { key: 'lineTotal', label: 'Line Total', width: usableWidth * 0.25, align: 'right' },
  ];

  const rowHeight = 20;
  let rowX = margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  tableColumns.forEach((column) => {
    const labelX = column.align === 'right' ? rowX + column.width : rowX;
    doc.text(column.label, labelX, cursorY, { align: column.align });
    rowX += column.width;
  });
  cursorY += 8;
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 14;

  const items = safeSnapshot.items || [];
  if (!items.length) {
    drawLabelValue('', 'No itemized rows available.');
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    items.forEach((item) => {
      ensureSpace(rowHeight);
      let cellX = margin;
      tableColumns.forEach((column) => {
        const value = column.key === 'unitPrice' || column.key === 'lineTotal'
          ? toCurrency(item[column.key])
          : String(item[column.key] ?? '');
        const maxWidth = column.width - 6;
        const lines = doc.splitTextToSize(value, maxWidth);
        const textY = cursorY;
        const anchorX = column.align === 'right' ? cellX + column.width : cellX;
        doc.text(lines[0] || '', anchorX, textY, { align: column.align });
        cellX += column.width;
      });
      cursorY += rowHeight;
    });
  }

  cursorY += 4;
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: ${toCurrency(safeSnapshot.totalAmount)}`, pageWidth - margin, cursorY, { align: 'right' });
  cursorY += 22;

  if (safeSnapshot.paymentInstructions) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Payment Instructions', margin, cursorY);
    cursorY += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const instructionLines = doc.splitTextToSize(safeSnapshot.paymentInstructions, usableWidth);
    ensureSpace(instructionLines.length * 12 + 4);
    doc.text(instructionLines, margin, cursorY);
    cursorY += instructionLines.length * 12 + 4;
  }

  cursorY += 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  const footer = doc.splitTextToSize(
    'Research use only. This invoice preview reflects the frozen order snapshot stored at submission time.',
    usableWidth
  );
  ensureSpace(footer.length * 11 + 4);
  doc.text(footer, margin, cursorY);

  const fileName = `${normalizeText(safeSnapshot.invoiceId || safeSnapshot.orderId || 'invoice').replace(/[^A-Za-z0-9-_]/g, '_')}.pdf`;
  doc.save(fileName || 'invoice.pdf');
};

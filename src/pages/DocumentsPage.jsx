import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import { useAccessibility } from '../context/AccessibilityContext';
import { createProformaInvoiceHtml, fetchOrderHistory } from '../services/orderService';

const openPrintWindow = (order) => {
  const html = createProformaInvoiceHtml(order);
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const parseItems = (raw) => {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const extractJsonArraySegment = (raw, startIndex) => {
  const openIndex = raw.indexOf('[', startIndex);
  if (openIndex === -1) return null;

  let depth = 0;
  for (let index = openIndex; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === '[') depth += 1;
    if (char === ']') depth -= 1;
    if (depth === 0) {
      return {
        start: openIndex,
        end: index,
        value: raw.slice(openIndex, index + 1),
      };
    }
  }

  return null;
};

const parseCoaMappings = (notes = '') => {
  const raw = String(notes || '').trim();
  if (!raw) return [];

  const marker = 'CoA mapped:';
  const results = [];
  const seen = new Set();
  let cursor = 0;

  while (cursor < raw.length) {
    const markerIndex = raw.indexOf(marker, cursor);
    if (markerIndex === -1) break;

    const segment = extractJsonArraySegment(raw, markerIndex + marker.length);
    if (!segment) {
      cursor = markerIndex + marker.length;
      continue;
    }

    try {
      const parsed = JSON.parse(segment.value);
      if (Array.isArray(parsed)) {
        parsed.forEach((entry) => {
          const handle = normalizeText(entry?.handle).toLowerCase();
          const lotId = normalizeText(entry?.lot_id || entry?.lotId);
          const coaUrl = normalizeText(entry?.coa_url || entry?.coaUrl);
          if (!handle || !coaUrl) return;
          const key = `${handle}::${lotId}::${coaUrl}`;
          if (seen.has(key)) return;
          seen.add(key);
          results.push({
            handle,
            lot_id: lotId,
            coa_url: coaUrl,
          });
        });
      }
    } catch {
      // Ignore malformed note fragments and keep scanning.
    }

    cursor = segment.end + 1;
  }

  return results;
};

const buildVerificationDocuments = (orders = []) => {
  return orders.flatMap((order) => {
    const items = parseItems(order.items_json);
    const itemLabelByHandle = new Map(
      items.map((item) => [normalizeText(item?.handle).toLowerCase(), normalizeText(item?.name || item?.handle || 'Research Item')])
    );

    return parseCoaMappings(order.owner_notes || order.admin_notes).map((entry) => ({
      id: `${normalizeText(order.order_id)}::${entry.handle}::${entry.lot_id || entry.coa_url}`,
      order_id: normalizeText(order.order_id),
      timestamp: normalizeText(order.timestamp),
      product_label: itemLabelByHandle.get(entry.handle) || entry.handle,
      handle: entry.handle,
      lot_id: entry.lot_id,
      coa_url: entry.coa_url,
      status: normalizeText(order.status).toUpperCase() || 'ORDER RECEIVED',
    }));
  });
};

function DocumentsPage() {
  const { session } = useAuth();
  const { language = 'en' } = useAccessibility();
  const es = language === 'es';
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadDocuments = async () => {
      if (!session?.email) {
        if (active) {
          setOrders([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const rows = await fetchOrderHistory({
          memberEmail: session.email,
          includeAll: false,
          includeArchives: true,
        });

        if (active) {
          setOrders(Array.isArray(rows) ? rows : []);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadDocuments();

    return () => {
      active = false;
    };
  }, [session?.email]);

  const text = {
    title: es ? 'Mis Documentos' : 'My Documents',
    subtitle: es
      ? 'Accede a facturas y documentos de verificacion vinculados a tus compras registradas.'
      : 'Access invoice and verification documents linked to your recorded purchases.',
    loading: es ? 'Cargando documentos...' : 'Loading documents...',
    empty: es ? 'Aun no hay documentos disponibles.' : 'No documents are available yet.',
    invoiceSection: es ? 'Facturas' : 'Invoices',
    verificationSection: es ? 'Documentos de Verificacion' : 'Verification Documents',
    invoiceEmpty: es ? 'Aun no hay documentos de factura disponibles.' : 'No invoice documents are available yet.',
    verificationEmpty: es ? 'Aun no hay documentos de verificacion asignados a tus pedidos.' : 'No verification documents have been assigned to your orders yet.',
    order: es ? 'Orden' : 'Order',
    amount: es ? 'Monto' : 'Amount',
    viewPdf: es ? 'Ver PDF' : 'View PDF',
    printInvoice: es ? 'Imprimir Factura' : 'Print Invoice',
    openCoa: es ? 'Abrir COA' : 'Open COA',
    batch: es ? 'Lote' : 'Batch',
    status: es ? 'Estado' : 'Status',
    assignedAt: es ? 'Asignado desde' : 'Assigned from',
  };

  const invoiceDocs = useMemo(() => (
    orders.filter((order) => ['INVOICED', 'PAID'].includes(String(order.payment_status || '').toUpperCase()))
  ), [orders]);

  const verificationDocs = useMemo(() => buildVerificationDocuments(orders), [orders]);
  const hasAnyDocuments = invoiceDocs.length > 0 || verificationDocs.length > 0;

  return (
    <section className="min-h-[60vh] px-6 py-10 bg-white dark:bg-[#0a0a0f]">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-brand-navy dark:text-white">{text.title}</h1>
        <p className="mt-2 text-sm text-brand-navy/60 dark:text-gray-300">{text.subtitle}</p>

        {isLoading ? (
          <div className="mt-6 rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 p-6 text-sm text-brand-navy/70 dark:text-gray-300">
            {text.loading}
          </div>
        ) : !hasAnyDocuments ? (
          <div className="mt-6 rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 p-6 text-sm text-brand-navy/70 dark:text-gray-300">
            {text.empty}
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-brand-navy dark:text-white">{text.invoiceSection}</h2>
                <span className="rounded-full border border-brand-navy/15 dark:border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-brand-orange">
                  {invoiceDocs.length}
                </span>
              </div>

              {invoiceDocs.length === 0 ? (
                <div className="rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 p-5 text-sm text-brand-navy/70 dark:text-gray-300">
                  {text.invoiceEmpty}
                </div>
              ) : (
                <div className="space-y-3">
                  {invoiceDocs.map((order) => (
                    <article key={order.order_id} className="rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-brand-navy dark:text-white">{order.invoice_id || `INV-${order.order_id}`}</p>
                        <p className="text-xs uppercase font-black tracking-widest text-brand-orange">{order.payment_status}</p>
                      </div>
                      <p className="mt-1 text-xs text-brand-navy/60 dark:text-gray-400">{text.order}: {order.order_id}</p>
                      <p className="text-xs text-brand-navy/60 dark:text-gray-400">{text.amount}: ${Number(order.total_amount || 0).toFixed(2)}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {order.invoice_pdf_url ? (
                          <a href={order.invoice_pdf_url} target="_blank" rel="noreferrer" className="rounded-xl border border-brand-navy/25 dark:border-white/20 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-brand-navy dark:text-gray-200">{text.viewPdf}</a>
                        ) : null}
                        <button type="button" onClick={() => openPrintWindow(order)} className="rounded-xl border border-brand-navy/25 dark:border-white/20 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-brand-navy dark:text-gray-200">{text.printInvoice}</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-brand-navy dark:text-white">{text.verificationSection}</h2>
                <span className="rounded-full border border-brand-navy/15 dark:border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-brand-orange">
                  {verificationDocs.length}
                </span>
              </div>

              {verificationDocs.length === 0 ? (
                <div className="rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 p-5 text-sm text-brand-navy/70 dark:text-gray-300">
                  {text.verificationEmpty}
                </div>
              ) : (
                <div className="space-y-3">
                  {verificationDocs.map((doc) => (
                    <article key={doc.id} className="rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-black text-brand-navy dark:text-white">{doc.product_label}</p>
                          <p className="mt-1 text-xs text-brand-navy/60 dark:text-gray-400">{text.order}: {doc.order_id}</p>
                        </div>
                        <p className="text-xs uppercase font-black tracking-widest text-brand-orange">{doc.status}</p>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-brand-navy/70 dark:text-gray-300">
                        {doc.lot_id ? <p>{text.batch}: <span className="font-bold">{doc.lot_id}</span></p> : null}
                        <p>{text.assignedAt}: <span className="font-bold">{doc.timestamp ? new Date(doc.timestamp).toLocaleString() : '--'}</span></p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <a href={doc.coa_url} target="_blank" rel="noreferrer" className="rounded-xl border border-brand-navy/25 dark:border-white/20 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-brand-navy dark:text-gray-200">
                          {text.openCoa}
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </section>
  );
}

export default DocumentsPage;

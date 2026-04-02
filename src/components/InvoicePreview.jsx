import PropTypes from 'prop-types';
import { Download, Printer, X } from 'lucide-react';
import { createInvoiceSnapshot, downloadInvoicePdf, openInvoicePrintWindow } from '../services/invoiceService';

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

function InvoicePreview({ order, paymentInstructions = '', open = false, onClose = () => {} }) {
  if (!open || !order) return null;

  const snapshot = createInvoiceSnapshot(order, { paymentInstructions });

  return (
    <div className="fixed inset-0 z-[90] bg-brand-navy/60 backdrop-blur-sm px-4 py-6">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-brand-navy/15 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0f172a]">
        <div className="flex items-center justify-between gap-3 border-b border-brand-navy/10 px-5 py-4 dark:border-white/10">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-orange">Invoice Preview</p>
            <h2 className="mt-1 text-lg font-black text-brand-navy dark:text-white">{snapshot.invoiceId}</h2>
            <p className="mt-1 text-sm text-brand-navy/65 dark:text-gray-300">{snapshot.orderId || 'Pending order'} · {snapshot.memberEmail || 'No member email'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openInvoicePrintWindow(snapshot)}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-navy/20 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-brand-navy dark:border-white/20 dark:text-gray-200"
            >
              <Printer size={14} />
              Print
            </button>
            <button
              type="button"
              onClick={() => downloadInvoicePdf(snapshot)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white"
            >
              <Download size={14} />
              Download PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-navy/20 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-brand-navy dark:border-white/20 dark:text-gray-200"
            >
              <X size={14} />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f8f7f2] px-4 py-4 dark:bg-[#111827]">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-brand-navy/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1220]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-orange">PEPTQ Fulfillment Artifact</p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-3xl font-black text-brand-navy dark:text-white">{snapshot.brandName}</h3>
                <p className="mt-2 text-sm text-brand-orange">Invoice Preview</p>
              </div>
              <div className="rounded-2xl border border-brand-navy/10 px-4 py-3 text-sm text-brand-navy dark:border-white/10 dark:text-gray-200">
                <p><span className="font-black">Invoice ID:</span> {snapshot.invoiceId}</p>
                <p><span className="font-black">Order ID:</span> {snapshot.orderId || '--'}</p>
                <p><span className="font-black">Created:</span> {snapshot.createdAtLabel}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <section className="rounded-2xl border border-brand-navy/10 px-4 py-4 dark:border-white/10">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-orange">Invoice Details</p>
                <div className="mt-3 space-y-2 text-sm text-brand-navy dark:text-gray-200">
                  <p><span className="font-black">Order Status:</span> {snapshot.orderStatus}</p>
                  <p><span className="font-black">Payment Status:</span> {snapshot.paymentStatus}</p>
                  <p><span className="font-black">Tracking:</span> {snapshot.trackingNumber || 'Not assigned'}</p>
                  <p><span className="font-black">Identity:</span> {snapshot.addressType}</p>
                  <p><span className="font-black">Member:</span> {snapshot.memberEmail || '--'}</p>
                </div>
              </section>

              <section className="rounded-2xl border border-brand-navy/10 px-4 py-4 dark:border-white/10">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-orange">Ship To</p>
                <div className="mt-3 space-y-1 text-sm text-brand-navy dark:text-gray-200">
                  {snapshot.shippingLines.length ? snapshot.shippingLines.map((line) => (
                    <p key={line}>{line}</p>
                  )) : (
                    <p>No shipping snapshot saved.</p>
                  )}
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-2xl border border-brand-navy/10 px-4 py-4 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-orange">Itemization</p>
                <p className="text-xs text-brand-navy/60 dark:text-gray-400">{snapshot.items.length} item{snapshot.items.length === 1 ? '' : 's'}</p>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-brand-navy/10 dark:border-white/10">
                      <th className="py-2 pr-3 text-left text-[11px] font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-400">Item</th>
                      <th className="py-2 px-3 text-right text-[11px] font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-400">Qty</th>
                      <th className="py-2 px-3 text-right text-[11px] font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-400">Unit</th>
                      <th className="py-2 pl-3 text-right text-[11px] font-black uppercase tracking-widest text-brand-navy/60 dark:text-gray-400">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.items.length ? snapshot.items.map((item, index) => (
                      <tr key={`${item.name}-${index}`} className="border-b border-brand-navy/8 dark:border-white/5">
                        <td className="py-3 pr-3 text-brand-navy dark:text-gray-200">{item.name}</td>
                        <td className="py-3 px-3 text-right text-brand-navy dark:text-gray-200">{item.quantity}</td>
                        <td className="py-3 px-3 text-right text-brand-navy dark:text-gray-200">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-3 pl-3 text-right font-black text-brand-navy dark:text-white">{formatCurrency(item.lineTotal)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="py-4 text-brand-navy/65 dark:text-gray-300">No itemized rows available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              {snapshot.paymentInstructions ? (
                <section className="rounded-2xl border border-brand-navy/10 px-4 py-4 text-sm text-brand-navy dark:border-white/10 dark:text-gray-200 md:max-w-xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-orange">Payment Instructions</p>
                  <p className="mt-3 whitespace-pre-wrap">{snapshot.paymentInstructions}</p>
                </section>
              ) : <div />}

              <section className="min-w-[240px] rounded-2xl border border-brand-navy/10 px-4 py-4 dark:border-white/10">
                <div className="flex items-center justify-between gap-4 text-sm text-brand-navy dark:text-gray-200">
                  <span className="font-black">Total</span>
                  <span className="text-lg font-black text-brand-navy dark:text-white">{formatCurrency(snapshot.totalAmount)}</span>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

InvoicePreview.propTypes = {
  order: PropTypes.shape({
    invoice_id: PropTypes.string,
    order_id: PropTypes.string,
    member_email: PropTypes.string,
    timestamp: PropTypes.string,
    payment_status: PropTypes.string,
    status: PropTypes.string,
    tracking_num: PropTypes.string,
    items_json: PropTypes.string,
    shipping_data: PropTypes.string,
    total_amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
  paymentInstructions: PropTypes.string,
  open: PropTypes.bool,
  onClose: PropTypes.func,
};

export default InvoicePreview;

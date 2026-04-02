import { useEffect, useState } from 'react';
import { Building2, Home, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useAccessibility } from '../context/AccessibilityContext';
import { fetchOrderHistory } from '../services/orderService';

const parseShippingDataBlob = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const buildShippingSummary = (shipping = null) => {
  if (!shipping || typeof shipping !== 'object') return '';
  return [
    shipping.business_name,
    shipping.address,
    [shipping.city, shipping.state].filter(Boolean).join(', '),
  ].filter(Boolean).join(' · ');
};

const getOrderStatusLabel = (status = '') => {
  const normalized = String(status || '').trim().toUpperCase() || 'PENDING';
  const labels = {
    PENDING: 'Pending',
    'ORDER RECEIVED': 'Confirmed',
    PROCESSING: 'Processing',
    SHIPPED: 'In Route',
    DELIVERED: 'Delivered',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return labels[normalized] || normalized;
};

const getOrderStatusTone = (status = '') => {
  const normalized = String(status || '').trim().toUpperCase();
  if (['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(normalized)) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (normalized === 'CANCELLED') {
    return 'border-brand-orange/30 bg-brand-orange/10 text-brand-orange';
  }
  return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
};

function OrderHistoryPage() {
  const { session, role } = useAuth();
  const { language = 'en' } = useAccessibility();
  const es = language === 'es';
  const canViewAll = role === 'OWNER';
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const rows = await fetchOrderHistory({
          memberEmail: session?.email || '',
          includeAll: canViewAll,
          includeArchives: true,
        });
        if (active) {
          setOrders(Array.isArray(rows) ? rows : []);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadHistory();

    return () => {
      active = false;
    };
  }, [session?.email, canViewAll]);

  const parseItems = (raw) => {
    try {
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const text = {
    title: es ? 'Libro de Compras' : 'Procurement Ledger',
    subtitle: es
      ? 'Historial de ordenes de libros activos y archivados, con respaldo local para continuidad.'
      : 'Order history from active and archived ledgers, with local cache fallback for continuity.',
    loading: es ? 'Cargando registros de compras...' : 'Loading procurement records...',
    empty: es ? 'Aun no hay registros de compras disponibles.' : 'No procurement records available yet.',
    pending: es ? 'PENDIENTE' : 'PENDING',
    payment: es ? 'Pago' : 'Payment',
    unpaid: es ? 'NO PAGADO' : 'UNPAID',
    total: es ? 'Total' : 'Total',
    tracking: es ? 'Rastreo' : 'Tracking',
    trackingPending: es ? 'Pendiente' : 'Pending',
    shippingTo: es ? 'Enviado a' : 'Shipped to',
    personal: es ? 'Personal' : 'Personal',
    business: es ? 'Business' : 'Business',
    noShippingSnapshot: es ? 'Sin captura de envio guardada.' : 'No shipping snapshot saved.',
  };

  return (
    <section className="min-h-[60vh] px-6 py-10 bg-white dark:bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black text-brand-navy dark:text-white tracking-tight">{text.title}</h1>
        <p className="mt-2 text-sm text-brand-navy/60 dark:text-gray-300">{text.subtitle}</p>

        {isLoading && (
          <div className="mt-6 rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 p-6 text-sm text-brand-navy/70 dark:text-gray-300">
            {text.loading}
          </div>
        )}

        {!isLoading && orders.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 p-6 text-sm text-brand-navy/70 dark:text-gray-300">
            {text.empty}
          </div>
        ) : !isLoading ? (
          <div className="mt-6 space-y-3">
            {orders.map((order) => {
              const items = parseItems(order.items_json);
              const shipping = parseShippingDataBlob(order.shipping_data);
              const isBusiness = String(shipping?.address_type || '').trim().toUpperCase() === 'BUSINESS';
              const shippingSummary = buildShippingSummary(shipping);
              const ShippingIcon = isBusiness ? Building2 : Home;
              return (
                <article key={order.order_id} className="rounded-2xl border border-brand-navy/15 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-black text-brand-navy dark:text-white">{order.order_id}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${isBusiness ? 'border-brand-orange/30 bg-brand-orange/10 text-brand-orange' : 'border-brand-navy/20 dark:border-white/15 bg-brand-navy/5 dark:bg-white/5 text-brand-navy dark:text-gray-200'}`}>
                        <ShippingIcon size={12} />
                        {isBusiness ? text.business : text.personal}
                      </span>
                      <p className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${getOrderStatusTone(order.status)}`}>
                        {getOrderStatusLabel(order.status || text.pending)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-brand-navy/60 dark:text-gray-400">{order.timestamp ? new Date(order.timestamp).toLocaleString() : '--'}</p>

                  <div className="mt-3 text-sm text-brand-navy/80 dark:text-gray-200 space-y-1">
                    <p>{text.payment}: <span className="font-bold">{order.payment_status || text.unpaid}</span></p>
                    <p>{text.total}: <span className="font-bold">${Number(order.total_amount || 0).toFixed(2)}</span></p>
                    <p>{text.tracking}: <span className="font-bold">{order.tracking_num || text.trackingPending}</span></p>
                  </div>

                  <div className="mt-3 rounded-xl border border-brand-navy/10 dark:border-white/10 bg-brand-navy/3 dark:bg-white/3 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-orange">{text.shippingTo}</p>
                    <div className="mt-2 flex items-start gap-2">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-brand-orange" />
                      <p className="text-sm text-brand-navy/75 dark:text-gray-300">
                        {shippingSummary || text.noShippingSnapshot}
                      </p>
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div className="mt-3 text-xs text-brand-navy/70 dark:text-gray-300">
                      {items.map((item) => (
                        <p key={`${order.order_id}-${item.handle}-${item.name}`}>{item.name || item.handle} x {item.quantity || 1}</p>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default OrderHistoryPage;

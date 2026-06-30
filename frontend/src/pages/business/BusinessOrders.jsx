import { useEffect, useMemo, useState } from 'react';
import ProductImage from '../../components/ProductImage';
import { formatProductPrice } from '../../utils/productCurrency';
import { api, getErrorMessage } from '../../services/api';

function formatLabel(value) {
  if (!value) return '—';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function paymentMethodLabel(method) {
  if (method === 'cod') return 'Cash on delivery';
  if (method === 'stripe') return 'Card (Stripe)';
  if (method === 'mock') return 'Mock payment';
  return '—';
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CustomerDetails({ order }) {
  const player = order.player;
  const profile = player?.playerProfile;
  const ship = order.shippingAddress;

  const rows = [
    { label: 'Full name', value: profile?.fullName || ship?.fullName },
    { label: 'Email', value: player?.email },
    { label: 'Phone', value: profile?.phone || ship?.phone },
    { label: 'Sport', value: formatLabel(profile?.sportPreference) },
    { label: 'Skill level', value: formatLabel(profile?.skillLevel) },
    { label: 'City', value: profile?.city || ship?.city },
    { label: 'Profile address', value: profile?.address },
    {
      label: 'Shipping address',
      value: ship?.line1
        ? [ship.line1, ship.city, ship.postalCode].filter(Boolean).join(', ')
        : null,
    },
    { label: 'Customer note', value: order.customerNote },
    { label: 'Ordered on', value: formatDate(order.createdAt) },
  ].filter((row) => row.value);

  if (!rows.length) {
    return (
      <p className="mt-3 text-xs text-slate-500">No customer details available for this order.</p>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-[#cc97ff]/15 bg-black/25 p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-base text-[#cc97ff]">person</span>
        <p className="font-headline text-xs font-bold uppercase tracking-[0.16em] text-[#cc97ff]">
          Customer details
        </p>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border border-white/[0.04] bg-[#0b1324]/60 px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{row.label}</dt>
            <dd className="mt-0.5 text-sm text-slate-200 break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function OrderItemDetails({ item }) {
  const lineTotal = (item.unitPrice ?? 0) * (item.quantity ?? 1);
  return (
    <li className="flex gap-4 rounded-xl border border-white/[0.06] bg-[#0b1324]/60 p-3 sm:p-4">
      <ProductImage
        product={item}
        path={item.imagePath}
        alt={item.name}
        className="h-20 w-20 shrink-0 rounded-lg object-cover sm:h-24 sm:w-24"
        placeholderClassName="h-20 w-20 shrink-0 rounded-lg sm:h-24 sm:w-24"
      />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">{item.name || 'Product'}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-slate-500">
          {item.sportType ? (
            <span className="rounded bg-white/5 px-2 py-0.5 capitalize">{item.sportType}</span>
          ) : null}
          {item.category ? <span className="rounded bg-white/5 px-2 py-0.5">{item.category}</span> : null}
          <span className="rounded bg-white/5 px-2 py-0.5">Qty {item.quantity}</span>
        </div>
        {item.description ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">{item.description}</p>
        ) : (
          <p className="mt-2 text-xs italic text-slate-600">No description on file.</p>
        )}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
          <span className="text-slate-400">
            Unit: <span className="font-orbitron text-[#cc97ff]">{formatProductPrice(item.unitPrice)}</span>
          </span>
          {item.listPrice != null && item.listPrice !== item.unitPrice ? (
            <span className="text-xs text-slate-500 line-through">{formatProductPrice(item.listPrice)}</span>
          ) : null}
          <span className="font-orbitron font-medium text-[#9bffce]">Line total: {formatProductPrice(lineTotal)}</span>
        </div>
      </div>
    </li>
  );
}

/** Filters, tracking, status */
export default function BusinessOrders() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('');

  const loadOrders = () =>
    api
      .get('/business/orders')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));

  useEffect(() => {
    loadOrders();
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return list;
    return list.filter((o) => o.status === filter);
  }, [list, filter]);

  const update = async (id, status) => {
    try {
      await api.patch(`/business/orders/${id}`, { status });
      await loadOrders();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  const setTracking = async (id) => {
    const trackingNumber = prompt('Tracking number');
    if (trackingNumber == null || trackingNumber === '') return;
    try {
      await api.patch(`/business/orders/${id}`, { trackingNumber, status: 'shipped' });
      await loadOrders();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  return (
    <div className="min-w-0">
      <h1 className="font-headline text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">
        My Orders
      </h1>
      <p className="mt-1 text-sm text-slate-400">View player details and fulfil each order.</p>
      <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        <button
          type="button"
          className={`shrink-0 rounded-lg px-3 py-2 text-xs uppercase sm:py-1 ${!filter ? 'bg-[#cc97ff] text-black' : 'bg-black/40 text-slate-400'}`}
          onClick={() => setFilter('')}
        >
          All
        </button>
        {['pending', 'paid', 'processing', 'shipped', 'completed'].map((s) => (
          <button
            key={s}
            type="button"
            className={`shrink-0 rounded-lg px-3 py-2 text-xs uppercase sm:py-1 ${filter === s ? 'bg-[#cc97ff] text-black' : 'bg-black/40 text-slate-400'}`}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>
      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      <ul className="mt-6 space-y-4">
        {filtered.map((o) => (
          <li key={o._id} className="rounded-xl border border-white/[0.06] bg-[#11192c] p-3 text-sm sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className="font-orbitron text-sm text-[#cc97ff] sm:text-base">
                  Order #{o._id.slice(-6).toUpperCase()}
                </p>
                <p className="mt-1 font-medium text-white">
                  <span className="capitalize">{o.status}</span> — {formatProductPrice(o.totalAmount)}
                </p>
                <p className="mt-1 text-xs text-[#9bffce]">
                  {paymentMethodLabel(o.paymentMethod)}
                  {o.paymentMethod === 'cod' ? ' · Collect payment on delivery' : ''}
                </p>
              </div>
              <span className="w-fit rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-headline uppercase tracking-wider text-slate-400">
                {formatDate(o.createdAt)}
              </span>
            </div>

            <CustomerDetails order={o} />

            {o.trackingNumber ? (
              <p className="mt-3 font-orbitron text-xs text-[#9bffce]">Tracking: {o.trackingNumber}</p>
            ) : null}
            {o.items?.length ? (
              <ul className="mt-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Products in this order</p>
                {o.items.map((i, idx) => (
                  <OrderItemDetails key={`${i.product || idx}-${idx}`} item={i} />
                ))}
              </ul>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {['processing', 'shipped', 'completed'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className="min-h-[40px] rounded-lg bg-black/40 px-3 py-2 text-[11px] uppercase tracking-wider text-slate-300 hover:bg-[#1c253b] sm:min-h-0 sm:py-1 sm:text-xs"
                  onClick={() => update(o._id, s)}
                >
                  Mark {s}
                </button>
              ))}
              <button
                type="button"
                className="col-span-2 min-h-[40px] rounded-lg border border-[#cc97ff]/40 px-3 py-2 text-[11px] uppercase text-[#cc97ff] sm:col-span-1 sm:min-h-0 sm:py-1 sm:text-xs"
                onClick={() => setTracking(o._id)}
              >
                Add tracking
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

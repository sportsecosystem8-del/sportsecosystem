import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PlayerCard from '../../components/player/PlayerCard';
import PlayerPageHeader from '../../components/player/PlayerPageHeader';
import ProductImage from '../../components/ProductImage';
import { formatProductPrice } from '../../utils/productCurrency';
import { api, getErrorMessage } from '../../services/api';

export default function PlayerOrders() {
  const location = useLocation();
  const endpoint = location.pathname.startsWith('/coach') ? '/coach/orders' : '/players/orders';
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get(endpoint)
      .then((r) => setOrders(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  }, [endpoint]);

  return (
    <div>
      <PlayerPageHeader title="Orders" subtitle="Your equipment order history." />
      {err ? <p className="mb-4 text-sm text-red-400">{err}</p> : null}
      <ul className="space-y-4">
        {orders.map((o) => (
          <PlayerCard key={o._id} className="text-sm">
            <span className="font-bold text-player-green">{o.status}</span>
            <span className="text-player-on-variant"> — {formatProductPrice(o.totalAmount)}</span>
            {o.paymentMethod === 'easypaisa' ? (
              <p className="mt-1 text-xs text-emerald-200/90">Paid via Easypaisa to the store owner.</p>
            ) : o.paymentMethod === 'cod' ? (
              <p className="mt-1 text-xs text-amber-200/90">Cash on delivery — pay when you receive the order.</p>
            ) : null}
            {o.trackingNumber ? (
              <p className="mt-2 font-orbitron text-xs text-player-green">Tracking: {o.trackingNumber}</p>
            ) : null}
            {o.shippingAddress?.line1 ? (
              <p className="mt-1 text-xs text-player-on-variant">
                Ship: {o.shippingAddress.fullName} · {o.shippingAddress.line1}, {o.shippingAddress.city}
              </p>
            ) : null}
            <ul className="mt-3 space-y-2 text-player-on-variant">
              {o.items?.map((i, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <ProductImage
                    product={i}
                    path={i.imagePath}
                    alt={i.name}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    placeholderClassName="h-12 w-12 shrink-0 rounded-lg"
                  />
                  <span>
                    {i.name} × {i.quantity}
                  </span>
                </li>
              ))}
            </ul>
          </PlayerCard>
        ))}
        {!orders.length && !err ? <p className="text-sm text-player-on-variant">No orders yet.</p> : null}
      </ul>
    </div>
  );
}

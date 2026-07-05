import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PlayerCard from '../../components/player/PlayerCard';
import PlayerPageHeader from '../../components/player/PlayerPageHeader';
import EasypaisaPaySection from '../../components/payment/EasypaisaPaySection';
import ProductImage from '../../components/ProductImage';
import { playerBtnOutlineSm, playerBtnPrimary } from '../../components/player/playerClassNames';
import { publicAssetUrl } from '../../utils/assetUrl';
import { formatProductPrice } from '../../utils/productCurrency';
import { api, getErrorMessage } from '../../services/api';

const SHIPPING_FIELDS = [
  { key: 'fullName', label: 'Full name', required: true },
  { key: 'line1', label: 'Address', required: true },
  { key: 'city', label: 'City', required: true },
  { key: 'phone', label: 'Phone', required: true },
];

export default function PlayerStore() {
  const { ownerId } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [ship, setShip] = useState({ fullName: '', line1: '', city: '', phone: '', postalCode: '' });
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [paySession, setPaySession] = useState(null);

  useEffect(() => {
    api
      .get(`/players/stores/${ownerId}`)
      .then((r) => {
        setStore(r.data?.data?.store || null);
        setProducts(r.data?.data?.products || []);
      })
      .catch((e) => setErr(getErrorMessage(e)));
  }, [ownerId]);

  const cartItems = () =>
    Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

  const cartLines = useMemo(
    () =>
      cartItems().map(({ productId, quantity }) => ({
        productId,
        quantity,
        product: products.find((p) => p._id === productId),
      })),
    [cart, products]
  );

  const cartTotal = useMemo(
    () =>
      cartLines.reduce((sum, { quantity, product }) => {
        const unit = product?.effectivePrice ?? product?.price ?? 0;
        return sum + unit * quantity;
      }, 0),
    [cartLines]
  );

  const shippingValid = ship.fullName.trim() && ship.line1.trim() && ship.city.trim() && ship.phone.trim();

  useEffect(() => {
    const items = cartItems();
    if (!showCheckout || !items.length || !shippingValid) {
      setPaySession(null);
      return;
    }
    api
      .post('/players/orders/easypaisa/initiate', { items })
      .then((r) => setPaySession(r.data?.data || null))
      .catch((e) => {
        setPaySession(null);
        setErr(getErrorMessage(e));
      });
  }, [showCheckout, cart, ship, shippingValid]);

  const placePaidOrder = async (paymentPayload) => {
    const items = cartItems();
    if (!items.length) return;
    setPlacing(true);
    setErr('');
    try {
      await api.post('/players/orders', {
        items,
        paymentMethod: 'easypaisa',
        shippingAddress: ship,
        customerNote: note || undefined,
        ...paymentPayload,
      });
      setCart({});
      setShowCheckout(false);
      setPaySession(null);
      setOk('Order placed! Check My Orders for details.');
    } catch (e) {
      setErr(getErrorMessage(e));
      throw e;
    } finally {
      setPlacing(false);
    }
  };

  const storeName = store?.storeName || 'Store';

  return (
    <div>
      <Link to="/player/shop" className="text-sm text-slate-400 underline">
        ← All equipment
      </Link>
      <PlayerPageHeader title={storeName} subtitle={store?.storeDescription || 'Browse this store’s products'} />
      {store?.storeBannerUrl ? (
        <img src={publicAssetUrl(store.storeBannerUrl)} alt="" className="mb-6 h-40 w-full rounded-xl object-cover" />
      ) : null}
      {err ? <p className="mb-4 text-sm text-red-400">{err}</p> : null}
      {ok ? <p className="mb-4 text-sm text-player-green">{ok}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <PlayerCard key={p._id} className="overflow-hidden p-0">
            <ProductImage product={p} className="h-44 w-full object-cover" placeholderClassName="h-44 w-full" />
            <div className="p-4">
              <p className="text-lg font-bold text-white">{p.name}</p>
              <p className="text-sm text-player-on-variant">
                {p.sportType}
                {p.category ? ` · ${p.category}` : ''}
              </p>
              <p className="mt-2 font-orbitron text-lg font-bold text-player-green">
                {formatProductPrice(p.effectivePrice ?? p.price)}
              </p>
              <button
                type="button"
                onClick={() => setCart((c) => ({ ...c, [p._id]: (c[p._id] || 0) + 1 }))}
                className={`${playerBtnOutlineSm} mt-4 w-full`}
              >
                Add to cart ({cart[p._id] || 0})
              </button>
            </div>
          </PlayerCard>
        ))}
      </div>

      {!products.length ? <p className="mt-6 text-sm text-slate-500">No products listed yet.</p> : null}

      <div className="mt-8">
        <button type="button" onClick={() => setShowCheckout((s) => !s)} className={playerBtnPrimary}>
          {showCheckout ? 'Hide checkout' : 'Checkout'}
        </button>
      </div>

      {showCheckout ? (
        <div className="mt-6 max-w-lg space-y-3 rounded-xl border border-white/10 bg-black/25 p-4 text-sm">
          <p className="font-orbitron text-base font-bold text-white">Total: {formatProductPrice(cartTotal)}</p>
          {SHIPPING_FIELDS.map(({ key, label, required }) => (
            <input
              key={key}
              className="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 text-white"
              placeholder={label}
              value={ship[key]}
              onChange={(e) => setShip((s) => ({ ...s, [key]: e.target.value }))}
              required={required}
            />
          ))}
          <textarea
            className="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 text-white"
            placeholder="Order note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {shippingValid && cartItems().length && paySession ? (
            <EasypaisaPaySection
              session={paySession}
              busy={placing}
              onConfirm={placePaidOrder}
              onError={setErr}
              submitLabel="Verify & place order"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

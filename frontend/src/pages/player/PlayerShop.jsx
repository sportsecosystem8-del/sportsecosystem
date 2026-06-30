import { useEffect, useMemo, useState } from 'react';
import PlayerCard from '../../components/player/PlayerCard';
import PlayerPageHeader from '../../components/player/PlayerPageHeader';
import { playerBtnOutlineSm, playerBtnPrimary } from '../../components/player/playerClassNames';
import ProductImage from '../../components/ProductImage';
import { formatProductPrice } from '../../utils/productCurrency';
import { playerShopSubtitle, sportFilterBadge } from '../../utils/sportDisplay';
import { api, getErrorMessage } from '../../services/api';

const SHIPPING_FIELDS = [
  { key: 'fullName', label: 'Full name', required: true },
  { key: 'line1', label: 'Address', required: true },
  { key: 'city', label: 'City', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'postalCode', label: 'Postal code', required: false },
];

/** Browse, filter, cart, cash-on-delivery checkout */
export default function PlayerShop() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [sport, setSport] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [ship, setShip] = useState({
    fullName: '',
    line1: '',
    city: '',
    phone: '',
    postalCode: '',
  });
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);

  const params = useMemo(() => {
    const p = {};
    if (sport) p.sport = sport;
    if (q.trim()) p.q = q.trim();
    if (category.trim()) p.category = category.trim();
    return p;
  }, [sport, q, category]);

  const load = () => {
    api
      .get('/players/products', { params })
      .then((r) => setProducts(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  };

  useEffect(() => {
    load();
  }, [sport, q, category]);

  useEffect(() => {
    api
      .get('/players/me/profile')
      .then((r) => {
        const sp = r.data?.data?.sportPreference;
        if (sp) setSport(sp);
      })
      .catch(() => {});
  }, []);

  const cartItems = () =>
    Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const product = products.find((p) => p._id === productId);
        return { productId, quantity, product };
      });
  }, [cart, products]);

  const cartTotal = useMemo(() => {
    return cartLines.reduce((sum, { quantity, product }) => {
      const unit = product?.effectivePrice ?? product?.price ?? 0;
      return sum + unit * quantity;
    }, 0);
  }, [cartLines]);

  const placeCodOrder = async () => {
    const items = cartItems();
    if (!items.length) return;
    setErr('');
    setOk('');
    setPlacing(true);
    try {
      await api.post('/players/orders', {
        items,
        paymentMethod: 'cod',
        shippingAddress: ship,
        customerNote: note || undefined,
      });
      setCart({});
      setShowCheckout(false);
      setOk('Order placed! Pay cash when your order is delivered.');
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setPlacing(false);
    }
  };

  const add = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));

  return (
    <div>
      <PlayerPageHeader title="Equipment" subtitle={playerShopSubtitle(sport)} />
      {sportFilterBadge(sport) ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-player-green">
          {sportFilterBadge(sport)}
        </p>
      ) : null}
      {err ? <p className="mb-4 text-sm text-red-400">{err}</p> : null}
      {ok ? <p className="mb-4 text-sm text-player-green">{ok}</p> : null}

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          placeholder="Search name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <select
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          value={sport}
          onChange={(e) => setSport(e.target.value)}
        >
          <option value="">All sports</option>
          <option value="cricket">Cricket</option>
          <option value="badminton">Badminton</option>
          <option value="general">General</option>
        </select>
      </div>

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
                {p.onSale ? (
                  <>
                    <span className="text-player-green">{formatProductPrice(p.effectivePrice ?? p.price)}</span>
                    <span className="ml-2 text-sm line-through text-slate-500">{formatProductPrice(p.price)}</span>
                    <span className="ml-2 rounded bg-amber-500/20 px-1 text-[10px] uppercase text-amber-200">Sale</span>
                  </>
                ) : (
                  <>{formatProductPrice(p.effectivePrice ?? p.price)}</>
                )}{' '}
                · Stock {p.stock}
              </p>
              <button type="button" onClick={() => add(p._id)} className={`${playerBtnOutlineSm} mt-4 w-full`}>
                Add to cart ({cart[p._id] || 0})
              </button>
            </div>
          </PlayerCard>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={() => setShowCheckout((s) => !s)} className={playerBtnPrimary}>
          {showCheckout ? 'Hide checkout' : 'Checkout'}
        </button>
      </div>

      {showCheckout ? (
        <div className="mt-6 max-w-lg space-y-3 rounded-xl border border-white/10 bg-black/25 p-4 text-sm">
          {cartLines.length ? (
            <div className="space-y-2 border-b border-white/10 pb-4">
              <p className="font-headline text-xs uppercase text-slate-400">Your cart</p>
              <ul className="space-y-2">
                {cartLines.map(({ productId, quantity, product }) => (
                  <li key={productId} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ProductImage
                        product={product}
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        placeholderClassName="h-12 w-12 shrink-0 rounded-lg"
                      />
                      <span className="min-w-0 flex-1 text-white">
                        {product?.name || 'Product'} × {quantity}
                      </span>
                    </div>
                    <span className="shrink-0 font-orbitron text-xs text-player-green">
                      {formatProductPrice((product?.effectivePrice ?? product?.price ?? 0) * quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="pt-2 text-right font-orbitron text-base font-bold text-white">
                Total: {formatProductPrice(cartTotal)}
              </p>
            </div>
          ) : (
            <p className="text-slate-400">Your cart is empty.</p>
          )}

          <p className="font-headline text-xs uppercase text-slate-400">Delivery address</p>
          {SHIPPING_FIELDS.map(({ key, label, required }) => (
            <div key={key}>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">
                {label}
                {required ? ' *' : ''}
              </label>
              <input
                className="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 text-white"
                placeholder={label}
                value={ship[key]}
                onChange={(e) => setShip((s) => ({ ...s, [key]: e.target.value }))}
                required={required}
              />
            </div>
          ))}
          <textarea
            className="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 text-white"
            placeholder="Order note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="space-y-3 border-t border-white/10 pt-4">
            <p className="text-xs text-slate-400">
              Pay with <span className="font-semibold text-white">cash on delivery (COD)</span>. The store will
              deliver to your address — hand over {formatProductPrice(cartTotal)} when you receive the order.
            </p>
            <button
              type="button"
              disabled={placing || !cartItems().length}
              onClick={placeCodOrder}
              className={playerBtnPrimary}
            >
              {placing ? 'Placing order…' : 'Place order (Cash on Delivery)'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

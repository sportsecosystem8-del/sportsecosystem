import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import ProductImage from '../../components/ProductImage';
import { formatProductPrice } from '../../utils/productCurrency';

const inputClass =
  'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#cc97ff]/50 focus:outline-none focus:ring-1 focus:ring-[#cc97ff]/40';

const formSectionClass = 'space-y-4 rounded-2xl border border-white/10 bg-[#11192c] p-6';
const formSectionTitlePurple =
  'font-rajdhani text-sm font-bold uppercase tracking-[0.14em] text-[#cc97ff]';
const formSectionTitleGreen =
  'font-rajdhani text-sm font-bold uppercase tracking-[0.14em] text-[#9bffce]';

const FREE_TRIAL_LISTINGS = 10;

export default function BusinessProducts() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [gateLoading, setGateLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [listingSlotsRemaining, setListingSlotsRemaining] = useState(0);
  const [freeTrialListingsGranted, setFreeTrialListingsGranted] = useState(FREE_TRIAL_LISTINGS);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('10');
  const [stock, setStock] = useState('5');
  const [sportType, setSportType] = useState('general');
  const [category, setCategory] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [saleStart, setSaleStart] = useState('');
  const [saleEnd, setSaleEnd] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [imageFile, setImageFile] = useState(null);
  const isVerified = verificationStatus === 'verified';
  const hasListingSlots = Number(listingSlotsRemaining || 0) > 0;
  const onFreeTrial = isVerified && !hasActiveSubscription;
  const canAddProducts = isVerified && hasListingSlots;
  const needsVerification = !isVerified;
  const needsSubscription = isVerified && !hasListingSlots;

  const loadMine = () => api.get('/business/products').then((r) => setItems(r.data.data || []));
  const loadGate = async () => {
    const [meRes, profileRes] = await Promise.all([
      api.get('/auth/me'),
      api.get('/business/me/profile'),
    ]);
    setVerificationStatus(meRes.data?.data?.verificationStatus || '');
    const profile = profileRes.data?.data || {};
    setListingSlotsRemaining(profile.listingSlotsRemaining || 0);
    setFreeTrialListingsGranted(profile.freeTrialListingsGranted ?? FREE_TRIAL_LISTINGS);
    setHasActiveSubscription(!!(profile.subscriptionPackage && profile.subscriptionRenewsAt));
  };

  useEffect(() => {
    Promise.all([loadMine(), loadGate()])
      .catch((e) => setErr(getErrorMessage(e)))
      .finally(() => setGateLoading(false));
  }, []);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('');
    setPrice('10');
    setStock('5');
    setSportType('general');
    setSalePrice('');
    setDiscountPercent('');
    setSaleStart('');
    setSaleEnd('');
    setLowStockThreshold('5');
    setImageFile(null);
  };

  const create = async (e) => {
    e.preventDefault();
    if (needsVerification) {
      setErr('Your business must be approved by admin before you can add products.');
      return;
    }
    if (needsSubscription) {
      setErr(
        onFreeTrial || !hasActiveSubscription
          ? 'Your free trial listings are used up. Purchase Basic, Pro, or Premium to list more products.'
          : 'Purchase or renew a subscription to get listing slots before adding products.'
      );
      return;
    }
    if (!imageFile) {
      setErr('Product image is required.');
      return;
    }
    try {
      setErr('');
      const uploadFd = new FormData();
      uploadFd.append('file', imageFile);
      const { data: uploadRes } = await api.post('/uploads/image', uploadFd);
      const imagePath = uploadRes.data?.path;
      if (!imagePath) {
        setErr('Image upload failed. Please try again.');
        return;
      }
      const body = {
        name,
        price: Number(price),
        stock: Number(stock),
        sportType,
        description: description.trim() || undefined,
        category: category || undefined,
        lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 5,
        images: [imagePath],
      };
      if (salePrice) body.salePrice = Number(salePrice);
      if (discountPercent) body.discountPercent = Number(discountPercent);
      if (saleStart) body.saleStart = new Date(saleStart).toISOString();
      if (saleEnd) body.saleEnd = new Date(saleEnd).toISOString();
      await api.post('/business/products', body);
      resetForm();
      await Promise.all([loadMine(), loadGate()]);
    } catch (er) {
      alert(getErrorMessage(er));
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete product?')) return;
    try {
      await api.delete(`/business/products/${id}`);
      await Promise.all([loadMine(), loadGate()]);
    } catch (er) {
      alert(getErrorMessage(er));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-rajdhani text-5xl font-bold uppercase tracking-tight text-white">My Products</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your storefront catalog, pricing, and stock.</p>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      {gateLoading ? (
        <p className="text-sm text-slate-400">Checking verification status...</p>
      ) : needsVerification ? (
        <div className="max-w-2xl rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-200">Verification required before adding products.</p>
          <p className="mt-2 text-amber-100/90">
            Wait for admin approval before listing products. You can optionally upload verification documents for security review.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-amber-100/80">
            <li>Verification status: {verificationStatus || 'pending'}</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/business/documents"
              className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/20"
            >
              Documents (optional)
            </Link>
          </div>
        </div>
      ) : needsSubscription ? (
        <div className="max-w-2xl rounded-xl border border-[#cc97ff]/30 bg-[#cc97ff]/10 p-4 text-sm">
          <p className="font-semibold text-[#e8d4ff]">
            {onFreeTrial || !hasActiveSubscription ? 'Free trial listings used up' : 'Subscription required to list products'}
          </p>
          <p className="mt-2 text-[#e8d4ff]/90">
            {onFreeTrial || !hasActiveSubscription
              ? `You have used all ${freeTrialListingsGranted} free listings. Choose Basic, Pro, or Premium to continue.`
              : 'Purchase or renew a subscription package to get listing slots, then you can add products.'}
          </p>
          <ul className="mt-3 space-y-1 text-xs text-[#e8d4ff]/80">
            <li>Listing slots remaining: {listingSlotsRemaining}</li>
          </ul>
          <div className="mt-4">
            <Link
              to="/business/subscription"
              className="rounded-lg bg-gradient-to-r from-[#cc97ff] to-[#9c48ea] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#360061]"
            >
              Manage subscription
            </Link>
          </div>
        </div>
      ) : null}

      {canAddProducts ? (
        <form onSubmit={create} className="max-w-3xl space-y-6">
          <div className="rounded-2xl border border-white/10 bg-[#11192c] p-6 shadow-lg shadow-black/20">
            <h2 className="font-rajdhani text-lg font-bold uppercase tracking-wide text-white">Add new product</h2>
            <p className="mt-1 text-sm text-slate-400">
              {onFreeTrial ? (
                <>
                  Free trial listings left:{' '}
                  <span className="font-orbitron text-[#9bffce]">
                    {listingSlotsRemaining} / {freeTrialListingsGranted}
                  </span>
                </>
              ) : (
                <>
                  Listing slots remaining:{' '}
                  <span className="font-orbitron text-[#cc97ff]">{listingSlotsRemaining}</span>
                </>
              )}
            </p>
          </div>

          <section className={formSectionClass}>
            <h3 className={formSectionTitlePurple}>1 · Product details</h3>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Product name *
              </label>
              <input
                className={inputClass}
                placeholder="e.g. Professional cricket bat"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Description
              </label>
              <textarea
                className={`${inputClass} min-h-[88px] resize-y`}
                placeholder="Material, size, brand, or what makes this item suitable for players…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Category
                </label>
                <input
                  className={inputClass}
                  placeholder="e.g. Bats, Shoes, Nets"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Sport *
                </label>
                <select className={inputClass} value={sportType} onChange={(e) => setSportType(e.target.value)}>
                  <option value="general">General equipment</option>
                  <option value="cricket">Cricket</option>
                  <option value="badminton">Badminton</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Product photo *
              </label>
              <input
                type="file"
                accept="image/*"
                required
                className="w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#cc97ff]/20 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[#cc97ff]"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              {imageFile ? (
                <p className="mt-2 text-xs text-[#cc97ff]">Selected: {imageFile.name}</p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">JPG or PNG — shown on your storefront.</p>
              )}
            </div>
          </section>

          <section className={formSectionClass}>
            <h3 className={formSectionTitlePurple}>2 · Pricing</h3>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Regular price (PKR) *
              </label>
              <input
                className={`${inputClass} max-w-xs`}
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="rounded-xl border border-dashed border-white/15 bg-black/25 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Promotional sale (optional)</p>
              <p className="mt-1 text-xs text-slate-500">Leave blank if this product is not on sale.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Sale price (PKR)</label>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="999"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Discount %</label>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max="100"
                    placeholder="15"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Sale starts</label>
                  <input
                    className={inputClass}
                    type="date"
                    value={saleStart}
                    onChange={(e) => setSaleStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-slate-500">Sale ends</label>
                  <input
                    className={inputClass}
                    type="date"
                    value={saleEnd}
                    onChange={(e) => setSaleEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className={formSectionClass}>
            <h3 className={formSectionTitleGreen}>3 · Inventory</h3>
            <p className="text-xs text-slate-500">How many units you have in stock and when to alert you.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Quantity in stock *
                </label>
                <input
                  className={`${inputClass} focus:border-[#9bffce]/40 focus:ring-[#9bffce]/30`}
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Low-stock alert at
                </label>
                <input
                  className={`${inputClass} focus:border-[#9bffce]/40 focus:ring-[#9bffce]/30`}
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                />
                <p className="mt-1.5 text-[10px] text-slate-500">Notify you when stock falls to this number or below.</p>
              </div>
            </div>
          </section>

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-[#cc97ff] to-[#9c48ea] px-6 py-3 font-rajdhani text-sm font-bold uppercase tracking-[0.12em] text-[#360061] transition hover:brightness-110 sm:w-auto"
          >
            Publish product
          </button>
        </form>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-rajdhani text-xl font-bold uppercase tracking-wide text-white">Your catalog</h2>
        {!items.length ? (
          <p className="text-sm text-slate-500">No products listed yet.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((p) => (
              <li key={p._id} className="overflow-hidden rounded-xl border border-white/10 bg-[#11192c] text-sm">
                <ProductImage product={p} className="h-40 w-full object-cover" placeholderClassName="h-40 w-full" />
                <div className="p-4">
                  <p className="font-rajdhani text-2xl font-bold text-white">{p.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">
                    {p.sportType}
                    {p.category ? ` · ${p.category}` : ''}
                  </p>
                  {p.description ? (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-400">{p.description}</p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-2 border-t border-white/10 pt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">Price</p>
                      <span className="font-orbitron text-lg text-[#9bffce]">{formatProductPrice(p.price)}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">In stock</p>
                      <span className="font-orbitron text-sm text-white">{p.stock}</span>
                      <p className="mt-0.5 text-[10px] text-slate-500">Alert at ≤{p.lowStockThreshold ?? 5}</p>
                    </div>
                  </div>
                  <label className="mt-4 block text-[10px] uppercase tracking-wider text-slate-500">
                    {p.images?.length ? 'Add another photo' : 'Add photo'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 w-full text-xs text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-[#cc97ff]"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      const fd = new FormData();
                      fd.append('image', file);
                      try {
                        await api.post(`/business/products/${p._id}/images`, fd);
                        loadMine();
                      } catch (er) {
                        alert(getErrorMessage(er));
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="mt-4 w-full rounded-lg bg-[#a70138]/20 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#ff6e84] hover:bg-[#a70138]/30"
                    onClick={() => remove(p._id)}
                  >
                    Delete product
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

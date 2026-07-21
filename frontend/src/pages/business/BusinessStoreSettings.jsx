import { useEffect, useState } from 'react';
import DeleteAccountSection from '../../components/shared/DeleteAccountSection';
import { publicAssetUrl } from '../../utils/assetUrl';
import { api, getErrorMessage } from '../../services/api';

export default function BusinessStoreSettings() {
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [shippingPolicyText, setShippingPolicyText] = useState('');
  const [returnPolicyText, setReturnPolicyText] = useState('');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');
  const [storeBannerUrl, setStoreBannerUrl] = useState('');
  const [shopImageUrls, setShopImageUrls] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingShop, setUploadingShop] = useState(false);

  const load = () =>
    api
      .get('/business/me/profile')
      .then((r) => {
        const p = r.data?.data;
        setStoreName(p?.storeName || p?.businessName || '');
        setStoreDescription(p?.storeDescription || '');
        setShippingPolicyText(p?.shippingPolicyText || '');
        setReturnPolicyText(p?.returnPolicyText || '');
        setStoreLogoUrl(p?.storeLogoUrl || '');
        setStoreBannerUrl(p?.storeBannerUrl || '');
        setShopImageUrls(Array.isArray(p?.shopImageUrls) ? p.shopImageUrls : []);
      })
      .catch((e) => setErr(getErrorMessage(e)));

  useEffect(() => {
    load();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await api.put('/business/store', {
        storeName: storeName.trim(),
        storeDescription: storeDescription.trim(),
        shippingPolicyText: shippingPolicyText.trim(),
        returnPolicyText: returnPolicyText.trim(),
      });
      setMsg('Store settings saved. Players will see your store name on products.');
      load();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const uploadBrand = async (e, endpoint, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    setErr('');
    try {
      const { data } = await api.post(endpoint, fd);
      const url = data.data?.[field];
      if (field === 'storeLogoUrl') setStoreLogoUrl(url || '');
      if (field === 'storeBannerUrl') setStoreBannerUrl(url || '');
      setMsg('Image uploaded.');
    } catch (er) {
      setErr(getErrorMessage(er));
    }
    e.target.value = '';
  };

  const removeBrand = async (endpoint, field) => {
    if (!window.confirm('Remove this image?')) return;
    setErr('');
    try {
      await api.delete(endpoint);
      if (field === 'storeLogoUrl') setStoreLogoUrl('');
      if (field === 'storeBannerUrl') setStoreBannerUrl('');
      setMsg('Image removed.');
    } catch (er) {
      setErr(getErrorMessage(er));
    }
  };

  const uploadShopPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (shopImageUrls.length >= 12) {
      setErr('Maximum 12 shop photos allowed.');
      return;
    }
    const fd = new FormData();
    fd.append('image', file);
    setUploadingShop(true);
    setErr('');
    try {
      const { data } = await api.post('/business/store/shop-photos', fd);
      setShopImageUrls(Array.isArray(data.data?.shopImageUrls) ? data.data.shopImageUrls : []);
      setMsg('Shop photo uploaded.');
    } catch (er) {
      setErr(getErrorMessage(er));
    } finally {
      setUploadingShop(false);
    }
  };

  const removeShopPhoto = async (url) => {
    if (!window.confirm('Remove this shop photo?')) return;
    setErr('');
    try {
      const { data } = await api.delete('/business/store/shop-photos', { data: { url } });
      setShopImageUrls(Array.isArray(data.data?.shopImageUrls) ? data.data.shopImageUrls : []);
      setMsg('Shop photo removed.');
    } catch (er) {
      setErr(getErrorMessage(er));
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-bold uppercase tracking-wide text-[#cc97ff]">Store setup</h1>
        <p className="mt-2 text-sm text-slate-400">
          Configure your storefront branding before listing products. Players see your store name when browsing equipment.
        </p>
      </div>
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-300">{msg}</p> : null}

      <form onSubmit={save} className="space-y-4 rounded-xl border border-white/10 bg-[#11192c]/90 p-6">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Store name</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Store description</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            rows={3}
            value={storeDescription}
            onChange={(e) => setStoreDescription(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Logo</label>
            {storeLogoUrl ? (
              <div className="relative mt-2 inline-block">
                <img src={publicAssetUrl(storeLogoUrl)} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => removeBrand('/business/store/logo', 'storeLogoUrl')}
                  className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white"
                  aria-label="Remove logo"
                >
                  ×
                </button>
              </div>
            ) : null}
            <input type="file" accept="image/*" className="mt-2 text-xs text-slate-400" onChange={(e) => uploadBrand(e, '/business/store/logo', 'storeLogoUrl')} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Banner</label>
            {storeBannerUrl ? (
              <div className="relative mt-2">
                <img src={publicAssetUrl(storeBannerUrl)} alt="" className="h-20 w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => removeBrand('/business/store/banner', 'storeBannerUrl')}
                  className="absolute right-1 top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white"
                  aria-label="Remove banner"
                >
                  ×
                </button>
              </div>
            ) : null}
            <input type="file" accept="image/*" className="mt-2 text-xs text-slate-400" onChange={(e) => uploadBrand(e, '/business/store/banner', 'storeBannerUrl')} />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Shop photos ({shopImageUrls.length}/12)
          </label>
          <p className="mt-1 text-[11px] text-slate-500">Gallery of your store — shown to players and admins.</p>
          {shopImageUrls.length ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {shopImageUrls.map((url) => (
                <div key={url} className="relative overflow-hidden rounded-lg border border-white/10">
                  <img src={publicAssetUrl(url)} alt="" className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeShopPhoto(url)}
                    className="absolute right-1 top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white"
                    aria-label="Remove shop photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <input
            type="file"
            accept="image/*"
            className="mt-2 text-xs text-slate-400"
            disabled={uploadingShop || shopImageUrls.length >= 12}
            onChange={uploadShopPhoto}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Shipping policy</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            rows={2}
            value={shippingPolicyText}
            onChange={(e) => setShippingPolicyText(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Return policy</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            rows={2}
            value={returnPolicyText}
            onChange={(e) => setReturnPolicyText(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#cc97ff] px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-[#360061] disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save store'}
        </button>
      </form>

      <DeleteAccountSection className="mt-10" />
    </div>
  );
}

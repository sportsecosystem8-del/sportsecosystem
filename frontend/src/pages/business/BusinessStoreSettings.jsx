import { useEffect, useState } from 'react';
import { publicAssetUrl } from '../../utils/assetUrl';
import { api, getErrorMessage } from '../../services/api';

export default function BusinessStoreSettings() {
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [shippingPolicyText, setShippingPolicyText] = useState('');
  const [returnPolicyText, setReturnPolicyText] = useState('');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');
  const [storeBannerUrl, setStoreBannerUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

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
              <img src={publicAssetUrl(storeLogoUrl)} alt="" className="mt-2 h-16 w-16 rounded-lg object-cover" />
            ) : null}
            <input type="file" accept="image/*" className="mt-2 text-xs text-slate-400" onChange={(e) => uploadBrand(e, '/business/store/logo', 'storeLogoUrl')} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Banner</label>
            {storeBannerUrl ? (
              <img src={publicAssetUrl(storeBannerUrl)} alt="" className="mt-2 h-20 w-full rounded-lg object-cover" />
            ) : null}
            <input type="file" accept="image/*" className="mt-2 text-xs text-slate-400" onChange={(e) => uploadBrand(e, '/business/store/banner', 'storeBannerUrl')} />
          </div>
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
    </div>
  );
}

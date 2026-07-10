import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { publicAssetUrl } from '../../utils/assetUrl';

const MIN_IMAGES = 3;

export default function BusinessGrounds() {
  const [list, setList] = useState([]);
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [sportType, setSportType] = useState('badminton');
  const [city, setCity] = useState('');
  const [location, setLocation] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('22:00');
  const [lengthFeet] = useState('60');
  const [areaSqFt] = useState('2000');
  const [imagePaths, setImagePaths] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('');

  const isVerified = verificationStatus === 'verified';

  const load = () => {
    api
      .get('/business/grounds')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  };

  useEffect(() => {
    load();
    Promise.all([
      api.get('/business/me/profile'),
      api.get('/auth/me').catch(() => ({ data: { data: null } })),
    ])
      .then(([profRes, meRes]) => {
        const p = profRes.data?.data;
        setProfile(p);
        setLocation(p?.address || '');
        setCity('');
        setVerificationStatus(meRes.data?.data?.verificationStatus || '');
      })
      .catch(() => {});
  }, []);

  const uploadFiles = async (files) => {
    const uploaded = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads/image', fd);
      if (data.data?.path) uploaded.push(data.data.path);
    }
    if (uploaded.length) setImagePaths((prev) => [...prev, ...uploaded]);
  };

  const removeImage = (index) => {
    setImagePaths((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!isVerified) {
      setErr('Admin must verify your business before you can list grounds.');
      return;
    }
    if (imagePaths.length < MIN_IMAGES) {
      setErr(`Upload at least ${MIN_IMAGES} ground photos.`);
      return;
    }
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await api.post('/business/grounds', {
        name,
        sportType,
        city,
        location: location || profile?.address,
        pricePerHour: Number(pricePerHour) || 0,
        openTime,
        closeTime,
        slotDurationMinutes: 60,
        lengthFeet: Number(lengthFeet),
        areaSqFt: Number(areaSqFt),
        imagePaths,
        description: `${name} — listed by ${profile?.businessName || 'business owner'}`,
      });
      setMsg('Ground listed — players can book slots online. No product subscription required.');
      setName('');
      setImagePaths([]);
      load();
    } catch (er) {
      setErr(getErrorMessage(er));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this ground listing?')) return;
    try {
      await api.delete(`/business/grounds/${id}`);
      load();
    } catch (er) {
      setErr(getErrorMessage(er));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-[0.08em] text-white sm:text-4xl">MY GROUNDS</h1>
        <p className="mt-2 text-sm text-slate-400">
          List your venue for online slot booking — requires admin verification and a linked{' '}
          <a href="/business/payment" className="text-[#cc97ff] underline">
            Easypaisa payment account
          </a>
          .
        </p>
      </div>
      {!isVerified ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Your business is not verified yet. Complete documents and wait for admin approval before listing grounds.
          Status: <span className="font-semibold capitalize">{verificationStatus || 'pending'}</span>
        </p>
      ) : null}
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-300">{msg}</p> : null}

      <form onSubmit={submit} className="rounded-xl border border-white/10 bg-[#11192c]/90 p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase text-slate-500">Ground name</label>
            <input className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Sport</label>
            <select className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white" value={sportType} onChange={(e) => setSportType(e.target.value)}>
              <option value="cricket">Cricket</option>
              <option value="badminton">Badminton</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">City</label>
            <input className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Price per hour (PKR)</label>
            <input type="number" min="0" className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white" value={pricePerHour} onChange={(e) => setPricePerHour(e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs uppercase text-slate-500">Location / address</label>
            <input className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white" value={location} onChange={(e) => setLocation(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Opens</label>
            <input type="time" className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase text-slate-500">Closes</label>
            <input type="time" className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase text-slate-500">Photos ({MIN_IMAGES}+ required)</label>
          <input type="file" accept="image/*" multiple className="mt-1 text-sm text-slate-400" onChange={(e) => uploadFiles(Array.from(e.target.files || []))} />
          <div className="mt-2 flex flex-wrap gap-2">
            {imagePaths.map((p, i) => (
              <div key={`${p}-${i}`} className="relative">
                <img src={publicAssetUrl(p)} alt="" className="h-16 w-16 rounded object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        <button type="submit" disabled={busy || !isVerified} className="rounded-lg bg-[#cc97ff] px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-[#360061] disabled:opacity-50">
          {busy ? 'Saving…' : 'List ground'}
        </button>
      </form>

      <ul className="space-y-4">
        {list.map((g) => (
          <li key={g._id} className="rounded-xl border border-white/10 bg-[#0b1324]/80 p-4 flex justify-between gap-4">
            <div>
              <p className="font-bold text-white">{g.name}</p>
              <p className="text-sm text-slate-400 capitalize">{g.sportType} · PKR {g.pricePerHour}/hr · {g.city || g.location}</p>
              <p className="text-xs text-slate-500">{g.openTime} – {g.closeTime}</p>
            </div>
            <button type="button" onClick={() => remove(g._id)} className="text-sm text-red-400 hover:underline">
              Remove
            </button>
          </li>
        ))}
        {!list.length ? <p className="text-sm text-slate-500">No grounds listed yet.</p> : null}
      </ul>
    </div>
  );
}

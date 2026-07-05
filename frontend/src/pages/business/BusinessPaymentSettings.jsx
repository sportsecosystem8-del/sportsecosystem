import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';

/** Business owner Easypaisa account for receiving ground & product payments */
export default function BusinessPaymentSettings() {
  const [mobile, setMobile] = useState('');
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get('/business/me/profile')
      .then((r) => {
        const p = r.data?.data;
        setMobile(p?.easypaisaMobile || '');
        setTitle(p?.easypaisaAccountTitle || p?.businessName || '');
      })
      .catch((e) => setErr(getErrorMessage(e)));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await api.put('/business/me/profile', {
        easypaisaMobile: mobile.trim(),
        easypaisaAccountTitle: title.trim(),
      });
      setMsg('Payment account saved. Customers will pay this Easypaisa number at checkout.');
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-headline text-2xl font-bold uppercase tracking-wide text-[#cc97ff]">Payment account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Link your Easypaisa mobile account. Ground bookings and shop orders are paid directly to you — the platform
          records the transaction and shares customer details with you.
        </p>
      </div>
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-300">{msg}</p> : null}
      <form onSubmit={save} className="space-y-4 rounded-xl border border-white/10 bg-[#11192c]/90 p-6">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Easypaisa mobile</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            placeholder="03XXXXXXXXX"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Account name (shown to customers)</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            placeholder="Your business or store name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#cc97ff] px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-[#360061] disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save payment account'}
        </button>
      </form>
    </div>
  );
}

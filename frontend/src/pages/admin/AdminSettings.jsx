import { useEffect, useState } from 'react';
import AdminCard from '../../components/admin/AdminCard';
import AdminIcon from '../../components/admin/AdminIcon';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { adminBtnPrimary, adminField } from '../../components/admin/adminClassNames';
import { api, getErrorMessage } from '../../services/api';

export default function AdminSettings() {
  const [list, setList] = useState([]);
  const [key, setKey] = useState('platformName');
  const [value, setValue] = useState('Sports Ecosystem Platform');
  const [err, setErr] = useState('');
  useEffect(() => {
    api
      .get('/admin/settings')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.put('/admin/settings', { settings: [{ key, value }] });
      const { data } = await api.get('/admin/settings');
      setList(data.data || []);
    } catch (er) {
      alert(getErrorMessage(er));
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Platform settings"
        subtitle="Keys include coach monthly fee: coach_platform_subscription_pkr (number, PKR; use 0 for free access). Legacy coach_platform_subscription_usd is converted automatically."
        actions={
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-admin-surface-high/60 px-4 py-2 font-label text-xs text-slate-400">
            <AdminIcon name="tune" className="text-[18px] text-admin-cyan" />
            Admin only
          </div>
        }
      />
      {err ? (
        <AdminCard accent="orange" className="mb-6 p-4">
          <p className="text-sm text-admin-orange">{err}</p>
        </AdminCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard accent="cyan" className="p-6">
          <h2 className="mb-4 font-headline text-xs font-bold uppercase tracking-widest text-slate-400">
            Update setting
          </h2>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="mb-1 block font-label text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Key
              </label>
              <input className={adminField} value={key} onChange={(e) => setKey(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block font-label text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Value
              </label>
              <input className={adminField} value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <button type="submit" className={`${adminBtnPrimary} w-full sm:w-auto`}>
              Save
            </button>
          </form>
        </AdminCard>

        <AdminCard accent="none" className="border border-white/[0.06] p-6">
          <h2 className="mb-4 font-headline text-xs font-bold uppercase tracking-widest text-slate-400">
            Current keys
          </h2>
          <ul className="max-h-80 space-y-2 overflow-y-auto admin-scrollbar">
            {list.map((s) => (
              <li
                key={s._id}
                className="rounded-lg border border-white/5 bg-admin-well px-3 py-2 font-mono text-xs text-slate-300"
              >
                <span className="text-admin-cyan">{s.key}</span>
                <span className="mx-2 text-slate-600">→</span>
                {JSON.stringify(s.value)}
              </li>
            ))}
            {!list.length && !err ? (
              <li className="py-8 text-center font-label text-sm text-slate-500">No settings returned.</li>
            ) : null}
          </ul>
        </AdminCard>
      </div>
    </div>
  );
}

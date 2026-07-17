import { useEffect, useState } from 'react';
import AdminCard from '../../components/admin/AdminCard';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { adminTableHead } from '../../components/admin/adminClassNames';
import { api, getErrorMessage } from '../../services/api';

export default function AdminSubscriptions() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    api
      .get('/admin/subscriptions')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Subscriptions & payments"
        subtitle="Business subscription charges and status."
      />
      {err ? (
        <AdminCard accent="orange" className="mb-6 p-4">
          <p className="text-sm text-admin-orange">{err}</p>
        </AdminCard>
      ) : null}
      <AdminCard accent="cyan" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead className={adminTableHead}>
              <tr>
                <th className="px-6 py-3.5">When</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p._id} className="border-b border-transparent transition-colors hover:bg-white/[0.04]">
                  <td className="px-6 py-3.5 font-label text-xs text-slate-400 sm:text-sm">
                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-6 py-3.5 font-orbitron font-bold tabular-nums text-white">
                    PKR {Number(p.amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="rounded-full bg-admin-cyan/10 px-2.5 py-0.5 font-label text-xs font-bold text-admin-cyan">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && !err ? (
            <p className="px-6 py-12 text-center font-label text-sm text-slate-500">No subscription payments.</p>
          ) : null}
        </div>
      </AdminCard>
    </div>
  );
}

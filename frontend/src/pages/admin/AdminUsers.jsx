import { useEffect, useState } from 'react';
import AdminCard from '../../components/admin/AdminCard';
import AdminIcon from '../../components/admin/AdminIcon';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { adminBtnSecondary, adminTableHead, adminTableRow } from '../../components/admin/adminClassNames';
import { api, getErrorMessage } from '../../services/api';

const strongPasswordPattern = '(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}';

export default function AdminUsers() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState('player');
  const [fullName, setFullName] = useState('Test Player');
  const load = () =>
    api
      .get('/admin/users')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  useEffect(() => {
    load();
  }, []);

  const createUser = async (e) => {
    e.preventDefault();
    try {
      const profile =
        newRole === 'player'
          ? { fullName, sportPreference: 'cricket', skillLevel: 'beginner', city: 'Lahore' }
          : newRole === 'coach'
            ? { fullName, specialties: ['cricket'], city: 'Lahore' }
            : { businessName: fullName || 'New Shop', storeName: fullName || 'New Shop' };
      await api.post('/admin/users', { email: newEmail, password: newPass, role: newRole, profile });
      setNewEmail('');
      setNewPass('');
      load();
    } catch (err2) {
      alert(getErrorMessage(err2));
    }
  };

  const suspend = async (id, flag) => {
    try {
      await api.patch(`/admin/users/${id}`, { isSuspended: flag });
      load();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  const removeUser = async (id, email) => {
    if (!confirm(`Delete user ${email}? This removes their account and profile permanently.`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      load();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="User management"
        subtitle="Monitor accounts, roles, verification status, and suspend access when needed."
        actions={
          <button type="button" onClick={() => load()} className={adminBtnSecondary}>
            <AdminIcon name="refresh" className="text-lg" />
            Refresh
          </button>
        }
      />

      {err ? (
        <AdminCard accent="orange" className="mb-6 p-4">
          <p className="text-sm text-admin-orange">{err}</p>
        </AdminCard>
      ) : null}

      <AdminCard accent="gold" className="mb-6 p-6">
        <p className="font-headline text-xs font-bold uppercase tracking-widest text-slate-400">Create user</p>
        <form onSubmit={createUser} className="mt-4 flex flex-wrap items-end gap-3">
          <input
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder="email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <input
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder="Strong password"
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            minLength={8}
            pattern={strongPasswordPattern}
            title="Use at least 8 characters including uppercase, lowercase, number, and special character."
            required
          />
          <select
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          >
            <option value="player">player</option>
            <option value="coach">coach</option>
            <option value="business_owner">business_owner</option>
          </select>
          <input
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder="Display / business name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <button type="submit" className={adminBtnSecondary}>
            Create
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          Password must include 8+ chars, uppercase, lowercase, number, and special character.
        </p>
      </AdminCard>

      <AdminCard accent="cyan" className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-white/5 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <AdminIcon name="manage_accounts" className="text-[22px] text-admin-cyan" />
            <span className="font-headline text-xs font-bold uppercase tracking-widest">All users</span>
            <span className="font-label text-xs text-slate-500">({list.length})</span>
          </div>
        </div>
        <div className="max-h-[min(70vh,560px)] overflow-auto admin-scrollbar">
          <table className="w-full text-left text-sm">
            <thead className={adminTableHead}>
              <tr>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Verification</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u._id} className={adminTableRow}>
                  <td className="px-6 py-3.5 text-admin-on-surface">{u.email}</td>
                  <td className="px-6 py-3.5 capitalize text-slate-400">{u.role?.replace('_', ' ')}</td>
                  <td className="px-6 py-3.5">
                    <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-label text-xs text-slate-400">
                      {u.verificationStatus}
                    </span>
                    {u.isSuspended ? (
                      <span className="ml-2 rounded-full bg-admin-orange/15 px-2.5 py-0.5 font-label text-xs text-admin-orange">
                        Suspended
                      </span>
                    ) : null}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    {u.role !== 'admin' ? (
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <button
                          type="button"
                          className="font-label text-xs font-semibold text-admin-cyan hover:underline"
                          onClick={() => suspend(u._id, !u.isSuspended)}
                        >
                          {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button
                          type="button"
                          className="font-label text-xs font-semibold text-admin-orange hover:underline"
                          onClick={() => removeUser(u._id, u.email)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="font-label text-xs text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && !err ? (
            <p className="px-6 py-12 text-center font-label text-sm text-slate-500">No users loaded.</p>
          ) : null}
        </div>
      </AdminCard>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api, getErrorMessage } from '../../services/api';

/**
 * Permanent account deletion — frees the email for re-registration.
 * @param {{ className?: string, titleClass?: string, inputClass?: string, buttonClass?: string }} props
 */
export default function DeleteAccountSection({
  className = '',
  titleClass = 'font-semibold text-red-300',
  inputClass = 'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-red-400/50',
  buttonClass = 'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50',
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);

  const onDelete = async (e) => {
    e.preventDefault();
    setErr('');
    if (confirm.trim().toUpperCase() !== 'DELETE') {
      setErr('Type DELETE to confirm.');
      return;
    }
    if (!password) {
      setErr('Enter your password.');
      return;
    }
    if (
      !window.confirm(
        'This permanently deletes your account and all related data. You can register again with the same email. Continue?',
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await api.delete('/auth/me', { data: { password, confirm: 'DELETE' } });
      logout();
      navigate('/register', { replace: true });
    } catch (e2) {
      setErr(getErrorMessage(e2));
      setBusy(false);
    }
  };

  return (
    <section className={`rounded-xl border border-red-500/25 bg-red-950/20 p-5 ${className}`.trim()}>
      <h2 className={titleClass}>Delete account</h2>
      <p className="mt-2 text-sm text-slate-400">
        Permanently remove your account and profile. After deletion you can create a new account with the same email.
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 text-sm font-semibold text-red-300 underline-offset-2 hover:underline"
        >
          I want to delete my account
        </button>
      ) : (
        <form onSubmit={onDelete} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="del-password">
              Password
            </label>
            <input
              id="del-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="del-confirm">
              Type DELETE to confirm
            </label>
            <input
              id="del-confirm"
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              placeholder="DELETE"
              required
            />
          </div>
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? 'Deleting…' : 'Delete forever'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setErr('');
                setPassword('');
                setConfirm('');
              }}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

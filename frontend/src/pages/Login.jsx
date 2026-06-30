import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getErrorMessage } from '../hooks/useAuth';

const inputClass =
  'mt-1 w-full rounded-xl border border-[#414859]/40 bg-black/35 px-3 py-2.5 text-sm text-[#dfe5fb] placeholder:text-slate-600 focus:border-[#cc97ff]/50 focus:outline-none focus:ring-1 focus:ring-[#cc97ff]/40';
const labelClass = 'block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;
  const [email, setEmail] = useState(location.state?.emailPrefill || '');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [notice] = useState(location.state?.message || '');
  const [busy, setBusy] = useState(false);

  const goHome = (role) => {
    if (role === 'player') navigate(from || '/player', { replace: true });
    else if (role === 'coach') navigate(from || '/coach', { replace: true });
    else if (role === 'business_owner') navigate(from || '/business', { replace: true });
    else if (role === 'admin') navigate(from || '/admin', { replace: true });
    else navigate('/', { replace: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const u = await login(email, password);
      goHome(u.role);
    } catch (er) {
      setErr(getErrorMessage(er));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070e1d] text-[#dfe5fb]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/4 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#A855F7]/20 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-[#00FF87]/08 blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(#fff_0.5px,transparent_0.5px)] [background-size:3px_3px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <Link to="/" className="mb-8 font-headline text-2xl font-black uppercase tracking-tight text-[#A855F7]">
          Sports Ecosystem
        </Link>

        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#11192c]/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="text-center">
            <h1 className="font-headline text-3xl font-bold uppercase tracking-tight text-white">Sign in</h1>
            <p className="mt-2 font-orbitron text-[10px] uppercase tracking-[0.25em] text-slate-500">Secure access</p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {err && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</p>
            )}
            {notice && (
              <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {notice}
              </p>
            )}
            <div>
              <label className={labelClass}>Email</label>
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs font-medium text-[#cc97ff] hover:text-[#e9d5ff]">
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-[#cc97ff] to-[#9c48ea] py-3.5 font-headline text-sm font-bold uppercase tracking-[0.12em] text-[#360061] shadow-[0_0_24px_rgba(168,85,247,0.35)] transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            No account?{' '}
            <Link to="/register" className="font-semibold text-[#cc97ff] hover:text-[#e9d5ff]">
              Register
            </Link>
          </p>
          <p className="mt-4 text-center">
            <Link to="/" className="text-xs text-slate-500 hover:text-slate-300">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

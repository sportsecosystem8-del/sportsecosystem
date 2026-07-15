import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, getErrorMessage } from '../hooks/useAuth';
import { PLAYER_CATEGORIES } from '../utils/evaluationDisplay';

const inputClass =
  'mt-1 w-full rounded-xl border border-[#414859]/40 bg-black/35 px-3 py-2.5 text-sm text-[#dfe5fb] placeholder:text-slate-600 focus:border-[#cc97ff]/50 focus:outline-none focus:ring-1 focus:ring-[#cc97ff]/40';
const labelClass = 'block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500';
const selectClass =
  'mt-1 w-full rounded-xl border border-[#414859]/40 bg-black/35 px-3 py-2.5 text-sm text-[#dfe5fb] focus:border-[#cc97ff]/50 focus:outline-none focus:ring-1 focus:ring-[#cc97ff]/40';
const strongPasswordPattern = '(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('player');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [okMessage, setOkMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [sportPreference, setSportPreference] = useState('cricket');
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [playerCategory, setPlayerCategory] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [city, setCity] = useState('');
  const [specialties, setSpecialties] = useState('cricket');
  const [academyLocation, setAcademyLocation] = useState('');
  const [locationMapUrl, setLocationMapUrl] = useState('');
  const [businessLocationMapUrl, setBusinessLocationMapUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  const buildProfile = () => {
    if (role === 'player') {
      const profile = { fullName, phone, sportPreference, skillLevel, city };
      if (sportPreference === 'cricket') profile.playerCategory = playerCategory;
      return profile;
    }
    if (role === 'coach') {
      return {
        fullName,
        phone,
        specialties: [specialties],
        academyLocation,
        city,
        yearsExperience: yearsExperience !== '' ? Number.parseInt(yearsExperience, 10) : undefined,
        locationMapUrl: locationMapUrl.trim(),
      };
    }
    return {
      businessName,
      address: businessAddress.trim(),
      phone,
      storeName: businessName,
      locationMapUrl: businessLocationMapUrl.trim(),
    };
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setOkMessage('');
    if (role === 'player' && sportPreference === 'cricket' && !playerCategory) {
      setErr('Select your playing category (batsman, bowler, or all-rounder).');
      return;
    }
    setBusy(true);
    try {
      const result = await register({ email, password, role, profile: buildProfile() });
      const msg = result?.message || 'Registration successful. Please verify your email before signing in.';
      setOkMessage(msg);
      navigate('/login', { replace: true, state: { emailPrefill: email, message: msg } });
    } catch (er) {
      setErr(getErrorMessage(er));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-[#070e1d] text-[#dfe5fb]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-[#A855F7]/18 blur-[110px]" />
        <div className="absolute bottom-1/4 left-0 h-[320px] w-[320px] rounded-full bg-[#9c48ea]/15 blur-[90px]" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(#fff_0.5px,transparent_0.5px)] [background-size:3px_3px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <div className="mb-6 text-center">
          <Link to="/" className="font-headline text-2xl font-black uppercase tracking-tight text-[#A855F7]">
            Sports Ecosystem
          </Link>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#11192c]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
          <div className="text-center">
            <h1 className="font-headline text-3xl font-bold uppercase tracking-tight text-white">Create account</h1>
            <p className="mt-2 text-sm text-slate-400">Choose your role and complete your profile.</p>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {err && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</p>
            )}
            {okMessage && (
              <p className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {okMessage}
              </p>
            )}

            <div>
              <label className={labelClass}>Role</label>
              <select className={selectClass} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="player">Player</option>
                <option value="coach">Coach</option>
                <option value="business_owner">Business owner</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
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
              <div className="sm:col-span-2">
                <label className={labelClass}>Password</label>
                <input
                  className={inputClass}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  pattern={strongPasswordPattern}
                  title="Use at least 8 characters including uppercase, lowercase, number, and special character."
                  required
                  autoComplete="new-password"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Must include 8+ characters with uppercase, lowercase, number, and special character.
                </p>
              </div>
            </div>

            {role === 'player' && (
              <div className="space-y-4 rounded-xl border border-white/[0.06] bg-[#0b1324]/80 p-4">
                <p className="font-orbitron text-[10px] uppercase tracking-[0.2em] text-[#9bffce]">Player profile</p>
                <div>
                  <label className={labelClass}>Full name</label>
                  <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Sport</label>
                    <select
                      className={selectClass}
                      value={sportPreference}
                      onChange={(e) => setSportPreference(e.target.value)}
                    >
                      <option value="cricket">Cricket</option>
                      <option value="badminton">Badminton</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Skill</label>
                    <select className={selectClass} value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)}>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
                {sportPreference === 'cricket' ? (
                  <div>
                    <label className={labelClass}>
                      Playing category <span className="text-red-400">*</span>
                    </label>
                    <select
                      className={selectClass}
                      value={playerCategory}
                      onChange={(e) => setPlayerCategory(e.target.value)}
                      required
                    >
                      <option value="">Select category</option>
                      {PLAYER_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div>
                  <label className={labelClass}>City</label>
                  <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
            )}

            {role === 'coach' && (
              <div className="space-y-4 rounded-xl border border-white/[0.06] bg-[#0b1324]/80 p-4">
                <p className="font-orbitron text-[10px] uppercase tracking-[0.2em] text-[#ff7524]">Coach profile</p>
                <div>
                  <label className={labelClass}>Full name</label>
                  <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass}>Sport specialty</label>
                  <select
                    className={selectClass}
                    value={specialties}
                    onChange={(e) => setSpecialties(e.target.value)}
                    required
                  >
                    <option value="cricket">Cricket</option>
                    <option value="badminton">Badminton</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Academy location</label>
                  <input
                    className={inputClass}
                    value={academyLocation}
                    onChange={(e) => setAcademyLocation(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Google Maps link (required)</label>
                  <input
                    className={inputClass}
                    placeholder="https://maps.google.com/..."
                    value={locationMapUrl}
                    onChange={(e) => setLocationMapUrl(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Years of experience</label>
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    placeholder="e.g. 5"
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
            )}

            {role === 'business_owner' && (
              <div className="space-y-4 rounded-xl border border-white/[0.06] bg-[#0b1324]/80 p-4">
                <p className="font-orbitron text-[10px] uppercase tracking-[0.2em] text-[#cc97ff]">Business profile</p>
                <div>
                  <label className={labelClass}>Business name</label>
                  <input
                    className={inputClass}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Business address (required)</label>
                  <input
                    className={inputClass}
                    placeholder="Street, area, city"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Google Maps link (required)</label>
                  <input
                    className={inputClass}
                    placeholder="https://maps.google.com/..."
                    value={businessLocationMapUrl}
                    onChange={(e) => setBusinessLocationMapUrl(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-gradient-to-r from-[#cc97ff] to-[#9c48ea] py-3.5 font-headline text-sm font-bold uppercase tracking-[0.12em] text-[#360061] shadow-[0_0_24px_rgba(168,85,247,0.35)] transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Register'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#cc97ff] hover:text-[#e9d5ff]">
              Sign in
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

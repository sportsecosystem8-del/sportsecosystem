import { useEffect, useState } from 'react';
import PlayerAvatar from '../../components/PlayerAvatar';
import PlayerCard from '../../components/player/PlayerCard';
import PlayerIcon from '../../components/player/PlayerIcon';
import { playerProfileInput, playerProfileSaveBtn } from '../../components/player/playerClassNames';
import WeeklyDaysTimeEditor from '../../components/shared/WeeklyDaysTimeEditor';
import { PLAYER_CATEGORIES } from '../../utils/evaluationDisplay';
import { api, getErrorMessage } from '../../services/api';

function labelCls() {
  return 'mb-2 block font-headline text-xs font-bold uppercase tracking-[0.16em] text-player-on-variant';
}

export default function PlayerProfile() {
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [sportPreference, setSportPreference] = useState('cricket');
  const [skillLevel, setSkillLevel] = useState('beginner');
  const [playerCategory, setPlayerCategory] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [trainingPreferences, setTrainingPreferences] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [enrollments, setEnrollments] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setErr('');
      try {
        const [meRes, profRes, trRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/players/me/profile'),
          api.get('/players/training-requests').catch(() => ({ data: { data: [] } })),
        ]);
        if (cancelled) return;
        setMe(meRes.data.data);
        const p = profRes.data.data;
        setProfile(p);
        setEnrollments(
          (trRes.data.data || []).filter((r) => r.status === 'accepted' && r.coachRollNo),
        );
        setFullName(p.fullName || '');
        setPhone(p.phone || '');
        setSportPreference(p.sportPreference || 'cricket');
        setSkillLevel(p.skillLevel || 'beginner');
        setPlayerCategory(p.playerCategory || '');
        setCity(p.city || '');
        setAddress(p.address || '');
        setTrainingPreferences(Array.isArray(p.trainingPreferences) ? p.trainingPreferences : []);
      } catch (e) {
        if (!cancelled) setErr(getErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      const payload = {
        fullName,
        phone: phone || undefined,
        sportPreference,
        skillLevel,
        city: city || undefined,
        address: address || undefined,
        trainingPreferences,
      };
      if (sportPreference === 'cricket') {
        if (!playerCategory) {
          setErr('Select your playing category (batsman, bowler, or all-rounder).');
          setSaving(false);
          return;
        }
        payload.playerCategory = playerCategory;
      }
      await api.put('/players/me/profile', payload);
      setMsg('Profile saved.');
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const okType =
      file.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name || '');
    if (!okType) {
      setErr('Please choose an image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr('Image must be 8 MB or smaller.');
      return;
    }
    setUploading(true);
    setErr('');
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('image', file, file.name);
      const { data } = await api.post('/players/me/profile-photo', fd);
      setProfile(data.data);
      setPhotoVersion(Date.now());
      setMsg('Profile photo updated.');
    } catch (er) {
      setErr(getErrorMessage(er));
    } finally {
      setUploading(false);
    }
  };

  const email = me?.email || '—';

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0a5230] via-[#0a6b45] to-player-green p-8 midnight-asymmetric shadow-2xl md:p-10">
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/3 rounded-full bg-player-green/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-white/90">Account</p>
            <h1 className="player-display-hero mt-2 font-display text-4xl uppercase tracking-tight text-white md:text-5xl lg:text-6xl">
              My profile
            </h1>
            <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-white/85">
              Keep your details current. Coaches identify you by your assigned student ID — profile photo is optional.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:items-end">
            <PlayerAvatar profile={profile || { fullName }} size="xl" cacheBust={photoVersion || undefined} />
            <label className="cursor-pointer rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm transition hover:border-player-green/50 hover:bg-player-green/20">
              {uploading ? 'Uploading…' : 'Change photo'}
              <input
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                className="sr-only"
                onChange={onPhoto}
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      </section>

      {err ? (
        <div className="midnight-asymmetric border border-red-500/35 bg-red-950/35 px-4 py-3 text-sm text-red-300 shadow-lg">
          {err}
        </div>
      ) : null}
      {msg ? (
        <div className="midnight-asymmetric border border-player-green/35 bg-player-green/10 px-4 py-3 text-sm font-medium text-player-green shadow-lg">
          {msg}
        </div>
      ) : null}

      {enrollments.length ? (
        <PlayerCard>
          <h2 className="player-headline-section font-headline text-lg font-bold uppercase tracking-tight text-white">
            Training student IDs
          </h2>
          <p className="mt-1 text-xs text-player-on-variant">
            Your coach-assigned roll numbers — use these at the academy (not tied to profile photo).
          </p>
          <ul className="mt-4 space-y-3">
            {enrollments.map((e) => {
              const coachName = e.coach?.coachProfile?.fullName || e.coach?.email || 'Coach';
              return (
                <li
                  key={e._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-player-green/25 bg-player-green/5 px-4 py-3"
                >
                  <span className="text-sm text-slate-200">{coachName}</span>
                  <span className="font-orbitron text-lg font-bold text-player-green">#{e.coachRollNo}</span>
                </li>
              );
            })}
          </ul>
        </PlayerCard>
      ) : null}

      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-2">
        <PlayerCard>
          <h2 className="player-headline-section font-headline text-lg font-bold uppercase tracking-tight text-white">
            Personal
          </h2>
          <p className="mt-1 text-xs text-player-on-variant">Name and sport preferences.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className={labelCls()} htmlFor="pf-email">
                Email
              </label>
              <input id="pf-email" type="email" readOnly value={email} className={`${playerProfileInput} opacity-80`} />
            </div>
            <div>
              <label className={labelCls()} htmlFor="pf-name">
                Full name
              </label>
              <input
                id="pf-name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={playerProfileInput}
              />
            </div>
            <div>
              <label className={labelCls()} htmlFor="pf-sport">
                Sport
              </label>
              <select
                id="pf-sport"
                value={sportPreference}
                onChange={(e) => setSportPreference(e.target.value)}
                className={playerProfileInput}
              >
                <option value="cricket">Cricket</option>
                <option value="badminton">Badminton</option>
              </select>
            </div>
            <div>
              <label className={labelCls()} htmlFor="pf-level">
                Skill level
              </label>
              <select
                id="pf-level"
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className={playerProfileInput}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            {sportPreference === 'cricket' ? (
              <div>
                <label className={labelCls()} htmlFor="pf-category">
                  Playing category <span className="text-red-400">*</span>
                </label>
                <select
                  id="pf-category"
                  required
                  value={playerCategory}
                  onChange={(e) => setPlayerCategory(e.target.value)}
                  className={playerProfileInput}
                >
                  <option value="">Select category</option>
                  {PLAYER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-player-on-variant">
                  Drives which techniques your coach evaluates and your weekly training plan.
                </p>
              </div>
            ) : null}
          </div>
        </PlayerCard>

        <PlayerCard>
          <h2 className="player-headline-section font-headline text-lg font-bold uppercase tracking-tight text-white">
            Contact
          </h2>
          <p className="mt-1 text-xs text-player-on-variant">Phone and location for sessions.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label className={labelCls()} htmlFor="pf-phone">
                Phone
              </label>
              <input id="pf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={playerProfileInput} />
            </div>
            <div>
              <label className={labelCls()} htmlFor="pf-city">
                City
              </label>
              <input id="pf-city" value={city} onChange={(e) => setCity(e.target.value)} className={playerProfileInput} />
            </div>
            <div>
              <label className={labelCls()} htmlFor="pf-address">
                Address
              </label>
              <textarea
                id="pf-address"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={playerProfileInput}
              />
            </div>
          </div>
        </PlayerCard>

        <PlayerCard className="lg:col-span-2">
          <h2 className="player-headline-section font-headline text-lg font-bold uppercase tracking-tight text-white">
            Training schedule
          </h2>
          <p className="mt-1 text-xs text-player-on-variant">
            Select the days you want to train and your usual time. Coach recommendations match on shared days, plus
            location, skill, and experience.
          </p>
          <div className="mt-6">
            <WeeklyDaysTimeEditor
              slots={trainingPreferences}
              onChange={setTrainingPreferences}
              fieldClass={playerProfileInput}
              emptyHint="Pick your preferred training days — used for coach matching."
            />
          </div>
        </PlayerCard>

        <div className="lg:col-span-2">
          <button type="submit" disabled={saving} className={playerProfileSaveBtn}>
            <span className="inline-flex items-center justify-center gap-2">
              <PlayerIcon name="save" className="text-lg" />
              {saving ? 'Saving…' : 'Save changes'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

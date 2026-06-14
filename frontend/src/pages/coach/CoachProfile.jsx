import { useCallback, useEffect, useState } from 'react';
import CoachAvatar from '../../components/CoachAvatar';
import { api, getErrorMessage } from '../../services/api';

export default function CoachProfile() {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [academyLocation, setAcademyLocation] = useState('');
  const [locationMapUrl, setLocationMapUrl] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);

  const load = useCallback(() => {
    api
      .get('/coaches/me/profile')
      .then((r) => {
        const p = r.data.data;
        setProfile(p);
        setFullName(p.fullName || '');
        setBio(p.bio || '');
        setCity(p.city || '');
        setAcademyLocation(p.academyLocation || '');
        setLocationMapUrl(p.locationMapUrl || '');
      })
      .catch((e) => setErr(getErrorMessage(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveDetails = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const { data } = await api.put('/coaches/me/profile', {
        fullName,
        bio,
        city,
        academyLocation,
        locationMapUrl: locationMapUrl.trim(),
      });
      setProfile(data.data);
      setMsg('Profile updated.');
    } catch (e) {
      setErr(getErrorMessage(e));
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
      const { data } = await api.post('/coaches/me/profile-photo', fd);
      setProfile(data.data);
      setPhotoVersion(Date.now());
      setMsg('Profile photo updated.');
      load();
    } catch (er) {
      const status = er.response?.status;
      if (status === 401) {
        setErr('Session expired. Please log in again and retry.');
      } else {
        setErr(getErrorMessage(er));
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-5xl tracking-[0.08em] text-white">MY PROFILE</h1>
        <p className="font-headline text-xs uppercase tracking-[0.3em] text-slate-500">
          Photo appears to players, admins, and business partners
        </p>
      </div>
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {msg ? <p className="text-sm text-[#9bffce]">{msg}</p> : null}

      <div className="midnight-asymmetric max-w-xl border border-player-inner/40 bg-player-container p-6 shadow-player-card">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <CoachAvatar profile={profile} size="xl" cacheBust={photoVersion || undefined} />
          <div className="flex-1 text-center sm:text-left">
            <p className="font-display text-2xl tracking-wide text-white">{profile?.fullName || '—'}</p>
            <p className="mt-1 text-sm text-slate-400">
              {profile?.academyLocation || profile?.city || 'Location not set'}
            </p>
            <label className="mt-4 inline-block cursor-pointer rounded-lg bg-[#ff7524] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:brightness-95">
              {uploading ? 'Uploading…' : 'Change photo'}
              <input
                type="file"
                accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
                className="sr-only"
                onChange={onPhoto}
                disabled={uploading}
              />
            </label>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">JPG, PNG, or WebP · max 8 MB</p>
          </div>
        </div>
      </div>

      <form onSubmit={saveDetails} className="midnight-asymmetric max-w-xl space-y-4 border border-player-inner/40 bg-player-container p-6 shadow-player-card">
        <p className="font-display text-2xl tracking-[0.12em] text-white">DETAILS</p>
        <input
          className="w-full border-b-2 border-player-inner bg-player-bg px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          className="w-full border-b-2 border-player-inner bg-player-bg px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="w-full border-b-2 border-player-inner bg-player-bg px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]"
          placeholder="Academy location (address or area)"
          value={academyLocation}
          onChange={(e) => setAcademyLocation(e.target.value)}
        />
        <input
          className="w-full border-b-2 border-player-inner bg-player-bg px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]"
          placeholder="Google Maps link"
          value={locationMapUrl}
          onChange={(e) => setLocationMapUrl(e.target.value)}
          required
        />
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Players see your academy address and map link on coach match cards.
        </p>
        <textarea
          className="h-28 w-full border-b-2 border-player-inner bg-player-bg px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]"
          placeholder="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <button type="submit" className="bg-[#ff7524] px-8 py-3 font-display text-xl tracking-[0.14em] text-black">
          SAVE
        </button>
      </form>
    </div>
  );
}

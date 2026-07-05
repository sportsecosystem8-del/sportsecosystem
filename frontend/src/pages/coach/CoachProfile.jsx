import { useCallback, useEffect, useState } from 'react';
import CoachAvatar from '../../components/CoachAvatar';
import { coachField, coachLabel } from '../../components/coach/coachClassNames';
import WeeklyDaysTimeEditor from '../../components/shared/WeeklyDaysTimeEditor';
import {
  MultiCheckboxGroup,
  SPORT_OPTIONS,
  SKILL_LEVEL_OPTIONS,
} from '../../components/shared/WeeklyScheduleEditor';
import { publicAssetUrl } from '../../utils/assetUrl';
import { api, getErrorMessage } from '../../services/api';

const COACHING_CATEGORY_OPTIONS = [
  { value: 'batsman', label: 'Batting coach' },
  { value: 'bowler', label: 'Bowling coach' },
  { value: 'allrounder', label: 'All-rounder coach' },
];

export default function CoachProfile() {
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [academyLocation, setAcademyLocation] = useState('');
  const [locationMapUrl, setLocationMapUrl] = useState('');
  const [yearsExperience, setYearsExperience] = useState(0);
  const [specialties, setSpecialties] = useState([]);
  const [preferredPlayerLevels, setPreferredPlayerLevels] = useState([]);
  const [coachingCategories, setCoachingCategories] = useState([]);
  const [defaultSessionDurationMinutes, setDefaultSessionDurationMinutes] = useState(60);
  const [availability, setAvailability] = useState([]);
  const [monthlyTrainingFee, setMonthlyTrainingFee] = useState(0);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingAcademy, setUploadingAcademy] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [academyImageUrls, setAcademyImageUrls] = useState([]);

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
        setYearsExperience(p.yearsExperience ?? 0);
        setSpecialties(Array.isArray(p.specialties) ? p.specialties : []);
        setPreferredPlayerLevels(Array.isArray(p.preferredPlayerLevels) ? p.preferredPlayerLevels : []);
        setCoachingCategories(Array.isArray(p.coachingCategories) ? p.coachingCategories : []);
        setDefaultSessionDurationMinutes(p.defaultSessionDurationMinutes ?? 60);
        setAvailability(Array.isArray(p.availability) ? p.availability : []);
        setAcademyImageUrls(Array.isArray(p.academyImageUrls) ? p.academyImageUrls : []);
        setMonthlyTrainingFee(p.monthlyTrainingFee ?? 0);
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
    if (specialties.length === 0) {
      setErr('Select at least one sport specialty.');
      return;
    }
    try {
      const { data } = await api.put('/coaches/me/profile', {
        fullName,
        bio,
        city,
        academyLocation,
        locationMapUrl: locationMapUrl.trim(),
        yearsExperience: Number.parseInt(yearsExperience, 10) || 0,
        specialties,
        preferredPlayerLevels,
        coachingCategories,
        defaultSessionDurationMinutes: Number.parseInt(defaultSessionDurationMinutes, 10) || 60,
        availability,
        monthlyTrainingFee: Number.parseInt(monthlyTrainingFee, 10) || 0,
      });
      setProfile(data.data);
      setAcademyImageUrls(data.data?.academyImageUrls || []);
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

  const onAcademyPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploadingAcademy(true);
    setErr('');
    setMsg('');
    try {
      let latest = profile;
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file, file.name);
        const { data } = await api.post('/coaches/me/academy-photos', fd);
        latest = data.data;
      }
      setProfile(latest);
      setAcademyImageUrls(latest?.academyImageUrls || []);
      setMsg('Academy photos updated.');
    } catch (er) {
      setErr(getErrorMessage(er));
    } finally {
      setUploadingAcademy(false);
    }
  };

  const removeAcademyPhoto = async (url) => {
    setErr('');
    try {
      const { data } = await api.delete('/coaches/me/academy-photos', { data: { url } });
      setProfile(data.data);
      setAcademyImageUrls(data.data?.academyImageUrls || []);
      setMsg('Photo removed.');
    } catch (er) {
      setErr(getErrorMessage(er));
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

      <form onSubmit={saveDetails} className="midnight-asymmetric max-w-2xl space-y-6 border border-player-inner/40 bg-player-container p-6 shadow-player-card">
        <p className="font-display text-2xl tracking-[0.12em] text-white">DETAILS</p>
        <input
          className={coachField}
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          className={coachField}
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className={coachField}
          placeholder="Academy location (address or area)"
          value={academyLocation}
          onChange={(e) => setAcademyLocation(e.target.value)}
        />
        <input
          className={coachField}
          placeholder="Google Maps link"
          value={locationMapUrl}
          onChange={(e) => setLocationMapUrl(e.target.value)}
          required
        />
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Players see your academy address, map link, and facility photos on your public profile.
        </p>

        <div className="space-y-2 border-t border-white/[0.06] pt-6">
          <p className={coachLabel}>Academy photos</p>
          <p className="text-xs text-slate-500">Upload photos of your academy, courts, or training facility (up to 12).</p>
          <label className="inline-block cursor-pointer rounded-lg border border-[#ff7524]/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#ff7524] hover:bg-[#ff7524]/10">
            {uploadingAcademy ? 'Uploading…' : 'Add photos'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={onAcademyPhotos}
              disabled={uploadingAcademy}
            />
          </label>
          {academyImageUrls.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {academyImageUrls.map((url) => (
                <div key={url} className="relative">
                  <img src={publicAssetUrl(url)} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => removeAcademyPhoto(url)}
                    className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-600">No academy photos yet.</p>
          )}
        </div>

        <textarea
          className="h-28 w-full border-b-2 border-player-inner bg-player-bg px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]"
          placeholder="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />

        <div className="space-y-2 border-t border-white/[0.06] pt-6">
          <p className={coachLabel}>Sport specialties</p>
          <MultiCheckboxGroup
            options={SPORT_OPTIONS}
            values={specialties}
            onChange={setSpecialties}
            accentClass="text-[#ff7524]"
          />
        </div>

        <div className="space-y-2">
          <p className={coachLabel}>Coaching focus (cricket)</p>
          <p className="text-xs text-slate-500">Batsmen see batting coaches, bowlers see bowling coaches, etc.</p>
          <MultiCheckboxGroup
            options={COACHING_CATEGORY_OPTIONS}
            values={coachingCategories}
            onChange={setCoachingCategories}
            accentClass="text-[#ff7524]"
          />
        </div>

        <div className="space-y-2">
          <label className={coachLabel} htmlFor="coach-session-duration">
            Default session length (minutes)
          </label>
          <input
            id="coach-session-duration"
            type="number"
            min={15}
            max={240}
            step={15}
            className={coachField}
            value={defaultSessionDurationMinutes}
            onChange={(e) => setDefaultSessionDurationMinutes(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <p className={coachLabel}>Preferred player levels</p>
          <p className="text-xs text-slate-500">Select which skill levels you prefer to train.</p>
          <MultiCheckboxGroup
            options={SKILL_LEVEL_OPTIONS}
            values={preferredPlayerLevels}
            onChange={setPreferredPlayerLevels}
            accentClass="text-[#ff7524]"
          />
        </div>

        <div className="space-y-2">
          <label className={coachLabel} htmlFor="coach-years">
            Years of experience
          </label>
          <input
            id="coach-years"
            type="number"
            min={0}
            max={50}
            className={coachField}
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className={coachLabel} htmlFor="coach-monthly-fee">
            Monthly training fee (PKR)
          </label>
          <p className="text-xs text-slate-500">Shown to players when browsing coaches — helps them match your fee to their budget.</p>
          <input
            id="coach-monthly-fee"
            type="number"
            min={0}
            className={coachField}
            value={monthlyTrainingFee}
            onChange={(e) => setMonthlyTrainingFee(e.target.value)}
          />
        </div>

        <div className="space-y-2 border-t border-white/[0.06] pt-6">
          <p className={coachLabel}>Weekly availability</p>
          <p className="text-xs text-slate-500">
            Pick the days you usually train and one time window. This helps match you with players — you can still
            schedule sessions outside these hours.
          </p>
          <WeeklyDaysTimeEditor
            slots={availability}
            onChange={setAvailability}
            fieldClass={coachField}
            accentClass="text-[#ff7524]"
            emptyHint="Select your usual training days and set one weekly time."
          />
        </div>

        <button type="submit" className="bg-[#ff7524] px-8 py-3 font-display text-xl tracking-[0.14em] text-black">
          SAVE
        </button>
      </form>
    </div>
  );
}

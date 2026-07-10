import { useEffect, useState } from 'react';
import CoachAvatar from '../CoachAvatar';
import ModalPortal from '../shared/ModalPortal';
import CoachLocationLines from './CoachLocationLines';
import { playerBtnOutlineSm, playerBtnSm } from './playerClassNames';
import { slotsToWeeklyPattern } from '../shared/WeeklyDaysTimeEditor';
import { WEEKDAY_OPTIONS } from '../shared/WeeklyScheduleEditor';
import { publicAssetUrl } from '../../utils/assetUrl';
import { api, getErrorMessage } from '../../services/api';

function Stars({ rating }) {
  const n = Math.round(Number(rating) || 0);
  return (
    <span className="inline-flex gap-0.5 text-amber-300" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? 'opacity-100' : 'opacity-25'}>
          ★
        </span>
      ))}
    </span>
  );
}

function formatWeeklyAvailability(slots) {
  const { days, start, end } = slotsToWeeklyPattern(slots);
  if (!days.length) return null;
  const labels = days
    .map((d) => WEEKDAY_OPTIONS.find((x) => x.value === d)?.label?.slice(0, 3) || `D${d}`)
    .join(', ');
  return `${labels} · ${start}–${end}`;
}

export default function CoachProfileDetailModal({
  open,
  coachId,
  coachRow,
  playerOrigin,
  onClose,
  onRequestTraining,
  onViewCertificate,
  requestAction,
  requesting,
}) {
  const [profile, setProfile] = useState(coachRow?.profile || null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open || !coachId) return;
    setErr('');
    setLoading(true);
    Promise.all([
      api.get(`/players/coaches/${coachId}/profile`),
      api.get(`/players/coaches/${coachId}/feedback`),
    ])
      .then(([profRes, revRes]) => {
        setProfile(profRes.data?.data?.profile || coachRow?.profile || null);
        setReviews(revRes.data?.data || []);
      })
      .catch((e) => {
        setErr(getErrorMessage(e));
        setProfile(coachRow?.profile || null);
      })
      .finally(() => setLoading(false));
  }, [open, coachId, coachRow]);

  const p = profile || {};
  const availability = formatWeeklyAvailability(p.availability);
  const academyPhotos = Array.isArray(p.academyImageUrls) ? p.academyImageUrls : [];
  const levels = (p.preferredPlayerLevels || []).map((l) => l.charAt(0).toUpperCase() + l.slice(1)).join(', ');

  return (
    <ModalPortal open={open}>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 pt-[env(safe-area-inset-top)] sm:items-center sm:p-4 sm:pt-4"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-player-container shadow-2xl sm:max-h-[92dvh] sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex gap-4">
            <CoachAvatar profile={p} name={p.fullName} size="xl" />
            <div>
              <h2 className="font-display text-2xl tracking-wide text-white">{p.fullName || 'Coach'}</h2>
              <p className="mt-1 text-sm capitalize text-player-on-variant">
                {(p.specialties || []).join(' · ') || '—'}
              </p>
              {p.averageRating > 0 ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                  <Stars rating={p.averageRating} />
                  <span>
                    {p.averageRating.toFixed(1)} ({p.ratingCount || 0} review{p.ratingCount === 1 ? '' : 's'})
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">No reviews yet</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {err ? <p className="mb-3 text-sm text-red-400">{err}</p> : null}
          {loading ? <p className="text-sm text-slate-500">Loading profile…</p> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-player-inner/40 p-3">
              <p className="font-headline text-[10px] uppercase tracking-wider text-player-green">Experience</p>
              <p className="mt-1 text-lg text-white">
                {p.yearsExperience > 0 ? `${p.yearsExperience} year${p.yearsExperience === 1 ? '' : 's'}` : 'Not listed'}
              </p>
            </div>
            {p.monthlyTrainingFee > 0 ? (
              <div className="rounded-lg border border-white/10 bg-player-inner/40 p-3">
                <p className="font-headline text-[10px] uppercase tracking-wider text-player-green">Monthly fee</p>
                <p className="mt-1 text-lg text-white">PKR {p.monthlyTrainingFee}</p>
              </div>
            ) : null}
            {levels ? (
              <div className="rounded-lg border border-white/10 bg-player-inner/40 p-3 sm:col-span-2">
                <p className="font-headline text-[10px] uppercase tracking-wider text-player-green">Trains</p>
                <p className="mt-1 text-sm text-slate-200">{levels}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <CoachLocationLines profile={p} playerOrigin={playerOrigin} className="text-sm" />
          </div>

          {academyPhotos.length ? (
            <div className="mt-4">
              <p className="font-headline text-[10px] uppercase tracking-wider text-slate-500">Academy photos</p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {academyPhotos.map((url) => (
                  <img
                    key={url}
                    src={publicAssetUrl(url)}
                    alt="Academy"
                    className="h-28 w-40 shrink-0 rounded-lg object-cover"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {p.bio ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-player-inner/30 p-3">
              <p className="font-headline text-[10px] uppercase tracking-wider text-slate-500">About</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">{p.bio}</p>
            </div>
          ) : null}

          {availability ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-player-inner/30 p-3">
              <p className="font-headline text-[10px] uppercase tracking-wider text-slate-500">Availability</p>
              <p className="mt-2 text-sm text-slate-300">{availability}</p>
            </div>
          ) : null}

          {coachRow?.matchScore != null ? (
            <div className="mt-4 rounded-lg border border-player-green/20 bg-player-green/5 p-3">
              <p className="font-headline text-[10px] uppercase tracking-wider text-player-green">Your match</p>
              <p className="mt-1 text-sm text-slate-200">Score: {coachRow.matchScore?.toFixed?.(1) ?? coachRow.matchScore}</p>
              {coachRow.reasons?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-400">
                  {coachRow.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5">
            <p className="font-headline text-sm font-bold uppercase tracking-wide text-player-green">Player reviews</p>
            {reviews.length ? (
              <ul className="mt-3 max-h-56 space-y-3 overflow-y-auto pr-1">
                {reviews.map((rev) => (
                  <li key={rev._id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">{rev.reviewerName}</p>
                      <Stars rating={rev.rating} />
                    </div>
                    {rev.comment ? <p className="mt-2 text-sm text-slate-300">{rev.comment}</p> : null}
                    {rev.coachReply ? (
                      <p className="mt-2 border-l-2 border-[#ff7524]/40 pl-2 text-xs italic text-slate-400">
                        Coach: {rev.coachReply}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-slate-500">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No player reviews yet.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-4">
          {requestAction && onRequestTraining ? (
            <button
              type="button"
              disabled={requestAction.disabled || requesting}
              onClick={() => onRequestTraining(coachId)}
              className={`${playerBtnSm} disabled:opacity-50`}
            >
              {requesting ? 'Sending…' : requestAction.label}
            </button>
          ) : null}
          {onViewCertificate ? (
            <button type="button" onClick={() => onViewCertificate(coachRow)} className={playerBtnOutlineSm}>
              View certificate
            </button>
          ) : null}
          <button type="button" onClick={onClose} className={playerBtnOutlineSm}>
            Close
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

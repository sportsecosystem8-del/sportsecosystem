import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CoachAvatar from '../../components/CoachAvatar';
import CoachLocationLines from '../../components/player/CoachLocationLines';
import PlayerCard from '../../components/player/PlayerCard';
import PlayerPageHeader from '../../components/player/PlayerPageHeader';
import {
  playerBtnOutlineSm,
  playerBtnSm,
  playerField,
  playerLabel,
} from '../../components/player/playerClassNames';
import { playerLocationOrigin } from '../../utils/coachLocation';
import { api, getErrorMessage } from '../../services/api';

function Stars({ rating, size = 'sm' }) {
  const n = Math.round(Number(rating) || 0);
  const cls = size === 'lg' ? 'text-lg' : 'text-sm';
  return (
    <span className={`inline-flex gap-0.5 text-amber-300 ${cls}`} aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? 'opacity-100' : 'opacity-25'}>
          ★
        </span>
      ))}
    </span>
  );
}

function StarPicker({ value, onChange, disabled }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className={`text-2xl transition-opacity disabled:opacity-40 ${
            value >= n ? 'text-amber-300 opacity-100' : 'text-amber-300/30 hover:opacity-70'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function FeedbackForm({ coachId, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setOk('');
    if (!rating || rating < 1 || rating > 5) {
      setErr('Please choose a rating from 1 to 5 stars.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/players/coaches/${coachId}/feedback`, {
        rating,
        comment: comment.trim() || undefined,
        anonymous,
      });
      setOk('Thanks — your feedback is on the coach profile.');
      setRating(0);
      setComment('');
      setAnonymous(false);
      onSubmitted?.();
    } catch (ex) {
      const msg = getErrorMessage(ex);
      if (/training session/i.test(msg)) {
        setErr('Rate after your first session with this coach.');
      } else {
        setErr(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-lg border border-white/10 bg-player-inner/40 p-4">
      <p className="font-headline text-xs font-bold uppercase tracking-[0.14em] text-player-green">Leave feedback</p>
      <p className="text-xs text-player-on-variant">Your rating appears on this coach’s public profile.</p>
      <StarPicker value={rating} onChange={setRating} disabled={busy} />
      <div>
        <label className={playerLabel} htmlFor={`fb-comment-${coachId}`}>
          Comment (optional)
        </label>
        <textarea
          id={`fb-comment-${coachId}`}
          className={`${playerField} mt-2 min-h-[80px] resize-y`}
          placeholder="How has training been?"
          value={comment}
          disabled={busy}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-player-on-variant">
        <input
          type="checkbox"
          checked={anonymous}
          disabled={busy}
          onChange={(e) => setAnonymous(e.target.checked)}
          className="rounded border-white/20 bg-player-container"
        />
        Post anonymously
      </label>
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {ok ? <p className="text-sm text-player-green">{ok}</p> : null}
      <button type="submit" disabled={busy} className={`${playerBtnSm} disabled:opacity-50`}>
        {busy ? 'Submitting…' : 'Submit feedback'}
      </button>
    </form>
  );
}

function CoachBlock({ coachId, coach, acceptedAt, playerOrigin }) {
  const [profile, setProfile] = useState(coach?.coachProfile || null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');

  const loadDetails = useCallback(async () => {
    setLoadErr('');
    setLoading(true);
    try {
      const [profRes, revRes] = await Promise.all([
        api.get(`/players/coaches/${coachId}/profile`),
        api.get(`/players/coaches/${coachId}/feedback`),
      ]);
      setProfile(profRes.data?.data?.profile || coach?.coachProfile || null);
      setReviews(revRes.data?.data || []);
    } catch (e) {
      setLoadErr(getErrorMessage(e));
      setProfile(coach?.coachProfile || null);
    } finally {
      setLoading(false);
    }
  }, [coachId, coach]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const name = profile?.fullName || coach?.coachProfile?.fullName || coach?.email || 'Coach';
  const specialties = profile?.specialties || coach?.coachProfile?.specialties || [];
  const avg = profile?.averageRating ?? coach?.coachProfile?.averageRating ?? 0;
  const count = profile?.ratingCount ?? coach?.coachProfile?.ratingCount ?? 0;

  return (
    <PlayerCard className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <CoachAvatar profile={profile || coach?.coachProfile} name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-white">{name}</h2>
          <p className="mt-1 text-sm font-medium text-player-green">Your coach</p>
          <CoachLocationLines
            profile={profile || coach?.coachProfile}
            playerOrigin={playerOrigin}
            className="mt-2"
          />
          {specialties.length ? (
            <p className="mt-1 text-[10px] uppercase tracking-wider text-player-on-variant">
              {specialties.slice(0, 4).join(' · ')}
            </p>
          ) : null}
          {avg > 0 ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
              <Stars rating={avg} />
              <span>
                {Number(avg).toFixed(1)} ({count} review{count === 1 ? '' : 's'})
              </span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">No reviews yet</p>
          )}
          {acceptedAt ? (
            <p className="mt-1 text-[10px] text-player-on-variant">
              Training since {new Date(acceptedAt).toLocaleDateString()}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/player/training" className={playerBtnSm}>
              View schedule
            </Link>
            <Link to="/player/coaches" className={playerBtnOutlineSm}>
              Find more coaches
            </Link>
          </div>
        </div>
      </div>

      {loadErr ? <p className="mt-3 text-sm text-red-400">{loadErr}</p> : null}
      {loading ? <p className="mt-3 text-sm text-slate-500">Loading profile…</p> : null}

      <FeedbackForm coachId={coachId} onSubmitted={loadDetails} />

      <div className="mt-5">
        <p className="font-headline text-xs font-bold uppercase tracking-[0.14em] text-player-green">
          Recent reviews
        </p>
        {reviews.length ? (
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {reviews.slice(0, 8).map((rev) => (
              <li key={rev._id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">{rev.reviewerName}</p>
                  <Stars rating={rev.rating} />
                </div>
                {rev.comment ? <p className="mt-2 text-sm text-slate-300">{rev.comment}</p> : null}
                {rev.coachReply ? (
                  <p className="mt-2 border-l-2 border-player-green/40 pl-2 text-xs italic text-slate-400">
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
          <p className="mt-2 text-sm text-player-on-variant">No player reviews yet for this coach.</p>
        )}
      </div>
    </PlayerCard>
  );
}

export default function PlayerMyCoach() {
  const [trainingRequests, setTrainingRequests] = useState([]);
  const [playerOrigin, setPlayerOrigin] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const [trRes, profileRes] = await Promise.all([
          api.get('/players/training-requests'),
          api.get('/players/me/profile').catch(() => ({ data: { data: null } })),
        ]);
        if (cancelled) return;
        setTrainingRequests(trRes.data?.data || []);
        setPlayerOrigin(playerLocationOrigin(profileRes.data?.data));
      } catch (e) {
        if (!cancelled) setErr(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myCoaches = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const req of trainingRequests) {
      if (req.status !== 'accepted') continue;
      const coach = req.coach;
      const coachId = String(coach?._id || coach || '');
      if (!coachId || seen.has(coachId)) continue;
      seen.add(coachId);
      list.push({
        coachId,
        coach,
        acceptedAt: req.updatedAt || req.createdAt,
      });
    }
    return list;
  }, [trainingRequests]);

  return (
    <div>
      <PlayerPageHeader
        title="My coach"
        subtitle="Your accepted coaches — view profile details and leave feedback."
      />
      {err ? <p className="mb-4 text-sm text-red-400">{err}</p> : null}
      {loading ? (
        <p className="text-sm text-player-on-variant">Loading…</p>
      ) : myCoaches.length === 0 ? (
        <PlayerCard className="p-6">
          <p className="text-sm text-player-on-variant">
            No coach assigned yet. Send a training request from{' '}
            <Link to="/player/coaches" className="font-semibold text-player-green hover:underline">
              Recommend coaches
            </Link>
            .
          </p>
        </PlayerCard>
      ) : (
        <div className="space-y-6">
          {myCoaches.map(({ coachId, coach, acceptedAt }) => (
            <CoachBlock
              key={coachId}
              coachId={coachId}
              coach={coach}
              acceptedAt={acceptedAt}
              playerOrigin={playerOrigin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import PlayerTrainingRequestCard from '../../components/coach/PlayerTrainingRequestCard';
import CoachSearchField from '../../components/coach/CoachSearchField';
import { api, getErrorMessage } from '../../services/api';
import { matchesTrainingRequestQuery } from '../../utils/coachStudents';
import { coachAcademyLabel, coachMapUrl } from '../../utils/coachLocation';

function coachLocationOrigin(coachProfile) {
  return coachMapUrl(coachProfile) || coachAcademyLabel(coachProfile) || '';
}

export default function CoachRequests() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [scheduledAtById, setScheduledAtById] = useState({});
  const [meetingLocationById, setMeetingLocationById] = useState({});
  const [coachOrigin, setCoachOrigin] = useState('');
  const [coachProfile, setCoachProfile] = useState(null);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  const filtered = list.filter((r) => matchesTrainingRequestQuery(r, query));

  const load = () =>
    api
      .get('/coaches/training-requests')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));

  useEffect(() => {
    load();
    api
      .get('/coaches/me/profile')
      .then((r) => {
        const p = r.data?.data;
        setCoachProfile(p);
        setCoachOrigin(coachLocationOrigin(p));
      })
      .catch(() => {});
  }, []);

  const act = async (id, status) => {
    const selected = scheduledAtById[id];
    if (status === 'accepted' && !selected) {
      setErr('Select a meeting date and time before accepting.');
      return;
    }
    const body =
      status === 'accepted'
        ? {
            status,
            scheduledAt: new Date(selected).toISOString(),
            meetingLocation: meetingLocationById[id] || coachOrigin || undefined,
            meetingAcademyName: coachProfile?.fullName || undefined,
          }
        : { status };
    setBusyId(id);
    setErr('');
    try {
      const res = await api.patch(`/coaches/training-requests/${id}`, body);
      const note = res.data?.data?.meetingInstructions || res.data?.data?.schedulingNote;
      setInfo(note || (status === 'accepted' ? 'Request accepted — player notified with meeting details.' : ''));
      setScheduledAtById((prev) => ({ ...prev, [id]: '' }));
      setMeetingLocationById((prev) => ({ ...prev, [id]: '' }));
      load();
    } catch (e) {
      setInfo('');
      setErr(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const markFees = async (id) => {
    setBusyId(id);
    setErr('');
    try {
      await api.post(`/coaches/training-requests/${id}/mark-fees-cleared`);
      setInfo('Fees marked cleared. You can now create the first session.');
      load();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const startSession = async (id) => {
    setBusyId(id);
    setErr('');
    try {
      await api.post(`/coaches/training-requests/${id}/start-session`);
      setInfo('First training session created — player added to Weekly Schedule.');
      load();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-[0.08em] text-white">TRAINING REQUESTS</h1>
          <p className="font-headline text-xs uppercase tracking-[0.3em] text-slate-500">
            Accept → meeting info → fees → first session
          </p>
        </div>
      </div>
      {err && <p className="text-sm text-red-400 mt-2">{err}</p>}
      {info && (
        <div className="mt-4 border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" role="status">
          {info}
        </div>
      )}
      {list.length > 1 ? (
        <div className="mt-6 max-w-xl space-y-2">
          <CoachSearchField
            value={query}
            onChange={setQuery}
            placeholder="Search by name, email, city, sport, or status…"
            aria-label="Search training requests"
          />
        </div>
      ) : null}
      <ul className="mt-4 grid gap-6 xl:grid-cols-2">
        {filtered.map((r) => (
          <PlayerTrainingRequestCard
            key={r._id}
            request={r}
            coachOrigin={coachOrigin}
            scheduledAt={scheduledAtById[r._id] || ''}
            onScheduledAtChange={(value) => setScheduledAtById((prev) => ({ ...prev, [r._id]: value }))}
            meetingLocation={meetingLocationById[r._id] ?? coachOrigin}
            onMeetingLocationChange={(value) => setMeetingLocationById((prev) => ({ ...prev, [r._id]: value }))}
            onAccept={() => act(r._id, 'accepted')}
            onReject={() => act(r._id, 'rejected')}
            onMarkFeesCleared={markFees}
            onStartSession={startSession}
            busy={busyId === r._id}
          />
        ))}
      </ul>
    </div>
  );
}

import { useEffect, useState } from 'react';
import PlayerTrainingRequestCard from '../../components/coach/PlayerTrainingRequestCard';
import CoachSearchField from '../../components/coach/CoachSearchField';
import { api, getErrorMessage } from '../../services/api';
import { matchesTrainingRequestQuery } from '../../utils/coachStudents';
import { coachAcademyLabel } from '../../utils/coachLocation';

export default function CoachRequests() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [scheduledAtById, setScheduledAtById] = useState({});
  const [meetingLocationById, setMeetingLocationById] = useState({});
  const [meetingDefaultLocation, setMeetingDefaultLocation] = useState('');
  const [coachProfile, setCoachProfile] = useState(null);
  const [query, setQuery] = useState('');
  const [rollNoById, setRollNoById] = useState({});
  const [firstSessionAtById, setFirstSessionAtById] = useState({});
  const [firstSessionDurationById, setFirstSessionDurationById] = useState({});
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
        setMeetingDefaultLocation(coachAcademyLabel(p) || '');
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
            meetingLocation: meetingLocationById[id] || meetingDefaultLocation || undefined,
            meetingAcademyName: coachProfile?.academyName || coachProfile?.fullName || undefined,
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
    const coachRollNo = String(rollNoById[id] || '').trim();
    if (!coachRollNo) {
      setErr('Enter a unique roll number / student ID before marking fees cleared.');
      return;
    }
    const wasCleared = Boolean(list.find((x) => x._id === id)?.feesCleared);
    setBusyId(id);
    setErr('');
    try {
      await api.post(`/coaches/training-requests/${id}/mark-fees-cleared`, { coachRollNo });
      setInfo(
        wasCleared
          ? `Student ID #${coachRollNo} saved.`
          : `Fees marked cleared. Student ID #${coachRollNo} assigned — you can create the first session.`,
      );
      setRollNoById((prev) => ({ ...prev, [id]: '' }));
      load();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const startSession = async (id) => {
    const scheduledAt = firstSessionAtById[id];
    if (!scheduledAt) {
      setErr('Pick a training session date and time.');
      return;
    }
    setBusyId(id);
    setErr('');
    try {
      await api.post(`/coaches/training-requests/${id}/start-session`, {
        scheduledAt: new Date(scheduledAt).toISOString(),
        durationMinutes: Number.parseInt(firstSessionDurationById[id], 10) || 60,
      });
      setInfo('First training session scheduled — player notified.');
      setFirstSessionAtById((prev) => ({ ...prev, [id]: '' }));
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
            scheduledAt={scheduledAtById[r._id] || ''}
            onScheduledAtChange={(value) => setScheduledAtById((prev) => ({ ...prev, [r._id]: value }))}
            meetingLocation={meetingLocationById[r._id] ?? meetingDefaultLocation}
            meetingLocationPlaceholder={meetingDefaultLocation || 'Academy address'}
            onMeetingLocationChange={(value) => setMeetingLocationById((prev) => ({ ...prev, [r._id]: value }))}
            rollNo={rollNoById[r._id] ?? ''}
            onRollNoChange={(value) => setRollNoById((prev) => ({ ...prev, [r._id]: value }))}
            onAccept={() => act(r._id, 'accepted')}
            onReject={() => act(r._id, 'rejected')}
            onMarkFeesCleared={markFees}
            firstSessionAt={firstSessionAtById[r._id] || ''}
            onFirstSessionAtChange={(value) => setFirstSessionAtById((prev) => ({ ...prev, [r._id]: value }))}
            firstSessionDuration={firstSessionDurationById[r._id] ?? 60}
            onFirstSessionDurationChange={(value) =>
              setFirstSessionDurationById((prev) => ({ ...prev, [r._id]: value }))
            }
            onScheduleFirstSession={startSession}
            busy={busyId === r._id}
          />
        ))}
      </ul>
    </div>
  );
}

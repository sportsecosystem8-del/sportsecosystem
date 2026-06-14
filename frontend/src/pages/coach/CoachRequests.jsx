import { useEffect, useState } from 'react';
import PlayerTrainingRequestCard from '../../components/coach/PlayerTrainingRequestCard';
import { api, getErrorMessage } from '../../services/api';
import { coachAcademyLabel, coachMapUrl } from '../../utils/coachLocation';

function coachLocationOrigin(coachProfile) {
  return coachMapUrl(coachProfile) || coachAcademyLabel(coachProfile) || '';
}

export default function CoachRequests() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [scheduledAtById, setScheduledAtById] = useState({});
  const [coachOrigin, setCoachOrigin] = useState('');

  const load = () =>
    api
      .get('/coaches/training-requests')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));

  useEffect(() => {
    load();
    api
      .get('/coaches/me/profile')
      .then((r) => setCoachOrigin(coachLocationOrigin(r.data?.data)))
      .catch(() => {});
  }, []);

  const act = async (id, status) => {
    const selected = scheduledAtById[id];
    if (status === 'accepted' && !selected) {
      const ok = window.confirm(
        'No schedule time selected. The request will be accepted but the player will not appear on Weekly Schedule until you accept with a date and time. Continue?',
      );
      if (!ok) return;
    }
    const body =
      status === 'accepted' && selected
        ? { status, scheduledAt: new Date(selected).toISOString() }
        : { status };
    try {
      const res = await api.patch(`/coaches/training-requests/${id}`, body);
      setErr('');
      const note = res.data?.data?.schedulingNote;
      const session = res.data?.data?.session;
      if (note) {
        setInfo(note);
      } else if (status === 'accepted' && session) {
        setInfo('Request accepted and session scheduled. The player will appear on Weekly Schedule.');
      } else if (status === 'accepted') {
        setInfo('');
      } else {
        setInfo('');
      }
      setScheduledAtById((prev) => ({ ...prev, [id]: '' }));
      load();
    } catch (e) {
      setInfo('');
      setErr(getErrorMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-[0.08em] text-white">TRAINING REQUESTS</h1>
          <p className="font-headline text-xs uppercase tracking-[0.3em] text-slate-500">Management Dashboard</p>
        </div>
      </div>
      {err && <p className="text-sm text-red-400 mt-2">{err}</p>}
      {info && (
        <div className="mt-4 border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100" role="status">
          {info}
        </div>
      )}
      <ul className="mt-4 grid gap-6 xl:grid-cols-2">
        {list.map((r) => (
          <PlayerTrainingRequestCard
            key={r._id}
            request={r}
            coachOrigin={coachOrigin}
            scheduledAt={scheduledAtById[r._id] || ''}
            onScheduledAtChange={(value) => setScheduledAtById((prev) => ({ ...prev, [r._id]: value }))}
            onAccept={() => act(r._id, 'accepted')}
            onReject={() => act(r._id, 'rejected')}
          />
        ))}
      </ul>
    </div>
  );
}

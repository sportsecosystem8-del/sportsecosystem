import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemedDateTimePicker from '../../components/coach/ThemedDateTimePicker';
import CoachStudentPicker from '../../components/coach/CoachStudentPicker';
import { coachBtnPrimary, coachField, coachLabel } from '../../components/coach/coachClassNames';
import { api, getErrorMessage } from '../../services/api';
import { studentsFromAcceptedRequests } from '../../utils/coachStudents';

export default function CoachSessions() {
  const [list, setList] = useState([]);
  const [students, setStudents] = useState([]);
  const [playerId, setPlayerId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [location, setLocation] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [editingId, setEditingId] = useState(null);
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    if (!silent) setErr('');
    try {
      const [sessionsRes, requestsRes, profileRes] = await Promise.all([
        api.get('/coaches/training-sessions'),
        api.get('/coaches/training-requests'),
        api.get('/coaches/me/profile'),
      ]);
      const accepted = studentsFromAcceptedRequests(requestsRes.data.data || []);
      setList(sessionsRes.data.data || []);
      setStudents(accepted);
      setDurationMinutes(profileRes.data?.data?.defaultSessionDurationMinutes ?? 60);
      setPlayerId((prev) => (prev && accepted.some((s) => s.playerId === prev) ? prev : accepted[0]?.playerId || ''));
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const mark = async (id, present) => {
    setMarkingId(id);
    setErr('');
    setMsg('');
    try {
      await api.post(`/coaches/sessions/${id}/attendance`, { present });
      setMsg(present ? 'Student marked present — session completed.' : 'Student marked absent — session completed.');
      await load({ silent: true });
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setMarkingId(null);
    }
  };

  const scheduleSession = async (e) => {
    e.preventDefault();
    if (!playerId) {
      setErr('Select a student first.');
      return;
    }
    if (!scheduledAt) {
      setErr('Pick a date and time.');
      return;
    }
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      await api.post('/coaches/training-sessions', {
        playerId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        location: location.trim() || undefined,
        durationMinutes: Number.parseInt(durationMinutes, 10) || 60,
      });
      setScheduledAt('');
      setLocation('');
      setMsg('Session scheduled. The player has been notified.');
      await load({ silent: true });
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (session) => {
    setEditingId(session._id);
    setEditScheduledAt(new Date(session.scheduledAt).toISOString().slice(0, 16));
    setEditLocation(session.location || '');
    setErr('');
    setMsg('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditScheduledAt('');
    setEditLocation('');
  };

  const saveEdit = async (sessionId) => {
    if (!editScheduledAt) {
      setErr('Pick a date and time.');
      return;
    }
    setUpdatingId(sessionId);
    setErr('');
    setMsg('');
    try {
      await api.patch(`/coaches/training-sessions/${sessionId}`, {
        scheduledAt: new Date(editScheduledAt).toISOString(),
        location: editLocation.trim() || undefined,
      });
      setMsg('Session updated. The player has been notified.');
      cancelEdit();
      await load({ silent: true });
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setUpdatingId(null);
    }
  };

  const upcoming = list.filter((s) => s.status === 'scheduled');
  const completed = list.filter((s) => s.status !== 'scheduled');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-[0.08em] text-white sm:text-5xl">WEEKLY SCHEDULE</h1>
        <p className="font-headline text-xs uppercase tracking-[0.3em] text-slate-500">Training Timeline</p>
      </div>

      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {msg ? <p className="text-sm text-[#9bffce]">{msg}</p> : null}

      <form
        onSubmit={scheduleSession}
        className="midnight-asymmetric max-w-2xl space-y-4 border border-[#ff7524]/25 bg-player-container p-6 shadow-player-card"
      >
        <div>
          <p className="font-display text-2xl tracking-[0.1em] text-white">SCHEDULE SESSION</p>
          <p className="mt-1 text-sm text-slate-400">
            Add sessions for accepted students. Update upcoming sessions anytime — players are notified automatically.
          </p>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-slate-400">
            No accepted students yet.{' '}
            <Link to="/coach/requests" className="text-[#ff7524] hover:underline">
              Accept a training request
            </Link>{' '}
            first.
          </p>
        ) : (
          <>
            <div>
              <label className={coachLabel} htmlFor="session-student">
                Student
              </label>
              <CoachStudentPicker
                id="session-student"
                students={students}
                value={playerId}
                onChange={setPlayerId}
                loading={loading}
              />
            </div>
            <div>
              <label className={coachLabel}>Date & time</label>
              <ThemedDateTimePicker
                className="mt-2"
                value={scheduledAt}
                onChange={setScheduledAt}
                placeholder="Pick session time"
              />
            </div>
            <div>
              <label className={coachLabel} htmlFor="session-duration">
                Duration (minutes)
              </label>
              <input
                id="session-duration"
                type="number"
                min={15}
                max={240}
                step={15}
                className={`${coachField} mt-2`}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
            <div>
              <label className={coachLabel} htmlFor="session-location">
                Location (optional)
              </label>
              <input
                id="session-location"
                className={`${coachField} mt-2`}
                placeholder="Academy ground, address, or map note"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <button type="submit" disabled={saving} className={`${coachBtnPrimary} max-w-xs`}>
              {saving ? 'Scheduling…' : 'Add session'}
            </button>
          </>
        )}
      </form>

      {loading ? (
        <p className="font-headline text-xs uppercase tracking-[0.2em] text-slate-500">Loading schedule…</p>
      ) : list.length === 0 && students.length > 0 ? (
        <div className="midnight-asymmetric border border-player-inner/40 bg-player-container p-6 text-sm text-slate-400 shadow-player-card">
          No sessions on the calendar yet. Use the form above to schedule the first session with your student.
        </div>
      ) : null}

      {upcoming.length ? (
        <section>
          <h2 className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-[#ff7524]">Upcoming</h2>
          <ul className="mt-4 grid gap-4">
            {upcoming.map((s) => (
              <SessionRow
                key={s._id}
                session={s}
                markingId={markingId}
                onMark={mark}
                editingId={editingId}
                editScheduledAt={editScheduledAt}
                editLocation={editLocation}
                updatingId={updatingId}
                onStartEdit={startEdit}
                onCancelEdit={cancelEdit}
                onSaveEdit={saveEdit}
                onEditScheduledAt={setEditScheduledAt}
                onEditLocation={setEditLocation}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {completed.length ? (
        <section>
          <h2 className="font-headline text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Completed</h2>
          <ul className="mt-4 grid gap-4">
            {completed.map((s) => (
              <SessionRow key={s._id} session={s} markingId={markingId} onMark={mark} dimmed />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function AttendanceBadge({ attendance }) {
  if (!attendance) return null;
  const present = attendance.present === true;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-headline text-[10px] font-bold uppercase tracking-wider ${
        present ? 'bg-player-green/15 text-player-green' : 'bg-red-500/15 text-red-300'
      }`}
    >
      {present ? 'Present' : 'Absent'}
    </span>
  );
}

function SessionRow({
  session,
  onMark,
  markingId,
  dimmed = false,
  editingId,
  editScheduledAt,
  editLocation,
  updatingId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditScheduledAt,
  onEditLocation,
}) {
  const name =
    session.player?.playerProfile?.fullName || session.player?.email || `player ${session.player?._id || session.player}`;
  const isMarking = markingId === session._id;
  const hasAttendance = Boolean(session.attendance);
  const canMark = session.status === 'scheduled' && !isMarking;
  const isEditing = editingId === session._id;
  const isUpdating = updatingId === session._id;

  return (
    <li
      className={`midnight-asymmetric grid gap-4 border border-player-inner/40 bg-player-container p-4 shadow-player-card md:grid-cols-[1fr_auto] md:items-center ${
        dimmed ? 'opacity-90' : ''
      } ${hasAttendance && session.attendance?.present ? 'border-player-green/25' : ''}`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-2xl text-white sm:text-3xl">{name}</p>
          <AttendanceBadge attendance={session.attendance} />
        </div>
        {!isEditing ? (
          <>
            <p className="font-orbitron text-xs uppercase tracking-[0.15em] text-[#ff7524]">
              {new Date(session.scheduledAt).toLocaleString()}
            </p>
            {session.location ? <p className="mt-1 text-xs text-slate-400">{session.location}</p> : null}
          </>
        ) : (
          <div className="mt-3 space-y-3">
            <ThemedDateTimePicker value={editScheduledAt} onChange={onEditScheduledAt} placeholder="New time" />
            <input
              className={coachField}
              placeholder="Location"
              value={editLocation}
              onChange={(e) => onEditLocation(e.target.value)}
            />
          </div>
        )}
        <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{session.status}</p>
      </div>
      {isEditing ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="bg-[#ff7524] px-3 py-2 font-display text-lg tracking-widest text-black disabled:opacity-50"
            disabled={isUpdating}
            onClick={() => onSaveEdit(session._id)}
          >
            {isUpdating ? 'SAVING…' : 'SAVE'}
          </button>
          <button
            type="button"
            className="border border-player-inner px-3 py-2 font-display text-lg tracking-widest text-slate-300"
            onClick={onCancelEdit}
          >
            CANCEL
          </button>
        </div>
      ) : canMark ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border border-[#ff7524]/50 px-3 py-2 font-display text-sm tracking-widest text-[#ff7524] hover:bg-[#ff7524]/10"
            onClick={() => onStartEdit(session)}
          >
            EDIT
          </button>
          <button
            type="button"
            className="bg-[#ff7524] px-3 py-2 font-display text-lg tracking-widest text-black transition hover:brightness-110 disabled:opacity-50"
            disabled={isMarking}
            onClick={() => onMark(session._id, true)}
          >
            PRESENT
          </button>
          <button
            type="button"
            className="border border-player-inner px-3 py-2 font-display text-lg tracking-widest text-slate-300 transition hover:border-white/30 disabled:opacity-50"
            disabled={isMarking}
            onClick={() => onMark(session._id, false)}
          >
            ABSENT
          </button>
        </div>
      ) : isMarking ? (
        <p className="font-headline text-[10px] uppercase tracking-wider text-[#ff7524]">Saving…</p>
      ) : hasAttendance ? (
        <p className="text-right text-[10px] uppercase tracking-wider text-slate-500">Attendance recorded</p>
      ) : session.status === 'scheduled' ? (
        <button
          type="button"
          className="border border-[#ff7524]/50 px-3 py-2 font-display text-sm tracking-widest text-[#ff7524]"
          onClick={() => onStartEdit?.(session)}
        >
          EDIT
        </button>
      ) : null}
    </li>
  );
}

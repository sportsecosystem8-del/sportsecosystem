import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { coachBtnPrimary, coachLabel, coachSelect } from '../../components/coach/coachClassNames';
import { api, getErrorMessage } from '../../services/api';
import { studentsFromAcceptedRequests } from '../../utils/coachStudents';

const fieldClass =
  'w-full border-b-2 border-player-inner bg-player-bg px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]';

function planStudentName(plan, studentNameById) {
  const p = plan.player;
  if (p && typeof p === 'object') {
    return p.playerProfile?.fullName || p.email || 'Student';
  }
  return studentNameById[String(p)] || 'Student';
}

function mondayInputValue(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().slice(0, 10);
}

/** Weekly plans; publish auto-drafts */
export default function CoachPlans() {
  const [list, setList] = useState([]);
  const [students, setStudents] = useState([]);
  const [player, setPlayer] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [title, setTitle] = useState('');
  const [goals, setGoals] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [publishNow, setPublishNow] = useState(true);

  const studentNameById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.playerId, s.fullName])),
    [students]
  );

  const loadPlans = () =>
    api
      .get('/coaches/training-plans')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));

  const loadStudents = () =>
    api
      .get('/coaches/training-requests')
      .then((r) => {
        const accepted = studentsFromAcceptedRequests(r.data.data || []);
        setStudents(accepted);
        setPlayer((prev) => (prev && accepted.some((s) => s.playerId === prev) ? prev : accepted[0]?.playerId || ''));
      })
      .catch((e) => setErr(getErrorMessage(e)));

  const load = () => {
    setErr('');
    return Promise.all([loadPlans(), loadStudents()]);
  };

  useEffect(() => {
    setWeekStart((prev) => prev || mondayInputValue());
    load();
  }, []);

  const generateAutoDraft = async () => {
    if (!player) {
      setErr('Select a student first.');
      return;
    }
    setErr('');
    setOk('');
    setAutoGenerating(true);
    const name = studentNameById[player] || 'student';
    try {
      const { data } = await api.post('/coaches/training-plans/auto-draft', {
        playerId: player,
        weekStartDate: weekStart ? new Date(weekStart).toISOString() : undefined,
        publishNow,
      });
      setOk(
        data.message ||
          (data.published
            ? `Plan is live for ${name} — check Player → Schedule.`
            : `Draft saved for ${name}. Click Publish below so they can see it.`)
      );
      loadPlans();
    } catch (er) {
      setErr(getErrorMessage(er));
    } finally {
      setAutoGenerating(false);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    if (!player) {
      setErr('Select a student who accepted your training request.');
      return;
    }
    setErr('');
    setOk('');
    try {
      await api.post('/coaches/training-plans', {
        player,
        weekStartDate: new Date(weekStart).toISOString(),
        title,
        goals,
        exercises: goals,
      });
      setTitle('');
      setGoals('');
      setOk('Plan created.');
      loadPlans();
    } catch (er) {
      setErr(getErrorMessage(er));
    }
  };

  const publish = async (id) => {
    setErr('');
    try {
      await api.put(`/coaches/training-plans/${id}`, { status: 'published', coachReviewed: true });
      setOk('Plan published to player.');
      loadPlans();
    } catch (er) {
      setErr(getErrorMessage(er));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-5xl tracking-[0.08em] text-white">TRAINING ARSENALS</h1>
        <p className="font-headline text-xs uppercase tracking-[0.3em] text-slate-500">Weekly tactical plans</p>
        {err ? <p className="mt-2 text-sm text-red-400">{err}</p> : null}
        {ok ? <p className="mt-2 text-sm text-[#ff7524]">{ok}</p> : null}
      </div>

      <div className="midnight-asymmetric max-w-xl space-y-3 border border-[#ff7524]/30 bg-player-container p-5 shadow-player-card">
        <p className="font-display text-2xl tracking-[0.12em] text-white">GENERATE AUTO DRAFT</p>
        <p className="text-sm text-slate-400">
          Select the student, then generate their AI weekly draft. Players only see plans after you publish.
        </p>
        <div>
          <label className={coachLabel}>Student</label>
          {students.length ? (
            <select
              className={`${coachSelect} mt-2`}
              value={player}
              onChange={(e) => setPlayer(e.target.value)}
            >
              <option value="">Select student…</option>
              {students.map((s) => (
                <option key={s.playerId} value={s.playerId}>
                  {s.fullName}
                  {s.sportPreference ? ` · ${s.sportPreference}` : ''}
                  {s.city ? ` · ${s.city}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              No active students yet. Accept a training request from{' '}
              <Link to="/coach/requests" className="text-[#ff7524] underline-offset-2 hover:underline">
                Requests
              </Link>{' '}
              first.
            </p>
          )}
        </div>
        <div>
          <label className={coachLabel}>Week starting</label>
          <input
            type="date"
            className={`${fieldClass} mt-2`}
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            disabled={!students.length}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
            disabled={!students.length}
            className="accent-[#ff7524]"
          />
          Publish to player now (shows on their Schedule)
        </label>
        <button
          type="button"
          disabled={!students.length || !player || autoGenerating}
          onClick={generateAutoDraft}
          className={`${coachBtnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {autoGenerating ? 'Generating…' : publishNow ? 'GENERATE & PUBLISH' : 'SAVE DRAFT ONLY'}
        </button>
      </div>

      <form
        onSubmit={create}
        className="midnight-asymmetric max-w-xl space-y-3 border border-player-inner/40 bg-player-container p-5 shadow-player-card"
      >
        <p className="font-display text-2xl tracking-[0.12em] text-white">FORGE NEW PLAN (manual)</p>
        <p className="text-sm text-slate-500">Uses the same student and week selected above.</p>
        <input
          className={fieldClass}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!students.length}
        />
        <textarea
          className={fieldClass}
          placeholder="Goals / exercises"
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          disabled={!students.length}
        />
        <button
          type="submit"
          disabled={!students.length || !player}
          className="w-full bg-[#ff7524] py-3 font-display text-xl tracking-[0.14em] text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          SAVE MANUAL PLAN
        </button>
      </form>
      <ul className="grid gap-6 lg:grid-cols-2">
        {list.map((p) => {
          const studentName = planStudentName(p, studentNameById);
          return (
            <li
              key={p._id}
              className="midnight-asymmetric border border-player-inner/40 bg-player-container p-5 text-sm shadow-player-card"
            >
              <p className="mb-1 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff7524]">
                {p.isAutoGenerated ? 'Auto draft for' : 'Plan for'} {studentName}
              </p>
              <div className="mb-2 flex items-start justify-between">
                <span className="font-display text-3xl text-white">{p.title}</span>
                <span
                  className={`rounded-full px-2 py-1 font-orbitron text-[10px] uppercase tracking-widest ${
                    p.status === 'draft' ? 'bg-amber-500/20 text-amber-200' : 'bg-player-green/10 text-player-green'
                  }`}
                >
                  {p.status}
                  {p.isAutoGenerated ? ' · auto' : ''}
                  {p.generationMethod === 'ai' ? ' · ai' : ''}
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Source:{' '}
                {p.generationMethod === 'ai'
                  ? 'AI Draft'
                  : p.generationMethod === 'manual'
                    ? 'Manual'
                    : 'Rules Fallback'}
              </p>
              <p className="font-headline text-xs uppercase tracking-[0.2em] text-slate-500">
                {studentName} · week of {new Date(p.weekStartDate).toLocaleDateString()}
              </p>
            {p.status === 'draft' ? (
              <p className="mt-1 text-xs font-medium text-amber-200">
                Draft — {studentName} cannot see this yet. Click Publish below.
              </p>
            ) : (
              <p className="mt-1 text-xs text-player-green">Published — visible on player Schedule.</p>
            )}
              <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-300">{p.goals || p.exercises}</pre>
              {p.status === 'draft' ? (
                <button
                  type="button"
                  className="mt-4 w-full bg-player-green/20 py-2 font-display text-sm text-player-green"
                  onClick={() => publish(p._id)}
                >
                  Publish to {studentName}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CoachPlanCard from '../../components/coach/CoachPlanCard';
import { coachBtnPrimary, coachLabel } from '../../components/coach/coachClassNames';
import CoachStudentPicker from '../../components/coach/CoachStudentPicker';
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

function weekStartIso(dateStr) {
  return new Date(dateStr).toISOString();
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
  const [busyPlanId, setBusyPlanId] = useState(null);
  const [publishNow, setPublishNow] = useState(false);

  const [evalReady, setEvalReady] = useState(null);

  const studentNameById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.playerId, s.fullName])),
    [students],
  );

  useEffect(() => {
    if (!player) {
      setEvalReady(null);
      return;
    }
    api
      .get('/coaches/training-requests')
      .then((r) => {
        const row = (r.data.data || []).find(
          (req) => req.status === 'accepted' && String(req.player?._id || req.player) === String(player),
        );
        setEvalReady(Boolean(row?.latestPerformance?.hasSkillEvaluation));
      })
      .catch(() => setEvalReady(null));
  }, [player]);

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

  const runAutoDraft = async ({ playerId, weekDate, publish, replaceExisting = true }) => {
    const { data } = await api.post('/coaches/training-plans/auto-draft', {
      playerId,
      weekStartDate: weekStartIso(weekDate),
      publishNow: publish,
      replaceExisting,
    });
    return data;
  };

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
      const data = await runAutoDraft({
        playerId: player,
        weekDate: weekStart,
        publish: publishNow,
        replaceExisting: true,
      });
      setOk(
        data.message ||
          (data.published
            ? `Personalized plan live for ${name}.`
            : `Evaluation-based draft ready for ${name}. Review the card below, then publish.`)
      );
      loadPlans();
    } catch (er) {
      setErr(getErrorMessage(er));
    } finally {
      setAutoGenerating(false);
    }
  };

  const regeneratePlan = async (plan) => {
    const playerId = String(plan.player?._id || plan.player);
    const weekDate = new Date(plan.weekStartDate).toISOString().slice(0, 10);
    setBusyPlanId(plan._id);
    setErr('');
    setOk('');
    try {
      const data = await runAutoDraft({
        playerId,
        weekDate,
        publish: false,
        replaceExisting: true,
      });
      setOk(data.message || 'Plan regenerated from latest evaluation.');
      loadPlans();
    } catch (er) {
      setErr(getErrorMessage(er));
    } finally {
      setBusyPlanId(null);
    }
  };

  const deleteDraft = async (id) => {
    if (!window.confirm('Delete this draft?')) return;
    setBusyPlanId(id);
    setErr('');
    try {
      await api.delete(`/coaches/training-plans/${id}`);
      setOk('Draft deleted.');
      loadPlans();
    } catch (er) {
      setErr(getErrorMessage(er));
    } finally {
      setBusyPlanId(null);
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
        weekStartDate: weekStartIso(weekStart),
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
    setBusyPlanId(id);
    setErr('');
    try {
      await api.put(`/coaches/training-plans/${id}`, { status: 'published', coachReviewed: true });
      setOk('Plan published — player gets skill feedback notification.');
      loadPlans();
    } catch (er) {
      setErr(getErrorMessage(er));
    } finally {
      setBusyPlanId(null);
    }
  };

  const savePlan = async (id, patch) => {
    setBusyPlanId(id);
    setErr('');
    try {
      await api.put(`/coaches/training-plans/${id}`, { ...patch, coachReviewed: true });
      setOk('Plan updated.');
      loadPlans();
    } catch (er) {
      setErr(getErrorMessage(er));
      throw er;
    } finally {
      setBusyPlanId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-5xl tracking-[0.08em] text-white">TRAINING ARSENALS</h1>
        <p className="font-headline text-xs uppercase tracking-[0.3em] text-slate-500">
          Evaluation-driven weekly plans
        </p>
        {err ? <p className="mt-2 text-sm text-red-400">{err}</p> : null}
        {ok ? <p className="mt-2 text-sm text-[#9bffce]">{ok}</p> : null}
      </div>

      <div className="midnight-asymmetric max-w-xl space-y-3 border border-[#ff7524]/30 bg-player-container p-5 shadow-player-card">
        <p className="font-display text-2xl tracking-[0.12em] text-white">GENERATE FROM EVALUATION</p>
        <p className="text-sm text-slate-400">
          System reads sub-technique scores (cover drive, passing, etc.), picks weak areas, and builds goals + a
          day-by-day program. Regenerating replaces any existing draft for that week.
        </p>
        {player && evalReady === false ? (
          <p className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            No skill evaluation yet.{' '}
            <Link to="/coach/performance" className="text-[#ff7524] hover:underline">
              Complete evaluation first
            </Link>
          </p>
        ) : null}
        {player && evalReady ? (
          <p className="rounded border border-player-green/30 bg-player-green/10 px-3 py-2 text-xs text-player-green">
            Ready — weak skills will drive the weekly plan and player message.
          </p>
        ) : null}
        <div>
          <label className={coachLabel}>Student</label>
          {students.length ? (
            <CoachStudentPicker students={students} value={player} onChange={setPlayer} />
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              No active students yet.{' '}
              <Link to="/coach/requests" className="text-[#ff7524] hover:underline">
                Accept a request
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
          Publish immediately after generate (skip draft review)
        </label>
        <button
          type="button"
          disabled={!students.length || !player || autoGenerating || evalReady === false}
          onClick={generateAutoDraft}
          className={`${coachBtnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {autoGenerating ? 'Analyzing & building…' : publishNow ? 'Generate & publish' : 'Generate draft'}
        </button>
      </div>

      <form
        onSubmit={create}
        className="midnight-asymmetric max-w-xl space-y-3 border border-player-inner/40 bg-player-container p-5 shadow-player-card"
      >
        <p className="font-display text-2xl tracking-[0.12em] text-white">MANUAL PLAN</p>
        <p className="text-sm text-slate-500">Optional — bypasses evaluation engine.</p>
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
          Save manual plan
        </button>
      </form>

      <ul className="grid gap-6 lg:grid-cols-2">
        {list.map((p) => (
          <CoachPlanCard
            key={p._id}
            plan={p}
            studentName={planStudentName(p, studentNameById)}
            onPublish={publish}
            onRegenerate={regeneratePlan}
            onDelete={deleteDraft}
            onSave={savePlan}
            busyId={busyPlanId}
          />
        ))}
      </ul>
      {!list.length ? (
        <p className="text-sm text-slate-500">No plans yet. Complete an evaluation, then generate above.</p>
      ) : null}
    </div>
  );
}

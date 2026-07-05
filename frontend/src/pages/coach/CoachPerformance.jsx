import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { coachLabel } from '../../components/coach/coachClassNames';
import CoachStudentPicker from '../../components/coach/CoachStudentPicker';
import { api, getErrorMessage } from '../../services/api';
import {
  defaultScoresFromRubric,
  playerCategoryLabel,
  scoresToPayload,
  sportLabel,
} from '../../utils/evaluationDisplay';
import { studentsFromAcceptedRequests } from '../../utils/coachStudents';

const fieldClass =
  'w-full border-b-2 border-player-inner bg-player-bg px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]';

function CategorySection({ category, skills, scores, onScoreChange, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const categoryAvg = useMemo(() => {
    const vals = skills.map((skill) => scores[`${category.name}::${skill}`]).filter((v) => v != null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + Number(b), 0) / vals.length);
  }, [category.name, skills, scores]);

  return (
    <section className="border border-player-inner/50 bg-player-bg/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-player-inner/30"
      >
        <span className="font-headline text-xs font-bold uppercase tracking-[0.18em] text-[#ff7524]">
          {category.name}
        </span>
        <span className="flex items-center gap-3">
          {categoryAvg != null ? (
            <span className="font-orbitron text-xs text-slate-400">{categoryAvg}% avg</span>
          ) : null}
          <span className="material-symbols-outlined text-lg text-slate-500">{open ? 'expand_less' : 'expand_more'}</span>
        </span>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-player-inner/40 px-4 py-4">
          {skills.map((skill) => {
            const key = `${category.name}::${skill}`;
            const value = scores[key] ?? 70;
            return (
              <div key={key}>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs uppercase tracking-[0.14em] text-slate-400">{skill}</label>
                  <span className="font-orbitron text-xs text-[#ff7524]">{value}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(e) => onScoreChange(key, +e.target.value)}
                  className="mt-1 w-full accent-[#ff7524]"
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export default function CoachPerformance() {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [playerId, setPlayerId] = useState('');
  const [week, setWeek] = useState('');
  const [rubric, setRubric] = useState(null);
  const [loadingRubric, setLoadingRubric] = useState(false);
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedStudent = useMemo(
    () => students.find((s) => s.playerId === playerId) || null,
    [students, playerId],
  );

  useEffect(() => {
    setLoadingStudents(true);
    api
      .get('/coaches/training-requests')
      .then((r) => {
        const accepted = studentsFromAcceptedRequests(r.data.data || []);
        setStudents(accepted);
        setPlayerId((prev) => (prev && accepted.some((s) => s.playerId === prev) ? prev : accepted[0]?.playerId || ''));
      })
      .catch((e) => setErr(getErrorMessage(e)))
      .finally(() => setLoadingStudents(false));
  }, []);

  const loadRubric = useCallback(async (sport, playerCategory) => {
    const slug = sport || 'cricket';
    setLoadingRubric(true);
    setErr('');
    try {
      const params = { sport: slug };
      if (slug === 'cricket' && playerCategory) params.playerCategory = playerCategory;
      const { data } = await api.get('/coaches/evaluation-rubric', { params });
      const rub = data.data;
      setRubric(rub);
      setScores(defaultScoresFromRubric(rub, 70));
    } catch (e) {
      setErr(getErrorMessage(e));
      setRubric(null);
      setScores({});
    } finally {
      setLoadingRubric(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedStudent) {
      setRubric(null);
      setScores({});
      return;
    }
    loadRubric(selectedStudent.sportPreference || 'cricket', selectedStudent.playerCategory);
  }, [selectedStudent, loadRubric]);

  const cricketMissingCategory =
    selectedStudent?.sportPreference === 'cricket' && !selectedStudent?.playerCategory;

  const previewOverall = useMemo(() => {
    const payload = scoresToPayload(scores);
    if (!payload.length) return null;
    return Math.round(payload.reduce((a, r) => a + r.score, 0) / payload.length);
  }, [scores]);

  const handleScoreChange = (key, value) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!playerId) {
      setErr('Select a student first.');
      return;
    }
    if (!week) {
      setErr('Pick the week starting date.');
      return;
    }
    const skillScores = scoresToPayload(scores);
    if (!skillScores.length) {
      setErr('No skill scores to submit.');
      return;
    }
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      await api.post('/coaches/performance', {
        playerId,
        weekStartDate: new Date(week).toISOString(),
        skillScores,
        comments: comments.trim() || undefined,
      });
      setMsg('Evaluation saved with sport-specific skill breakdown.');
      setComments('');
    } catch (er) {
      setErr(getErrorMessage(er));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-5xl tracking-[0.08em] text-white">PERFORMANCE EVALUATION</h1>
        <p className="font-headline text-xs uppercase tracking-[0.28em] text-[#ff7524]">
          Sport-specific techniques · deep sub-skills
        </p>
      </div>
      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {msg ? <p className="text-sm text-[#9bffce]">{msg}</p> : null}

      <form onSubmit={submit} className="midnight-asymmetric max-w-4xl space-y-5 bg-player-container p-6 shadow-player-card">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={coachLabel}>Student</label>
            <CoachStudentPicker
              id="eval-student"
              students={students}
              value={playerId}
              onChange={setPlayerId}
              loading={loadingStudents}
              emptyContent={
                <p className="text-sm text-slate-400">
                  No accepted students yet.{' '}
                  <Link to="/coach/requests" className="text-[#ff7524] hover:underline">
                    Accept a training request
                  </Link>{' '}
                  first.
                </p>
              }
            />
          </div>
          <div>
            <label className={coachLabel}>Week starting</label>
            <input
              type="date"
              className={`${fieldClass} mt-1`}
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col justify-end">
            {selectedStudent ? (
              <p className="rounded border border-[#ff7524]/30 bg-[#ff7524]/5 px-3 py-2 text-xs text-slate-300">
                Evaluating:{' '}
                <span className="font-semibold text-white">{selectedStudent.fullName}</span>
                {selectedStudent.coachRollNo ? (
                  <span className="ml-2 font-orbitron text-[#ff7524]">#{selectedStudent.coachRollNo}</span>
                ) : (
                  <span className="ml-2 text-amber-300">(no roll no yet)</span>
                )}
                {' · '}
                Rubric:{' '}
                <span className="font-headline uppercase tracking-wider text-[#ff7524]">
                  {sportLabel(selectedStudent.sportPreference)}
                </span>
                {selectedStudent.sportPreference === 'cricket' && selectedStudent.playerCategory ? (
                  <span className="ml-2 text-slate-400">
                    · {playerCategoryLabel(selectedStudent.playerCategory)}
                  </span>
                ) : null}
                {previewOverall != null ? (
                  <span className="ml-2 text-slate-400">· Preview overall {previewOverall}%</span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>

        {cricketMissingCategory ? (
          <p className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            This cricket player has not set a playing category yet. Ask them to update Profile (batsman, bowler, or
            all-rounder) so evaluations match their role.
          </p>
        ) : null}

        {loadingRubric ? (
          <p className="font-headline text-xs uppercase tracking-[0.2em] text-slate-500">Loading skill rubric…</p>
        ) : rubric?.categories?.length ? (
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Score each sub-technique (0–100). Categories collapse for faster navigation.
            </p>
            {rubric.categories.map((category, idx) => (
              <CategorySection
                key={category.name}
                category={category}
                skills={category.skills}
                scores={scores}
                onScoreChange={handleScoreChange}
                defaultOpen={idx < 2}
              />
            ))}
          </div>
        ) : selectedStudent ? (
          <p className="text-sm text-slate-400">Could not load evaluation rubric for this sport.</p>
        ) : null}

        <textarea
          className="h-28 w-full border-b-2 border-player-inner bg-player-bg px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]"
          placeholder="Coach comments (optional)"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
        <button
          type="submit"
          disabled={!students.length || !playerId || saving || loadingRubric || cricketMissingCategory}
          className="bg-[#ff7524] px-8 py-3 font-display text-2xl tracking-[0.14em] text-black disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Submit evaluation'}
        </button>
      </form>
    </div>
  );
}

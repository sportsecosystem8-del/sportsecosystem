import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { coachLabel, coachSelect } from '../../components/coach/coachClassNames';
import { api, getErrorMessage } from '../../services/api';
import { studentsFromAcceptedRequests } from '../../utils/coachStudents';

const fieldClass =
  'w-full border-b-2 border-player-inner bg-player-bg px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]';

export default function CoachPerformance() {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [playerId, setPlayerId] = useState('');
  const [week, setWeek] = useState('');
  const [technique, setTechnique] = useState(70);
  const [fitness, setFitness] = useState(70);
  const [attitude, setAttitude] = useState(70);
  const [comments, setComments] = useState('');
  const [err, setErr] = useState('');

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

  const submit = async (e) => {
    e.preventDefault();
    if (!playerId) {
      setErr('Select a student first.');
      return;
    }
    setErr('');
    try {
      await api.post('/coaches/performance', {
        playerId,
        weekStartDate: new Date(week).toISOString(),
        technique,
        fitness,
        attitude,
        comments,
      });
      alert('Evaluation saved');
    } catch (er) {
      setErr(getErrorMessage(er));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-5xl tracking-[0.08em] text-white">PERFORMANCE EVALUATION</h1>
        <p className="font-headline text-xs uppercase tracking-[0.28em] text-[#ff7524]">Data-driven assessment</p>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <form onSubmit={submit} className="midnight-asymmetric max-w-3xl space-y-4 bg-player-container p-6 shadow-player-card">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className={coachLabel}>Student</label>
            {loadingStudents ? (
              <p className="mt-2 text-xs text-slate-500">Loading students…</p>
            ) : students.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">
                No accepted students yet.{' '}
                <Link to="/coach/requests" className="text-[#ff7524] hover:underline">
                  Accept a training request
                </Link>{' '}
                first.
              </p>
            ) : (
              <select
                className={`${coachSelect} mt-1`}
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                required
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.playerId} value={s.playerId}>
                    {s.fullName}
                    {s.sportPreference ? ` — ${s.sportPreference}` : ''}
                  </option>
                ))}
              </select>
            )}
            {students.length > 0 && (
              <p className="mt-1 text-[10px] text-slate-500">
                Student needs at least one scheduled session (accept with a time on Requests).
              </p>
            )}
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
        </div>
        <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">Technique {technique}</label>
        <input type="range" min={0} max={100} value={technique} onChange={(e) => setTechnique(+e.target.value)} className="w-full accent-[#ff7524]" />
        <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">Fitness {fitness}</label>
        <input type="range" min={0} max={100} value={fitness} onChange={(e) => setFitness(+e.target.value)} className="w-full accent-[#ff7524]" />
        <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">Attitude {attitude}</label>
        <input type="range" min={0} max={100} value={attitude} onChange={(e) => setAttitude(+e.target.value)} className="w-full accent-[#ff7524]" />
        <textarea
          className="h-28 w-full border-b-2 border-player-inner bg-player-bg px-3 py-2 text-sm text-white outline-none focus:border-[#ff7524]"
          placeholder="Comments"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
        <button
          type="submit"
          disabled={!students.length || !playerId}
          className="bg-[#ff7524] px-8 py-3 font-display text-2xl tracking-[0.14em] text-black disabled:opacity-50"
        >
          SUBMIT EVALUATION
        </button>
      </form>
    </div>
  );
}

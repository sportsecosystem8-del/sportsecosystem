import { useCallback, useEffect, useState } from 'react';
import { coachField, coachLabel } from '../../components/coach/coachClassNames';
import CoachStudentPicker from '../../components/coach/CoachStudentPicker';
import { api, getErrorMessage } from '../../services/api';
import { studentsFromAcceptedRequests } from '../../utils/coachStudents';

/** Per-student monthly fee ledger */
export default function CoachPayments() {
  const [feeRows, setFeeRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [playerId, setPlayerId] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [feeBusy, setFeeBusy] = useState(false);

  const load = useCallback(() => {
    setErr('');
    Promise.all([api.get('/coaches/student-fees'), api.get('/coaches/training-requests')])
      .then(([feeRes, reqRes]) => {
        setFeeRows(feeRes.data.data || []);
        const accepted = studentsFromAcceptedRequests(reqRes.data.data || []);
        setStudents(accepted);
        setPlayerId((prev) => (prev && accepted.some((s) => s.playerId === prev) ? prev : accepted[0]?.playerId || ''));
      })
      .catch((e) => setErr(getErrorMessage(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveFee = async (e) => {
    e.preventDefault();
    if (!playerId) {
      setErr('Select a student.');
      return;
    }
    const fee = Number(monthlyFee);
    if (!Number.isFinite(fee) || fee < 0) {
      setErr('Enter a valid monthly fee.');
      return;
    }
    setFeeBusy(true);
    setErr('');
    setMsg('');
    try {
      await api.put('/coaches/student-fees', {
        playerId,
        joiningDate: joiningDate || undefined,
        monthlyFee: fee,
        notes: notes.trim() || undefined,
      });
      setMonthlyFee('');
      setNotes('');
      setJoiningDate('');
      setMsg('Student fee record saved.');
      load();
    } catch (er) {
      setErr(getErrorMessage(er));
    } finally {
      setFeeBusy(false);
    }
  };

  const removeFee = async (id) => {
    if (!window.confirm('Remove this fee record?')) return;
    try {
      await api.delete(`/coaches/student-fees/${id}`);
      load();
    } catch (er) {
      setErr(getErrorMessage(er));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-[0.08em] text-white sm:text-5xl">FEES RECORD</h1>
        <p className="font-headline text-xs uppercase tracking-[0.3em] text-slate-500">Student monthly fees</p>
      </div>

      {err ? <p className="text-sm text-red-400">{err}</p> : null}
      {msg ? <p className="text-sm text-[#9bffce]">{msg}</p> : null}

      <section className="midnight-asymmetric border border-[#ff7524]/25 bg-player-container p-6">
        <h2 className="font-headline text-lg uppercase tracking-[0.12em] text-white">Student fee records</h2>
        <p className="mt-1 text-xs text-slate-500">Track each student&apos;s name, joining date, and monthly fee.</p>
        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={saveFee}>
          <div className="sm:col-span-2">
            <label className={coachLabel}>Student</label>
            <CoachStudentPicker students={students} value={playerId} onChange={setPlayerId} />
          </div>
          <div>
            <label className={coachLabel} htmlFor="fee-join">
              Joining date
            </label>
            <input
              id="fee-join"
              type="date"
              className={coachField}
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
            />
          </div>
          <div>
            <label className={coachLabel} htmlFor="fee-amt">
              Monthly fee (PKR)
            </label>
            <input
              id="fee-amt"
              type="number"
              min="0"
              className={coachField}
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className={coachLabel} htmlFor="fee-notes">
              Notes (optional)
            </label>
            <input id="fee-notes" className={coachField} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button
            type="submit"
            disabled={feeBusy || !students.length}
            className="rounded-lg bg-[#ff7524] px-5 py-2 font-display text-lg tracking-[0.12em] text-black disabled:opacity-50 sm:col-span-2 sm:max-w-xs"
          >
            {feeBusy ? 'Saving…' : 'Save fee record'}
          </button>
        </form>

        <ul className="mt-6 space-y-2">
          {feeRows.length === 0 ? (
            <li className="text-sm text-slate-500">No student fee records yet.</li>
          ) : (
            feeRows.map((row) => (
              <li
                key={row._id}
                className="grid gap-2 rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm sm:grid-cols-[1.2fr_1fr_1fr_auto]"
              >
                <span className="font-semibold text-white">{row.studentName}</span>
                <span className="text-slate-400">
                  Joined {row.joiningDate ? new Date(row.joiningDate).toLocaleDateString() : '—'}
                </span>
                <span className="font-orbitron text-[#ff7524]">PKR {row.monthlyFee}/mo</span>
                <button type="button" onClick={() => removeFee(row._id)} className="text-xs text-red-300 hover:text-red-200">
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

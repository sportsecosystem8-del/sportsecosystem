import { useEffect, useMemo, useState } from 'react';
import PlayerCard from '../../components/player/PlayerCard';
import PlayerPageHeader from '../../components/player/PlayerPageHeader';
import { playerBtnOutlineSm, playerBtnSm, playerField, playerLabel } from '../../components/player/playerClassNames';
import DocumentPreviewModal from '../../components/DocumentPreviewModal';
import { useVerificationDocumentPreview } from '../../hooks/useVerificationDocumentPreview';
import { previewVerificationDocumentError } from '../../utils/verificationDocument';
import CoachAvatar from '../../components/CoachAvatar';
import CoachLocationLines from '../../components/player/CoachLocationLines';
import CoachProfileDetailModal from '../../components/player/CoachProfileDetailModal';
import ModalPortal from '../../components/shared/ModalPortal';
import { playerLocationOrigin } from '../../utils/coachLocation';
import { playerCoachesSubtitle, sportFilterBadge } from '../../utils/sportDisplay';
import { api, getErrorMessage } from '../../services/api';

export default function PlayerCoaches() {
  const [list, setList] = useState([]);
  const [trainingRequests, setTrainingRequests] = useState([]);
  const [requestingCoachId, setRequestingCoachId] = useState(null);
  const [requestNote, setRequestNote] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [err, setErr] = useState('');
  const [certPicker, setCertPicker] = useState(null);
  const [certLoadingId, setCertLoadingId] = useState(null);
  const [playerOrigin, setPlayerOrigin] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [detailCoach, setDetailCoach] = useState(null);
  const [playerSport, setPlayerSport] = useState('');
  const docPreview = useVerificationDocumentPreview();

  const openCertificate = async (coachId, doc) => {
    setErr('');
    docPreview.clearError();
    try {
      await docPreview.view(
        `/players/coaches/${coachId}/certificates/${doc._id}/file`,
        doc.originalName || 'certificate'
      );
    } catch (e) {
      setErr(e.message || previewVerificationDocumentError(e));
    }
  };

  const viewCertificate = async (row) => {
    const coachId = row.userId;
    const cached = row.certificates;
    setCertLoadingId(coachId);
    setErr('');
    try {
      let docs = cached;
      if (!Array.isArray(docs)) {
        const { data } = await api.get(`/players/coaches/${coachId}/certificates`);
        docs = data.data || [];
      }
      if (!docs.length) {
        setErr('No verified certificates are available for this coach yet.');
        return;
      }
      if (docs.length === 1) {
        await openCertificate(coachId, docs[0]);
        return;
      }
      setCertPicker({ coachId, docs });
    } catch (e) {
      setErr(previewVerificationDocumentError(e));
    } finally {
      setCertLoadingId(null);
    }
  };

  const requestByCoachId = useMemo(() => {
    const map = new Map();
    const priority = { accepted: 3, pending: 2, rejected: 1 };
    for (const tr of trainingRequests) {
      const id = String(tr.coach?._id || tr.coach || '');
      if (!id) continue;
      const prev = map.get(id);
      if (!prev || (priority[tr.status] ?? 0) > (priority[prev.status] ?? 0)) map.set(id, tr);
    }
    return map;
  }, [trainingRequests]);

  function coachRequestAction(coachId) {
    const tr = requestByCoachId.get(String(coachId));
    if (!tr) return { label: 'Request training', disabled: false, hint: null };
    if (tr.status === 'pending') {
      return { label: 'Request pending', disabled: true, hint: 'Waiting for coach to accept.' };
    }
    if (tr.status === 'accepted') {
      if (tr.feesClearedAt || tr.feesCleared) {
        return { label: 'Training active', disabled: true, hint: 'This coach will train you.' };
      }
      return {
        label: 'Accepted — fees pending',
        disabled: true,
        hint: 'Coach accepted. Training starts after fees are cleared.',
      };
    }
    if (tr.status === 'rejected') {
      return { label: 'Request again', disabled: false, hint: 'Previous request was declined.' };
    }
    return { label: 'Request training', disabled: false, hint: null };
  }

  const filteredList = useMemo(() => {
    const cap = maxBudget !== '' ? Number(maxBudget) : null;
    if (!Number.isFinite(cap) || cap < 0) return list;
    return list.filter((row) => {
      const fee = row.profile?.monthlyTrainingFee;
      if (fee == null || fee === 0) return true;
      return fee <= cap;
    });
  }, [list, maxBudget]);

  const loadTrainingRequests = async () => {
    const { data } = await api.get('/players/training-requests');
    setTrainingRequests(data.data || []);
  };

  const load = async () => {
    setErr('');
    setInfoMsg('');
    try {
      const [rec, tr, profileRes] = await Promise.all([
        api.get('/players/recommendations', { params: { limit: 5 } }),
        api.get('/players/training-requests'),
        api.get('/players/me/profile').catch(() => ({ data: { data: null } })),
      ]);
      const rows = rec.data.data || [];
      setList(rows);
      setTrainingRequests(tr.data.data || []);
      setPlayerOrigin(playerLocationOrigin(profileRes.data?.data));
      setPlayerSport(profileRes.data?.data?.sportPreference || '');
      if (!rows.length && rec.data.message) {
        setInfoMsg(rec.data.message);
      }
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const requestTraining = async (id) => {
    const action = coachRequestAction(id);
    if (action.disabled) return;
    setErr('');
    setStatusMsg('');
    setRequestingCoachId(id);
    try {
      await api.post('/players/training-requests', {
        coachId: id,
        message: requestNote || 'I would like to train with you.',
      });
      await loadTrainingRequests();
      setStatusMsg('Request sent. The coach will review it soon.');
    } catch (e) {
      await loadTrainingRequests().catch(() => {});
      setErr(getErrorMessage(e));
    } finally {
      setRequestingCoachId(null);
    }
  };

  return (
    <div>
      <PlayerPageHeader
        title="Coach match"
        subtitle={playerCoachesSubtitle(playerSport)}
      />
      {sportFilterBadge(playerSport) ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-player-green">
          {sportFilterBadge(playerSport)}
        </p>
      ) : null}
      {err ? <p className="mb-4 text-sm text-red-400">{err}</p> : null}
      {infoMsg ? <p className="mb-4 text-sm text-player-on-variant">{infoMsg}</p> : null}
      {statusMsg ? <p className="mb-4 text-sm text-player-green">{statusMsg}</p> : null}
      <PlayerCard className="mb-6 max-w-xl">
        <label className={playerLabel} htmlFor="max-budget">
          Max monthly budget (PKR)
        </label>
        <input
          id="max-budget"
          type="number"
          min="0"
          className={`${playerField} mt-2`}
          placeholder="e.g. 5000 — leave empty to show all"
          value={maxBudget}
          onChange={(e) => setMaxBudget(e.target.value)}
        />
      </PlayerCard>
      <PlayerCard className="mb-6 max-w-xl">
        <label className={playerLabel}>Optional message (all requests)</label>
        <input
          className={`${playerField} mt-2`}
          placeholder="I would like to train with you."
          value={requestNote}
          onChange={(e) => setRequestNote(e.target.value)}
        />
      </PlayerCard>
      <ul className="space-y-4">
        {filteredList.map((row) => (
          <PlayerCard key={row.userId} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setDetailCoach(row)}
              className="flex flex-1 gap-4 text-left transition hover:opacity-90"
            >
              <CoachAvatar profile={row.profile} size="lg" />
              <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-player-green/40 bg-player-green/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-player-green">
                  #{row.rank || '—'}
                </span>
                <p className="text-lg font-bold text-white underline-offset-2 hover:underline">{row.profile?.fullName}</p>
              </div>
              {row.profile?.academyName ? (
                <p className="mt-0.5 text-sm font-medium text-player-green">{row.profile.academyName}</p>
              ) : null}
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-player-green">Tap for full profile & reviews</p>
              <p className="mt-1 text-sm text-player-on-variant">{row.profile?.specialties?.join(', ') || '—'}</p>
              {row.profile?.averageRating > 0 ? (
                <p className="mt-1 text-xs text-amber-200">
                  ★ {row.profile.averageRating.toFixed(1)} ({row.profile.ratingCount || 0} reviews)
                </p>
              ) : null}
              {row.profile?.monthlyTrainingFee > 0 ? (
                <p className="mt-1 text-sm font-semibold text-player-green">
                  PKR {row.profile.monthlyTrainingFee}/month
                </p>
              ) : null}
              {row.distanceKm != null ? (
                <p className="mt-1 text-xs text-slate-300">
                  {row.distanceKm < 10
                    ? `${Number(row.distanceKm).toFixed(1)} km away`
                    : `${Math.round(row.distanceKm)} km away`}
                </p>
              ) : null}
              <CoachLocationLines profile={row.profile} playerOrigin={playerOrigin} className="mt-2" />
              </div>
            </button>
            <div className="flex w-full flex-col gap-2 border-t border-white/10 pt-4 sm:w-56 sm:border-0 sm:pt-0">
              <button
                type="button"
                onClick={() => setDetailCoach(row)}
                className={playerBtnOutlineSm}
              >
                View profile
              </button>
              {(() => {
                const action = coachRequestAction(row.userId);
                return (
                  <>
                    <button
                      type="button"
                      disabled={action.disabled || requestingCoachId === row.userId}
                      onClick={() => requestTraining(row.userId)}
                      className={`${playerBtnSm} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {requestingCoachId === row.userId ? 'Sending…' : action.label}
                    </button>
                    {action.hint ? (
                      <p className="text-[10px] leading-snug text-player-on-variant/80">{action.hint}</p>
                    ) : null}
                  </>
                );
              })()}
              <button
                type="button"
                disabled={certLoadingId === row.userId}
                onClick={() => viewCertificate(row)}
                className={playerBtnOutlineSm}
              >
                {certLoadingId === row.userId ? 'Loading…' : 'View certificate'}
              </button>
            </div>
          </PlayerCard>
        ))}
        {!list.length && !err && !infoMsg ? (
          <p className="text-sm text-player-on-variant">No coaches yet — complete your profile or wait for verifications.</p>
        ) : null}
      </ul>

      <DocumentPreviewModal
        open={Boolean(docPreview.preview)}
        title="Certificate preview"
        fileName={docPreview.preview?.originalName}
        blobUrl={docPreview.preview?.blobUrl}
        mimeType={docPreview.preview?.mimeType}
        onClose={docPreview.close}
        onDownload={docPreview.download}
      />

      <ModalPortal open={Boolean(certPicker)}>
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 pt-[env(safe-area-inset-top)] sm:items-center sm:p-4 sm:pt-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cert-picker-title"
          onClick={() => setCertPicker(null)}
        >
          <div
            className="max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))] w-full overflow-hidden rounded-t-2xl border border-white/10 bg-player-container p-4 shadow-xl sm:max-h-[85dvh] sm:max-w-md sm:rounded-xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="cert-picker-title" className="font-headline text-xs font-bold uppercase tracking-wider text-player-green">
              Verified certificates
            </p>
            <p className="mt-1 text-sm text-player-on-variant">Select a document to open.</p>
            <ul className="mt-4 max-h-[50dvh] space-y-2 overflow-y-auto sm:max-h-64">
              {certPicker?.docs.map((doc) => (
                <li key={doc._id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-left text-sm text-white hover:border-player-green/40"
                    onClick={async () => {
                      const { coachId } = certPicker;
                      setCertPicker(null);
                      await openCertificate(coachId, doc);
                    }}
                  >
                    <span className="font-medium">{doc.originalName || 'Certificate'}</span>
                    {doc.docType ? (
                      <span className="mt-0.5 block text-xs text-player-on-variant">{doc.docType}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className={`${playerBtnOutlineSm} mt-4 w-full`} onClick={() => setCertPicker(null)}>
              Close
            </button>
          </div>
        </div>
      </ModalPortal>

      <CoachProfileDetailModal
        open={Boolean(detailCoach)}
        coachId={detailCoach?.userId}
        coachRow={detailCoach}
        playerOrigin={playerOrigin}
        onClose={() => setDetailCoach(null)}
        onRequestTraining={requestTraining}
        onViewCertificate={viewCertificate}
        requestAction={detailCoach ? coachRequestAction(detailCoach.userId) : null}
        requesting={requestingCoachId === detailCoach?.userId}
      />
    </div>
  );
}

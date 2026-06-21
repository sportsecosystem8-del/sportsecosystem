import { useEffect, useState } from 'react';
import AdminCard from '../../components/admin/AdminCard';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminVerificationDocumentList from '../../components/admin/AdminVerificationDocumentList';
import { adminBtnCompactGhost, adminBtnCompactPrimary } from '../../components/admin/adminClassNames';
import CoachAvatar from '../../components/CoachAvatar';
import { api, getErrorMessage } from '../../services/api';

export default function AdminVerifyCoaches() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [banner, setBanner] = useState('');
  const load = () =>
    api
      .get('/admin/verification/coaches')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));
  useEffect(() => {
    load();
  }, []);

  const act = async (userId, action) => {
    setErr('');
    setBanner('');
    let reason = '';
    if (action === 'approve') {
      reason = '';
    } else {
      const entered = window.prompt('Reason / notes (optional)');
      if (entered === null) return;
      reason = entered || '';
    }
    try {
      await api.patch(`/admin/verification/coaches/${userId}`, { action, reason });
      if (action === 'approve') setBanner('Admin Approved');
      else if (action === 'reject') setBanner('Rejection recorded. Coach was notified in-app.');
      else setBanner('Request recorded. Coach was notified in-app.');
      load();
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Coach verification"
        subtitle="Review uploaded documents, then approve or reject the coach application."
      />
      {banner ? (
        <AdminCard accent="cyan" className="mb-6 p-4">
          <p className="text-sm font-medium text-white">{banner}</p>
        </AdminCard>
      ) : null}
      {err ? (
        <AdminCard accent="orange" className="mb-6 p-4">
          <p className="text-sm text-admin-orange">{err}</p>
        </AdminCard>
      ) : null}
      <ul className="space-y-4">
        {list.map((u) => (
          <AdminCard key={u._id} accent="cyan" className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <CoachAvatar profile={u.coachProfile} size="md" />
                <div>
                  <p className="text-base font-bold text-white">{u.coachProfile?.fullName || '—'}</p>
                  <p className="mt-1 font-label text-sm text-slate-400">{u.email}</p>
                  {u.coachProfile?.phone ? (
                    <p className="mt-1 font-label text-xs text-slate-400">Phone: {u.coachProfile.phone}</p>
                  ) : null}
                  {u.coachProfile?.academyLocation || u.coachProfile?.city ? (
                    <p className="mt-1 font-label text-xs text-slate-400">
                      Location:{' '}
                      {[u.coachProfile?.academyLocation, u.coachProfile?.city].filter(Boolean).join(', ')}
                    </p>
                  ) : null}
                  {u.coachProfile?.specialties?.length ? (
                    <p className="mt-1 font-label text-xs text-slate-400">
                      Specialties: {u.coachProfile.specialties.join(', ')}
                    </p>
                  ) : null}
                  {u.coachProfile?.yearsExperience != null ? (
                    <p className="mt-1 font-label text-xs text-slate-400">
                      Experience: {u.coachProfile.yearsExperience} year
                      {u.coachProfile.yearsExperience === 1 ? '' : 's'}
                    </p>
                  ) : null}
                  <p className="mt-1 font-label text-xs text-slate-400">
                    Map:{' '}
                    {u.coachProfile?.locationMapUrl ? (
                      <a
                        href={u.coachProfile.locationMapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-admin-cyan underline-offset-2 hover:underline"
                      >
                        Open location
                      </a>
                    ) : (
                      '—'
                    )}
                  </p>
                  <p className="mt-2 font-label text-xs text-slate-500">Status: {u.verificationStatus}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={adminBtnCompactPrimary} onClick={() => act(u._id, 'approve')}>
                  Approve coach
                </button>
                <button type="button" className={adminBtnCompactGhost} onClick={() => act(u._id, 'reject')}>
                  Reject coach
                </button>
                <button type="button" className={adminBtnCompactGhost} onClick={() => act(u._id, 'more_info')}>
                  Request docs
                </button>
              </div>
            </div>
            <AdminVerificationDocumentList documents={u.verificationDocuments} onChanged={load} />
          </AdminCard>
        ))}
        {!list.length && !err ? (
          <AdminCard accent="none" className="border border-dashed border-white/10 p-10 text-center font-label text-sm text-slate-500">
            Queue empty.
          </AdminCard>
        ) : null}
      </ul>
    </div>
  );
}

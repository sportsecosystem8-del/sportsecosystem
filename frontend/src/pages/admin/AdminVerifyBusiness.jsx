import { useEffect, useState } from 'react';
import AdminCard from '../../components/admin/AdminCard';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminVerificationDocumentList from '../../components/admin/AdminVerificationDocumentList';
import { adminBtnCompactGhost, adminBtnCompactPrimary } from '../../components/admin/adminClassNames';
import { api, getErrorMessage } from '../../services/api';
import { publicAssetUrl } from '../../utils/assetUrl';

function BusinessFullProfile({ profile }) {
  if (!profile) return null;
  const shopPhotos = Array.isArray(profile.shopImageUrls) ? profile.shopImageUrls : [];
  return (
    <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
      <p className="font-headline text-xs font-bold uppercase tracking-wider text-admin-orange">Full business profile</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {profile.storeName ? (
          <p className="font-label text-xs text-slate-300">
            <span className="text-slate-500">Store name: </span>
            {profile.storeName}
          </p>
        ) : null}
        {profile.phone ? (
          <p className="font-label text-xs text-slate-300">
            <span className="text-slate-500">Phone: </span>
            {profile.phone}
          </p>
        ) : null}
        {profile.storeDescription ? (
          <p className="font-label text-xs text-slate-300 sm:col-span-2">
            <span className="text-slate-500">Description: </span>
            {profile.storeDescription}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-4">
        {profile.storeLogoUrl ? (
          <div>
            <p className="mb-1 font-label text-xs text-slate-500">Logo</p>
            <img
              src={publicAssetUrl(profile.storeLogoUrl)}
              alt="Store logo"
              className="h-20 w-20 rounded-lg border border-white/10 object-cover"
            />
          </div>
        ) : null}
        {profile.storeBannerUrl ? (
          <div className="min-w-[200px] flex-1">
            <p className="mb-1 font-label text-xs text-slate-500">Banner</p>
            <img
              src={publicAssetUrl(profile.storeBannerUrl)}
              alt="Store banner"
              className="h-24 w-full max-w-md rounded-lg border border-white/10 object-cover"
            />
          </div>
        ) : null}
      </div>
      {shopPhotos.length ? (
        <div>
          <p className="mb-2 font-label text-xs text-slate-500">Shop photos</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {shopPhotos.map((url) => (
              <a key={url} href={publicAssetUrl(url)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-white/10">
                <img src={publicAssetUrl(url)} alt="Shop" className="h-28 w-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      ) : (
        <p className="font-label text-xs text-slate-500">No shop gallery photos uploaded.</p>
      )}
    </div>
  );
}

export default function AdminVerifyBusiness() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [banner, setBanner] = useState('');
  const [expanded, setExpanded] = useState({});
  const load = () =>
    api
      .get('/admin/verification/business')
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
      await api.patch(`/admin/verification/business/${userId}`, { action, reason });
      if (action === 'approve') setBanner('Admin Approved');
      else if (action === 'reject') setBanner('Rejection recorded. Owner was notified in-app.');
      else setBanner('Request recorded. Owner was notified in-app.');
      load();
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Business verification"
        subtitle="Review full store profile, photos, and documents — then approve or reject."
      />
      {banner ? (
        <AdminCard accent="orange" className="mb-6 p-4">
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
          <AdminCard key={u._id} accent="orange" className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-base font-bold text-white">{u.businessProfile?.businessName || '—'}</p>
                {u.businessProfile?.storeName && u.businessProfile.storeName !== u.businessProfile.businessName ? (
                  <p className="mt-0.5 font-label text-sm text-admin-orange">{u.businessProfile.storeName}</p>
                ) : null}
                <p className="mt-1 font-label text-sm text-slate-400">{u.email}</p>
                {u.businessProfile?.address ? (
                  <p className="mt-1 font-label text-xs text-slate-400">Address: {u.businessProfile.address}</p>
                ) : null}
                <p className="mt-1 font-label text-xs text-slate-400">
                  Map:{' '}
                  {u.businessProfile?.locationMapUrl ? (
                    <a
                      href={u.businessProfile.locationMapUrl}
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
                <button
                  type="button"
                  className="mt-2 font-label text-xs font-semibold text-admin-orange underline-offset-2 hover:underline"
                  onClick={() => setExpanded((prev) => ({ ...prev, [u._id]: !prev[u._id] }))}
                >
                  {expanded[u._id] ? 'Hide full profile' : 'View full profile'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={adminBtnCompactPrimary} onClick={() => act(u._id, 'approve')}>
                  Approve business
                </button>
                <button type="button" className={adminBtnCompactGhost} onClick={() => act(u._id, 'reject')}>
                  Reject business
                </button>
                <button type="button" className={adminBtnCompactGhost} onClick={() => act(u._id, 'more_info')}>
                  Request docs
                </button>
              </div>
            </div>
            {expanded[u._id] ? <BusinessFullProfile profile={u.businessProfile} /> : null}
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

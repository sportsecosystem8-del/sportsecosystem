import DocumentPreviewModal from '../DocumentPreviewModal';
import { useVerificationDocumentPreview } from '../../hooks/useVerificationDocumentPreview';
import { adminBtnCompactGhost, adminBtnCompactPrimary } from './adminClassNames';
import { api, getErrorMessage } from '../../services/api';

function statusPill(status) {
  if (status === 'approved') return 'bg-emerald-500/15 text-emerald-400';
  if (status === 'rejected') return 'bg-admin-orange/15 text-admin-orange';
  return 'bg-admin-cyan/10 text-admin-cyan';
}

export default function AdminVerificationDocumentList({ documents, onChanged }) {
  const docPreview = useVerificationDocumentPreview();

  const preview = async (docId, originalName) => {
    try {
      await docPreview.view(`/admin/verification/documents/${docId}/file`, originalName);
    } catch (e) {
      alert(e.message || 'Could not open document.');
    }
  };

  const patchDoc = async (docId, status) => {
    let reason = '';
    if (status === 'rejected') {
      const entered = window.prompt('Rejection reason (optional)');
      if (entered === null) return;
      reason = entered || '';
    }
    try {
      await api.patch(`/admin/verification/documents/${docId}`, { status, reason });
      onChanged?.();
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  if (!documents?.length) {
    return (
      <p className="mt-4 border-t border-white/10 pt-4 font-label text-xs text-slate-500">
        No verification documents uploaded yet.
      </p>
    );
  }

  return (
    <>
      <DocumentPreviewModal
        open={Boolean(docPreview.preview)}
        title="Document preview"
        fileName={docPreview.preview?.originalName}
        blobUrl={docPreview.preview?.blobUrl}
        mimeType={docPreview.preview?.mimeType}
        onClose={docPreview.close}
        onDownload={docPreview.download}
      />
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="font-headline text-[11px] font-bold uppercase tracking-wider text-slate-400">Uploaded documents</p>
      <ul className="mt-3 space-y-3">
        {documents.map((d) => (
          <li
            key={d._id}
            className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">{d.originalName || 'File'}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 font-label text-[11px] text-slate-500">
                {d.docType ? <span>{d.docType}</span> : null}
                {d.docType ? <span>·</span> : null}
                <span className={`rounded-full px-2 py-0.5 font-bold uppercase ${statusPill(d.status)}`}>{d.status}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={adminBtnCompactGhost} onClick={() => preview(d._id, d.originalName)}>
                View
              </button>
              {d.status !== 'approved' ? (
                <button type="button" className={adminBtnCompactPrimary} onClick={() => patchDoc(d._id, 'approved')}>
                  Approve doc
                </button>
              ) : null}
              {d.status !== 'rejected' ? (
                <button type="button" className={adminBtnCompactGhost} onClick={() => patchDoc(d._id, 'rejected')}>
                  Reject doc
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
    </>
  );
}

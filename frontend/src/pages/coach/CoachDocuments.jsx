import { useEffect, useState } from 'react';
import DocumentPreviewModal from '../../components/DocumentPreviewModal';
import { useVerificationDocumentPreview } from '../../hooks/useVerificationDocumentPreview';
import { api, getErrorMessage } from '../../services/api';

export default function CoachDocuments() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const docPreview = useVerificationDocumentPreview();

  const load = () =>
    api
      .get('/coaches/documents')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));

  useEffect(() => {
    load();
    const onVis = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const upload = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post('/coaches/documents', fd);
      e.target.reset();
      load();
    } catch (er) {
      alert(getErrorMessage(er));
    }
  };

  const preview = async (docId, originalName) => {
    try {
      await docPreview.view(`/coaches/documents/${docId}/file`, originalName);
    } catch (e) {
      alert(e.message || 'Could not open document.');
    }
  };

  return (
    <div>
      <DocumentPreviewModal
        open={Boolean(docPreview.preview)}
        title="Document preview"
        fileName={docPreview.preview?.originalName}
        blobUrl={docPreview.preview?.blobUrl}
        mimeType={docPreview.preview?.mimeType}
        onClose={docPreview.close}
        onDownload={docPreview.download}
      />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-[0.08em] text-white">CERTIFICATIONS</h1>
          <p className="font-headline text-xs uppercase tracking-[0.3em] text-slate-500">Credentials and compliance registry</p>
        </div>
      </div>
      {err && <p className="text-sm text-red-400 mt-2">{err}</p>}
      <form onSubmit={upload} className="midnight-asymmetric mt-4 max-w-2xl space-y-3 border border-player-inner/40 bg-player-container p-6 shadow-player-card">
        <p className="font-display text-2xl tracking-[0.12em] text-white">UPLOAD NEW DOCUMENT</p>
        <input type="file" name="file" required className="text-sm text-slate-300" />
        <input name="docType" placeholder="Document type" className="w-full border-b-2 border-player-inner bg-player-bg px-2 py-2 text-sm text-white outline-none focus:border-[#ff7524]" />
        <button type="submit" className="bg-[#ff7524] px-6 py-3 font-display text-xl tracking-[0.14em] text-black">
          SUBMIT FOR VERIFICATION
        </button>
      </form>
      <ul className="mt-8 grid gap-4 lg:grid-cols-2">
        {list.map((d) => (
          <li key={d._id} className="midnight-asymmetric flex flex-col gap-3 border border-player-inner/40 bg-player-container p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-headline text-sm uppercase tracking-[0.15em] text-white">{d.originalName}</p>
              <p className="mt-1 font-orbitron text-xs uppercase tracking-widest text-[#ff7524]">{d.status}</p>
            </div>
            <button
              type="button"
              onClick={() => preview(d._id, d.originalName)}
              className="shrink-0 border border-[#ff7524]/40 px-4 py-2 font-headline text-[10px] uppercase tracking-wider text-[#ff7524]"
            >
              View
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

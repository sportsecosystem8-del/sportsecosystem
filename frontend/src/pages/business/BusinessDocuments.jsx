import { useEffect, useState } from 'react';
import DocumentPreviewModal from '../../components/DocumentPreviewModal';
import { useVerificationDocumentPreview } from '../../hooks/useVerificationDocumentPreview';
import { api, getErrorMessage } from '../../services/api';

export default function BusinessDocuments() {
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const docPreview = useVerificationDocumentPreview();

  const load = () =>
    api
      .get('/business/documents')
      .then((r) => setList(r.data.data || []))
      .catch((e) => setErr(getErrorMessage(e)));

  useEffect(() => {
    load();
  }, []);

  const upload = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post('/business/documents', fd);
      e.target.reset();
      load();
    } catch (er) {
      alert(getErrorMessage(er));
    }
  };

  const preview = async (docId, originalName) => {
    try {
      await docPreview.view(`/business/documents/${docId}/file`, originalName);
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
      <h1 className="font-rajdhani text-5xl font-bold uppercase tracking-tight text-white">Business Profile Documents</h1>
      {err && <p className="text-sm text-red-400 mt-2">{err}</p>}
      <form onSubmit={upload} className="mt-6 max-w-2xl space-y-3 rounded-xl bg-[#11192c] p-5">
        <input type="file" name="file" required className="text-sm text-slate-300" />
        <input name="docType" placeholder="Document type" className="w-full rounded-lg border-none bg-black/40 px-3 py-2 text-sm text-white focus:ring-1 focus:ring-[#cc97ff]" />
        <button type="submit" className="rounded-lg bg-gradient-to-r from-[#cc97ff] to-[#9c48ea] px-4 py-2 text-sm font-bold uppercase tracking-wider text-[#360061]">
          Upload
        </button>
      </form>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {list.map((d) => (
          <li key={d._id} className="flex flex-col gap-2 rounded-xl bg-[#11192c] p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-white">{d.originalName}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-[#9bffce]">{d.status}</p>
            </div>
            <button
              type="button"
              onClick={() => preview(d._id, d.originalName)}
              className="shrink-0 rounded-lg border border-[#cc97ff]/40 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#cc97ff]"
            >
              View
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

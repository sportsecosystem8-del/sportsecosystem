import { useEffect } from 'react';

export default function DocumentPreviewModal({
  open,
  title = 'Document preview',
  fileName,
  blobUrl,
  mimeType,
  onClose,
  onDownload,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !blobUrl) return null;

  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType?.startsWith('image/');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-preview-title"
      onClick={onClose}
    >
      <div
        className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden border-white/10 bg-[#0b1324] shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:max-w-5xl sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-white/10 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pr-2">
              <p
                id="doc-preview-title"
                className="font-headline text-xs font-bold uppercase tracking-wider text-white sm:text-sm"
              >
                {title}
              </p>
              {fileName ? (
                <p className="mt-1 break-all text-[11px] text-slate-400 sm:truncate sm:text-xs" title={fileName}>
                  {fileName}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/15 sm:hidden"
              aria-label="Close preview"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:flex sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-[11px] font-headline font-semibold uppercase tracking-wider text-slate-200 transition hover:bg-white/10 sm:min-h-0 sm:py-2 sm:text-xs"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="hidden min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-headline font-semibold uppercase tracking-wider text-white transition hover:bg-white/15 sm:inline-flex"
            >
              <span className="material-symbols-outlined text-base">close</span>
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[#070e1d] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4">
          {isPdf ? (
            <iframe
              title={fileName || 'Document preview'}
              src={blobUrl}
              className="h-full min-h-[calc(100dvh-11rem)] w-full rounded-lg border border-white/10 bg-white sm:min-h-[min(75dvh,720px)]"
            />
          ) : null}
          {isImage ? (
            <div className="flex min-h-[calc(100dvh-11rem)] items-center justify-center sm:min-h-[50dvh]">
              <img
                src={blobUrl}
                alt={fileName || 'Document preview'}
                className="max-h-[calc(100dvh-12rem)] w-full max-w-full rounded-lg object-contain shadow-lg sm:max-h-[75dvh] sm:w-auto"
              />
            </div>
          ) : null}
          {!isPdf && !isImage ? (
            <div className="flex min-h-[calc(100dvh-11rem)] flex-col items-center justify-center gap-4 px-4 text-center sm:min-h-[40dvh]">
              <span className="material-symbols-outlined text-5xl text-slate-500">description</span>
              <p className="max-w-md text-sm text-slate-400">
                In-browser preview is not available for this file type. Use the download button if you want to save it.
              </p>
              <button
                type="button"
                onClick={onDownload}
                className="min-h-[44px] rounded-lg bg-gradient-to-r from-[#cc97ff] to-[#9c48ea] px-5 py-2.5 text-xs font-headline font-bold uppercase tracking-wider text-[#360061]"
              >
                Download file
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

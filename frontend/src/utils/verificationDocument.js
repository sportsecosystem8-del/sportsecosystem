import { api, getErrorMessage } from '../services/api';

function mimeFromName(name) {
  const ext = String(name || '')
    .split('.')
    .pop()
    ?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'application/octet-stream';
}

/** Fetch an authenticated verification document for in-app preview. */
export async function fetchVerificationDocument(fileUrl, originalName) {
  const res = await api.get(fileUrl, { responseType: 'blob' });
  const headerType = res.headers?.['content-type']?.split(';')[0]?.trim();
  const mimeType =
    headerType && headerType !== 'application/octet-stream' ? headerType : mimeFromName(originalName);
  const blob =
    res.data instanceof Blob && res.data.type === mimeType
      ? res.data
      : new Blob([res.data], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);
  return {
    blobUrl,
    mimeType,
    originalName: originalName || 'document',
    blob,
  };
}

export function downloadVerificationDocument({ blobUrl, originalName }) {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = originalName || 'document';
  a.rel = 'noopener';
  a.click();
}

export function revokeVerificationDocumentUrl(blobUrl) {
  if (blobUrl) URL.revokeObjectURL(blobUrl);
}

export function previewVerificationDocumentError(e) {
  return getErrorMessage(e);
}

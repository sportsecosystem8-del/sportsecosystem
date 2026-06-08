import { useCallback, useState } from 'react';
import {
  downloadVerificationDocument,
  fetchVerificationDocument,
  previewVerificationDocumentError,
  revokeVerificationDocumentUrl,
} from '../utils/verificationDocument';

export function useVerificationDocumentPreview() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const view = useCallback(async (fileUrl, originalName) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchVerificationDocument(fileUrl, originalName);
      setPreview((prev) => {
        if (prev?.blobUrl) revokeVerificationDocumentUrl(prev.blobUrl);
        return data;
      });
      return data;
    } catch (e) {
      const message = previewVerificationDocumentError(e);
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    setPreview((prev) => {
      if (prev?.blobUrl) revokeVerificationDocumentUrl(prev.blobUrl);
      return null;
    });
    setError('');
  }, []);

  const download = useCallback(() => {
    if (preview) downloadVerificationDocument(preview);
  }, [preview]);

  return { preview, loading, error, view, close, download, clearError: () => setError('') };
}

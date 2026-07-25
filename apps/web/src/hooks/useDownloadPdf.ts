import { useCallback, useState } from 'react';
import { apiClient } from '../api/client';
import { describeApiError, type ApiErrorPresentation } from '../api/errors';

interface UseDownloadPdfResult {
  download: (url: string, filename: string) => Promise<void>;
  downloading: boolean;
  error: ApiErrorPresentation | null;
}

// §15.10 (08_FRONTEND_STRUCTURE.md) — the letters' GET /:id/pdf (and, once
// B-05 lands, the payslip PDF) return a StreamableFile behind the same
// JwtAuthGuard as everything else, so it cannot be a plain <a href> — the
// browser would hit it with no Authorization header. Fetch as a blob
// through the shared axios instance (so the request interceptor still
// attaches the token, R-08/07_FRONTEND_RULES.md), then trigger a synthetic
// download link.
export function useDownloadPdf(): UseDownloadPdfResult {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<ApiErrorPresentation | null>(null);

  const download = useCallback(async (url: string, filename: string) => {
    setDownloading(true);
    setError(null);
    try {
      const response = await apiClient.get<Blob>(url, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setDownloading(false);
    }
  }, []);

  return { download, downloading, error };
}

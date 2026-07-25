// Mirrors apps/api/src/common/bulk-import/bulk-import-result.ts — the shared
// shape for every "upload a spreadsheet, get back a per-row report" endpoint
// (employees import now, attendance raw logs later per §15.8).
export interface ImportRowError {
  row: number;
  messages: string[];
}

export interface BulkImportResult {
  totalRows: number;
  successCount: number;
  failureCount: number;
  createdIds: string[];
  errors: ImportRowError[];
}

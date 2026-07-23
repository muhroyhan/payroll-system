// Shared shape for every "upload a spreadsheet, get back a per-row report"
// endpoint (employees, attendance raw logs) — partial success by design: one
// bad row shouldn't block the other 199.
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

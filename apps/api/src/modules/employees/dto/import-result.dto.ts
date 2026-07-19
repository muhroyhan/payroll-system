export interface ImportRowError {
  row: number;
  messages: string[];
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  failureCount: number;
  createdEmployeeIds: string[];
  errors: ImportRowError[];
}

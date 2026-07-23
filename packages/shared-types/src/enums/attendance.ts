// §5.3 — many fingerprint devices don't report in/out per scan; reconciliation
// falls back to inferring in/out from scan order per day when this is null.
export enum ScanType {
  IN = "in",
  OUT = "out",
}

// §5.3 attendance_records.source
export enum AttendanceSource {
  FINGERPRINT = "fingerprint",
  MANUAL = "manual",
  CSV_IMPORT = "csv_import",
}

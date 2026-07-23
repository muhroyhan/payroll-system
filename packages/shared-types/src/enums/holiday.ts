// §5.7 — provenance of a holiday row. Sync overwrites/creates google_calendar
// rows; manual rows (company off-days, cuti bersama) are never touched by sync.
export enum HolidaySource {
  GOOGLE_CALENDAR = "google_calendar",
  MANUAL = "manual",
}

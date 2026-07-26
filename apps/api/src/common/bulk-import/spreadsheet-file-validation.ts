import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

// Shared by every "upload a spreadsheet" endpoint (employees, attendance raw
// logs — see bulk-import-result.ts). Audit fix: FileInterceptor('file') was
// called with no limits/fileFilter at all, so an arbitrarily large upload sat
// entirely in memory (multer's default storage) before parseRows() ever ran,
// and a file of any type was handed straight to XLSX.read() (§parseRows in
// both *-import.service.ts) regardless of what it actually was.
//
// The extension/mimetype whitelist here is deliberately narrower than what
// XLSX.read() can technically parse (SheetJS also reads ODS, DBF, SYLK, and
// several other formats via content-sniffing) — it's scoped to exactly what
// parseRows()'s own error message already promises ("Could not parse the
// uploaded file as CSV or Excel"), not a new restriction invented here.
export const SPREADSHEET_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx'];

// Real-world clients report a wide (and inconsistent) set of MIME types for
// CSV/Excel — including the generic fallback most browsers use when they
// don't recognize the file type from its extension. This whitelist rejects
// obviously-wrong types (images, PDFs, HTML, ...) without being so strict
// that a legitimately-exported CSV/Excel file gets bounced over a client's
// mimetype quirk. Actual content validity is still enforced downstream by
// XLSX.read() itself (parseRows()'s try/catch) — this is a cheap early
// reject, not the only line of defense.
const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel', // .xls, and some clients report .csv as this too
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/octet-stream', // common generic fallback for spreadsheet uploads
]);

export function spreadsheetFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  const ext = extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    // Must be an HttpException — @nestjs/platform-express's transformException
    // only passes an error through unchanged if it already is one; a plain
    // Error here would fall through to a generic unhandled-exception 500
    // instead of a clean 400 (the exact leak this audit fix closes).
    callback(
      new BadRequestException(
        `Unsupported file extension "${ext || '(none)'}" — expected one of: ${ALLOWED_EXTENSIONS.join(', ')}`,
      ),
      false,
    );
    return;
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(
      new BadRequestException(
        `Unsupported file type "${file.mimetype}" — expected a CSV or Excel file (.csv, .xls, .xlsx)`,
      ),
      false,
    );
    return;
  }
  callback(null, true);
}

// Ready-to-spread multer options for FileInterceptor('file', ...) — one
// definition shared by every consumer so the limit/filter can't drift
// between endpoints.
export const SPREADSHEET_MULTER_OPTIONS = {
  limits: { fileSize: SPREADSHEET_MAX_FILE_SIZE_BYTES },
  fileFilter: spreadsheetFileFilter,
};

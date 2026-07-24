import { Matches } from 'class-validator';

export class CreatePayrollRunDto {
  // §5.8 — period is 'YYYY-MM' (e.g. '2026-07').
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'period must be in YYYY-MM format (e.g. 2026-07)',
  })
  period: string;
}

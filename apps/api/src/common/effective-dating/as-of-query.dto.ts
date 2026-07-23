import { IsDateString, IsOptional } from 'class-validator';

// Query param for effective-dated resolution endpoints. Defaults to "today"
// when omitted, resolved in the controller.
export class AsOfQueryDto {
  @IsOptional()
  @IsDateString()
  asOf?: string;
}

export function asOfOrToday(asOf?: string): string {
  return asOf ?? new Date().toISOString().slice(0, 10);
}

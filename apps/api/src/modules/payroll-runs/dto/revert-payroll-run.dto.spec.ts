import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RevertPayrollRunDto } from './revert-payroll-run.dto';

// Audit-trail follow-up (dispute-traceability review, §1B/HIGH) — reason is
// mandatory, not optional: an empty/missing/whitespace-only body must be
// rejected by the global ValidationPipe before it ever reaches the
// controller/service.
describe('RevertPayrollRunDto', () => {
  async function validateBody(body: unknown) {
    const dto = plainToInstance(RevertPayrollRunDto, body);
    return validate(dto);
  }

  it('rejects a missing reason', async () => {
    const errors = await validateBody({});
    expect(errors).not.toHaveLength(0);
    expect(errors[0].property).toBe('reason');
  });

  it('rejects an empty-string reason', async () => {
    const errors = await validateBody({ reason: '' });
    expect(errors).not.toHaveLength(0);
  });

  it('rejects a too-short reason', async () => {
    const errors = await validateBody({ reason: 'abc' });
    expect(errors).not.toHaveLength(0);
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('accepts a proper reason', async () => {
    const errors = await validateBody({
      reason: 'Data absensi Juli salah, perlu dihitung ulang',
    });
    expect(errors).toHaveLength(0);
  });
});

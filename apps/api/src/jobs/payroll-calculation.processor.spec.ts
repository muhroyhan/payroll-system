import { PayrollRunStatus } from '@payroll-system/shared-types';
import { PayrollCalculationProcessor } from './payroll-calculation.processor';

interface MockRun {
  id: string;
  status: PayrollRunStatus;
  totalCount?: number;
  processedCount?: number;
  update: jest.Mock<Promise<MockRun>, [Partial<MockRun>]>;
}

describe('PayrollCalculationProcessor (P8-T02)', () => {
  function makeProcessor(run: MockRun | null, activeCount: number) {
    const payrollRunModel = {
      findByPk: jest.fn().mockResolvedValue(run),
    };
    const employeeModel = {
      count: jest.fn().mockResolvedValue(activeCount),
      // Returns a chunk sized to the limit/offset window against activeCount.
      findAll: jest
        .fn()
        .mockImplementation(
          ({ limit, offset }: { limit: number; offset: number }) => {
            const remaining = Math.max(0, activeCount - offset);
            const size = Math.min(limit, remaining);
            return Promise.resolve(
              Array.from({ length: size }, (_, i) => ({
                id: `emp-${offset + i}`,
              })),
            );
          },
        ),
    };
    const calculationService = {
      newScopeCache: jest.fn().mockReturnValue({}),
      calculateEmployee: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new PayrollCalculationProcessor(
      payrollRunModel as any,
      employeeModel as any,
      calculationService as any,
    );
    return { processor, payrollRunModel, employeeModel, calculationService };
  }

  function draftRun(): MockRun {
    const run: MockRun = {
      id: 'run-1',
      status: PayrollRunStatus.DRAFT,
      update: jest
        .fn<Promise<MockRun>, [Partial<MockRun>]>()
        .mockImplementation(function (this: MockRun, patch) {
          Object.assign(this, patch);
          return Promise.resolve(this);
        }),
    };
    return run;
  }

  function job() {
    return { name: 'calculate-payroll-run', data: { payrollRunId: 'run-1' } };
  }

  it('processes a single chunk (< CHUNK_SIZE) and flips draft → calculated', async () => {
    const run = draftRun();
    const { processor, employeeModel } = makeProcessor(run, 30);

    await processor.process(job() as any);

    expect(employeeModel.findAll).toHaveBeenCalledTimes(1);
    expect(run.totalCount).toBe(30);
    expect(run.processedCount).toBe(30);
    expect(run.status).toBe(PayrollRunStatus.CALCULATED);
  });

  it('chunks a large run (250 employees → 3 batches) with ABSOLUTE progress sets (100, 200, 250)', async () => {
    const run = draftRun();
    const { processor, employeeModel } = makeProcessor(run, 250);

    await processor.process(job() as any);

    // 250 / 100 = 3 fetches (offsets 0, 100, 200).
    expect(employeeModel.findAll).toHaveBeenCalledTimes(3);
    // processedCount is SET absolutely each chunk, never incremented.
    const processedSets = run.update.mock.calls
      .map((c) => c[0].processedCount)
      .filter((v) => v !== undefined);
    expect(processedSets).toEqual([0, 100, 200, 250]);
    expect(run.totalCount).toBe(250);
    expect(run.status).toBe(PayrollRunStatus.CALCULATED);
  });

  // Idempotency: a retry firing after the run already reached `calculated` is a
  // no-op — no re-processing, no counter writes, no re-flip.
  it('is a no-op when the run is not draft (already calculated)', async () => {
    const run = draftRun();
    run.status = PayrollRunStatus.CALCULATED;
    const { processor, employeeModel } = makeProcessor(run, 100);

    await processor.process(job() as any);

    expect(employeeModel.count).not.toHaveBeenCalled();
    expect(employeeModel.findAll).not.toHaveBeenCalled();
    expect(run.update).not.toHaveBeenCalled();
  });

  it('handles a missing run gracefully (no throw)', async () => {
    const { processor } = makeProcessor(null, 0);
    await expect(processor.process(job() as any)).resolves.toBeUndefined();
  });

  it('ignores an unknown job name', async () => {
    const run = draftRun();
    const { processor, payrollRunModel } = makeProcessor(run, 10);
    await processor.process({ name: 'something-else', data: {} } as any);
    expect(payrollRunModel.findByPk).not.toHaveBeenCalled();
  });
});

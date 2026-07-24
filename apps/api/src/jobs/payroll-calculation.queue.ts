import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// P8-T02 — SEPARATE queue from pdf-generation (§ P8-T05: "PDF generation queue
// separate from the calculation job"; §6 folder layout keeps
// payroll-calculation.processor.ts distinct too). Rationale: the two jobs have
// opposite shapes — one big, long-running, chunked batch per run vs. many
// small per-document renders — so isolating them lets each retry/scale
// independently and a slow batch never starves per-document PDF jobs. Same
// PATTERN as PdfGenerationQueue (one queue, dispatch by job.name), different
// queue name.
export const PAYROLL_CALCULATION_QUEUE = 'payroll-calculation';

@Injectable()
export class PayrollCalculationQueue {
  constructor(
    @InjectQueue(PAYROLL_CALCULATION_QUEUE) private readonly queue: Queue,
  ) {}

  // jobId = payrollRunId dedups concurrent enqueues for the same run (BullMQ
  // ignores a second job with a live jobId). removeOnComplete frees the id so a
  // later re-calc (after a revert-to-draft) can enqueue again.
  enqueueCalculateRun(payrollRunId: string): Promise<unknown> {
    return this.queue.add(
      'calculate-payroll-run',
      { payrollRunId },
      {
        jobId: payrollRunId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }
}

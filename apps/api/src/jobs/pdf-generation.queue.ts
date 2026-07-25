import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const PDF_GENERATION_QUEUE = 'pdf-generation';

// Producer side of the shared PDF generation queue (§2.2/§3 — PDF generation
// is always a background job, never inline in a request handler). Each
// letter/payslip type adds its own enqueue method + job name here and its own
// processor under jobs/processors — one queue, not a parallel one per type.
@Injectable()
export class PdfGenerationQueue {
  constructor(
    @InjectQueue(PDF_GENERATION_QUEUE) private readonly queue: Queue,
  ) {}

  enqueueSuratIjin(suratIjinId: string): Promise<unknown> {
    return this.queue.add('generate-surat-ijin-pdf', { suratIjinId });
  }

  enqueueSuratPeringatan(suratPeringatanId: string): Promise<unknown> {
    return this.queue.add('generate-surat-peringatan-pdf', {
      suratPeringatanId,
    });
  }

  enqueueOvertimeLetter(overtimeLetterId: string): Promise<unknown> {
    return this.queue.add('generate-overtime-letter-pdf', {
      overtimeLetterId,
    });
  }

  // P8-T05 — payslip PDFs are many small per-document jobs, the same shape as
  // the letter types above, so they ride the SAME queue/processor rather than
  // a third queue (payroll-calculation stays the separate one, since that's
  // one big chunked batch job per run, not one job per document). Bulk-enqueue
  // (addBulk) so a run's payslips are dispatched in one call, not looped
  // one-at-a-time from the caller.
  enqueuePayslipPdfBulk(payslipIds: string[]): Promise<unknown> {
    if (payslipIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.queue.addBulk(
      payslipIds.map((payslipId) => ({
        name: 'generate-payslip-pdf',
        data: { payslipId },
      })),
    );
  }
}

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
}

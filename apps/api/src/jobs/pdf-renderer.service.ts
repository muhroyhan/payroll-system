import { Injectable } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';

// Shared HTML->PDF renderer for every letter/payslip type (§2.1 notes — the
// PDF library choice: headless-Chrome over a drawing-API template library,
// because (a) letters/payslips are naturally HTML/CSS documents — payslips
// especially need tabular earnings/deductions layout, which HTML tables
// handle far more simply than a positional drawing API, and (b) this project
// already reuses HTML/CSS skills across the stack (React admin UI), so
// templates stay easy for the same people to maintain. The heavier
// Chromium footprint is fine specifically because §2.2 already mandates PDF
// generation run in a background job, never inline in a request handler.
@Injectable()
export class PdfRendererService {
  private browserPromise: Promise<Browser> | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch({ headless: true });
    }
    return this.browserPromise;
  }

  async renderHtmlToPdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      // Static HTML with inline CSS and no external resources — 'load' is
      // sufficient; setContent's waitUntil doesn't support 'networkidle*'.
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
    }
  }
}

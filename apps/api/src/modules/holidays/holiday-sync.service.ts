import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { HolidaySource } from '@payroll-system/shared-types';
import { Holiday } from './entities/holiday.entity';

// Public Google Calendar ICS feed for Indonesian holidays. No API key needed.
const DEFAULT_FEED_URL =
  'https://calendar.google.com/calendar/ical/en.indonesian%23holiday%40group.v.calendar.google.com/public/basic.ics';

export interface HolidaySyncResult {
  fetched: number;
  created: number;
  updated: number;
  skippedManual: number;
}

interface ParsedEvent {
  date: string; // 'YYYY-MM-DD'
  name: string;
}

@Injectable()
export class HolidaySyncService {
  private readonly logger = new Logger(HolidaySyncService.name);

  constructor(
    @InjectModel(Holiday)
    private readonly holidayModel: typeof Holiday,
  ) {}

  private get feedUrl(): string {
    return process.env.HOLIDAY_ICS_URL ?? DEFAULT_FEED_URL;
  }

  // §5.7 — sync google_calendar holidays without clobbering manual entries.
  // Optionally restrict to a single year.
  async syncFromGoogleCalendar(year?: number): Promise<HolidaySyncResult> {
    const ics = await this.fetchFeed();
    let events = this.parseIcs(ics);
    if (year !== undefined) {
      events = events.filter((e) => e.date.startsWith(`${year}-`));
    }

    let created = 0;
    let updated = 0;
    let skippedManual = 0;

    for (const event of events) {
      const existing = await this.holidayModel.findOne({
        where: { date: event.date },
      });
      if (existing) {
        if (existing.source === HolidaySource.MANUAL) {
          skippedManual += 1; // never overwrite a user-entered holiday
          continue;
        }
        await existing.update({
          name: event.name,
          source: HolidaySource.GOOGLE_CALENDAR,
        });
        updated += 1;
      } else {
        await this.holidayModel.create({
          date: event.date,
          name: event.name,
          source: HolidaySource.GOOGLE_CALENDAR,
          isActive: true,
        } as any);
        created += 1;
      }
    }

    return { fetched: events.length, created, updated, skippedManual };
  }

  private async fetchFeed(): Promise<string> {
    try {
      const res = await fetch(this.feedUrl);
      if (!res.ok) {
        throw new Error(`feed responded ${res.status}`);
      }
      return await res.text();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Holiday feed fetch failed: ${message}`);
      throw new ServiceUnavailableException(
        `Could not fetch the Google Calendar holiday feed: ${message}`,
      );
    }
  }

  // Minimal ICS parser: unfold continuation lines, then pull DATE-valued
  // DTSTART + SUMMARY out of each VEVENT.
  private parseIcs(ics: string): ParsedEvent[] {
    const unfolded = ics.replace(/\r?\n[ \t]/g, '');
    const lines = unfolded.split(/\r?\n/);

    const events: ParsedEvent[] = [];
    let inEvent = false;
    let date: string | null = null;
    let name: string | null = null;

    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') {
        inEvent = true;
        date = null;
        name = null;
      } else if (line === 'END:VEVENT') {
        if (date && name) {
          events.push({ date, name: this.unescape(name) });
        }
        inEvent = false;
      } else if (inEvent) {
        if (line.startsWith('DTSTART')) {
          const raw = line.split(':')[1]?.trim(); // e.g. 20260101
          if (raw && /^\d{8}/.test(raw)) {
            date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
          }
        } else if (line.startsWith('SUMMARY')) {
          name = line.slice(line.indexOf(':') + 1).trim();
        }
      }
    }

    return events;
  }

  private unescape(value: string): string {
    return value
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\n/gi, ' ')
      .replace(/\\\\/g, '\\');
  }
}

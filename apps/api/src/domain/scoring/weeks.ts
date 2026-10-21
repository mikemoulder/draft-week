// A game week runs Monday 00:00 UTC to the next Monday. Its id is that Monday's date.
export const DAY_MS = 86_400_000;
export const WEEK_MS = 7 * DAY_MS;

export function weekStartOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - sinceMonday * DAY_MS);
}

export function weekIdOf(date: Date): string {
  return weekStartOf(date).toISOString().slice(0, 10);
}

export function isWeekId(id: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) return false;
  const d = new Date(`${id}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.getUTCDay() === 1;
}

export function weekBounds(weekId: string): { start: Date; end: Date } {
  const start = new Date(`${weekId}T00:00:00Z`);
  return { start, end: new Date(start.getTime() + WEEK_MS) };
}

export function addWeeks(weekId: string, n: number): string {
  return new Date(weekBounds(weekId).start.getTime() + n * WEEK_MS).toISOString().slice(0, 10);
}

/** Day of the week (0 = Monday) for a timestamp inside the given week. */
export function dayOfWeek(weekId: string, at: Date): number {
  return Math.floor((at.getTime() - weekBounds(weekId).start.getTime()) / DAY_MS);
}

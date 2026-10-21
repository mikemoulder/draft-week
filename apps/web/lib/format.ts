import type { LeagueStatus, WeekInfo } from "@draftweek/shared";

export function weekRange(weekId: string): string {
  const start = new Date(`${weekId}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${f(start)} to ${f(end)}`;
}

export const STATUS_LABEL: Record<LeagueStatus, string> = {
  setup: "Setup",
  drafting: "Drafting",
  ready: "Ready",
  live: "Live",
  final: "Final",
};

export const WEEK_NOTE: Record<WeekInfo["status"], string> = {
  final: "Finished. Draft now and play the whole week straight away",
  live: "In progress. Points so far count as soon as you draft",
  upcoming: "Starts Monday. Draft now, scores arrive daily",
};

export const pts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const money = (n: number) =>
  `${n < 0 ? "−" : "+"}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: n !== 0 && Math.abs(n) < 10 ? 2 : 0 })}`;

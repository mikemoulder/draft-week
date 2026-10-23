import Link from "next/link";
import { Robot, UserCircle } from "@phosphor-icons/react";
import { MIN_LEAGUE_SIZE, kickoffSize, pairings, type LeagueState } from "@draftweek/shared";
import { cx } from "@/components/primitives";

export const MATCHUP_RULE = `Managers play each other in the order they joined: 1st v 2nd, 3rd v 4th. Bots only make up the numbers: up to ${MIN_LEAGUE_SIZE} players, plus one if needed so everyone has an opponent. Win your matchup, and climb the standings on total points.`;

type Side = { id: string | null; name: string; bot: boolean };

/** While squads are being picked: the draw as it stands, final at kick-off. */
export function MatchupsPreview({ league }: { league: LeagueState }) {
  const humans = league.members.filter((m) => !m.isBot);
  const bySeat = new Map(league.members.map((m) => [m.seat, m]));
  const pairs = pairings(league.members.map((m) => ({ seat: m.seat, isBot: m.isBot })));
  const side = (seat: number | undefined): Side => {
    const m = seat === undefined ? undefined : bySeat.get(seat);
    if (!m) return { id: null, name: "A bot", bot: true };
    return { id: m.id, name: m.id === league.myMemberId ? "You" : m.name, bot: m.isBot };
  };
  const rows: [Side, Side][] = pairs.map(([a, b]) => [side(a), side(b)]);
  // An odd manager out meets the first bot to fill a seat.
  if (humans.length % 2 === 1) {
    const last = [...league.members].sort((a, b) => Number(a.isBot) - Number(b.isBot) || a.seat - b.seat).filter((m) => !m.isBot).at(-1);
    if (last && !rows.some(([a, b]) => a.id === last.id || b.id === last.id)) rows.push([side(last.seat), side(undefined)]);
  }
  // Bots at kick-off: up to the minimum, plus one for an odd manager out (already shown above).
  const bots = kickoffSize(humans.length) - humans.length;
  const botPairs = Math.max(0, (bots - (humans.length % 2)) / 2);
  // Big event leagues: your matchup and the first few, not hundreds of rows.
  const SHOWN = 12;
  const mineAt = rows.findIndex(([a, b]) => a.name === "You" || b.name === "You");
  const shown = rows.length <= SHOWN ? rows : [...(mineAt >= SHOWN - 1 ? [rows[mineAt]!] : []), ...rows.slice(0, mineAt >= SHOWN - 1 ? SHOWN - 1 : SHOWN)];

  return (
    <section aria-label="Matchups" className="mt-10 rounded-panel border border-line p-6 md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="t-label">This week&apos;s matchups</p>
          <h2 className="t-display-m mt-2">{league.replay ? "Drawn when the week is played" : "Drawn at kick-off on Monday"}</h2>
        </div>
        <p className="t-small max-w-[46ch] text-fg-mute md:text-right">
          {MATCHUP_RULE}{" "}
          <Link href="/how-it-works#matchups" className="text-action hover:underline">
            Full rules
          </Link>
        </p>
      </div>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {shown.map(([a, b], i) => (
          <li key={i} className={cx("flex items-center gap-3 rounded-tile bg-fill px-4 py-3", (a.name === "You" || b.name === "You") && "ring-1 ring-[var(--accent)]")}>
            <SideLabel side={a} />
            <span className="t-label shrink-0 text-[10px] text-fg-mute">vs</span>
            <SideLabel side={b} align="right" />
          </li>
        ))}
        {rows.length > shown.length ? (
          <li className="t-small flex items-center rounded-tile border border-dashed border-line px-4 py-3 text-fg-mute">
            and {rows.length - shown.length} more {rows.length - shown.length === 1 ? "matchup" : "matchups"} between managers
          </li>
        ) : null}
        {botPairs > 0 ? (
          <li className="flex items-center gap-3 rounded-tile border border-dashed border-line px-4 py-3 text-fg-mute">
            <Robot size={18} weight="duotone" aria-hidden />
            <span className="t-small">
              {botPairs} more matchup{botPairs === 1 ? "" : "s"} between bots, unless friends join
            </span>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function SideLabel({ side, align }: { side: Side; align?: "right" }) {
  const Icon = side.bot ? Robot : UserCircle;
  return (
    <span className={cx("flex min-w-0 flex-1 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <Icon size={18} weight="duotone" className="shrink-0 text-fg-mute" aria-hidden />
      <span className={cx("t-small truncate font-semibold", side.name === "You" && "text-accent", side.id === null && "font-normal text-fg-mute")}>{side.name}</span>
    </span>
  );
}

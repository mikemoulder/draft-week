import Link from "next/link";
import { Robot, UserCircle } from "@phosphor-icons/react";
import { pairings, type LeagueState } from "@draftweek/shared";
import { cx } from "@/components/primitives";

export const MATCHUP_RULE =
  "Managers play each other first, in the order they joined: 1st v 2nd, 3rd v 4th. Bots fill the empty seats, so an odd manager out plays a bot. Win your matchup, and climb the standings on total points.";

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
  const botPairs = Math.max(0, Math.floor((league.size - league.members.length - (humans.length % 2)) / 2));

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
        {rows.map(([a, b], i) => (
          <li key={i} className={cx("flex items-center gap-3 rounded-tile bg-fill px-4 py-3", (a.name === "You" || b.name === "You") && "ring-1 ring-[var(--accent)]")}>
            <SideLabel side={a} />
            <span className="t-label shrink-0 text-[10px] text-fg-mute">vs</span>
            <SideLabel side={b} align="right" />
          </li>
        ))}
        {botPairs > 0 ? (
          <li className="flex items-center gap-3 rounded-tile border border-dashed border-line px-4 py-3 text-fg-mute">
            <Robot size={18} weight="duotone" aria-hidden />
            <span className="t-small">
              {botPairs} more matchup{botPairs === 1 ? "" : "s"} between bots, unless friends take those seats
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

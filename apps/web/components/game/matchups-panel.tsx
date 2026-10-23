import Link from "next/link";
import { Robot, Shuffle, UsersThree } from "@phosphor-icons/react";
import { MIN_LEAGUE_SIZE, kickoffSize, type LeagueState } from "@draftweek/shared";

export const MATCHUP_RULE = `Opponents are drawn at random at kick-off. Managers play managers; bots only fill the gaps, up to ${MIN_LEAGUE_SIZE} players and one more if needed so everyone has an opponent. Win your matchup, and climb the standings on total points.`;

/** While squads are being picked: how the draw will work, and what it looks like so far. */
export function MatchupsPreview({ league }: { league: LeagueState }) {
  const managers = league.members.filter((m) => !m.isBot).length;
  const players = kickoffSize(managers);
  const bots = players - managers;
  return (
    <section aria-label="Matchups" className="mt-10 rounded-panel border border-line p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-fill text-action">
            <Shuffle size={26} weight="duotone" aria-hidden />
          </span>
          <div>
            <p className="t-label">This week&apos;s matchups</p>
            <h2 className="t-display-m mt-2">{league.replay ? "Drawn at random when the week is played" : "Drawn at random at kick-off"}</h2>
            <p className="t-small mt-2 max-w-[60ch] text-fg-mute">
              {MATCHUP_RULE}{" "}
              <Link href="/how-it-works#matchups" className="text-action hover:underline">
                Full rules
              </Link>
            </p>
          </div>
        </div>
        <dl className="grid shrink-0 grid-cols-3 gap-2 text-center">
          {[
            { icon: UsersThree, k: "Managers", v: managers },
            { icon: Robot, k: "Bots", v: bots },
            { icon: Shuffle, k: "Matchups", v: players / 2 },
          ].map(({ icon: Icon, k, v }) => (
            <div key={k} className="flex flex-col-reverse items-center rounded-tile bg-fill px-4 py-3">
              <dt className="t-label mt-1 text-[10px]">{k}</dt>
              <dd className="flex flex-col items-center gap-1">
                <Icon size={18} weight="duotone" className="text-fg-mute" aria-hidden />
                <span className="t-num text-[24px] leading-none">{v}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

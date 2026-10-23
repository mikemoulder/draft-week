import { CalendarBlank, CheckCircle, UsersThree } from "@phosphor-icons/react";
import type { LeagueState } from "@draftweek/shared";
import { STATUS_LABEL, weekRange } from "@/lib/format";
import { CopyCode } from "./copy-code";

export function LeagueHeader({ league }: { league: LeagueState }) {
  const humans = league.members.filter((m) => !m.isBot).length;
  const ready = league.members.filter((m) => !m.isBot && m.hasSquad).length;
  return (
    <div className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="t-label inline-flex items-center gap-2 rounded-chip bg-fill px-3 py-1.5 text-fg-soft">
          {league.status === "live" ? <span className="live-dot rounded-full" aria-hidden /> : null}
          {STATUS_LABEL[league.status]}
        </p>
        <h1 className="t-display-l mt-4 truncate">{league.name}</h1>
        <p className="t-body mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-fg-mute">
          <span className="inline-flex items-center gap-1.5">
            <CalendarBlank size={18} weight="duotone" aria-hidden /> {weekRange(league.weekId)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UsersThree size={18} weight="duotone" aria-hidden /> {humans} {humans === 1 ? "manager" : "managers"}
            {league.members.length > humans ? ` and ${league.members.length - humans} bots` : league.status === "picking" ? ", bots fill the empty seats at kick-off" : ""}
          </span>
          {league.status === "picking" ? (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle size={18} weight="duotone" aria-hidden /> {ready} of {humans} squads picked
            </span>
          ) : null}
        </p>
      </div>
      {league.status === "picking" ? (
        <div className="flex flex-col gap-2 md:items-end">
          <p className="t-label">Invite code</p>
          <CopyCode code={league.inviteCode} />
          <p className="t-small text-fg-mute md:text-right">
            {league.replay ? "Friends can join until the owner plays the week." : "Friends can join until kick-off on Monday."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

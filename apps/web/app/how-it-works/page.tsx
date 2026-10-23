import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowsDownUp,
  CalendarCheck,
  Coins,
  Crown,
  Eye,
  HandCoins,
  LockKey,
  Ranking,
  Scales,
  ShieldCheck,
  Skull,
  Sword,
  UserFocus,
  Users,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import { BASE_BUDGET, VOLUME_BONUS_TIERS } from "@draftweek/shared";
import { Footer } from "@/components/landing/footer";
import { Nav } from "@/components/landing/nav";
import { Container } from "@/components/primitives";

export const metadata: Metadata = {
  title: "How it works",
  description: "How FTL prices traders, scores their real Strike trades, draws matchups, and keeps the game fair.",
};

const WEEK = [
  { icon: Users, title: "Start or join a league", body: "Eight seats. Invite friends with a code; bots fill any seat left empty." },
  { icon: Coins, title: "Pick five traders", body: `Spend up to ${BASE_BUDGET} credits, plus a bonus for your own trading on Strike.` },
  { icon: LockKey, title: "Squads lock at kick-off", body: "Monday 00:00 UTC. No changes once the week starts." },
  { icon: Ranking, title: "Seven days of points", body: "Every day your traders trade on Strike, they score for you." },
];

const POINTS = [
  {
    icon: Ranking,
    color: "var(--style-scalper)",
    big: "1 to 10",
    title: "Daily rank",
    body: "Each day, every Strike trader who traded is ranked by return: realized profit after fees, divided by their equity going into the day. The top tenth scores 10, the next tenth 9, down to 1. A trader who did not trade scores 0.",
  },
  {
    icon: Skull,
    color: "var(--danger)",
    big: "−5",
    title: "Liquidation",
    body: "Any liquidation that day costs 5 points on top of the rank, so a liquidated trader can score below zero.",
  },
  {
    icon: Crown,
    color: "var(--accent)",
    big: "×1.5",
    title: "Captain",
    body: "Your captain's points count one and a half times, on days the captain trades.",
  },
  {
    icon: ArrowsDownUp,
    color: "var(--style-swing)",
    big: "Auto-sub",
    title: "Bench",
    body: "Three starters score. A starter who sits a day out is replaced, for that day only, by your first bench trader who traded.",
  },
];

const FAIR = [
  {
    icon: LockKey,
    title: "No hindsight",
    body: "Squads lock before the week starts, and the week already in progress cannot be picked. You can replay a finished week, but only on its own, against bots and friends who pick blind too.",
  },
  {
    icon: Scales,
    title: "One lucky trade is not a week",
    body: "Points come from rank, not dollars, and a trader scores at most 10 a day. A 400% day earns the same 10 as a steady top-tenth day, so a single gamble cannot run away with the league.",
  },
  {
    icon: Coins,
    title: "Small accounts cannot inflate returns",
    body: "Returns are measured against at least $100 of equity, so a $5 account that makes $5 shows 5%, not 100%.",
  },
  {
    icon: UserFocus,
    title: "You cannot pick yourself",
    body: "The game refuses a squad that includes your own Strike account, so you can never score your own trading.",
  },
  {
    icon: ShieldCheck,
    title: "Only real, active people",
    body: "A trader is pickable only after 5 to 3,000 trades in the week before. That keeps out dormant accounts and high-frequency bots. Vaults are never pickable.",
  },
  {
    icon: Eye,
    title: "Every point can be checked",
    body: "Points come from public trade data on Strike, recomputed every five minutes. Anyone can look a trader up on Strike and see the same fills.",
  },
];

export default function HowItWorks() {
  return (
    <>
      <Nav />
      <main>
        <Container className="pb-[var(--section-y)] pt-14 md:pt-20">
          <p className="t-label">How it works</p>
          <h1 className="t-display-xl mt-5 max-w-[14ch]">Real trades. Fair points.</h1>
          <p className="t-lead mt-6 max-w-[640px] text-fg-soft">
            FTL is fantasy football for Strike Finance. You pick five real Strike traders, and every trade they make that week scores for
            you. Here is exactly how the points work, and how the game stops people from gaming them.
          </p>

          {/* The week */}
          <section aria-labelledby="week" className="mt-16">
            <h2 id="week" className="t-display-m">
              The week
            </h2>
            <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {WEEK.map((s, i) => (
                <li key={s.title} className="rounded-tile bg-tile p-5">
                  <span className="flex items-center justify-between">
                    <s.icon size={26} weight="duotone" className="text-action" aria-hidden />
                    <span className="t-num text-[14px] text-fg-mute">{i + 1}</span>
                  </span>
                  <p className="t-title mt-4">{s.title}</p>
                  <p className="t-small mt-1 text-fg-mute">{s.body}</p>
                </li>
              ))}
            </ol>
            <p className="t-small mt-4 max-w-[70ch] text-fg-mute">
              <CalendarCheck size={15} weight="duotone" className="mr-1 inline align-[-2px]" aria-hidden />
              Two kinds of week can host a league: next week, which you pick now and watch live, and a finished week, which you play straight
              away as a replay. The week in progress cannot be picked, because its results are already coming in.
            </p>
          </section>

          {/* Squad */}
          <section aria-labelledby="squad" className="mt-16 grid gap-10 lg:grid-cols-[5fr_6fr]">
            <div>
              <h2 id="squad" className="t-display-m">
                Your squad
              </h2>
              <p className="t-body mt-4 text-fg-soft">
                Five traders: three starters who score, and two on the bench. One starter is your captain. Friends can pick the same traders as you.
              </p>
              <ul className="t-body mt-5 flex flex-col gap-3 text-fg-soft">
                <li>
                  <span className="font-semibold text-fg">Prices, 20 to 60 credits.</span> Set by how many points a trader scored the week before:
                  the best are 60, the quietest 20.
                </li>
                <li>
                  <span className="font-semibold text-fg">Grades, A+ to D.</span> Last week&apos;s return against everyone else: A+ is the top
                  10%, A the next 20%, B the middle 30%, C the next 25%, and D the bottom 15%.
                </li>
                <li>
                  <span className="font-semibold text-fg">Budget, {BASE_BUDGET} credits.</span> Enough for a couple of stars and some value
                  picks, never all five stars.
                </li>
              </ul>
            </div>
            <div className="rounded-panel bg-tile p-6 md:p-8">
              <p className="t-label inline-flex items-center gap-2">
                <HandCoins size={16} weight="duotone" aria-hidden /> Trading bonus
              </p>
              <p className="t-body mt-3 text-fg-soft">
                Sign in with the wallet you trade with, and your own Strike volume over the last seven days adds credits when you join a league.
              </p>
              <table className="mt-5 w-full">
                <thead>
                  <tr className="t-label text-left text-[10px]">
                    <th className="pb-2 font-semibold">Your 7-day volume on Strike</th>
                    <th className="pb-2 text-right font-semibold">Extra credits</th>
                  </tr>
                </thead>
                <tbody>
                  {[...VOLUME_BONUS_TIERS].reverse().map((t) => (
                    <tr key={t.minUsd} className="border-t border-line">
                      <td className="t-num py-2.5 text-[16px]">${t.minUsd.toLocaleString("en-US")}+</td>
                      <td className="t-num py-2.5 text-right text-[16px] text-success">+{t.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Points */}
          <section aria-labelledby="points" className="mt-16">
            <h2 id="points" className="t-display-m">
              Points
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {POINTS.map((r) => (
                <div key={r.title} className="rounded-tile bg-tile p-5">
                  <r.icon size={26} weight="duotone" style={{ color: r.color }} aria-hidden />
                  <p className="t-num mt-4 text-[30px] leading-none" style={{ color: r.color }}>
                    {r.big}
                  </p>
                  <p className="t-title mt-3">{r.title}</p>
                  <p className="t-small mt-1 text-fg-mute">{r.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-tile border border-line p-5">
              <p className="t-label">Example day</p>
              <p className="t-body mt-2 text-fg-soft">
                Your captain finishes in the top tenth (10 × 1.5 = 15). Your second starter ranks in the fifth tenth (5). Your third starter does
                not trade, so your first bench trader comes on, ranks in the eighth tenth, but gets liquidated (8 − 5 = 3). Your day: 15 + 5 + 3
                = <span className="t-num font-semibold text-fg">23 points</span>.
              </p>
            </div>
          </section>

          {/* Matchups */}
          <section aria-labelledby="matchups" className="mt-16 grid gap-6 lg:grid-cols-[5fr_6fr]">
            <div>
              <h2 id="matchups" className="t-display-m">
                Matchups and standings
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              <p className="t-body flex gap-3 text-fg-soft">
                <Sword size={22} weight="duotone" className="mt-0.5 shrink-0 text-action" aria-hidden />
                <span>
                  Every manager has one head-to-head matchup for the week. Managers play each other first, in the order they joined the league:
                  1st v 2nd, 3rd v 4th. Bots fill the empty seats, so an odd manager out plays a bot, and the remaining bots play each other.
                </span>
              </p>
              <p className="t-body flex gap-3 text-fg-soft">
                <Ranking size={22} weight="duotone" className="mt-0.5 shrink-0 text-action" aria-hidden />
                <span>
                  The standings rank all eight squads by total points, with each manager&apos;s matchup result (W, L or D) beside them. Win your
                  matchup to win the week; finish top for bragging rights over everyone else.
                </span>
              </p>
            </div>
          </section>

          {/* Fair play */}
          <section aria-labelledby="fair" className="mt-16">
            <h2 id="fair" className="t-display-m">
              Fair play
            </h2>
            <p className="t-body mt-3 max-w-[70ch] text-fg-soft">The ways someone might try to game FTL, and what stops them.</p>
            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {FAIR.map((f) => (
                <div key={f.title} className="rounded-tile bg-tile p-5">
                  <f.icon size={26} weight="duotone" className="text-success" aria-hidden />
                  <p className="t-title mt-4">{f.title}</p>
                  <p className="t-small mt-1 text-fg-mute">{f.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3 rounded-tile border border-line p-5">
              <Warning size={22} weight="duotone" className="mt-0.5 shrink-0 text-warning" aria-hidden />
              <p className="t-small text-fg-soft">
                <span className="font-semibold text-fg">What no fantasy game can fully stop.</span> One person could run two Strike accounts,
                hedge between them, and close only the winning side on the account a squad picked. FTL limits what that buys: the trader
                still scores at most 10 a day, the same as any top-tenth trader, the account must be an active trader in the week before to be
                pickable at all, and the trades cost real fees on Strike.
              </p>
            </div>
          </section>

          <div className="mt-16 flex flex-wrap items-center gap-4">
            <Link href="/play" className="btn btn-action btn-lg">
              Start a league <ArrowRight size={17} weight="bold" aria-hidden />
            </Link>
            <Link href="/#game" className="btn btn-ghost btn-lg">
              Watch last week&apos;s game
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

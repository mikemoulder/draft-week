# DESIGN.md

The design of FTL (Fantasy Trading League), decided once, before the build. Every component answers to this file.
When the design changes, change this file first, then the code.

---

## 0. Thesis

> v2, 2026-10-21 23:40 UTC. The user asked for warm, creative and visually rich, with real icons, beyond the
> skill's rigid directions. v1 (black scoreboard, zero radius, mono) is superseded; its storyboard survives.

```text
THESIS      A trading-card club under floodlights: every Strike trader is a collectible card you draft into a five-card hand, and the week is a match you watch. It refuses to look like an exchange.
WORLD       Flat warm night ground (plum-navy), no background gradients; Bricolage Grotesque for display and numbers, Figtree for text; rounded cards with tier frames (bronze, silver, gold, legend); Phosphor duotone icons; sunset orange is the action, gold means the lead, red is the red card.
STORY       Hook with a fanned hand of this week's top real cards -> live facts with icons -> last week's game of the week, replayed -> how a trade becomes a point -> nothing is simulated -> play.
FIRST VIEW  1440: headline left, lead + orange action, a fanned hand of five real trader cards right, glowing; facts strip at the fold. 375: headline, action, the hand as an overlapping row, facts.
SIGNATURE   The trader card: crest generated from the account (colors, pattern, jersey number), an overall rating from last week, a tier frame, a style badge. It appears in the hero hand, the draft room and the replay.
REFUSES     Candlestick charts and terminal chrome; stock photos, AI art and fake player faces; flat grey dashboards.
```

---

## 1. Distill

| Question | Answer |
|---|---|
| What it is (12 words, for a stranger) | Fantasy football where the players are real Strike traders and their real trades |
| Who it is for (a person, not a market) | A Strike trader in a Discord clan on Sunday night who wants bragging rights over friends without adding margin |
| The one action (verb + object) | Start a league |
| The mechanism (the true, interesting part) | Every Strike fill is public. Each day every trader who traded is ranked by return against all others and scored 1 to 10; a liquidation costs 5; the captain counts 1.5x; an idle starter is replaced by a bench trader who traded |
| Feels (three adjectives) | competitive, live, exact |
| Never feels (three adjectives) | casino, corporate, cute |
| Proof we can show (live UI, a number, a transaction, code) | Last week's game of the week replayed from real fills, with real handles and a real liquidation; live counts and the last ingest time from our API |
| Product noun (one word, used everywhere) | league (a manager drafts traders into a lineup; leagues have matchups) |

---

## 2. Signature

| Metaphor | Clarity | Specific | Buildable | Motion | Fit | Total |
|---|---|---|---|---|---|---|
| Stadium scoreboard: two totals flip day by day, red card on a liquidation | 3 | 2 | 3 | 3 | 3 | 14 |
| Worm race: two cumulative lines racing across Mon to Sun | 3 | 2 | 3 | 3 | 2 | 13 |
| Trade tape becoming points: fills stream in and turn into numbers | 2 | 3 | 2 | 3 | 2 | 12 |
| Snake draft board filling up | 2 | 1 | 3 | 2 | 2 | 10 |
| Trading cards of traders flipping over | 2 | 1 | 2 | 2 | 1 | 8 |

**Chosen:** the scoreboard and the worm, as one element: the replay scoreboard.

| | |
|---|---|
| The element | `ReplayScoreboard`: header with the two managers and totals in display numerals; below, a 7-column day strip (MON to SUN) where each day reveals both lineups' trader chips with their points; a lead line (home's margin over away around a zero baseline) drawn across the days |
| Where it lives | Landing beat 4 (game of the week, real data, no sign-in) and the league screen in live/final (the user's own matchup). Same component |
| Still frame (what a screenshot shows) | Day 5 of 7: totals 92 to 92, the worms crossing, a red card on one chip, the leader's total in yellow |
| Motion (what changes, how long, how it loops or ends) | Press Play: each day takes 900ms; chips light left to right (60ms stagger), totals count up, the worm extends one segment; a liquidation flashes red once and holds; the leader's total turns yellow on a lead change. Ends on Sunday with the winner marked. Replay button restarts |
| Reduced motion (the honest still state) | The final state: all seven days revealed, final totals, winner marked, worm complete |
| At 375px | Header totals stacked tight; day strip becomes a horizontal snap scroller of day cards; worm full width, 120px tall |
| What it proves about the product | Points really come from real trades: real handles, real liquidations, real lead changes, from Strike mainnet |

---

## 3. Direction

**Chosen (v2):** custom, outside the six directions: "floodlit card club". It borrows soft-product's warmth and
radius, bold-signal's display scale, and luminous-dark's atmosphere field, on purpose, because the user asked for a
warm, creative, collectible feel that none of the six alone gives.

**Why not v1 (bold-signal):** too rigid and cold for a social game; the user rejected it. The card is a better
signature than the scoreboard because it is the object people collect, compare and share.

| Dial | Setting |
|---|---|
| Ground | warm dark plum-navy `#15112A`, flat. No glow fields or background gradients (user: "too much gradient, feels like slop") |
| Type voice | Bricolage Grotesque 800 for display and every number (warm, quirky grotesque); Figtree 400/600/700 for text and labels |
| Density | balanced: generous hero, dense cards |
| Corners | round: cards 20, panels 24, tiles 16, buttons and chips as pills |
| Surfaces | soft elevation on cards, hairlines in warm white at low alpha, a chunky 4px "game button" underside on the primary action |
| Color strategy | warm base + sunset orange action + gold (the lead, gold cards) + red card; four style colors only inside cards (degen pink, scalper sky, swing mint, steady lilac) |
| Icons | Phosphor (MIT), duotone weight in features and badges, regular weight in UI |
| Fonts | Bricolage Grotesque and Figtree, Google Fonts, OFL, self-hosted by next/font |

### Calibration

| Reference | URL | Measured on | Why this one |
|---|---|---|---|
| Sleeper | https://sleeper.com | 2026-10-21, 1440 + 390 (`.design/ref-sleeper`) | the fantasy sports app traders already know; how matchup rows and labels are proportioned |

| Component | Reference (measured) | Ours | Why different |
|---|---|---|---|
| Page ground / text | rgb(5,9,29) navy / white | #0B0B0B / #F2F0E9 | warm neutral black, not sports-app navy |
| H1 size / lh / tracking / weight | no display H1 on the scores page | clamp(56px, 9vw, 152px) / 0.88 / -0.05em / 800 | type is the image in this direction |
| H2 | 11px 700 uppercase +0.023em (section labels) | labels 12px mono +0.06em; claims at display-l | their H2s are labels; we keep labels and add claim headings |
| Body | 16px Inter 400 / 24px | 16px Archivo 400 / 1.55 | same size, our family |
| Label | 14px 600 uppercase +0.071em; dates 11px 700 | 12px JetBrains Mono 500 uppercase +0.06em | mono carries the "data" voice |
| Nav | 80px, sticky, transparent | 64px bar, 1px bottom line, sticky | denser, ruled |
| Primary button | pill, cyan fill, 14px 600 uppercase +0.071em | 48px, zero radius, yellow is NOT the button: bone fill, black text, 14px 700 | accent means "the lead" only |
| Secondary button | text link with arrow | text link with arrow, mono | same |
| Card / tile | matchup card ~355x104, radius ~12, two team rows of 48px, score right-aligned | matchup row 2 x 48px, zero radius, 1px line, score right in display numerals | their structure, our corners |
| Section rhythm | n/a (app page) | section-y clamp(72px, 9vw, 128px), heading gap 40px | ratio ~3:1 |
| Footer | standard link columns | giant cropped wordmark + one ruled row of links | direction footer |
| Accent use | cyan on the main action and active tab | yellow only on leader totals, the leading worm, and points just scored | one meaning |

---

## 4. Storyboard

| # | Beat | Job (one line) | Pattern | Tone | Align | Content (real copy, drafted now) |
|---|---|---|---|---|---|---|
| 1 | Nav | find the game, play it | full-width bar, 1px bottom line | quiet | edge | FTL + "Fantasy Trading League" label · links: SCORING, LAST WEEK, GITHUB · [Play now] |
| 2 | Hook | what, why, what next | editorial statement | loud, airy | left | H1 "Five traders. / Seven days." Lead: "Fantasy football for Strike Finance. Draft five real traders, and every trade they make this week scores for you. Free to play." [Start a league] · Watch last week's game ↓ |
| 3 | Facts | prove it is live | marquee band | dense | full | 540 TRADERS FOLLOWED · 43,368 TRADES LAST WEEK · 95 LIQUIDATIONS · DATA UPDATED 3 MIN AGO · FREE TO PLAY · (numbers from /api/showcase) |
| 4 | Signature | show the game being played | live stage panel | contained | left header | Label "LAST WEEK · OCT 12 TO 18 · GAME OF THE WEEK". H2 "A real week, replayed." Lead: "Two lineups of real Strike traders. Every point below is a trade that happened." The ReplayScoreboard, [Play the week] |
| 5 | Mechanism | how a trade becomes a point | ruled columns, giant numerals | dense | left | H2 "How a trade becomes a point." Columns: "1 to 10 / Ranked daily. Every trader who traded that day is ranked by return against every other trader. Top tenth scores 10." · "-5 / Red card. A liquidation costs five points, on top of the day." · "x1.5 / Captain. Your captain counts one and a half. A starter who sits out is replaced by your first bench trader who traded." |
| 6 | Trust | nothing is simulated | inverted statement band (bone) | calm | left | H2 "Nothing here is simulated." Rows: "Every fill comes from Strike's public API." / "Refreshed every five minutes. Last update 3 min ago." / "Cards show last week, so nobody drafts with hindsight." |
| 7 | Close | one action | closing statement | loud, airy | center | H2 "Draft night is tonight." [Start a league] · "Sign in with your Strike wallet, or play as a guest." |
| 8 | Footer | identity, links | big wordmark footer | quiet | edge | FTL set at viewport width, cropped. Row: GitHub · Strike Finance · "Data from Strike Finance's public API. Not affiliated." · Built for the Strike Hackathon 2026 |

Rhythm check:

- [x] No two adjacent beats use the same pattern
- [x] Open and contained sections alternate (open hook, band, panel, open columns, inverted band, open close)
- [x] At most one inverted band, plus the footer
- [x] Centered: close only (hero is left, by direction)
- [x] Density alternates: airy hook, dense band, contained stage, dense columns, calm band, airy close
- [x] No two beats share a job
- [x] Six beats between nav and footer
- [x] The signature appears once on the landing page, in the second scroll

### Product screens

| Screen | Its one job | Primary action | States it needs |
|---|---|---|---|
| `/signin` | get in with a wallet or as a guest | Choose a wallet | no wallet found, waiting for signature, cancelled, error |
| `/play` | see my leagues, start or join one | Start a league | empty (no leagues), loading, error, success toast on create/join |
| `/leagues/[id]` setup | gather friends, start the draft | Start the draft (owner) | waiting for owner, copy invite success |
| `/leagues/[id]` drafting | make my picks | Draft [trader] | on the clock, waiting for others, pick conflict error, loading pool |
| `/leagues/[id]` ready | set my lineup, then play | Play the week (replay owner) / Save lineup | lineup invalid, saved toast, locked |
| `/leagues/[id]` live/final | watch my matchup | Replay the week | partial (live: days so far), error |

Four routes. The trader detail is a sheet inside the draft room, not a route.

---

## 5. Wireframes

### First viewport, 1440 x 900

```text
+--------------------------------------------------------------------------------------------------+
| FTL  FANTASY TRADING LEAGUE   SCORING   LAST WEEK   GITHUB                              [ PLAY NOW ]  |  64h bar, 1px line-strong bottom
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|  FANTASY FOOTBALL FOR STRIKE FINANCE                                                             |  label, mono, fg-mute
|                                                                                                  |
|  FIVE TRADERS.                                                                                   |  1. display-xl 152px, 800, 125% width, lh .88
|  SEVEN DAYS.                                                                                     |
|                                                                                                  |
|  Draft five real traders, and every trade they make on        [ START A LEAGUE ]                 |  lead 19px fg-soft, 560 max | 3. action
|  Strike this week scores for you. Free to play.               Watch last week's game ↓           |
|                                                                                                  |
+--------------------------------------------------------------------------------------------------+
| 540 TRADERS FOLLOWED  ·  43,368 TRADES LAST WEEK  ·  95 LIQUIDATIONS  ·  UPDATED 3 MIN AGO  ·   |  marquee band, 56h, 1px lines
+--------------------------------------------------------------------------------------------------+
| LAST WEEK · OCT 12 TO 18 · GAME OF THE WEEK                                                      |  2. scoreboard top edge at y~760
| Hodl Hannah                        134      152                        Margin Call Mike          |
```

### First viewport, 375 x 812

```text
+-----------------------------------+
| FTL                  [ PLAY NOW ] |  links collapse
|                                   |
| FANTASY FOOTBALL FOR STRIKE       |
| FIVE                              |  display-xl at 15vw (56px), 2 words per line
| TRADERS.                          |
| SEVEN                             |
| DAYS.                             |
|                                   |
| Draft five real traders, and      |  lead 17px
| every trade they make...          |
| [ START A LEAGUE              ]   |  full width 48px
| Watch last week's game ↓          |
| 540 TRADERS · 43,368 TRADES ·...  |  marquee
+-----------------------------------+
```

### The signature section, 1440

```text
| LAST WEEK · OCT 12 TO 18 · GAME OF THE WEEK                                    [ PLAY THE WEEK ] |
| A real week, replayed.                                                                           |  display-l
| Two lineups of real Strike traders. Every point below is a trade that happened.                  |
+--------------------------------------------------------------------------------------------------+
| FUNDING FIONA                    113           127                           SPREAD SAM          |  display-l numerals; leader in yellow
+--------------------------------------------------------------------------------------------------+
|  MON    |  TUE    |  WED    |  THU    |  FRI    |  SAT    |  SUN    |                            |  7 columns, 1px rules
|  21 26  |  23  6  |  17 17  |  22 13  |   9 30  |  11 20  |  10 15  |  day scores, mono
|  chips  |  chips  |  chips  |  [RED]  |  chips  |  chips  |  chips  |  trader chips: name + pts
+--------------------------------------------------------------------------------------------------+
|  worm: two polylines over 7 day ticks, leader yellow, other bone; crossing point marked          |  160h
+--------------------------------------------------------------------------------------------------+
```

**Alignment anchors:** container edge at the gutter (page max 1440); hero copy column 760px from the left edge; the action sits at the right of the lead row at 1440 and below it at 375; the scoreboard spans the container; its 7 day columns share the container width equally.

**Eye path:** 1. the headline "FIVE TRADERS. SEVEN DAYS." 2. the scoreboard numerals at the fold 3. START A LEAGUE

**Squint test:** the darkest, largest mass is the two-line headline, then the scoreboard totals. The button is bone on black: visible, smaller.

---

## 6. System (v2)

### Color

| Token | Value | Use |
|---|---|---|
| ground / surface / surface-2 | #15112A / #1E1838 / #282046 | page, panels, pressed |
| panel / tile | #1B1533 / #221B3D | cards and blocks |
| fg / fg-soft / fg-mute / fg-faint | #FFF6EA / #EADFD0 / #B3A8C4 / #7D7396 | warm white to lavender grey |
| line / line-strong | warm white at 10% / 28% | hairlines |
| action / on-action | #FF7A3D / #1A0B02 | the one primary action per section, with a #B3471A 4px underside |
| accent (gold) | #FFC93C | the lead, points as they land, gold tier |
| danger (red card) | #FF4D6D | liquidation, errors |
| success / warning | #3DDC97 / #FF9F43 | state only |
| style colors | degen #FF5C8A, scalper #5CC8FF, swing #3DDC97, steady #B794FF | card backgrounds and badges only |
| tier frames | bronze #D98C5F, silver #C9CFDA, gold #FFC93C, legend pink to orange to gold | card borders only |

### Type

| Role | Size | Line height | Tracking | Weight | Font |
|---|---|---|---|---|---|
| display-xl | clamp(48px, 7.5vw, 120px) | 0.92 | -0.035em | 800 | Bricolage Grotesque |
| display-l | clamp(34px, 4.6vw, 64px) | 0.98 | -0.03em | 800 | Bricolage Grotesque |
| display-m | clamp(24px, 2.4vw, 34px) | 1.05 | -0.02em | 800 | Bricolage Grotesque |
| title | 20px | 1.2 | -0.01em | 700 | Figtree |
| lead | 17 to 20px | 1.5 | 0 | 400 | Figtree |
| body / small | 16 / 14px | 1.55 / 1.5 | 0 | 400 | Figtree |
| label | 12px | 1.2 | +0.08em, uppercase | 700 | Figtree |
| num | per role | 1 | -0.02em | 800, tabular | Bricolage Grotesque |

### Shape, elevation, motion

| Thing | Decision |
|---|---|
| radius | chip 999, button 999, input 14, tile 16, card 20, panel 24 |
| card shadow | 0 18px 40px -18px rgb(0 0 0 / 0.7) |
| hover | cards lift 6px and straighten their tilt, 200ms |
| motion | ease cubic-bezier(0.2, 0.8, 0.2, 1); 160ms UI, 420ms reveals; the replay keeps 900ms per day |
| reduced motion | final states, no tilt animation, no pulse |

---

## 7. Pre-mortem

| Tell | In the plan? | Countermeasure |
|---|---|---|
| Purple gradient hero | no | flat near-black, type as image |
| Three icon feature tiles | risk in "how scoring works" | ruled columns led by giant numerals (1 to 10, -5, x1.5), no icons |
| Fake stats / logos / testimonials | no | every number in the marquee comes from /api/showcase; none hardcoded |
| Acid green on black (crypto default) | the direction's default accent was acid lime | changed to scoreboard yellow with one meaning; red card for liquidation |
| Centered everything | no | left-aligned editorial hero, centered close only |
| Generic dashboard screenshot | no | the signature is the real matchup component with real data |

**Three things a design director would wince at, and the fix:**

1. Huge display type next to dense data could feel like two sites. Fix: the same display face sets the scoreboard numerals, so the hero type and the data are visibly one voice.
2. Bot names ("Margin Call Mike") could read as cute. Fix: they appear only as manager names in mono, never as characters or avatars; real trader handles carry the screen.
3. The draft room could become a spreadsheet. Fix: one table with four columns, the style chip as the only color, the pick action on the row, and the draft board as the loud element.

**The screenshot sentence (v2).**

> A fanned hand of glowing trading cards of real Strike traders, gold and silver frames with crests and ratings, next to "Five traders. Seven days." under a sunset floodlight.

One site.

---

## 7b. Changes during the build

- 2026-10-21: the worm (two cumulative lines) became a lead line. In close games the two cumulative lines overlap
  all week, which hides exactly the drama the signature exists to show; a margin line crosses zero at every lead change.
- 2026-10-22: background glow fields removed; the ground is flat. Color comes from the cards, the action and the
  data. The only gradient left is the legend tier's card frame, because it means "rarest".
- 2026-10-21: the product is named FTL, Fantasy Trading League (was the working name Draft Week). Wordmark: FTL in
  the display face, with "Fantasy Trading League" as a mono label beside it in the nav.

## 8. Critique log

| Round | Date | Score /30 | Lowest dimensions | slop-check | Fixes made |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |

# DESIGN.md

The design of Draft Week, decided once, before the build. Every component answers to this file.
When the design changes, change this file first, then the code.

---

## 0. Thesis

```text
THESIS      A stadium scoreboard for Strike traders: the page is a game being played, not a product being sold. It refuses to look like an exchange.
WORLD       Near-black ground, Archivo 800 expanded display set like a jersey, mono for every number's label, hard 1px lines, zero radius. One accent, scoreboard yellow, means "the lead"; liquidation is the red card.
STORY       Hook (five traders, seven days) -> live facts band -> last week's game of the week, replayed -> how a trade becomes a point -> nothing is simulated -> play.
FIRST VIEW  1440: giant two-line headline left, lead + two actions, the facts marquee at the fold, the scoreboard's top edge visible. 375: the headline at 15vw, one action, marquee, scoreboard header.
SIGNATURE   The replay scoreboard: two managers' totals in huge numerals, a 7-day worm race drawing day by day, trader chips lighting with points, a red card flashing on a liquidation.
REFUSES     Candlestick charts and trading-terminal chrome; casino gold, coins and confetti; gradient blobs, glass cards and floating 3D.
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
| The element | `ReplayScoreboard`: header with the two managers and totals in display numerals; below, a 7-column day strip (MON to SUN) where each day reveals both lineups' trader chips with their points; a worm chart of both cumulative totals drawn across the days |
| Where it lives | Landing beat 4 (game of the week, real data, no sign-in) and the league screen in live/final (the user's own matchup). Same component |
| Still frame (what a screenshot shows) | Day 5 of 7: totals 92 to 92, the worms crossing, a red card on one chip, the leader's total in yellow |
| Motion (what changes, how long, how it loops or ends) | Press Play: each day takes 900ms; chips light left to right (60ms stagger), totals count up, the worm extends one segment; a liquidation flashes red once and holds; the leader's total turns yellow on a lead change. Ends on Sunday with the winner marked. Replay button restarts |
| Reduced motion (the honest still state) | The final state: all seven days revealed, final totals, winner marked, worm complete |
| At 375px | Header totals stacked tight; day strip becomes a horizontal snap scroller of day cards; worm full width, 120px tall |
| What it proves about the product | Points really come from real trades: real handles, real liquidations, real lead changes, from Strike mainnet |

---

## 3. Direction

**Chosen:** bold-signal from `references/directions.md`, dark first.

**Why this and not luminous-dark:** luminous-dark is discreet and technical (a privacy product); a fantasy league is loud, social and competitive, and its natural reference is a sports broadcast, not a terminal.

| Dial | Setting |
|---|---|
| Ground | dark only (`#0B0B0B`); the one inverted band uses bone `#F2F0E9` |
| Type voice | heavy display: Archivo 800 at 125% width for display and scores; Archivo 400/600 normal width for body; mono for labels |
| Density | dense and rhythmic: bands, ruled rows, a marquee |
| Corners | none. Zero radius everywhere |
| Surfaces | hard 1px lines; full-contrast 1px for interactive frames; offset hard shadow only on the floating sheet |
| Color strategy | monochrome + one accent (scoreboard yellow) + the red card (danger) as a state |
| Fonts | display/body: Archivo (Google, OFL, free); mono: JetBrains Mono (Google, OFL, free). Self-hosted by next/font, no runtime CDN |

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
| 1 | Nav | find the game, play it | full-width bar, 1px bottom line | quiet | edge | DRAFT WEEK · links: SCORING, LAST WEEK, GITHUB · [Play now] |
| 2 | Hook | what, why, what next | editorial statement | loud, airy | left | H1 "Five traders. / Seven days." Lead: "Fantasy football for Strike Finance. Draft five real traders, and every trade they make this week scores for you. Free to play." [Start a league] · Watch last week's game ↓ |
| 3 | Facts | prove it is live | marquee band | dense | full | 540 TRADERS FOLLOWED · 43,368 TRADES LAST WEEK · 95 LIQUIDATIONS · DATA UPDATED 3 MIN AGO · FREE TO PLAY · (numbers from /api/showcase) |
| 4 | Signature | show the game being played | live stage panel | contained | left header | Label "LAST WEEK · OCT 12 TO 18 · GAME OF THE WEEK". H2 "A real week, replayed." Lead: "Two lineups of real Strike traders. Every point below is a trade that happened." The ReplayScoreboard, [Play the week] |
| 5 | Mechanism | how a trade becomes a point | ruled columns, giant numerals | dense | left | H2 "How a trade becomes a point." Columns: "1 to 10 / Ranked daily. Every trader who traded that day is ranked by return against every other trader. Top tenth scores 10." · "-5 / Red card. A liquidation costs five points, on top of the day." · "x1.5 / Captain. Your captain counts one and a half. A starter who sits out is replaced by your first bench trader who traded." |
| 6 | Trust | nothing is simulated | inverted statement band (bone) | calm | left | H2 "Nothing here is simulated." Rows: "Every fill comes from Strike's public API." / "Refreshed every five minutes. Last update 3 min ago." / "Cards show last week, so nobody drafts with hindsight." |
| 7 | Close | one action | closing statement | loud, airy | center | H2 "Draft night is tonight." [Start a league] · "Sign in with your Strike wallet, or play as a guest." |
| 8 | Footer | identity, links | big wordmark footer | quiet | edge | DRAFT WEEK set at viewport width, cropped. Row: GitHub · Strike Finance · "Data from Strike Finance's public API. Not affiliated." · Built for the Strike Hackathon 2026 |

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
| DRAFT WEEK              SCORING   LAST WEEK   GITHUB                              [ PLAY NOW ]  |  64h bar, 1px line-strong bottom
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
| DRAFT WEEK           [ PLAY NOW ] |  links collapse
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

## 6. System

### Color

| Token | Dark (only mode) | Use |
|---|---|---|
| ground | #0B0B0B | the page |
| surface / surface-2 | #151515 / #1E1E1E | stages, panels, pressed |
| panel / tile | #111111 / #151515 | cards, blocks |
| fg / fg-soft / fg-mute / fg-faint | #F2F0E9 / #D6D3CA / #9A978F / #6B6963 | text strengths |
| line / line-strong | #2A2A2A / #F2F0E9 | rules, interactive frames |
| action / on-action | #F2F0E9 / #0B0B0B | the primary button (bone, not yellow) |
| accent / accent-soft / on-accent-soft | #FFD23F / rgb(255 210 63 / 0.12) / #FFE48A | the lead: leader's total, leading worm, points just scored |
| danger / danger-soft | #FF4D5E / rgb(255 77 94 / 0.14) | the red card (liquidation), errors |
| success / warning | #5EE08A / #FF9F43 | state only (saved, locked) |

Accent rule, in one sentence: yellow appears only on whoever is ahead and on points as they land, never on buttons, links, nav or decoration.

### Type

| Role | Size (375 to 1440) | Line height | Tracking | Weight | Font | Use |
|---|---|---|---|---|---|---|
| display-xl | clamp(56px, 9vw, 152px) | 0.88 | -0.05em | 800, wdth 125 | Archivo | hero only |
| display-l | clamp(36px, 5vw, 72px) | 0.95 | -0.04em | 800, wdth 125 | Archivo | section claims, scoreboard totals |
| display-m | clamp(24px, 2.6vw, 36px) | 1.05 | -0.03em | 800, wdth 125 | Archivo | day totals, league names |
| title | 20px | 1.2 | -0.02em | 700 | Archivo | card and column titles |
| lead | 19px (17px at 375) | 1.5 | 0 | 400 | Archivo | the sentence under a heading |
| body | 16px | 1.55 | 0 | 400 | Archivo | |
| small | 14px | 1.5 | 0 | 400 | Archivo | meta |
| label | 12px | 1.2 | +0.06em | 500 uppercase | JetBrains Mono | eyebrows, column heads, chips |
| num | per role | 1 | -0.02em | 800, tabular-nums | Archivo | points, totals |

Ratio check: hero 152 / body 16 = 9.5 at 1440 (bold-signal intends type as image; at 375 it is 56/16 = 3.5). Display tracking within -0.03 to -0.05. Two families, three weights (400, 700, 800).

### Space and layout

| Token | Value |
|---|---|
| page max width | 1440px |
| gutter (375 / 768 / 1440) | 16 / 19 / 36 (clamp(16px, 2.5vw, 40px)) |
| section padding | clamp(72px, 9vw, 128px) |
| heading to content | 40px |
| grid gap (tiles / columns) | 0, columns are separated by 1px rules |
| text column / prose measure | 560px lead, 640px prose |

### Shape and elevation

| Component | Radius | Border | Shadow |
|---|---|---|---|
| button | 0 | primary: none (bone fill); secondary: 1px line-strong | none |
| input | 0 | 1px line, 1px line-strong on focus | none |
| chip | 0 | 1px line | none |
| tile | 0 | 1px line | none |
| card | 0 | 1px line | none |
| panel | 0 | 1px line-strong | none |
| feature card | n/a | | |
| product frame (sheet, dialog) | 0 | 1px line-strong | 6px 6px 0 #F2F0E9 |

### Motion

| Token | Value |
|---|---|
| ease out | cubic-bezier(0.7, 0, 0.3, 1) |
| ease in-out | cubic-bezier(0.7, 0, 0.3, 1) |
| micro (hover, press) | 100ms |
| UI (sheets, tabs) | 160ms |
| reveal | 280ms, clip-path from the left, no fade, no translate |
| signature loop | 900ms per day, 60ms chip stagger, plays on button press, not on load |
| reduced motion | final state of everything; marquee stops |

### Components

| Component | Decision |
|---|---|
| Nav | full-width 64px bar, sticky, 1px line bottom; wordmark 800 expanded; links mono 12px; one bone action; at 375 wordmark + action only |
| Buttons | 48 (primary, bone fill), 44 (secondary outline), arrow link (mono). One primary per section |
| Surfaces | rows and ruled columns by default; panel only for the scoreboard and the draft board; chips for traders |
| Inputs | 48px, zero radius, mono placeholder, bone focus ring 2px |
| Labels / eyebrows | mono 12px uppercase +0.06em, fg-mute |
| Status chips | league status (SETUP, DRAFTING, READY, LIVE, FINAL) and trader style; LIVE gets a 6px danger dot that pulses |
| Footer | giant cropped wordmark, one ruled link row, the not-affiliated line |
| Icons | almost none: arrows as text glyphs, a 1.5px stroke copy icon, a red card glyph (a rotated red rectangle) |
| Imagery | product UI only (the scoreboard, the draft board); no photos, no illustrations |

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

**The screenshot sentence.**

> A black scoreboard where two lineups of real Strike traders race across seven days, the totals tied at 92 with one trader flagged by a red card.

One site.

---

## 8. Critique log

| Round | Date | Score /30 | Lowest dimensions | slop-check | Fixes made |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |

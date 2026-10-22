# FTL: why people play, and how the money works

As of 2026-10-22. Shared version: https://claude.ai/artifact/28pZnm1NBsp8b3heEodnUH

## Summary

FTL gives Strike traders a free weekly game: pick five real traders, beat your friends, and win a prize pot. Nobody pays to play, so nobody loses money by playing.

The game turns into real Strike activity in one step. Players can copy the traders they picked using Strike's own copy trading, and copied traders earn Strike's 10% profit share. That gives traders a reason to want to be picked, and to tell their followers about FTL.

FTL earns from trading, not from players. It takes a builder fee (up to 1%) on trades placed through its app, and later a manager's commission on an FTL vault. Both fund the weekly prize pots, which Strike or a sponsor seeds until fees can carry them.

## Why anyone uses FTL

People come for four reasons: a free prize, bragging rights over friends, a better way to find traders worth copying, and status for the traders themselves. Each group below gets something it cannot get on Strike today.

| Who | What they want | What FTL gives them | What brings them in |
| --- | --- | --- | --- |
| Strike traders (about 540 active in the last 30 days) | Something to do with friends that is not another leveraged trade | A free weekly league against their clan or group chat, scored on real trades | A weekly STRIKE prize pot, free to enter, and an invite code from a friend |
| Copy traders | To know who is actually good before risking money | Ratings, grades and a week of watching a trader score before copying them | "Back your squad": copy your five picks in one tap, with safe limits |
| The traders being picked | Followers, status, income | A rated card they can share ("I'm a 97 Legend on FTL"), copiers, and Strike's 10% profit share from those copiers | Their card, made for them, with their own Strike avatar where they have one |
| Newcomers to perps | To learn without losing money | A season of watching real traders win and get liquidated, with zero risk | Guest play with no wallet, then a wallet sign-in when they are ready |
| Strike | More active users and more volume | A weekly reason to open Strike, copy volume, and a budget bonus that rewards players for trading on Strike | A product built on its public data and native copy trading, at no cost to Strike |

The strongest single reason is the free prize pot; the stickiest is playing against friends. Without a pot, FTL is a curiosity; with one, it is a weekly habit.

## The weekly loop

1. **Pick five traders** within your budget. Free, against friends.
2. **Watch them score.** Points come from their real trades on Strike.
3. **Back your squad.** Copy them on Strike, with limits you set.
4. **Traders get paid.** Strike pays them 10% of their copiers' profit.
5. **Traders share their cards.** Their followers join FTL for next week.

The loop closes at the last step: traders who are picked and copied earn Strike's profit share, so they bring their followers to next week's league. "Back your squad" is the step that turns a free game into real Strike volume.

## How money moves on Strike today

FTL can earn from two of these: the builder fee now and the vault commission later. Everything else either pays someone else or only covers brand-new users.

| Mechanism | Who pays | Who earns | Rate | Can FTL use it? |
| --- | --- | --- | --- | --- |
| [Trading fee](https://docs.strikefinance.org/perpetuals/trading-fees) | Every trader | Strike, liquidity providers, STRIKE stakers | 0.05% taker at the base tier; makers get a 0.005% rebate | No |
| [Builder fee](https://docs.strikefinance.org/api/builder-codes) | A trader whose order an app places | The app (FTL) | Up to 1%, capped by what the user approves, charged on fill | Yes, needs a registered builder code |
| [Copy profit share](https://docs.strikefinance.org/perpetuals/copy-trading) | A copier, when they stop a profitable copy | The copied Strike trader | 10% of profit; losses are not shared | Not directly. It is the traders' reason to want to be picked |
| [Referral reward](https://docs.strikefinance.org/perpetuals/referrals) | Strike, out of referred traders' fees | The referrer | 20% to 40% of fees, plus 12% one level further | Weak: only new sign-ups, and the code needs $10,000 of your own volume |
| [Vault leader commission](https://docs.strikefinance.org/api/vault-leader) | Vault depositors, out of profits | The vault's manager | Set per vault; one Strike test vault charges 10% | Yes, later, with capital and a strategy |

For scale: Strike's own dashboard showed $165,130 of lifetime revenue on $747.6 million of volume on 2026-10-21, about 0.02% of volume. FTL's share of that flow will be small at first, so prize pots need a seed.

## FTL's model, in three phases

FTL starts free and earns nothing, then earns from trades it places, then from a vault it runs. Players never pay to play in any phase.

| Phase | What ships | Who pays | What FTL earns | What it needs |
| --- | --- | --- | --- | --- |
| Now (hackathon) | Free weekly leagues, guest and wallet sign-in, a budget bonus for trading on Strike, "Back your squad" with Strike's native copy trading | Nobody extra; copiers pay Strike's normal fees and the 10% profit share to traders | Nothing | A registered builder code, so FTL can set up copies for users |
| Next (first month) | "Trade like this card": one tap to open the same position as a picked trader, placed by FTL. Cards with Strike avatars. Bigger leagues for STRIKE holders | Traders who use the one-tap button, through the builder fee | A builder fee on those trades, for example 0.1% | The builder code, and order safety limits in the app |
| Later | An FTL vault on Strike that trades the week's most-picked squad. Official leagues for Strike clans | Vault depositors, out of profits only | The manager's commission, for example 10% of profits | Starting capital, a tested strategy, and a Strike vault (how vaults are created is not confirmed yet) |

Every phase sends part of what FTL earns into the next weekly prize pot. The split is a decision for later, once there are real numbers.

## Prize pots

A weekly pot only ever pays out what came in, so it can never run dry the way an entry-fee pool does. At Strike's current size, fees alone make a modest pot, which is why the first seasons need a seed.

The example below is arithmetic on assumptions, not a forecast. Every input marked "assumed" is a guess to replace with real numbers.

| Source | Inputs | Per week |
| --- | --- | --- |
| Builder fee on one-tap trades | 200 players (assumed), half of them trade $10,000 a week through FTL (assumed), 0.1% fee | $1,000 |
| FTL vault commission | $50,000 deposited (assumed), 2% weekly profit (assumed), 10% commission | $100 |
| Seed from Strike or a sponsor | Agreed per season, paid in STRIKE | to agree |

If half of FTL's earnings go into the pot, the example gives about $550 a week before any seed. The pot is paid in STRIKE to the top managers of each week, and STRIKE-holder leagues can carry a larger share.

## What we rejected, and why

| Option | Why not |
| --- | --- |
| Entry fees in STRIKE, winners take the pot | Losers fund winners, so casual players drain away and the pot shrinks. It also reads as gambling, which raises legal questions in many countries |
| Funding pots from referral rewards | Referrals only pay on brand-new Strike users, so the 6,000 people already on Strike would bring in nothing |
| FTL copying trades with its own engine | FTL would have to hold keys that can trade users' money, and its copies would lag Strike's own copy engine by seconds |

## Risks and open questions

- **Small audience.** About 540 Strike traders were active in the last 30 days and about 200 are pickable in a given week. Leagues work at this size; a big public game needs Strike to grow.
- **Copying through FTL is untested.** Strike's docs say all trading endpoints work with app-created trading keys, but we have not called the copy endpoint with one. That needs the builder code.
- **Builder fees do not apply to copies.** Strike's engine places copy orders, not FTL, so the fee only applies to trades FTL places itself. This is read from the docs, not tested.
- **Prize pots and regulation.** Free entry with sponsored prizes is the safest model, but prizes paid in a token still deserve a check before real money flows.
- **Traders on cards.** Names, handles and avatars are already public on Strike's leaderboard. FTL should still let any trader opt out of being picked, and it already stores an opt-out flag.
- **Vault details.** How a Strike vault is created, and what commission it may charge, is not confirmed.

## Decisions needed

- [ ] Register a builder code at app.strikefinance.org/builder-codes, so FTL can set up copies and place one-tap trades
- [ ] Ask Strike whether they would seed a weekly STRIKE prize pot for the first seasons
- [ ] Choose the builder fee for one-tap trades (0.1% is the example used here)
- [ ] Confirm "Back your squad" ships in the hackathon build, or stays a link to each trader on Strike

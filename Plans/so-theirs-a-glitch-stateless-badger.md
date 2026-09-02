# Fix the TAP bonus claim button — one click, no dollar amount

## Context

Two production complaints, both from the same root cause — a dollar figure on a button that reads like a per-click payment, on a ladder that is actually incremental:

1. A creator who never claimed and is already past $1M is walked up the ladder one goal at a time. `js/shop-dashboard.js:478` uses `.find()` over an ascending array, so it offers the *lowest* unclaimed goal reached, not the highest. Three clicks, three records, three emails.
2. A creator who already claimed a lower goal and reaches the next sees `CLAIM $1,500` and reads it as a flat $1,500 payment rather than the increment for that goal.

Fix: **the button says `CLAIM BONUS` with no dollar figure, and one click settles every goal earned so far.** The notification emails keep their current wording and amounts, so the payout check is unchanged.

## Settled: the ladder is incremental

Confirmed 2026-09-01. This matches `Plans/vast-wiggling-pearl.md:7` and the existing page markers.

| Goal | TAP GMV | Pays | Running total |
|---|---|---|---|
| GOAL 1 | $100K | $500 | $500 |
| GOAL 2 | $250K | +$1,000 | $1,500 |
| GOAL 3 | $1M | +$1,500 | $3,000 |

**Consequence that drives the design:** a creator at $1M who never claimed is owed all three, $3,000. A single click must therefore record **every** earned-but-unclaimed goal — recording only the highest would silently cost that creator $1,500.

The existing ladder markers at `shop-dashboard.html:406,412,418` ("$500", "$1.5K Total", "$3K Total") are correct under this reading and stay as they are. The header comment at `js/shop-dashboard.js:17-19` is also correct and stays.

## Changes

All in `js/shop-dashboard.js`. **No Apps Script edit, so no redeploy.**

### 1. One click settles every earned goal — `js/shop-dashboard.js:478, 581-614`

Replace the single-tier `nextClaim` with the full set of earned-but-unclaimed goals:

```js
const claimable = TAP_BONUS_TIERS.filter(t => tapYTD >= t.threshold && !claimedTiers.has(t.key));
```

`handleTapBonusClaim` takes that array and writes each `{uid}_{tier}` document, firing the existing webhook once per goal. Reuse the current function body verbatim — same `setDoc` shape, same fire-and-forget `fetch`, same `text/plain` content type (the comment at `:596-599` explains why that must not change). The button disables once for the whole batch instead of once per goal, and the existing failure `alert()` path stays.

Net effect: the creator clicks once; the ledger and the emails come out exactly as they would have after three separate clicks today, so nothing downstream changes.

### 2. Drop the dollar amount from the button — `js/shop-dashboard.js:482`

```js
tapYTDDisplay.textContent = nextClaim.goal + ': CLAIM $' + nextClaim.amount.toLocaleString() + ' BONUS';
```
becomes
```js
tapYTDDisplay.textContent = 'CLAIM BONUS';
```

### 3. Claimed-state label — `js/shop-dashboard.js:489`

`'$' + lastClaimed.amount + ' CLAIMED'` becomes `'BONUS CLAIMED'`, for the same reason — `$1,500 CLAIMED` reads as "I was just paid $1,500" when it is only that goal's increment. My call on wording; say so if you'd rather it show the running total.

### 4. Update the state-machine comment — `js/shop-dashboard.js:425-427`

It documents the old lowest-first behaviour and the `GOAL N: CLAIM $X BONUS` label. Bring it in line with the batch behaviour.

## Explicitly unchanged

- `scripts/tap-bonus-email.gs` — same subject, body, amounts. **No redeploy.**
- `firestore-production.rules` — `{uid}_{tier}` create-only still holds; a batch of one-create-per-goal is fine.
- Firestore record shape and webhook payload.
- `shop-dashboard.html:405-418` ladder markers — correct as-is under the incremental ladder.

## Verification

1. `node --check js/shop-dashboard.js`
2. `node validate-and-deploy-shop.js`, push, wait for Pages.
3. Confirm the deploy replaced the cached file:
   ```
   curl -s https://shop.taboost.me/js/shop-dashboard.js | grep -c "CLAIM BONUS"   # expect 1
   curl -s https://shop.taboost.me/js/shop-dashboard.js | grep -c "CLAIM \$"      # expect 0
   ```
4. In-browser on a test account, driving the renderer from devtools (no writes needed to check labels):
   - `renderTapGoalsSection(50000)` → progress state, no claim button
   - `renderTapGoalsSection(150000)` → `CLAIM BONUS`
   - `renderTapGoalsSection(1200000)` with no prior claims → `CLAIM BONUS`; **one** click writes `tier1`, `tier2` and `tier3`, then the button reads `BONUS CLAIMED`
   - with `tier1` pre-existing → one click writes only `tier2` and `tier3`
5. Confirm info@taboost.me receives one email per newly-claimed goal, wording unchanged — three emails totalling $3,000 for the never-claimed $1M creator.

## Follow-ups found while exploring — not in this change

- **Creators already affected.** Some hold multiple claim records from the ladder-walking flow. A read-only report of every creator with more than one `tapBonusClaims` document, and what each goal was worth, would let you reconcile before the next payout run.
- **`scripts/cashback-claim-email.gs` is untracked by git** and still sends to `marco@taboost.me` with a different secret property name (`CASHBACK_SECRET`). It is a near-duplicate of the TAP script and will drift silently. Which of the two is actually deployed cannot be determined from the repo.
- **Five copies of the tier table** (`js/shop-dashboard.js:25`, `scripts/tap-bonus-email.gs:26`, `scripts/cashback-claim-email.gs:25`, `tap-bonus-mark-claimed.html:22`, plus the prose ladder in `shop-dashboard.html:405-418`). Any amount change needs five coordinated edits, one in an untracked file and one in a Google-hosted script.
- **No wrong-claim reversal exists.** `tap-bonus-mark-claimed.html` is additive only — it cannot delete or amend a claim, and its `exists()` guard makes it a no-op on the record you would want to fix. Fixing one means the Firebase console.
- **Milestone still unverified server-side** — a creator can forge a claim from the browser console. This change makes the honest path correct; it does not close that.

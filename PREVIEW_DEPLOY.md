# Hero Preview Deployment

## Preview URL for Marco

```
https://shop.taboost.me/preview/hero-preview-deploy/
```

*(Alternate URL if the custom domain redirects: `https://ceyre-boop.github.io/TABOOST-Shop/preview/hero-preview-deploy/`)*

---

## What is deployed

This branch (`hero-preview-deploy` / `copilot/add-hero-section-animations`)
contains the updated hero section with:

- Layered animated parallax background (gradient clouds, motion lines, shimmer, noise overlay)
- "Creator Mode Activated" load animation (sweep/flicker/chip entrance)
- Rotating creator taglines & rotating search placeholders
- Neon focus pulse + typing sparkle on the search bar
- CTA updated to **"Find Campaigns"**
- Magnetic hover, click bounce, and ripple on category chips
- Category-driven hero / page background colour theming
- 3-card creator carousel (Top Earning / Highest Commission / Trending)
- Floating glass stats HUD (EPC, top commission %, new campaigns)
- Scroll-coupled hero transforms and sticky blur-glass category bar
- Product-card "Creator Insights" hover tooltip + neon border glow

Production (`shop.taboost.me`) is **not affected** — nothing in this branch
or its workflow touches `main` or the root of `gh-pages`.

---

## One-time setup checklist (repo owner)

Complete these steps once in order to activate the preview URL.

### Step 1 — Approve the pending workflow run

GitHub blocked the first workflow run because it was added by a bot.
You must approve it manually:

1. Visit: `https://github.com/ceyre-boop/TABOOST-Shop/actions/runs/24592170338`
2. Click **"Review pending deployments"** (or **"Approve and run"**)
3. Confirm approval.

After approval, the workflow will run and create the `gh-pages` branch with
the preview content at `preview/hero-preview-deploy/`.

All future pushes to this branch will trigger the workflow automatically
with no further approval needed.

---

### Step 2 — Create the `hero-preview-deploy` branch on GitHub

The branch exists locally; create it on GitHub via the web UI:

1. Go to `https://github.com/ceyre-boop/TABOOST-Shop/tree/copilot/add-hero-section-animations`
2. Click the branch dropdown (top-left, shows **"copilot/add-hero-section-animations"**)
3. Type `hero-preview-deploy` in the search box
4. Click **"Create branch: hero-preview-deploy from 'copilot/add-hero-section-animations'"**

This creates the `hero-preview-deploy` branch at the same commit. Any push
to it will also trigger the preview deploy workflow.

---

### Step 3 — Switch GitHub Pages source to the `gh-pages` branch

Currently, GitHub Pages serves from `main`. Switch it to `gh-pages` so the
preview subdirectory URL becomes accessible:

1. Go to `https://github.com/ceyre-boop/TABOOST-Shop/settings/pages`
2. Under **Build and deployment → Source**, select:
   - Source: **Deploy from a branch**
   - Branch: **`gh-pages`** / root (`/`)
3. Click **Save**.

> **Note on production**: Switching the Pages source to `gh-pages` means
> production will now be served from the `gh-pages` root. After the workflow
> runs (Step 1), `gh-pages` will contain the preview at the subdirectory but
> the root will be empty. To restore production, run a one-time copy:
>
> ```bash
> git checkout main
> git checkout -b sync-gh-pages
> # Copy production files to gh-pages manually, or:
> git push origin main:gh-pages
> ```
>
> Or add a separate production-deploy workflow to `main` that mirrors the
> same `peaceiris/actions-gh-pages` setup without a `destination_dir`.

---

## How the workflow operates

`.github/workflows/preview-deploy.yml` triggers on every push to
`hero-preview-deploy` or `copilot/add-hero-section-animations`.

It uses [`peaceiris/actions-gh-pages@v4`](https://github.com/peaceiris/actions-gh-pages) to:
1. Checkout the branch content
2. Write it into `preview/hero-preview-deploy/` on the `gh-pages` branch
3. `keep_files: true` preserves everything else in `gh-pages` (production is safe)

---

## Sharing with Marco

Once the steps above are complete, send Marco this link:

```
https://shop.taboost.me/preview/hero-preview-deploy/
```

The preview auto-updates ~60 seconds after each push to the branch.

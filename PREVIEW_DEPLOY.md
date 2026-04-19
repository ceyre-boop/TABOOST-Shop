# Hero Preview Deployment

## Preview URL for Marco

```
https://shop.taboost.me/preview/hero-preview-deploy/
```

*(Alternate: `https://ceyre-boop.github.io/TABOOST-Shop/preview/hero-preview-deploy/`)*

---

## What is deployed

This branch contains the updated hero section with:

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

---

## How the preview deployment works

`.github/workflows/preview-deploy.yml` triggers on every push to
`hero-preview-deploy` or `copilot/add-hero-section-animations`.

On each run it:
1. Checks out this branch (preview content)
2. Checks out `main` (production content)
3. Builds a combined `deploy/` folder:
   - `deploy/` root ← production content from `main`
   - `deploy/preview/hero-preview-deploy/` ← this branch's content
4. Pushes the whole thing to the `gh-pages` branch

This means:
- `shop.taboost.me/` → production (always up to date with `main`)
- `shop.taboost.me/preview/hero-preview-deploy/` → the updated hero preview

**Production is never affected** — `main` itself is never touched.

---

## Setup checklist

- [x] Approve the first workflow run (GitHub bot security gate)
- [x] Create `hero-preview-deploy` branch on GitHub
- [x] Switch GitHub Pages source to `gh-pages` branch in Settings → Pages
- [ ] Push any new commit to `hero-preview-deploy` to trigger a fresh deploy
      (or re-run the latest workflow run manually)

### Trigger a re-deploy manually

1. Go to `https://github.com/ceyre-boop/TABOOST-Shop/actions/workflows/preview-deploy.yml`
2. Click **"Run workflow"** → select branch `hero-preview-deploy` → **"Run workflow"**

The preview URL will be live within ~60 seconds.

---

## Sharing with Marco

```
https://shop.taboost.me/preview/hero-preview-deploy/
```


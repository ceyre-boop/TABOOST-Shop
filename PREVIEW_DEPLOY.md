# Hero Preview Deployment

## Preview URL

```
https://shop.taboost.me/preview/hero-preview-deploy/
```

*(Accessible also as `https://ceyre-boop.github.io/TABOOST-Shop/preview/hero-preview-deploy/`)*

---

## What is deployed

Branch `hero-preview-deploy` contains the updated hero section with:

- Layered animated parallax background (gradient clouds, motion lines, shimmer, noise overlay)
- "Creator Mode Activated" load animation (sweep/flicker/chip entrance)
- Rotating taglines & rotating search placeholders
- Neon focus pulse + typing sparkle on the search bar
- Magnetic hover, click bounce, and ripple on category chips
- Category-driven hero / page background colour theming
- 3-card creator carousel (Top Earning / Highest Commission / Trending)
- Floating glass stats HUD (EPC, top commission %, new campaigns)
- Scroll-coupled hero transforms and sticky blur-glass category bar
- Product-card "Creator Insights" hover tooltip + neon border glow

---

## How the preview deployment works

The workflow `.github/workflows/preview-deploy.yml` runs automatically on every
push to this branch. It uses `peaceiris/actions-gh-pages` to copy the site
files into the `gh-pages` branch at the path `preview/hero-preview-deploy/`.
The `keep_files: true` option ensures the rest of the `gh-pages` branch (e.g.
the production site at the root) is **never deleted**.

### One-time setup required by the repository owner

GitHub Pages is currently configured to serve from the **`main` branch**.
To enable the preview subdirectory URL, change the Pages source to the
**`gh-pages` branch**:

1. Go to `https://github.com/ceyre-boop/TABOOST-Shop/settings/pages`
2. Under **Build and deployment → Source**, select:
   - Source: **Deploy from a branch**
   - Branch: **`gh-pages`** / `/ (root)`
3. Click **Save**.

Once this is done:
- Production (`shop.taboost.me/`) will continue to be served from the `gh-pages`
  root — which should already contain the production build. If the `gh-pages`
  branch was created fresh by this workflow, the root will be empty until a
  production deploy is run. In that case, merge or cherry-pick the production
  deploy workflow to `main`, or copy the site files to `gh-pages` root once.
- The preview will be live at:
  `https://shop.taboost.me/preview/hero-preview-deploy/`

> **Production is safe.** Nothing in this branch or its workflow touches the
> `main` branch or the root of `gh-pages`. The preview lives exclusively
> under `preview/hero-preview-deploy/`.

---

## Sharing the preview

Send Marco this URL:

```
https://shop.taboost.me/preview/hero-preview-deploy/
```

The link will update automatically whenever a new commit is pushed to this
branch (the GitHub Actions workflow re-deploys within ~60 seconds).

# Plan — Genie flow: three bug fixes

## Context

Three reported bugs in the Ask-the-Genie flow on `genie-preview` (the spec says `demo` /
`.subcategory-pill` / `.genie-modal`, but those are placeholders — real branch is `genie-preview`,
the panel is `.genie-panel`, pills are `.genie-chip`). Root causes confirmed by reading
`js/genie.js`, `css/genie.css`, and `index.html`:

- **Bug 1 (red pill leak)** — `render()` already wipes `panelBody.innerHTML` on every view and
  recreates chips from scratch, and **nothing in the JS ever adds `.active`/`.selected` to a chip.**
  So the proposed class-strip would be a no-op. The actual cause is CSS: `css/genie.css:168`
  styles `.genie-chip:hover` red, and on touch devices `:hover` **sticks after a tap** — when the
  next view renders a chip under the same finger position, it inherits the stuck hover. That's why
  a specific sub-pill (Jewelry, Toys & Baby) looks "selected on load."
- **Bug 2 (no movement on tap)** — the sub-pill handler calls `applyNiche(sub); closePanel();`.
  `applyNiche` fires the homepage search (results render, panel closes) but **never scrolls**, so
  the user is left at the top looking at the hero while results sit far below.
- **Bug 3 (Priority Campaigns dead)** — Genie's Priority Campaigns chip only does
  `closePanel()` + scroll to `#featured-section`, but **skips `clearSearch()`**. If a search is
  active, `#featured-section` is `display:none`, so scrolling to it does nothing. The homepage pill
  works because it calls `clearSearch()` first (un-hides the section).

Outcome: pills never look pre-selected, tapping a subcategory lands the user on the results, and
Genie's Priority Campaigns behaves exactly like the homepage pill.

---

## Fixes

### Bug 1 — sticky-hover (CSS, fixes every category at once) — `css/genie.css:168`
Split the combined rule so `.active` stays global but `:hover` only applies on real pointers:
```css
.genie-chip.active { border-color: var(--genie-pink); background: rgba(255,0,68,0.12); color: #fff; }
@media (hover: hover) {
  .genie-chip:hover { border-color: var(--genie-pink); background: rgba(255,0,68,0.12); color: #fff; }
}
```
One change covers all main categories and subcategories — no per-category work, and no JS needed.
*(Why not the spec's class-strip: chips are recreated each render and never carry a class, so
removing `.active`/`.selected` strips nothing. This targets the true cause.)*

### Bug 2 — scroll to results — `js/genie.js`, `applyNiche()` (~line 334)
After the search fires, scroll to the results container. Centralizing it in `applyNiche` fixes the
subcategory tap **and** the niche / High-Commission Genie chips (all route through `applyNiche`):
```js
function applyNiche(niche) {
  var input = document.getElementById('main-search');
  var trigger = document.getElementById('search-trigger');
  if (input && trigger) { input.value = niche; trigger.click(); }
  var results = document.getElementById('search-results-container');
  if (results) window.scrollTo({ top: Math.max(0, results.offsetTop - 80), behavior: 'smooth' });
}
```
`handleSearch` runs synchronously on `trigger.click()`, so the container is rendered/visible before
we measure `offsetTop`. `closePanel()` in the chip handler is unchanged.

### Bug 3 — reuse the homepage handler (no duplicated logic) — `index.html` + `js/genie.js`
1. **`index.html`** — extract the campaigns-pill logic (currently inline at lines 1400–1404) into a
   named global, placed right after `clearSearch()` (~line 1374):
   ```js
   window.showPriorityCampaigns = function () {
     clearSearch();
     const f = document.getElementById('featured-section');
     if (f) window.scrollTo({ top: Math.max(0, f.offsetTop - 80), behavior: 'smooth' });
   };
   ```
   Then the pill handler block becomes just:
   ```js
   if (tag.dataset.action === 'campaigns') { showPriorityCampaigns(); return; }
   ```
2. **`js/genie.js`** — the Priority Campaigns chip (`viewFindCat`, ~line 370) calls the same handler
   instead of its own partial logic:
   ```js
   pc.addEventListener('click', function () {
     closePanel();
     if (window.showPriorityCampaigns) window.showPriorityCampaigns();
   });
   ```

Files touched: `css/genie.css` (1 rule), `js/genie.js` (2 spots), `index.html` (2 spots).

---

## Verification

These are interaction/CSS bugs — Node can only confirm no syntax errors (`node --check js/genie.js`).
Behavioral checks happen in the browser. Interceptor isn't installed locally, so this runs on the
rebuilt `genie-preview` preview (or a local static server with mobile emulation / touch for Bug 1):

1. Genie → Find a product → **Fashion** → "Jewelry Accessories & Derivatives" shows **no red** on load.
2. ← Categories → **Toys & Baby** → no red pill on load; bounce between categories repeatedly → no
   state carries over. *(Must be tested with touch / mobile emulation — sticky hover doesn't repro with a mouse.)*
3. Tap any subcategory → panel closes → page **scrolls to the product results**.
4. Open Genie → **Priority Campaigns** → campaign tiles render/scroll into view — including **after a
   prior search** was active (the case that was broken).

Ship (branch corrected to `genie-preview`):
```bash
git add css/genie.css js/genie.js index.html
git commit -m "fix: genie subcategory sticky-hover, scroll on selection, priority campaigns reuse handler"
git push origin genie-preview
```

## Out of scope
- Mobile search-results header text removal (still parked).
- Scoring tuning (rating-fidelity vs rotation levers) from the prior task.

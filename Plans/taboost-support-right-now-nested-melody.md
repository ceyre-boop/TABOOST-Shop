# Plan — Wire Kyra's Genie scripts into the live Genie (genie-preview)

## Context

The Genie's per-product script generator was built but stubbed behind "Updated scripts coming
soon" while Kyra wrote the real copy. That copy is now delivered in
`.github/workflows/Genie_scripts.md` (odd location — it'll be moved). It contains **11 categories**
(Beauty, Fashion, Electronics, Home, Health, Sports, Kitchen, Pets, Accessories, Food, Toys) ×
**6 angles** (Generic, Storytime, Educational, Before/After, Product Demo, Skit/Comedy) ×
**HOOK / THE BUILD / THE TURN / THE CLOSE**, each with 3–5 alternative human-written lines and
`[product]` / `[insert feature]` placeholders.

The engine to display this already exists in `js/genie.js` — `renderScript()`, `buildScript()`,
`scriptToText()`, the angle chips, `Genie.onProductSelected` (called from `index.html:1493`), and
the CSS (`.genie-script-trigger`, `.genie-gen-btn`, `.genie-script-content.expanded`). It was just
disabled. This task feeds Kyra's content into `buildScript` and un-stubs the mount.

**Chosen UX:** show **one** randomly-picked line per section (a clean 4-beat script) with a
**🔀 Shuffle lines** button to swap lines and the existing **🔀 Different angle** to switch angle.

> Branch: `genie-preview` only. `main` untouched.

---

## Approach — MD is the source, generate a JS data file (Code-before-prompts)

Don't parse markdown at runtime. A Node build step converts the MD → a static JS data file the
browser loads, mirroring the repo's existing `update-*.js` / `build-*.js` pipeline pattern.

### 1. New `build-genie-scripts.js` (Node parser)
Reads the source MD, emits `js/genie-scripts-data.js`:
```js
window.GENIE_SCRIPTS = {
  "Beauty":   { "balanced": {hook:[...],build:[...],turn:[...],close:[...]}, "storytime":{...},
                "educational":{...}, "beforeafter":{...}, "demo":{...}, "skit":{...} },
  "Fashion":  {...}, /* …11 categories total… */
};
```
Parser must be **lenient** — the MD has smart quotes, occasional missing quote marks, section
headers sometimes glued to the previous line (e.g. `…what are we doing?" THE TURN:`), and stray
colons. Rules: detect CATEGORY by known ALL-CAPS names; map angle headers
(Generic→`balanced`, Storytime→`storytime`, Educational→`educational`, Before/After→`beforeafter`,
Product Demo→`demo`, Skit/Comedy→`skit`); detect `HOOK|THE BUILD|THE TURN|THE CLOSE` even mid-line;
strip surrounding quotes from each line. **Validate + log** counts (expect 11×6×4, each ≥1 line);
fail loudly if a section is empty.

### 2. `js/genie.js` — point the engine at the data
- **`CATEGORY_TO_BUCKET`** map: granular product `category` → MD bucket. Direct maps for covered
  ones (e.g. `'Beauty & Personal Care'→Beauty`, `'Womenswear & Underwear'→Fashion`,
  `'Fashion Accessories'`/`'Jewelry Accessories & Derivatives'`/`'Luggage & Bags'→Accessories`,
  `'Phones & Electronics'`/`'Computers & Office Equipment'→Electronics`,
  `'Home Supplies'`/`'Household Appliances'`/`'Furniture'`/`'Home Improvement'`/`'Textiles & Soft Furnishings'`/`'Tools & Hardware'→Home`,
  `'Kitchenware'→Kitchen`, `'Sports & Outdoor'→Sports`, `'Food & Beverages'→Food`,
  `'Pet Supplies'→Pets`, `'Toys & Hobbies'→Toys`, `'Health'→Health`). Uncovered
  (`Automotive & Motorcycle`, `Baby & Maternity`, `Other`) → no bucket.
- **`buildScript(item, angleId)`**: if `GENIE_SCRIPTS[bucket][angleId]` exists, return the 4 blocks
  with `bullets:[pickLine(section, item)]` — `pickLine` picks one random line and substitutes
  `[product]` → `shortName(item.name)` (leaves `[insert …]` for the creator). **Else fall back** to
  the existing generated angle functions (`angleBalanced` etc.) so uncovered categories still work.
- **`ANGLES`**: drop the `unboxing` entry (Kyra didn't write it) → 6 chips. Keep the other labels.
- **`renderScript()`**: add a **🔀 Shuffle lines** button that re-calls `renderScript()` (fresh
  random picks); keep **Different angle** and **Copy Script** (`scriptToText` already serializes
  one-line blocks). Store the last-rendered blocks for Copy/save.
- **`mountScriptSection()`**: replace the "coming soon" pill with the real trigger + content box +
  a "Get my script →" button that toggles `.expanded` and calls `renderScript()` (CSS already
  present). `onProductSelected` already mounts + clears the box — unchanged.
- **Copy updates**: `viewOrient` step 3 (line ~299) and `viewMenu` tip (line ~419) — replace
  "Updated Genie scripts are coming soon" with live messaging ("tap a product → Genie Script").
- **Optional**: re-enable `onLaunch` save-for-filming via the existing `showFollowUp`/`pushSaved`
  using the last-rendered blocks (the `viewSaved` UI already exists).

### 3. `index.html` — load the data + cache-bust
- Add `<script src="js/genie-scripts-data.js?v=20260626"></script>` immediately before
  `js/genie.js` (so `window.GENIE_SCRIPTS` exists first).
- Bump `js/genie.js?v=20260625` → `?v=20260626`.

### 4. Source file housekeeping
`git mv .github/workflows/Genie_scripts.md genie-scripts.md` (repo root = canonical source; the
`.github/workflows/` location is wrong and confusing). `build-genie-scripts.js` reads it from there.
Note in-repo: `js/genie-scripts-data.js` is **generated — edit the MD and rebuild**, never hand-edit
(same rule as `shop-data.js`).

Files: `build-genie-scripts.js` (new), `js/genie-scripts-data.js` (new, generated), `js/genie.js`,
`index.html`, `genie-scripts.md` (moved). Execution at E3 — Forge may write the lenient parser.

---

## Verification

1. `node build-genie-scripts.js` → confirm log shows all 11 categories × 6 angles × 4 sections
   populated (no empties); spot-check Beauty/Generic lines match the MD.
2. `node --check js/genie.js` and `node --check js/genie-scripts-data.js` → syntax clean.
3. Browser on the rebuilt preview (`?v=20260626` confirms fresh load):
   - Open a **Beauty** product → action bar → **Genie Script → Get my script** → one line under
     each of HOOK/BUILD/TURN/CLOSE; **Shuffle lines** swaps them; **Different angle** switches set;
     **Copy Script** copies the shown 4 lines; `[product]` shows the real product name.
   - Open an **uncovered** category (e.g. Automotive) → falls back to a generated script, no error.
4. Interceptor would let me verify this myself — install still pending your authorization to clone
   the source repo; otherwise this step is manual on the preview.

Ship:
```bash
git add genie-scripts.md build-genie-scripts.js js/genie-scripts-data.js js/genie.js index.html
git commit -m "feat: Genie scripts live — Kyra's category/angle copy, one-line + shuffle UX"
git push origin genie-preview
```

## Out of scope
- The missing "Unboxing" angle (Kyra didn't write it) — dropped from the chips.
- Per-line AI rewriting / filling `[insert feature]` placeholders (creator fills those).
- Scoring tuning and mobile-header items from prior tasks.

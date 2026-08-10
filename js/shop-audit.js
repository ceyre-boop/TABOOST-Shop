// Shop Account Audit — AI-generated mid-month / month-end recap modal (v2, per-account).
// Replaces the manual Canva recap. Spec: design_handoff_shop_ai_audit README (v2).
//
// The audit is scoped to ONE TikTok Shop account at a time; creators with several linked
// accounts pick which one via the account switcher.
//
// Data sources:
//   - myData (resolved by js/shop-dashboard.js from allShopData / Firebase user), read per account
//   - data/shop/sugg-products.csv   (handle -> 5 suggested products + category GMV)
//   - data/shop/top-products.csv    (handle -> top 5 products [cols B,D,F,H,J] + top 2 categories [L,N])
//   - data/shop/audit-products.json (normalised product name -> image + brand TAP campaign;
//                                    built by build-audit-products.js, TAP catalog only)
//   - AI text via SHOP_AUDIT_ENDPOINT serverless proxy; supportive fallback copy if unset/down.

// Serverless proxy that holds the API key (see api/shop-audit/). Leave '' to always use
// the built-in fallback copy (modal still works, marked "offline copy" in console).
const SHOP_AUDIT_ENDPOINT = 'https://taboost-shop-audit.onrender.com';

// TAP storefront — the destination behind the "TAP Product Search" button.
const SA_TAP_SEARCH_URL = 'https://shop.taboost.me';


(function () {
    'use strict';

    let saState = { variant: 'mid', account: null, loading: true, ai: null, error: false, open: false };
    let saSuggested = null;   // handle -> [{rank,name,gmv}]
    let saTopProducts = null; // handle -> { categories:[{name,gmv}], products:[{rank,name,gmv}] }
    let saAuditProducts = null; // normalised product name -> [image, link, commission, brand, vs]
    let saMonthlyData = null; // { months: { 'YYYY-MM': { handle: {shopPosts, tapPosts, ...} } } }
    let saAbort = null;

    // Month-End flags any account averaging below this commission rate.
    const SA_COMM_TARGET = 12.5;

    function saFmt(n) { return '$' + Math.round(n || 0).toLocaleString('en-US'); }

    // Every figure we show is an estimate off a lagging export, so cents imply a
    // precision the data doesn't have. Feed cells arrive as "$175,316.52" — round
    // on ingest so display AND the AI payload are covered in one place.
    function saMoneyStr(raw) {
        const s = String(raw == null ? '' : raw).trim();
        if (!s) return '';
        const n = parseFloat(s.replace(/[^0-9.-]/g, ''));
        return isNaN(n) ? s : '$' + Math.round(n).toLocaleString('en-US');
    }

    // Compact form for chart labels — full figures don't fit above a bar.
    function saFmtShort(n) {
        n = Math.round(n || 0);
        if (n >= 1000000) return '$' + (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1000) return '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return '$' + n;
    }

    // "25.16%" -> 25.16. Returns null when there's no usable number.
    function saCommNum(raw) {
        const n = parseFloat(String(raw == null ? '' : raw).replace(/[^0-9.]/g, ''));
        return isFinite(n) ? n : null;
    }

    // Only Month-End flags this, and only when there's real commission data —
    // a 0% account had no sales that month, so "raise your rate" would be noise.
    function saCommBelowTarget(m, variant) {
        if (variant !== 'end') return false;
        const n = saCommNum(m.avgComm);
        return n != null && n > 0 && n < SA_COMM_TARGET;
    }

    // Closed months only (oldest -> newest). historyMonths runs 1:1 with each
    // account's gmv array, and its last entry is the month still in progress.
    function saGmvSeries(handle, maxPoints) {
        const me = saMe() || {};
        const months = me.historyMonths || [];
        const h = (me.accountsHistory || []).find(x => (x.handle || '').toLowerCase() === (handle || '').toLowerCase());
        const arr = (h && h.gmv) || [];
        const n = Math.min(months.length, arr.length);
        const pts = [];
        for (let i = 0; i < n - 1; i++) {
            pts.push({ label: String(months[i] || '').split(/\s+/)[0], gmv: parseFloat(arr[i]) || 0 });
        }
        return pts.slice(-(maxPoints || 6));
    }
    function saEsc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function saMe() {
        try { if (typeof myData !== 'undefined' && myData) return myData; } catch (e) { /* not declared */ }
        return window.myData || null;
    }

    function saAccounts() { return (saMe() || {}).accounts || []; }

    function saActiveAccount() {
        const accounts = saAccounts();
        if (!accounts.length) return null;
        const found = accounts.find(a => (a.handle || '').toLowerCase() === saState.account);
        return found || accounts[0];
    }

    // ---------- CSV feeds ----------

    function saParseCSV(text) {
        const rows = [];
        let row = [], cur = '', inQ = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (c === '"') {
                if (inQ && text[i + 1] === '"') { cur += '"'; i++; }
                else inQ = !inQ;
            } else if (c === ',' && !inQ) { row.push(cur); cur = ''; }
            else if ((c === '\n' || c === '\r') && !inQ) {
                if (c === '\r' && text[i + 1] === '\n') i++;
                row.push(cur); cur = '';
                if (row.some(v => v.trim() !== '')) rows.push(row);
                row = [];
            } else cur += c;
        }
        if (cur !== '' || row.length) { row.push(cur); if (row.some(v => v.trim() !== '')) rows.push(row); }
        return rows;
    }

    // These feeds are rebuilt by CI without the HTML's ?v= being bumped, so a plain
    // fetch() serves whatever the browser cached and creators see stale numbers.
    // 'no-cache' revalidates against the server every time (cheap 304 when unchanged).
    const SA_FETCH_OPTS = { cache: 'no-cache' };

    async function saFetchCSV(path) {
        try {
            const res = await fetch(path, SA_FETCH_OPTS);
            if (!res.ok) return null;
            return saParseCSV(await res.text());
        } catch (e) {
            console.warn('Shop Audit: could not load ' + path, e);
            return null;
        }
    }

    // Both feeds are repeating "name, gmv" slots. Resolve the columns from the header rather
    // than a hardcoded stride, so adding an upstream "Product ID" column shifts indices safely
    // instead of silently corrupting the parse. Mirrors resolveFeedColumns() in
    // build-audit-products.js — keep the two in step.
    function saResolveColumns(headers) {
        const h = (headers || []).map(x => String(x || '').trim());
        const slots = [], categories = [];
        for (let k = 1; k <= 5; k++) {
            const name = h.findIndex(x =>
                new RegExp('^(top\\s*' + k + '\\s*product|suggested\\s*product\\s*' + k + ')$', 'i').test(x));
            if (name < 0) continue;
            const gmv = h.findIndex(x =>
                new RegExp('^(top\\s*' + k + '\\s*product\\s*gmv|total\\s*gmv\\s*' + k + ')$', 'i').test(x));
            const id = h.findIndex(x =>
                new RegExp('^(top\\s*' + k + '\\s*)?(product\\s*_?id|sku(\\s*id)?)(\\s*' + k + ')?$', 'i').test(x));
            slots.push({ name: name, gmv: gmv, id: id >= 0 ? id : null });
        }
        for (let k = 1; k <= 2; k++) {
            const name = h.findIndex(x => new RegExp('^top\\s*' + k + '\\s*category$', 'i').test(x));
            if (name < 0) continue;
            const gmv = h.findIndex(x => new RegExp('^top\\s*' + k + '\\s*category\\s*gmv$', 'i').test(x));
            categories.push({ name: name, gmv: gmv });
        }
        if (!slots.length) {
            for (let k = 0; k < 5; k++) slots.push({ name: 1 + k * 2, gmv: 2 + k * 2, id: null });
            categories.push({ name: 11, gmv: 12 }, { name: 13, gmv: 14 });
        }
        return { slots: slots, categories: categories };
    }

    async function saLoadSuggested() {
        if (saSuggested) return;
        saSuggested = {};
        const rows = await saFetchCSV('data/shop/sugg-products.csv');
        if (!rows) return;
        const cols = saResolveColumns(rows[0]);
        for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            const handle = (r[0] || '').trim().toLowerCase();
            if (!handle) continue;
            const items = [];
            cols.slots.forEach((slot, k) => {
                const name = (r[slot.name] || '').trim();
                if (!name) return;
                // productId is null today; carried through so it isn't dropped once it exists.
                items.push({ rank: k + 1, name: name, gmv: saMoneyStr(r[slot.gmv]),
                             productId: slot.id != null ? (r[slot.id] || '').trim() : '' });
            });
            if (items.length) saSuggested[handle] = items;
        }
    }

    // Top-Products sheet export: col A handle; products in B,D,F,H,J (GMV in C,E,G,I,K);
    // top 2 categories in L,N (GMV in M,O). GMV cells optional.
    async function saLoadTopProducts() {
        if (saTopProducts) return;
        saTopProducts = {};
        const rows = await saFetchCSV('data/shop/top-products.csv');
        if (!rows) return;
        const cols = saResolveColumns(rows[0]);
        for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            const handle = (r[0] || '').trim().toLowerCase();
            if (!handle) continue;
            const products = [];
            cols.slots.forEach((slot, k) => {
                const name = (r[slot.name] || '').trim();
                if (!name) return;
                products.push({ rank: k + 1, name: name, gmv: saMoneyStr(r[slot.gmv]),
                                productId: slot.id != null ? (r[slot.id] || '').trim() : '' });
            });
            const categories = [];
            cols.categories.forEach(c => {
                const name = (r[c.name] || '').trim();
                if (name) categories.push({ name: name, gmv: saMoneyStr(r[c.gmv]) });
            });
            if (products.length || categories.length) saTopProducts[handle] = { products: products, categories: categories };
        }
    }

    // Product image + brand TAP campaign for the Proven Winners popup, built by
    // build-audit-products.js. Only TAP catalog products are in here (~40% of
    // suggestions) — the rest render a placeholder, which is expected, not an error.
    // Month-end report snapshots (data/shop/monthly/YYYY-MM.csv -> monthly-stats.json).
    // The only source of per-month post counts.
    async function saLoadMonthly() {
        if (saMonthlyData) return;
        saMonthlyData = { months: {} };
        try {
            const res = await fetch('data/shop/monthly-stats.json', SA_FETCH_OPTS);
            if (!res.ok) return;
            const json = await res.json();
            if (json && json.months) saMonthlyData = json;
        } catch (e) {
            console.warn('Shop Audit: could not load monthly-stats.json', e);
        }
    }

    async function saLoadAuditProducts() {
        if (saAuditProducts) return;
        saAuditProducts = {};
        try {
            const res = await fetch('data/shop/audit-products.json', SA_FETCH_OPTS);
            if (!res.ok) return;
            const json = await res.json();
            saAuditProducts = (json && json.products) || {};
        } catch (e) {
            console.warn('Shop Audit: could not load audit-products.json', e);
        }
    }

    // MUST stay byte-identical to norm() in build-audit-products.js.
    function saNorm(s) {
        return String(s == null ? '' : s)
            .toLowerCase()
            .replace(/’/g, "'")
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    // -> { image, link, commission, brand, vs } or null. Truncated-name matching is
    // resolved at build time, so a plain exact lookup is enough here.
    function saProductFor(name) {
        const rec = saAuditProducts && saAuditProducts[saNorm(name)];
        if (!rec) return null;
        return { image: rec[0] || '', link: rec[1] || '', commission: rec[2] || '', brand: rec[3] || '', vs: rec[4] || '' };
    }

    // Shared row furniture so "Top 5 Products" and "Proven Winners" stay identical.
    // Both take the SAME record, and read image and link independently — a product may
    // have either, both, or neither.
    // The tile carries the row's TAP status rather than a product photo: a pink TAP square
    // when that exact product has a campaign, otherwise the ★ tile — a deliberate "no TAP
    // campaign for this SKU" state, not a failed image. Product images are no longer rendered
    // (coverage was structurally capped at the TAP catalog, so most rows had none anyway);
    // audit-products.json still carries the image field if we ever bring photos back.
    function saThumb(p) {
        return p && p.link
            ? '<div class="sa-sugg-thumb sa-thumb-tap" title="TAP campaign available">TAP</div>'
            : '<div class="sa-sugg-thumb sa-thumb-none" aria-hidden="true">★</div>';
    }

    // A row is a link ONLY when that exact product has a TAP campaign — it goes straight to
    // TikTok, no intermediate step. Without a campaign there is nothing to open, so the row
    // stays a plain div: not focusable, no pointer, no hover affordance.
    function saRowOpen(p, cls) {
        return p && p.link
            ? '<a class="' + cls + ' sa-row-link" href="' + saEsc(p.link) + '" ' +
              'target="_blank" rel="noopener noreferrer">'
            : '<div class="' + cls + '">';
    }
    function saRowClose(p) {
        return p && p.link ? '</a>' : '</div>';
    }

    function saForHandle(map, handle) {
        return (map && handle && map[handle.toLowerCase()]) || null;
    }

    // ---------- metrics (per selected account) ----------

    function saMonthLabel(offset) {
        // Anchor to the data timestamp, not the wall clock, so labels match the numbers.
        const raw = window.SHOP_LAST_UPDATED || '';
        let d = new Date();
        const m = raw.match(/^([A-Za-z]{3})\s+(\d{1,2})/);
        if (m) {
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const mi = months.indexOf(m[1]);
            if (mi >= 0) { d = new Date(); d.setDate(1); d.setMonth(mi); }
        }
        d.setDate(1);
        d.setMonth(d.getMonth() + offset);
        return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }

    // Same anchoring as saMonthLabel, but as the "YYYY-MM" key used by monthly-stats.json.
    function saMonthKey(offset) {
        const raw = window.SHOP_LAST_UPDATED || '';
        let d = new Date();
        const m = raw.match(/^([A-Za-z]{3})\s+(\d{1,2})/);
        if (m) {
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const mi = months.indexOf(m[1]);
            if (mi >= 0) { d = new Date(); d.setDate(1); d.setMonth(mi); }
        }
        d.setDate(1);
        d.setMonth(d.getMonth() + offset);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }

    // Closed-month figures the history CSV doesn't carry — post counts above all.
    // Returns null when that month hasn't been exported yet, so the card shows "—"
    // rather than a misleading zero.
    function saMonthlyStats(handle, offset) {
        const months = saMonthlyData && saMonthlyData.months;
        const month = months && months[saMonthKey(offset)];
        return (month && month[(handle || '').toLowerCase()]) || null;
    }

    // Per-account history (oldest -> newest); idx counts back from the end (0 = current).
    // field is 'gmv' | 'tap' | 'comm'. Returns null when that series is absent, so a
    // shop-data.js built before per-account tap/comm existed degrades to "--", not $0.
    function saAcctHist(handle, idx, field) {
        const me = saMe() || {};
        const h = (me.accountsHistory || []).find(x => (x.handle || '').toLowerCase() === handle.toLowerCase());
        const arr = (h && h[field || 'gmv']) || [];
        if (arr.length > idx) return parseFloat(arr[arr.length - 1 - idx]) || 0;
        return null;
    }

    function saTrend(cur, prev, suffix) {
        if (!prev || prev <= 0 || cur == null) return null;
        const pct = Math.round(((cur - prev) / prev) * 100);
        return (pct >= 0 ? '+' : '') + pct + '% ' + suffix;
    }

    function saMetrics(variant) {
        const me = saMe() || {};
        const acct = saActiveAccount() || {};
        const handle = acct.handle || '';
        const name = me.name || me.username || 'Creator';
        const firstName = name.split(' ')[0];
        const commPct = acct.commPct ? String(acct.commPct).replace(/[^0-9.%-]/g, '') : null;
        const top = saForHandle(saTopProducts, handle);

        const base = {
            name: name, firstName: firstName, handle: handle,
            accountTabs: saAccounts().map(a => a.handle).filter(Boolean),
            avgComm: commPct,
            topCategories: (top && top.categories) || [],
            topProducts: (top && top.products) || [],
            suggested: saForHandle(saSuggested, handle) || []
        };

        if (variant === 'end') {
            const endGMV = saAcctHist(handle, 1);
            const prevGMV = saAcctHist(handle, 2);
            const endTap = saAcctHist(handle, 1, 'tap');
            const endComm = saAcctHist(handle, 1, 'comm');
            // base.avgComm is the *live* month's rate, which would be wrong on a
            // closed-month card. Recompute from that month's own comm / GMV.
            const endCommPct = (endComm != null && endGMV)
                ? (endComm / endGMV * 100).toFixed(2) + '%'
                : null;
            // The month-end report snapshot is the source of truth for a closed month —
            // it is the same export the numbers are reconciled against, and it is the ONLY
            // source of post counts (history.csv keeps GMV/TAP/COMM/BONUS and nothing else).
            // history.csv is the fallback for months not yet exported; post counts stay null
            // (not 0) there so the card shows "—" rather than a false zero.
            const snap = saMonthlyStats(handle, -1);
            const gmv = snap ? snap.gmv : endGMV;
            return Object.assign(base, {
                period: saMonthLabel(-1), statsPillLabel: 'Month-End Stats',
                accountGmv: gmv,
                avgComm: snap && snap.commPct ? snap.commPct : endCommPct,
                tapGmv: snap ? snap.tapGmv : endTap,
                shopPosts: snap ? snap.shopPosts : null,
                tapPosts: snap ? snap.tapPosts : null,
                gmvTrend: saTrend(gmv, prevGMV, 'vs prior month')
            });
        }
        const curGMV = parseFloat(acct.gmv) || 0;
        const lmGMV = parseFloat(acct.gmvLM) || saAcctHist(handle, 1);
        // Mid-month GMV is partial, so comparing it against a FULL prior month made every
        // creator look catastrophic on the 6th. Compare the sheet's own full-month
        // projection (GMV Pace = MTD / day-of-month * days-in-month) instead, and label it
        // as a pace so the number isn't mistaken for booked GMV.
        const pace = parseFloat(acct.gmvPace) || 0;
        return Object.assign(base, {
            period: saMonthLabel(0), statsPillLabel: 'Mid-Month Stats',
            accountGmv: curGMV,
            tapGmv: parseFloat(acct.tapGMV) || 0,
            shopPosts: acct.sv != null ? parseFloat(acct.sv) || 0 : null,
            tapPosts: acct.tap != null ? parseFloat(acct.tap) || 0 : null,
            gmvTrend: pace > 0
                ? saTrend(pace, lmGMV, 'pace vs last month')
                : saTrend(curGMV, lmGMV, 'vs last month')
        });
    }

    // ---------- AI ----------

    function saFallback(m, variant) {
        // Month-End hides Proven Winners in favour of the GMV chart, so its copy
        // must never point "below" at a list that isn't on the page.
        const isEnd = variant === 'end';
        const winners = (m.suggested || []).slice(0, 2).map(s => s.name.split(/[|,–-]/)[0].trim());
        const winnerTitle = isEnd ? 'Line up next month’s winners' : 'Try the proven winners below';
        const winnerLine = isEnd
            ? (winners.length
                ? 'Proven sellers in your lane — like ' + winners[0] + ' — are worth lining up for next month.'
                : 'Check the Mid-Month recap for proven sellers in your lane to line up for next month.')
            : (winners.length
                ? 'The proven winners below — like ' + winners[0] + ' — are already thriving in your lane and could be an easy, exciting add.'
                : 'Keep an eye on the proven winners list — top sellers in your lane will appear there as the feed grows.');
        const laneLine = m.topCategories.length
            ? 'Leaning ~70% of posts into ' + m.topCategories[0].name + ' gives each product room to build momentum.'
            : 'Leaning ~70% of posts into one category gives each product room to build momentum.';
        const trendUp = (m.gmvTrend || '').startsWith('+');
        return {
            grade: trendUp ? 'A-' : 'B+',
            verdict: trendUp
                ? 'Great momentum — @' + m.handle + '’s GMV is trending up, and there’s a clear runway to grow even more.'
                : 'You’ve built a great foundation on @' + m.handle + ' — a couple of small tweaks could unlock your next level.',
            coreIssues: [
                { title: 'Space for a new hero', detail: 'Finding this account’s next signature product is a fun opportunity to build fresh momentum.' },
                { title: 'A chance to focus your feed', detail: 'Zeroing in on a few favorite products could help one really take off.' },
                { title: 'Content ready for a refresh', detail: 'A fresh hook or clearer call-to-action could lift conversion on every post.' }
            ],
            tips: [
                { title: 'Celebrate your winners again', detail: 'Give a proven product 4-5 fresh posts instead of one — winners deserve repeat features.' },
                { title: 'Pick a lane you love', detail: laneLine },
                { title: winnerTitle, detail: winnerLine }
            ]
        };
    }

    // Cache one AI result per account+variant+data-refresh so the key is used minimally.
    // "Regenerate" passes force=true to bypass.
    function saCacheKey(m, v) {
        // v2 namespace: Month-End copy changed when Proven Winners moved off that
        // page, so previously cached Month-End text must not be reused.
        return 'shopAudit2:' + (m.handle || m.name) + ':' + v + ':' + (window.SHOP_LAST_UPDATED || '');
    }
    function saCacheGet(key) {
        try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
        catch (e) { return null; }
    }
    function saCacheSet(key, ai) {
        try { localStorage.setItem(key, JSON.stringify(ai)); } catch (e) { /* full/blocked */ }
    }

    async function saGenerate(force) {
        const v = saState.variant;
        saState.loading = true; saState.error = false; saState.ai = null;
        saRender();
        await Promise.all([saLoadSuggested(), saLoadTopProducts(), saLoadAuditProducts(), saLoadMonthly()]);
        const m = saMetrics(v);
        const acct = saState.account;

        if (saAbort) saAbort.abort();

        const stale = () => saState.variant !== v || saState.account !== acct;

        if (force !== true) {
            const cached = saCacheGet(saCacheKey(m, v));
            if (cached && cached.coreIssues && cached.tips) {
                saState.ai = cached; saState.loading = false; saState.error = false;
                saRender();
                return;
            }
        }

        if (!SHOP_AUDIT_ENDPOINT) {
            console.info('Shop Audit: SHOP_AUDIT_ENDPOINT not set — using offline fallback copy.');
            setTimeout(() => {
                if (stale()) return;
                saState.ai = saFallback(m, v); saState.loading = false; saState.error = true;
                saRender();
            }, 700);
            return;
        }

        // Payload for the SELECTED account only (README v2).
        const payload = {
            creator: m.firstName,
            account_handle: m.handle,
            period: m.period,
            recap_type: v === 'end' ? 'month-end (full month closed)' : 'mid-month (month in progress)',
            account_gmv: m.accountGmv != null ? Math.round(m.accountGmv) : null,
            avg_commission: m.avgComm,
            commission_target: SA_COMM_TARGET,
            avg_commission_below_target: saCommBelowTarget(m, v),
            tap_gmv: m.tapGmv != null ? Math.round(m.tapGmv) : null,
            shop_posts: m.shopPosts, tap_posts: m.tapPosts,
            gmv_trend: m.gmvTrend || 'n/a',
            top_categories: m.topCategories.map(c => ({ name: c.name, gmv: c.gmv || undefined })),
            top_selling_products: m.topProducts.map(p => p.name),
            proven_winners_not_yet_posted: (m.suggested || []).map(s => ({ product: s.name, category_gmv: s.gmv })),
            // Month-End replaces the Proven Winners list with the GMV chart, so copy
            // must not point "below" at it.
            proven_winners_list_visible: v !== 'end'
        };

        saAbort = new AbortController();
        try {
            const res = await fetch(SHOP_AUDIT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: saAbort.signal
            });
            if (!res.ok) throw new Error('audit endpoint ' + res.status);
            const ai = await res.json();
            if (!ai || !ai.coreIssues || !ai.tips) throw new Error('bad audit payload');
            if (stale()) return;
            saState.ai = ai; saState.loading = false; saState.error = false;
            saCacheSet(saCacheKey(m, v), ai);
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.warn('Shop Audit: AI call failed, using fallback copy.', e);
            if (stale()) return;
            saState.ai = saFallback(m, v); saState.loading = false; saState.error = true;
        }
        saRender();
    }

    // ---------- render ----------

    // iOS Safari ignores body{overflow:hidden} — the page rubber-bands behind the modal.
    // Pin the body and restore the scroll position on close.
    let saScrollY = 0;
    function saLockScroll(lock) {
        const b = document.body;
        if (lock) {
            if (b.dataset.saLocked) return;
            saScrollY = window.scrollY || window.pageYOffset || 0;
            b.dataset.saLocked = '1';
            b.style.position = 'fixed';
            b.style.top = (-saScrollY) + 'px';
            b.style.left = '0';
            b.style.right = '0';
            b.style.width = '100%';
            b.style.overflow = 'hidden';
        } else {
            if (!b.dataset.saLocked) return;
            delete b.dataset.saLocked;
            b.style.position = ''; b.style.top = ''; b.style.left = '';
            b.style.right = ''; b.style.width = ''; b.style.overflow = '';
            window.scrollTo(0, saScrollY);
        }
    }

    function saScrollToTop() {
        const overlay = document.getElementById('shopAuditOverlay');
        if (overlay) overlay.scrollTop = 0;
    }

    function saRender() {
        const overlay = document.getElementById('shopAuditOverlay');
        if (!overlay) return;
        overlay.classList.toggle('open', saState.open);
        saLockScroll(saState.open);
        if (!saState.open) return;

        const m = saMetrics(saState.variant);
        const ai = saState.ai || {};

        // Before the 12th there is no fresh mid-month product data, so the toggle is hidden
        // entirely rather than offering a recap built on last month's feed.
        const midBtn = overlay.querySelector('#saMidBtn');
        midBtn.style.display = saMidMonthAvailable() ? '' : 'none';
        midBtn.classList.toggle('active', saState.variant === 'mid');
        overlay.querySelector('#saEndBtn').classList.toggle('active', saState.variant === 'end');
        overlay.querySelector('#saName').textContent = m.name;
        overlay.querySelector('#saHandleChip').textContent = '@' + m.handle;
        overlay.querySelector('#saPeriod').textContent = m.period;        overlay.querySelector('#saStatsPill').textContent = m.statsPillLabel;
        overlay.querySelector('#saTapGmv').textContent = m.tapGmv != null ? saFmt(m.tapGmv) : '—';
        overlay.querySelector('#saTapPosts').textContent = m.tapPosts != null ? m.tapPosts : '—';
        overlay.querySelector('#saAcctGmv').textContent = m.accountGmv != null ? saFmt(m.accountGmv) : '—';
        overlay.querySelector('#saShopPosts').textContent = m.shopPosts != null ? m.shopPosts : '—';
        overlay.querySelector('#saAvgComm').textContent = m.avgComm || '—';
        overlay.querySelector('#saTrendNote').textContent = m.gmvTrend || '';
        overlay.querySelector('#saLoadingName').textContent = '@' + m.handle;
        overlay.querySelector('#saSuggSub').textContent =
            'Top sellers in @' + m.handle + '’s lane not posted yet — ranked by category GMV.';
        overlay.querySelector('#saFootNote').textContent =
            '✦ Generated by TABOOST AI from @' + m.handle + '’s live Shop data · not manual';

        // Account switcher
        const tabs = overlay.querySelector('#saTabs');
        tabs.innerHTML = m.accountTabs.map(h =>
            '<button type="button" data-handle="' + saEsc(h.toLowerCase()) + '"' +
            ((h.toLowerCase() === (m.handle || '').toLowerCase()) ? ' class="active"' : '') + '>@' + saEsc(h) + '</button>'
        ).join('');
        tabs.querySelectorAll('button').forEach(b =>
            b.addEventListener('click', () => saSetAccount(b.dataset.handle)));

        // Top categories + top 5 products (per account, from top-products.csv)
        const catList = overlay.querySelector('#saCatList');
        if (m.topCategories.length) {
            catList.innerHTML = m.topCategories.map(c =>
                '<div class="sa-cat-row"><span class="name">' + saEsc(c.name) + '</span>' +
                (c.gmv ? '<span class="gmv">' + saEsc(c.gmv) + '</span>' : '') + '</div>'
            ).join('');
        } else {
            catList.innerHTML = '<div class="sa-prod-pending">Category breakdown connects in the next data update.</div>';
        }
        const prodList = overlay.querySelector('#saProdList');
        if (m.topProducts.length) {
            prodList.innerHTML = m.topProducts.map(p =>
                saRowOpen(saProductFor(p.name), 'sa-prod-item') +
                '<span class="sa-prod-rank">' + p.rank + '</span>' +
                saThumb(saProductFor(p.name)) +
                '<span class="sa-prod-name">' + saEsc(p.name) + '</span>' +
                saRowClose(saProductFor(p.name))
            ).join('');
        } else {
            prodList.innerHTML = '<div class="sa-prod-pending">Your per-product breakdown is on its way — the product feed connects in the next data update.</div>';
        }

        // Month-End swaps Proven Winners for the closed-month GMV chart.
        const isEnd = saState.variant === 'end';
        const chartEl = overlay.querySelector('#saChart');
        overlay.querySelector('#saSuggested').style.display = isEnd ? 'none' : '';
        chartEl.style.display = isEnd ? '' : 'none';
        if (isEnd) saRenderChart(overlay, m);

        // Commission alert (Month-End only) — deterministic, not AI-generated.
        const belowTarget = saCommBelowTarget(m, saState.variant);
        const alertEl = overlay.querySelector('#saAlert');
        alertEl.style.display = belowTarget ? 'flex' : 'none';
        if (belowTarget) {
            alertEl.innerHTML =
                '<span class="sa-alert-icon" aria-hidden="true">!</span>' +
                '<div><strong>Avg commission is ' + saEsc(m.avgComm) + ' — under the ' +
                SA_COMM_TARGET + '% target.</strong> Leaning into higher-commission products is ' +
                'the fastest way to earn more on the same GMV.</div>';
        }

        // Suggested products
        const suggList = overlay.querySelector('#saSuggList');
        if (m.suggested && m.suggested.length) {
            suggList.innerHTML = m.suggested.map((s, i) => {
                const p = saProductFor(s.name);
                return saRowOpen(p, 'sa-sugg-row') +
                    '<div class="sa-rank">' + s.rank + '</div>' +
                    saThumb(p) +
                    '<div class="sa-sugg-name">' + saEsc(s.name) + '</div>' +
                    '<div class="sa-sugg-gmv"><div class="amount">' + saEsc(s.gmv) + '</div>' +
                    '<div class="label">CATEGORY GMV</div></div>' +
                    saRowClose(p);
            }).join('');
        } else {
            suggList.innerHTML = '<div class="sa-prod-pending">Personalized picks are being prepared for this account — check back after the next data update.</div>';
        }

        // Audit states
        overlay.querySelector('#saLoading').style.display = saState.loading ? 'block' : 'none';
        overlay.querySelector('#saReady').style.display = saState.loading ? 'none' : 'block';
        if (!saState.loading && ai.coreIssues) {
            overlay.querySelector('#saGrade').textContent = ai.grade || '';
            overlay.querySelector('#saVerdict').textContent = ai.verdict || '';
            // The commission gap is measured, so it leads the list rather than
            // depending on the model to notice it.
            let issues = (ai.coreIssues || []).slice();
            if (belowTarget) {
                issues.unshift({
                    title: 'Commission rate below target',
                    detail: '@' + m.handle + ' averaged ' + m.avgComm + ' against the ' +
                        SA_COMM_TARGET + '% target. Swapping a few posts toward higher-commission ' +
                        'products in your best category lifts earnings without needing more GMV.'
                });
            }
            overlay.querySelector('#saIssues').innerHTML = issues.map(c =>
                '<div><div class="sa-item-title"><span>•</span> ' + saEsc(c.title) + '</div>' +
                '<div class="sa-item-detail">' + saEsc(c.detail) + '</div></div>'
            ).join('');
            overlay.querySelector('#saTips').innerHTML = (ai.tips || []).map(t =>
                '<div><div class="sa-item-title"><span class="star">★</span> ' + saEsc(t.title) + '</div>' +
                '<div class="sa-item-detail starred">' + saEsc(t.detail) + '</div></div>'
            ).join('');
        }
    }

    // Closed-month GMV bars. Plain divs rather than a chart library — the modal
    // mounts and resizes inside a scroll container, where canvas sizing is fiddly.
    function saRenderChart(overlay, m) {
        const pts = saGmvSeries(m.handle, 6);
        const bars = overlay.querySelector('#saBars');
        const note = overlay.querySelector('#saChartNote');
        const sub = overlay.querySelector('#saChartSub');

        if (!pts.length) {
            bars.innerHTML = '<div class="sa-prod-pending">Monthly history connects in the next data update.</div>';
            note.textContent = '';
            sub.textContent = '';
            return;
        }

        const max = Math.max.apply(null, pts.map(p => p.gmv));
        const best = pts.reduce((a, b) => (b.gmv > a.gmv ? b : a), pts[0]);
        const last = pts[pts.length - 1];

        sub.textContent = 'Closed months for @' + m.handle + ' — ' + pts.length +
            (pts.length === 1 ? ' month' : ' months') + ' of GMV.';
        note.textContent = 'Best month: ' + best.label + ' ' + saFmtShort(best.gmv);

        bars.innerHTML = pts.map(p => {
            const pct = max > 0 ? Math.max(2, Math.round((p.gmv / max) * 100)) : 2;
            const isLast = p === last;
            return '<div class="sa-bar-col' + (isLast ? ' current' : '') + '">' +
                '<div class="sa-bar-val">' + saEsc(saFmtShort(p.gmv)) + '</div>' +
                '<div class="sa-bar-track"><div class="sa-bar-fill" style="height:' + pct + '%;"></div></div>' +
                '<div class="sa-bar-lab">' + saEsc(p.label) + '</div>' +
                '</div>';
        }).join('');
    }

    // ---------- modal shell ----------

    function saBuildModal() {
        const overlay = document.createElement('div');
        overlay.id = 'shopAuditOverlay';
        overlay.className = 'sa-overlay';
        overlay.innerHTML =
        '<div class="sa-watermark" aria-hidden="true">TABOOST</div>' +
        '<div class="sa-modal" role="dialog" aria-modal="true" aria-label="Shop Account Audit">' +
          '<div class="sa-controls">' +
            '<div class="sa-seg">' +
              '<button id="saMidBtn" type="button">Mid-Month Recap</button>' +
              '<button id="saEndBtn" type="button">Month-End Recap</button>' +
            '</div>' +
            '<div class="sa-controls-right">' +
              '<span class="sa-ai-badge"><span>✦</span> TABOOST AI</span>' +
              '<button id="saClose" class="sa-close" type="button" title="Close">✕</button>' +
            '</div>' +
          '</div>' +
          '<div class="sa-switch">' +
            '<span class="sa-switch-label">Auditing account</span>' +
            '<div class="sa-switch-tabs" id="saTabs"></div>' +
          '</div>' +
          '<div class="sa-card">' +
            '<div class="sa-head">' +
              '<div class="sa-head-left">' +
                '<div class="sa-head-name" id="saName"></div>' +
                '<div class="sa-head-sub">' +
                  '<span class="sa-handle-pill" id="saHandleChip"></span>' +
                  '<span class="sa-head-period" id="saPeriod"></span>' +
                '</div>' +
              '</div>' +
              '<div class="sa-head-right">' +
                '<img class="sa-logo" src="images/taboost-logo.jpg" alt="TABOOST">' +              '</div>' +
            '</div>' +
            '<div class="sa-stats">' +
              '<div class="sa-inner">' +
                '<div class="sa-pill-filled">TAP Campaigns</div>' +
                '<div class="sa-big-num" id="saTapGmv"></div>' +
                '<div class="sa-num-label">TAP GMV</div>' +
                '<div class="sa-mid-num" id="saTapPosts"></div>' +
                '<div class="sa-mid-label">TAP Shop Posts</div>' +
              '</div>' +
              '<div class="sa-inner">' +
                '<div class="sa-pill-outline" id="saStatsPill"></div>' +
                '<div class="sa-big-num" id="saAcctGmv"></div>' +
                '<div class="sa-num-label">Account GMV</div>' +
                '<div class="sa-mid-num" id="saShopPosts"></div>' +
                '<div class="sa-mid-label">Shop Posts</div>' +
              '</div>' +
              '<div class="sa-inner">' +
                '<div class="sa-pill-filled">Account Essentials</div>' +
                '<div class="sa-big-num" id="saAvgComm"></div>' +
                '<div class="sa-num-label">Avg Commission</div>' +
                '<div class="sa-mid-num" id="saTrendNote" style="font-size:24px;"></div>' +
                '<div class="sa-mid-label">GMV Trend</div>' +
              '</div>' +
            '</div>' +
            '<div class="sa-row">' +
              '<div class="sa-inner sa-products">' +
                '<div class="sa-pill-wrap"><span class="sa-pill-outline" style="font-size:15px; padding:9px 20px;">Top Selling Products</span></div>' +
                '<div class="sa-mini-title"><span class="star">★</span> Top Categories</div>' +
                '<div class="sa-cat-list" id="saCatList"></div>' +
                '<div class="sa-prod-block">' +
                  '<div class="sa-mini-title"><span class="star">★</span> Top 5 Products</div>' +
                  '<div class="sa-prod-list" id="saProdList"></div>' +
                '</div>' +
              '</div>' +
              '<div class="sa-inner sa-audit">' +
                '<div class="sa-pill-wrap"><span class="sa-pill-white">✦ Shop Account Audit</span></div>' +
                '<div class="sa-alert" id="saAlert" style="display:none;"></div>' +
                '<div id="saLoading">' +
                  '<div class="sa-loading-line"><span class="sa-spinner"></span> TABOOST AI is reading <span id="saLoadingName"></span>’s numbers…</div>' +
                  '<div class="sa-skeletons">' +
                    '<div class="sa-shimmer" style="width:85%;"></div>' +
                    '<div class="sa-shimmer" style="width:70%;"></div>' +
                    '<div class="sa-shimmer" style="width:92%;"></div>' +
                    '<div class="sa-shimmer" style="width:60%;"></div>' +
                  '</div>' +
                '</div>' +
                '<div id="saReady" style="display:none;">' +
                  '<div class="sa-verdict">' +
                    '<div class="sa-grade" id="saGrade"></div>' +
                    '<div class="sa-verdict-text" id="saVerdict"></div>' +
                  '</div>' +
                  '<div class="sa-cols">' +
                    '<div><div class="sa-col-title">Core Issues</div><div class="sa-items" id="saIssues"></div></div>' +
                    '<div><div class="sa-col-title pink"><span>★</span> Growth Moves</div><div class="sa-items" id="saTips"></div></div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            // Month-End shows the closed-month GMV chart here; Mid-Month shows Proven Winners.
            '<div class="sa-inner sa-chart" id="saChart" style="display:none;">' +
              '<div class="sa-sugg-head">' +
                '<div class="sa-sugg-title"><span class="star">★</span> GMV By Month</div>' +
                '<div class="sa-sugg-soon" id="saChartNote"></div>' +
              '</div>' +
              '<div class="sa-sugg-sub" id="saChartSub"></div>' +
              '<div class="sa-bars" id="saBars"></div>' +
            '</div>' +
            '<div class="sa-inner sa-suggested" id="saSuggested">' +
              '<div class="sa-sugg-head">' +
                '<div class="sa-sugg-title"><span class="star">★</span> Proven Winners To Add</div>' +
              '</div>' +
              '<div class="sa-sugg-sub" id="saSuggSub"></div>' +
              '<div class="sa-sugg-list" id="saSuggList"></div>' +
            '</div>' +
            '<div class="sa-foot">' +
              '<div class="sa-foot-note" id="saFootNote"></div>' +
              '<button id="saRegen" class="sa-regen" type="button">↻ Regenerate</button>' +
            '</div>' +
          '</div>' +
        '</div>';
        document.body.appendChild(overlay);

        overlay.querySelector('#saClose').addEventListener('click', closeShopAudit);
        overlay.addEventListener('click', e => { if (e.target === overlay) closeShopAudit(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && saState.open) closeShopAudit(); });
        // Rows with a TAP campaign are plain anchors straight to the TikTok TAP link —
        // no intermediate popup. Rows without one are inert by design: nothing to click
        // through to, so they get no cursor, no hover affordance and no focus stop.
        overlay.querySelector('#saMidBtn').addEventListener('click', () => saSetVariant('mid'));
        overlay.querySelector('#saEndBtn').addEventListener('click', () => saSetVariant('end'));
        overlay.querySelector('#saRegen').addEventListener('click', () => saGenerate(true));
    }

    function saSetVariant(v) {
        if (v === saState.variant) return;
        saState.variant = v;
        saScrollToTop();
        saGenerate();
    }

    function saSetAccount(handle) {
        if (handle === saState.account) return;
        saState.account = handle;
        saScrollToTop();
        saGenerate();
    }

    // Mid-month product data is uploaded around the 10th and 20th, so a Mid-Month recap
    // before then would be built on last month's product feed. Gate on the day-of-month of
    // the DATA timestamp rather than the wall clock: that way the recap appears only once
    // data through the 12th actually exists, instead of the day the calendar rolls over.
    const SA_MIDMONTH_FROM_DAY = 12;

    // Day-of-month from the DATA timestamp, so the welcome line and the buttons can never
    // disagree — e.g. "Mid-Month Recap is ready" while that button is still hidden.
    function saDataDay() {
        const m = String(window.SHOP_LAST_UPDATED || '').match(/^[A-Za-z]{3}\s+(\d{1,2})/);
        return m ? parseInt(m[1], 10) : null;
    }

    function saMidMonthAvailable() {
        const day = saDataDay();
        return day == null ? true : day >= SA_MIDMONTH_FROM_DAY;
    }

    // Welcome-banner subline. Every message points "below" at the action bar, so the line
    // and the visible buttons always describe the same thing.
    function saWelcomeLine() {
        const day = saDataDay();
        if (day == null) return 'Search for new TAP links below';
        if (day <= 2) return 'Start the month off right, search for new TAP links below';
        if (day < SA_MIDMONTH_FROM_DAY) return 'Month-End Recap is ready, click below';
        return 'Mid-Month Recap is ready, click below';
    }

    function openShopAudit(variant) {
        if (!document.getElementById('shopAuditOverlay')) saBuildModal();
        if (!saState.account) {
            const first = saAccounts()[0];
            saState.account = first ? (first.handle || '').toLowerCase() : null;
        }
        // Never land on a variant whose toggle is hidden.
        if (variant === 'mid' || variant === 'end') saState.variant = variant;
        if (!saMidMonthAvailable()) saState.variant = 'end';
        saState.open = true;
        saGenerate();
        saScrollToTop();
    }
    function closeShopAudit() {
        saState.open = false;
        saRender();
    }
    window.openShopAudit = openShopAudit;
    window.closeShopAudit = closeShopAudit;

    // Launcher: discreet footer link while the feature awaits approval.
    // Swap back to the pink .sa-launcher button after sign-off.
    // Action bar under the welcome banner. Replaces the old hidden "account audit (beta)"
    // footer link — these buttons are the launcher now.
    function saInsertLauncher() {
        if (document.getElementById('saActions')) return;
        const banner = document.getElementById('welcomeBanner');
        if (!banner) return;

        // This file loads AFTER js/shop-dashboard.js, which only DEFINES
        // window.CAMPAIGN_ANNOUNCEMENT at parse time and renders it later from the auth
        // callback — so updating it here is picked up with no change to that render path.
        // Also write the element directly, in case the banner rendered first. The trailing
        // "HERE" link is dropped: every message now points at the buttons below, and TAP
        // search is one of them.
        const line = saWelcomeLine();
        if (window.CAMPAIGN_ANNOUNCEMENT) {
            window.CAMPAIGN_ANNOUNCEMENT.text = line;
            window.CAMPAIGN_ANNOUNCEMENT.linkText = '';
            window.CAMPAIGN_ANNOUNCEMENT.linkUrl = '';
            window.CAMPAIGN_ANNOUNCEMENT.postText = '';
        }
        const msgEl = document.getElementById('welcomeMessage');
        if (msgEl) msgEl.textContent = line;

        const bar = document.createElement('div');
        bar.className = 'sa-actions';
        bar.id = 'saActions';
        bar.innerHTML =
            '<a class="sa-action sa-action-primary" href="' + saEsc(SA_TAP_SEARCH_URL) + '">' +
              '<span class="sa-action-ico" aria-hidden="true">🔍</span> TAP Product Search</a>' +
            '<button class="sa-action" type="button" id="saOpenEnd">' +
              '<span class="sa-action-ico" aria-hidden="true">📅</span> Month-End Recap</button>' +
            '<button class="sa-action" type="button" id="saOpenMid">' +
              '<span class="sa-action-ico" aria-hidden="true">📊</span> Mid-Month Recap</button>';
        banner.insertAdjacentElement('afterend', bar);

        bar.querySelector('#saOpenEnd').addEventListener('click', () => openShopAudit('end'));
        const midBtn = bar.querySelector('#saOpenMid');
        // Hidden until mid-month data exists — same rule as the toggle inside the modal.
        if (saMidMonthAvailable()) {
            midBtn.addEventListener('click', () => openShopAudit('mid'));
        } else {
            midBtn.remove();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', saInsertLauncher);
    } else {
        saInsertLauncher();
    }
})();

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
//   - AI text via SHOP_AUDIT_ENDPOINT serverless proxy; supportive fallback copy if unset/down.

// Serverless proxy that holds the API key (see api/shop-audit/). Leave '' to always use
// the built-in fallback copy (modal still works, marked "offline copy" in console).
const SHOP_AUDIT_ENDPOINT = 'https://taboost-shop-audit.onrender.com';

(function () {
    'use strict';

    let saState = { variant: 'mid', account: null, loading: true, ai: null, error: false, open: false };
    let saSuggested = null;   // handle -> [{rank,name,gmv}]
    let saTopProducts = null; // handle -> { categories:[{name,gmv}], products:[{rank,name,gmv}] }
    let saAbort = null;

    function saFmt(n) { return '$' + Math.round(n || 0).toLocaleString('en-US'); }
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

    async function saFetchCSV(path) {
        try {
            const res = await fetch(path);
            if (!res.ok) return null;
            return saParseCSV(await res.text());
        } catch (e) {
            console.warn('Shop Audit: could not load ' + path, e);
            return null;
        }
    }

    async function saLoadSuggested() {
        if (saSuggested) return;
        saSuggested = {};
        const rows = await saFetchCSV('data/shop/sugg-products.csv');
        if (!rows) return;
        for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            const handle = (r[0] || '').trim().toLowerCase();
            if (!handle) continue;
            const items = [];
            for (let k = 0; k < 5; k++) {
                const name = (r[1 + k * 2] || '').trim();
                const gmv = (r[2 + k * 2] || '').trim();
                if (name) items.push({ rank: k + 1, name: name, gmv: gmv });
            }
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
        for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            const handle = (r[0] || '').trim().toLowerCase();
            if (!handle) continue;
            const products = [];
            for (let k = 0; k < 5; k++) {
                const name = (r[1 + k * 2] || '').trim();   // B, D, F, H, J
                const gmv = (r[2 + k * 2] || '').trim();    // C, E, G, I, K
                if (name) products.push({ rank: k + 1, name: name, gmv: gmv });
            }
            const categories = [];
            [[11, 12], [13, 14]].forEach(([ci, gi]) => {    // L/M, N/O
                const name = (r[ci] || '').trim();
                if (name) categories.push({ name: name, gmv: (r[gi] || '').trim() });
            });
            if (products.length || categories.length) saTopProducts[handle] = { products: products, categories: categories };
        }
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

    // Per-account GMV history (oldest -> newest); idx counts back from the end (0 = current).
    function saAcctHist(handle, idx) {
        const me = saMe() || {};
        const h = (me.accountsHistory || []).find(x => (x.handle || '').toLowerCase() === handle.toLowerCase());
        const arr = (h && h.gmv) || [];
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
            return Object.assign(base, {
                period: saMonthLabel(-1), recapTag: 'MONTH-END RECAP', statsPillLabel: 'Month-End Stats',
                accountGmv: endGMV,
                tapGmv: null, shopPosts: null, tapPosts: null, // per-account/month TAP + post history not kept
                gmvTrend: saTrend(endGMV, prevGMV, 'vs prior month')
            });
        }
        const curGMV = parseFloat(acct.gmv) || 0;
        const lmGMV = parseFloat(acct.gmvLM) || saAcctHist(handle, 1);
        return Object.assign(base, {
            period: saMonthLabel(0), recapTag: 'MID-MONTH RECAP', statsPillLabel: 'Mid-Month Stats',
            accountGmv: curGMV,
            tapGmv: parseFloat(acct.tapGMV) || 0,
            shopPosts: acct.sv != null ? parseFloat(acct.sv) || 0 : null,
            tapPosts: acct.tap != null ? parseFloat(acct.tap) || 0 : null,
            gmvTrend: saTrend(curGMV, lmGMV, 'vs last month')
        });
    }

    // ---------- AI ----------

    function saFallback(m) {
        const winners = (m.suggested || []).slice(0, 2).map(s => s.name.split(/[|,–-]/)[0].trim());
        const winnerLine = winners.length
            ? 'The proven winners below — like ' + winners[0] + ' — are already thriving in your lane and could be an easy, exciting add.'
            : 'Keep an eye on the proven winners list — top sellers in your lane will appear there as the feed grows.';
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
                { title: 'Try the proven winners below', detail: winnerLine }
            ]
        };
    }

    // Cache one AI result per account+variant+data-refresh so the key is used minimally.
    // "Regenerate" passes force=true to bypass.
    function saCacheKey(m, v) {
        return 'shopAudit:' + (m.handle || m.name) + ':' + v + ':' + (window.SHOP_LAST_UPDATED || '');
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
        await Promise.all([saLoadSuggested(), saLoadTopProducts()]);
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
                saState.ai = saFallback(m); saState.loading = false; saState.error = true;
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
            tap_gmv: m.tapGmv != null ? Math.round(m.tapGmv) : null,
            shop_posts: m.shopPosts, tap_posts: m.tapPosts,
            gmv_trend: m.gmvTrend || 'n/a',
            top_categories: m.topCategories.map(c => ({ name: c.name, gmv: c.gmv || undefined })),
            top_selling_products: m.topProducts.map(p => p.name),
            proven_winners_not_yet_posted: (m.suggested || []).map(s => ({ product: s.name, category_gmv: s.gmv }))
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
            saState.ai = saFallback(m); saState.loading = false; saState.error = true;
        }
        saRender();
    }

    // ---------- render ----------

    function saRender() {
        const overlay = document.getElementById('shopAuditOverlay');
        if (!overlay) return;
        overlay.classList.toggle('open', saState.open);
        document.body.style.overflow = saState.open ? 'hidden' : '';
        if (!saState.open) return;

        const m = saMetrics(saState.variant);
        const ai = saState.ai || {};

        overlay.querySelector('#saMidBtn').classList.toggle('active', saState.variant === 'mid');
        overlay.querySelector('#saEndBtn').classList.toggle('active', saState.variant === 'end');
        overlay.querySelector('#saName').textContent = m.name;
        overlay.querySelector('#saHandleChip').textContent = '@' + m.handle;
        overlay.querySelector('#saPeriod').textContent = m.period;
        overlay.querySelector('#saRecapTag').textContent = m.recapTag;
        overlay.querySelector('#saStatsPill').textContent = m.statsPillLabel;
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
                '<div class="sa-prod-item"><span class="sa-prod-rank">' + p.rank + '</span> ' + saEsc(p.name) + '</div>'
            ).join('');
        } else {
            prodList.innerHTML = '<div class="sa-prod-pending">Your per-product breakdown is on its way — the product feed connects in the next data update.</div>';
        }

        // Suggested products
        const suggList = overlay.querySelector('#saSuggList');
        if (m.suggested && m.suggested.length) {
            suggList.innerHTML = m.suggested.map(s =>
                '<div class="sa-sugg-row">' +
                '<div class="sa-rank">' + s.rank + '</div>' +
                '<div class="sa-sugg-name">' + saEsc(s.name) + '</div>' +
                '<div class="sa-sugg-gmv"><div class="amount">' + saEsc(s.gmv) + '</div>' +
                '<div class="label">CATEGORY GMV</div></div></div>'
            ).join('');
        } else {
            suggList.innerHTML = '<div class="sa-prod-pending">Personalized picks are being prepared for this account — check back after the next data update.</div>';
        }

        // Audit states
        overlay.querySelector('#saLoading').style.display = saState.loading ? 'block' : 'none';
        overlay.querySelector('#saReady').style.display = saState.loading ? 'none' : 'block';
        if (!saState.loading && ai.coreIssues) {
            overlay.querySelector('#saGrade').textContent = ai.grade || '';
            overlay.querySelector('#saVerdict').textContent = ai.verdict || '';
            overlay.querySelector('#saIssues').innerHTML = (ai.coreIssues || []).map(c =>
                '<div><div class="sa-item-title"><span>•</span> ' + saEsc(c.title) + '</div>' +
                '<div class="sa-item-detail">' + saEsc(c.detail) + '</div></div>'
            ).join('');
            overlay.querySelector('#saTips').innerHTML = (ai.tips || []).map(t =>
                '<div><div class="sa-item-title"><span class="star">★</span> ' + saEsc(t.title) + '</div>' +
                '<div class="sa-item-detail starred">' + saEsc(t.detail) + '</div></div>'
            ).join('');
        }
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
              '<div style="min-width:240px;">' +
                '<div class="sa-head-name" id="saName"></div>' +
                '<div class="sa-head-sub">' +
                  '<span class="sa-handle-pill" id="saHandleChip"></span>' +
                  '<span class="sa-head-period" id="saPeriod"></span>' +
                '</div>' +
              '</div>' +
              '<div class="sa-head-right">' +
                '<img class="sa-logo" src="images/taboost-logo.jpg" alt="TABOOST">' +
                '<div class="sa-recap-tag" id="saRecapTag"></div>' +
              '</div>' +
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
            '<div class="sa-inner sa-suggested">' +
              '<div class="sa-sugg-head">' +
                '<div class="sa-sugg-title"><span class="star">★</span> Proven Winners To Add</div>' +
                '<div class="sa-sugg-soon">TAP-linked picks coming soon</div>' +
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
        overlay.querySelector('#saMidBtn').addEventListener('click', () => saSetVariant('mid'));
        overlay.querySelector('#saEndBtn').addEventListener('click', () => saSetVariant('end'));
        overlay.querySelector('#saRegen').addEventListener('click', () => saGenerate(true));
    }

    function saSetVariant(v) {
        if (v === saState.variant) return;
        saState.variant = v;
        saGenerate();
    }

    function saSetAccount(handle) {
        if (handle === saState.account) return;
        saState.account = handle;
        saGenerate();
    }

    function openShopAudit() {
        if (!document.getElementById('shopAuditOverlay')) saBuildModal();
        if (!saState.account) {
            const first = saAccounts()[0];
            saState.account = first ? (first.handle || '').toLowerCase() : null;
        }
        saState.open = true;
        saGenerate();
    }
    function closeShopAudit() {
        saState.open = false;
        saRender();
    }
    window.openShopAudit = openShopAudit;
    window.closeShopAudit = closeShopAudit;

    // Launcher: discreet footer link while the feature awaits approval.
    // Swap back to the pink .sa-launcher button after sign-off.
    function saInsertLauncher() {
        if (document.getElementById('saLauncher')) return;
        const footer = document.querySelector('.creator-footer');
        const wrap = document.createElement('p');
        wrap.style.cssText = 'text-align:center; margin-top:8px;';
        wrap.innerHTML = '<a id="saLauncher" href="#" style="font-size:11px; color:#555; ' +
            'text-decoration:none; opacity:.7;">✦ account audit (beta)</a>';
        if (footer) footer.appendChild(wrap);
        else document.querySelector('.creator-layout, main, body').appendChild(wrap);
        wrap.querySelector('#saLauncher').addEventListener('click', e => { e.preventDefault(); openShopAudit(); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', saInsertLauncher);
    } else {
        saInsertLauncher();
    }
})();

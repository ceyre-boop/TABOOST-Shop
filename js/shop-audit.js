// Shop Account Audit — AI-generated mid-month / month-end recap modal.
// Replaces the manual Canva recap. Spec: design_handoff_shop_ai_audit README.
//
// Data sources:
//   - myData (resolved by js/shop-dashboard.js from allShopData / Firebase user)
//   - data/shop/sugg-products.csv  (Creator handle -> 5 suggested products + category GMV)
//   - AI text via SHOP_AUDIT_ENDPOINT serverless proxy; supportive fallback copy if unset/down.

// Serverless proxy that holds the API key (see api/shop-audit/). Leave '' to always use
// the built-in fallback copy (modal still works, marked "offline copy" in console).
const SHOP_AUDIT_ENDPOINT = '';

(function () {
    'use strict';

    let saState = { variant: 'mid', loading: true, ai: null, error: false, open: false };
    let saSuggested = null; // rows from sugg-products.csv, keyed by handle
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

    // ---------- suggested-products CSV ----------

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

    async function saLoadSuggested() {
        if (saSuggested) return saSuggested;
        saSuggested = {};
        try {
            const res = await fetch('data/shop/sugg-products.csv');
            if (!res.ok) return saSuggested;
            const rows = saParseCSV(await res.text());
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
        } catch (e) {
            console.warn('Shop Audit: could not load sugg-products.csv', e);
        }
        return saSuggested;
    }

    function saMySuggested(me) {
        const accounts = me.accounts || [];
        for (const a of accounts) {
            const h = (a.handle || '').toLowerCase();
            if (h && saSuggested && saSuggested[h]) return saSuggested[h];
        }
        return [];
    }

    // ---------- metrics ----------

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

    function saSum(accounts, key) {
        return (accounts || []).reduce((t, a) => t + (parseFloat(a[key]) || 0), 0);
    }

    function saHistTotals(me, idx) {
        // accountsHistory gmv arrays are oldest -> newest; idx counts back from the end (0 = current).
        let total = 0, found = false;
        (me.accountsHistory || []).forEach(h => {
            const arr = h.gmv || [];
            if (arr.length > idx) { total += parseFloat(arr[arr.length - 1 - idx]) || 0; found = true; }
        });
        return found ? total : null;
    }

    function saTrend(cur, prev, suffix) {
        if (!prev || prev <= 0 || cur == null) return null;
        const pct = Math.round(((cur - prev) / prev) * 100);
        return (pct >= 0 ? '+' : '') + pct + '% ' + suffix;
    }

    function saMetrics(variant) {
        const me = saMe() || {};
        const accounts = me.accounts || [];
        const name = me.name || me.username || 'Creator';
        const firstName = name.split(' ')[0];
        const suggested = saMySuggested(me);

        const base = {
            name: name, firstName: firstName,
            handles: accounts.slice(0, 3).map(a => ({
                handle: a.handle || '', gmv: parseFloat(a.gmv) || 0
            })),
            avgComm: me.avgComm != null ? (parseFloat(me.avgComm).toFixed(1) + '%') : null,
            suggested: suggested
        };

        if (variant === 'end') {
            const endGMV = saHistTotals(me, 1);
            const prevGMV = saHistTotals(me, 2);
            const tapHist = me.tapHistory || [];
            const endTap = tapHist.length > 1 ? parseFloat(tapHist[tapHist.length - 2]) || 0 : null;
            return Object.assign(base, {
                period: saMonthLabel(-1), recapTag: 'MONTH-END RECAP', statsPillLabel: 'Month-End Stats',
                totalGmv: endGMV != null ? endGMV : (parseFloat(me.tapLM) || 0),
                tapGmv: endTap != null ? endTap : (parseFloat(me.tapLM) || 0),
                shopPosts: null, tapPosts: null, // per-month post counts not kept in history
                gmvTrend: saTrend(endGMV, prevGMV, 'vs prior month')
            });
        }
        const curGMV = parseFloat(me.totalGMV) || 0;
        const lmGMV = saHistTotals(me, 1);
        return Object.assign(base, {
            period: saMonthLabel(0), recapTag: 'MID-MONTH RECAP', statsPillLabel: 'Mid-Month Stats',
            totalGmv: curGMV,
            tapGmv: saSum(accounts, 'tapGMV'),
            shopPosts: saSum(accounts, 'sv') || null,
            tapPosts: saSum(accounts, 'tap') || null,
            gmvTrend: saTrend(curGMV, lmGMV, 'vs last month')
        });
    }

    // ---------- AI ----------

    function saFallback(m) {
        const winners = (m.suggested || []).slice(0, 2).map(s => s.name.split(/[|,–-]/)[0].trim());
        const winnerLine = winners.length
            ? 'The proven winners below — like ' + winners[0] + ' — are already thriving in your lane and could be an easy, exciting add.'
            : 'Keep an eye on the proven winners list — top sellers in your lane will appear there as the feed grows.';
        const trendUp = (m.gmvTrend || '').startsWith('+');
        return {
            grade: trendUp ? 'A-' : 'B+',
            verdict: trendUp
                ? 'Great momentum — ' + m.firstName + '’s GMV is trending up, and there’s a clear runway to grow even more.'
                : 'You’ve built a great foundation — a couple of small tweaks could unlock your next level.',
            coreIssues: [
                { title: 'Space for a new hero', detail: 'Finding your next signature product is a fun opportunity to build fresh momentum.' },
                { title: 'A chance to focus your feed', detail: 'Zeroing in on a few favorite products could help one really take off.' },
                { title: 'Content ready for a refresh', detail: 'A fresh hook or clearer call-to-action could lift conversion on every post.' }
            ],
            tips: [
                { title: 'Celebrate your winners again', detail: 'Give a proven product 4-5 fresh posts instead of one — winners deserve repeat features.' },
                { title: 'Pick a lane you love', detail: 'Leaning ~70% of posts into one category gives each product room to build momentum.' },
                { title: 'Try the proven winners below', detail: winnerLine }
            ]
        };
    }

    async function saGenerate() {
        const v = saState.variant;
        saState.loading = true; saState.error = false; saState.ai = null;
        saRender();
        await saLoadSuggested();
        const m = saMetrics(v);

        if (saAbort) saAbort.abort();

        if (!SHOP_AUDIT_ENDPOINT) {
            console.info('Shop Audit: SHOP_AUDIT_ENDPOINT not set — using offline fallback copy.');
            setTimeout(() => {
                if (saState.variant !== v) return;
                saState.ai = saFallback(m); saState.loading = false; saState.error = true;
                saRender();
            }, 700);
            return;
        }

        const payload = {
            creator: m.firstName,
            period: m.period,
            recap_type: v === 'end' ? 'month-end (full month closed)' : 'mid-month (month in progress)',
            total_gmv: Math.round(m.totalGmv || 0),
            tap_gmv: Math.round(m.tapGmv || 0),
            shop_posts: m.shopPosts, tap_posts: m.tapPosts,
            gmv_trend: m.gmvTrend || 'n/a',
            avg_commission_pct: m.avgComm,
            // top_categories / top_selling_products: pending per-creator product feed (see README)
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
            if (saState.variant !== v) return;
            saState.ai = ai; saState.loading = false; saState.error = false;
        } catch (e) {
            if (e.name === 'AbortError') return;
            console.warn('Shop Audit: AI call failed, using fallback copy.', e);
            if (saState.variant !== v) return;
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
        overlay.querySelector('#saPeriod').textContent = m.period;
        overlay.querySelector('#saRecapTag').textContent = m.recapTag;
        overlay.querySelector('#saStatsPill').textContent = m.statsPillLabel;
        overlay.querySelector('#saTapGmv').textContent = saFmt(m.tapGmv);
        overlay.querySelector('#saTapPosts').textContent = m.tapPosts != null ? m.tapPosts : '—';
        overlay.querySelector('#saTotalGmv').textContent = saFmt(m.totalGmv);
        overlay.querySelector('#saShopPosts').textContent = m.shopPosts != null ? m.shopPosts : '—';
        overlay.querySelector('#saTrend').textContent = m.gmvTrend || '';
        overlay.querySelector('#saAvgComm').textContent = m.avgComm || '—';
        overlay.querySelector('#saLoadingName').textContent = m.firstName;
        overlay.querySelector('#saSuggSub').textContent =
            'Top sellers in ' + m.firstName + '’s lane not posted yet — ranked by category GMV.';
        overlay.querySelector('#saFootNote').textContent =
            '✦ Generated by TABOOST AI from ' + m.firstName + '’s live Shop data · not manual';

        // Essentials: per-account handle chips + account GMV (PSS feed not available yet)
        const handlesEl = overlay.querySelector('#saHandles');
        if (m.handles.length) {
            handlesEl.innerHTML = m.handles.map((h, i) =>
                '<div class="' + (i === Math.min(1, m.handles.length - 1) ? 'primary' : '') + '" style="text-align:center;">' +
                '<div class="sa-handle-chip">' + saEsc(h.handle) + '</div>' +
                '<div class="sa-handle-score">' + saEsc(saFmt(h.gmv).replace('$', '$')) + '</div></div>'
            ).join('');
        } else {
            handlesEl.innerHTML = '<div class="sa-prod-pending">No linked accounts found</div>';
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
            suggList.innerHTML = '<div class="sa-prod-pending">Personalized picks are being prepared for your account — check back after the next data update.</div>';
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
          '<div class="sa-card">' +
            '<div class="sa-head">' +
              '<div style="min-width:240px;">' +
                '<div class="sa-head-name" id="saName"></div>' +
                '<div class="sa-head-period" id="saPeriod"></div>' +
              '</div>' +
              '<div style="text-align:right; padding-top:4px;">' +
                '<div class="sa-wordmark">TABOOST</div>' +
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
                '<div class="sa-big-num" id="saTotalGmv"></div>' +
                '<div class="sa-num-label">Total GMV</div>' +
                '<div class="sa-mid-num" id="saShopPosts"></div>' +
                '<div class="sa-mid-label">Shop Posts</div>' +
              '</div>' +
              '<div class="sa-inner">' +
                '<div class="sa-pill-filled">Creator Essentials</div>' +
                '<div class="sa-handles" id="saHandles"></div>' +
                '<div class="sa-handles-label">Account GMV</div>' +
                '<div class="sa-mid-num" id="saAvgComm"></div>' +
                '<div class="sa-mid-label">Avg Commission</div>' +
              '</div>' +
            '</div>' +
            '<div class="sa-row">' +
              '<div class="sa-inner sa-products">' +
                '<div class="sa-pill-wrap"><span class="sa-pill-outline" style="font-size:15px; padding:9px 20px;">Top Selling Products</span></div>' +
                '<div class="sa-cat-main"><span class="star">★</span> <span id="saTrend"></span></div>' +
                '<div class="sa-cat-second">GMV trend this period</div>' +
                '<div class="sa-prod-list"><div class="sa-prod-pending">Your per-product breakdown is on its way — the product feed connects in the next data update.</div></div>' +
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
        overlay.querySelector('#saRegen').addEventListener('click', saGenerate);
    }

    function saSetVariant(v) {
        if (v === saState.variant) return;
        saState.variant = v;
        saGenerate();
    }

    function openShopAudit() {
        if (!document.getElementById('shopAuditOverlay')) saBuildModal();
        saState.open = true;
        saGenerate();
    }
    function closeShopAudit() {
        saState.open = false;
        saRender();
    }
    window.openShopAudit = openShopAudit;
    window.closeShopAudit = closeShopAudit;

    // Launcher: insert into the dashboard after the accounts grid.
    function saInsertLauncher() {
        if (document.getElementById('saLauncher')) return;
        const anchor = document.getElementById('accountsGrid');
        const wrap = document.createElement('div');
        wrap.style.cssText = 'text-align:center; margin: 24px 0;';
        wrap.innerHTML = '<button id="saLauncher" class="sa-launcher" type="button">' +
            '<span class="spark">✦</span> Open Shop Account Audit</button>';
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
        else document.querySelector('.creator-layout, main, body').appendChild(wrap);
        wrap.querySelector('#saLauncher').addEventListener('click', openShopAudit);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', saInsertLauncher);
    } else {
        saInsertLauncher();
    }
})();

#!/usr/bin/env node
/**
 * fetch-product-images.js — resolve official TikTok Shop product images.
 *
 * Replaces fetch_product_images.py, which had two faults that left 125 products
 * permanently imageless:
 *
 *   1. On any failure it wrote `cache[pid] = ''`, and its selection filter was
 *      `pid not in cache`. A single timeout or rate-limit therefore blacklisted a
 *      product forever — it was never retried on any later run.
 *   2. It only ever requested the US storefront. Products listed in another
 *      region return {"message":"The product is not currently available in your
 *      country or region."} with no og:image, and were written off as dead.
 *
 * This version keeps an attempts ledger so failures are retried on a cooldown
 * rather than blacklisted, and falls back through regional storefronts.
 * TikTok's responses are non-deterministic under load: the same product can
 * return the geo message on one request and full HTML on the next, which is
 * exactly why retrying across runs matters more than any single pass.
 *
 * Image cache format is unchanged (pid -> url) so build-product-data.js keeps
 * working; retry bookkeeping lives beside it in product-images-attempts.json.
 *
 *   node fetch-product-images.js data/shop [--max-attempts N] [--force]
 */

const fs = require('fs');
const path = require('path');

const csvDir = process.argv[2] || 'data/shop';
const argHas = f => process.argv.includes(f);
const argVal = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? Number(process.argv[i + 1]) : d; };

const CACHE_FILE    = path.join(csvDir, 'product-images.json');
const ATTEMPTS_FILE = path.join(csvDir, 'product-images-attempts.json');
const PRODUCTS_CSV  = path.join(csvDir, 'tap-products.csv');

const CONCURRENCY   = 3;                    // TikTok 429s readily above this
const TIMEOUT_MS    = 15000;
const MAX_ATTEMPTS  = argVal('--max-attempts', 6);
const COOLDOWN_MS   = 24 * 60 * 60 * 1000;  // wait a day before re-trying a failure
const FORCE         = argHas('--force');    // ignore cooldown and attempt ceiling

// Tried in order until one returns an og:image. Plain (no param) is the US
// storefront and covers the overwhelming majority; the rest are the regions
// TABOOST actually brokers in.
const REGIONS = [null, 'GB', 'US', 'MY', 'ID', 'TH', 'VN', 'PH', 'SG'];

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Minimal RFC4180-ish parser: quoted fields, escaped quotes, embedded commas.
function parseCsv(text) {
    const rows = [];
    let row = [], field = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQ) {
            if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (c === '"') inQ = false;
            else field += c;
        } else if (c === '"') inQ = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c !== '\r') field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const header = rows.shift().map(h => h.replace(/^﻿/, '').trim());
    return rows.filter(r => r.length > 1).map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] || '').trim()])));
}

async function fetchOgImage(pid, region) {
    const url = `https://www.tiktok.com/view/product/${pid}` + (region ? `?region=${region}` : '');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
        if (res.status === 429) return { status: 'ratelimited' };
        const body = await res.text();
        // The geo refusal is a tiny JSON body, not an HTML page.
        if (body.length < 400 && body.includes('not currently available')) return { status: 'geo' };
        const m = body.match(/og:image[^>]*?content="(https:[^"]+)"/);
        if (m && /tiktokcdn|ttcdn|tiktok/.test(m[1])) return { status: 'ok', url: m[1] };
        return { status: 'no-og' };
    } catch (e) {
        return { status: e.name === 'AbortError' ? 'timeout' : 'error' };
    } finally { clearTimeout(timer); }
}

async function resolve(pid) {
    for (const region of REGIONS) {
        const r = await fetchOgImage(pid, region);
        if (r.status === 'ok') return { url: r.url, region: region || 'US' };
        // Back off hard on a 429 — hammering the next region makes it worse.
        if (r.status === 'ratelimited') { await sleep(4000); continue; }
        // A geo refusal is the only signal worth trying another storefront for.
        if (r.status !== 'geo') return { url: null, reason: r.status };
        await sleep(400);
    }
    return { url: null, reason: 'geo-all-regions' };
}

(async () => {
    if (!fs.existsSync(PRODUCTS_CSV)) {
        console.error(`No products CSV at ${PRODUCTS_CSV}`);
        process.exit(1);
    }
    const cache    = readJson(CACHE_FILE, {});
    const attempts = readJson(ATTEMPTS_FILE, {});
    const now = Date.now();

    const seen = new Set();
    const products = [];
    for (const row of parseCsv(fs.readFileSync(PRODUCTS_CSV, 'utf8'))) {
        const id = (row['Product ID'] || '').trim();
        const name = (row['Product Name'] || '').trim();
        if (!id || !name || seen.has(id)) continue;
        seen.add(id);
        products.push({ id, name });
    }

    const todo = products.filter(p => {
        if (cache[p.id]) return false;                       // already have an image
        if (FORCE) return true;
        const a = attempts[p.id];
        if (!a) return true;                                 // never tried
        if (a.attempts >= MAX_ATTEMPTS) return false;        // give up after N
        return now - (a.lastTried || 0) > COOLDOWN_MS;       // else respect cooldown
    });

    const haveImage = products.filter(p => cache[p.id]).length;
    console.log(`Products in ${path.basename(PRODUCTS_CSV)}: ${products.length}`);
    console.log(`  with an image already : ${haveImage}`);
    console.log(`  missing               : ${products.length - haveImage}`);
    console.log(`  attempting this run   : ${todo.length}` +
        (FORCE ? '  (--force: ignoring cooldown and attempt ceiling)' : ''));
    if (!todo.length) {
        const stalled = products.filter(p => !cache[p.id] && (attempts[p.id]?.attempts || 0) >= MAX_ATTEMPTS).length;
        console.log(`\nNothing to fetch. ${stalled} product(s) have hit the ${MAX_ATTEMPTS}-attempt ceiling` +
            ` — re-run with --force to try them anyway.`);
        return;
    }

    let done = 0, ok = 0, byRegion = {};
    const save = () => {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 0));
        fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify(attempts, null, 2));
    };

    const queue = todo.slice();
    const worker = async () => {
        while (queue.length) {
            const p = queue.shift();
            const r = await resolve(p.id);
            if (r.url) {
                cache[p.id] = r.url;
                delete attempts[p.id];                        // clean slate once resolved
                ok++;
                byRegion[r.region] = (byRegion[r.region] || 0) + 1;
            } else {
                // Keep the blank so build-product-data.js still counts it, but record
                // the attempt so a later run knows to come back rather than skip it.
                cache[p.id] = '';
                const a = attempts[p.id] || { attempts: 0 };
                attempts[p.id] = { attempts: a.attempts + 1, lastTried: Date.now(), lastReason: r.reason, name: p.name.slice(0, 80) };
            }
            if (++done % 25 === 0) { console.log(`  ${done}/${todo.length} (${ok} resolved)`); save(); }
            await sleep(300);
        }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    save();

    const stillMissing = products.filter(p => !cache[p.id]).length;
    console.log(`\nResolved ${ok}/${todo.length} this run.`);
    if (Object.keys(byRegion).length) {
        console.log('  by storefront: ' + Object.entries(byRegion).map(([r, n]) => `${r}=${n}`).join(', '));
    }
    console.log(`Coverage: ${products.length - stillMissing}/${products.length} ` +
        `(${((products.length - stillMissing) / products.length * 100).toFixed(1)}%)`);
    if (stillMissing) console.log(`${stillMissing} still missing — they stay queued for the next run.`);
})();

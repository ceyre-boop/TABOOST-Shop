// Shop Account Audit — serverless AI proxy (Cloudflare Worker).
// Holds the LLM API key server-side because the site is static GitHub Pages.
//
// Deploy:  cd api/shop-audit && npx wrangler deploy
// Secret:  npx wrangler secret put OPENAI_API_KEY
// Then set SHOP_AUDIT_ENDPOINT in js/shop-audit.js to the worker URL.

const ALLOWED_ORIGINS = [
    'https://shop.taboost.me',
    'https://ceyre-boop.github.io',
    'http://localhost:8000',
    'http://127.0.0.1:8000'
];

const SYSTEM_PROMPT = "You are TABOOST's Shop Growth partner, a warm, encouraging strategist for TikTok Shop creators. You audit ONE TikTok Shop account at a time. You cite that account's real numbers and product names — never generic advice. Tone: supportive and positive — lead with what's working, frame problems as opportunities, and make every suggestion feel achievable and hopeful, like a teammate cheering them on. Never harsh or blaming. Keep every 'title' to 3-6 words and every 'detail' to ONE warm, clear sentence. Core issues = gentle, constructive observations of what's holding GMV back (phrase as opportunities, not failures). Tips = friendly, doable moves to grow GMV, and at least one tip should encourage them to try the proven winners they haven't posted yet. Grade the account health honestly but kindly.";

const AUDIT_SCHEMA = {
    name: 'render_audit',
    schema: {
        type: 'object',
        properties: {
            grade: { type: 'string', description: 'One-letter account-health grade A-F, optional +/-' },
            verdict: { type: 'string', description: 'One warm sentence summarizing where the account stands.' },
            coreIssues: {
                type: 'array', minItems: 3, maxItems: 3,
                items: {
                    type: 'object',
                    properties: { title: { type: 'string' }, detail: { type: 'string' } },
                    required: ['title', 'detail'], additionalProperties: false
                }
            },
            tips: {
                type: 'array', minItems: 3, maxItems: 3,
                items: {
                    type: 'object',
                    properties: { title: { type: 'string' }, detail: { type: 'string' } },
                    required: ['title', 'detail'], additionalProperties: false
                }
            }
        },
        required: ['grade', 'verdict', 'coreIssues', 'tips'],
        additionalProperties: false
    },
    strict: true
};

function corsHeaders(origin) {
    const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        const headers = corsHeaders(origin);

        if (request.method === 'OPTIONS') return new Response(null, { headers });
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers });
        }

        let payload;
        try { payload = await request.json(); }
        catch (e) { return new Response(JSON.stringify({ error: 'invalid JSON' }), { status: 400, headers }); }

        // Light rate limiting: one audit payload is small; reject oversized bodies.
        if (JSON.stringify(payload).length > 8000) {
            return new Response(JSON.stringify({ error: 'payload too large' }), { status: 413, headers });
        }

        const userMsg = 'Write a shop account audit for this creator. Data:\n'
            + JSON.stringify(payload, null, 2)
            + '\n\nRespond with the finished audit in the required JSON format.';

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + env.OPENAI_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    max_tokens: 1500,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: userMsg }
                    ],
                    response_format: { type: 'json_schema', json_schema: AUDIT_SCHEMA }
                })
            });
            if (!res.ok) {
                const detail = await res.text();
                console.error('LLM error', res.status, detail.slice(0, 300));
                return new Response(JSON.stringify({ error: 'llm_error' }), { status: 502, headers });
            }
            const data = await res.json();
            const audit = JSON.parse(data.choices[0].message.content);
            return new Response(JSON.stringify(audit), { headers });
        } catch (e) {
            console.error('proxy failure', e);
            return new Response(JSON.stringify({ error: 'proxy_failure' }), { status: 502, headers });
        }
    }
};

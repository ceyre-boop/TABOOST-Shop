// Shop Account Audit — AI proxy (Node, for Render web service).
// Same contract as worker.js: POST audit payload -> { grade, verdict, coreIssues[], tips[] }.
// Key lives in the OPENAI_API_KEY env var (Render dashboard / render env), never in the client.

const http = require('http');

const PORT = process.env.PORT || 10000;

const ALLOWED_ORIGINS = [
    'https://shop.taboost.me',
    'https://ceyre-boop.github.io',
    'https://taboost-genie-preview.onrender.com',
    'http://localhost:8000',
    'http://localhost:8321',
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

// Very light in-memory rate limit: max 60 audits per rolling hour across all users.
let calls = [];
function rateLimited() {
    const now = Date.now();
    calls = calls.filter(t => now - t < 3600e3);
    if (calls.length >= 60) return true;
    calls.push(now);
    return false;
}

function cors(origin) {
    const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
}

const server = http.createServer(async (req, res) => {
    const headers = cors(req.headers.origin || '');
    if (req.method === 'OPTIONS') { res.writeHead(204, headers); return res.end(); }
    if (req.method === 'GET' && req.url === '/healthz') {
        res.writeHead(200, headers); return res.end('{"ok":true}');
    }
    if (req.method !== 'POST') {
        res.writeHead(405, headers); return res.end('{"error":"POST only"}');
    }
    if (rateLimited()) {
        res.writeHead(429, headers); return res.end('{"error":"rate_limited"}');
    }

    let body = '';
    req.on('data', c => {
        body += c;
        if (body.length > 8000) { res.writeHead(413, headers); res.end('{"error":"payload too large"}'); req.destroy(); }
    });
    req.on('end', async () => {
        if (res.writableEnded) return;
        let payload;
        try { payload = JSON.parse(body); }
        catch (e) { res.writeHead(400, headers); return res.end('{"error":"invalid JSON"}'); }

        const userMsg = 'Write a shop account audit for this creator. Data:\n'
            + JSON.stringify(payload, null, 2)
            + '\n\nRespond with the finished audit in the required JSON format.';

        try {
            const r = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
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
            if (!r.ok) {
                console.error('LLM error', r.status, (await r.text()).slice(0, 300));
                res.writeHead(502, headers); return res.end('{"error":"llm_error"}');
            }
            const data = await r.json();
            const audit = JSON.parse(data.choices[0].message.content);
            res.writeHead(200, headers); res.end(JSON.stringify(audit));
        } catch (e) {
            console.error('proxy failure', e);
            res.writeHead(502, headers); res.end('{"error":"proxy_failure"}');
        }
    });
});

server.listen(PORT, () => console.log('shop-audit proxy listening on', PORT));

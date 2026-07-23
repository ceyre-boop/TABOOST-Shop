# Shop Audit AI Proxy

Tiny Cloudflare Worker that holds the LLM API key (the site is static GitHub Pages — no key
can live in the browser). The dashboard POSTs the creator's audit payload; the worker calls
the model with the supportive-tone system prompt + forced JSON schema and returns
`{ grade, verdict, coreIssues[], tips[] }`.

## Deploy (one time)

```bash
cd api/shop-audit
npx wrangler deploy worker.js --name taboost-shop-audit --compatibility-date 2026-07-01
npx wrangler secret put OPENAI_API_KEY   # paste the key when prompted
```

Then paste the worker URL into `SHOP_AUDIT_ENDPOINT` at the top of `js/shop-audit.js` and
redeploy the site (run `validate-and-deploy-shop.js` first for cache-busting).

Until the endpoint is set, the modal works fully but shows the built-in supportive fallback
copy instead of live AI text — never an empty audit.

## Notes

- Provider-agnostic: to use Anthropic instead, swap the endpoint/body in `worker.js`
  (a `tools` entry + `tool_choice: {type:"tool"}` forces the same schema).
- CORS is limited to shop.taboost.me / github.io / localhost — edit `ALLOWED_ORIGINS`.
- Payloads over 8 KB are rejected as light abuse protection.

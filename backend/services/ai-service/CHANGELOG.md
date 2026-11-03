# ai-service — Changelog

## 2026-05-19 — Live Azure (o-series support)

Three small bugs were preventing the live Azure call from succeeding —
each surfaced only after a real API key was wired into `config.ts`:

- **Empty-env override** — `process.env['AZURE_OPENAI_API_KEY'] ?? '...'`
  let compose's `${VAR:-}` empty-string default win over the inline
  fallback. Switched to `||` for the three Azure env reads so empty also
  falls through.
- **Stale API version** — default was `2024-08-01-preview`, but o-series
  deployments (o1/o3/o4-mini/…) require **`2024-12-01-preview` or later**.
  Bumped the default in both `src/config.ts` and `compose.yaml`.
- **Reasoning-model request shape** — o-series:
  - rejects `max_tokens` (use `max_completion_tokens`),
  - only accepts `temperature: 1` (so omit the override entirely),
  - spends most of the budget on `reasoning_tokens` (the 600-token
    default was burned 100% on internal thinking with zero left for the
    visible reply → empty content + `finish_reason=length`).

  `src/azure/openai-client.ts` now detects o-series by deployment-name
  prefix (`/^o\d/i.test(deployment)`) and:
  - sends `max_completion_tokens: max(maxTokens, 4000)`,
  - omits `temperature` for reasoning models, keeps it for chat models,
  - widens 400 error logging to include the response body so the next
    surprise from Azure is easier to diagnose.

### Verified

```bash
curl http://localhost:8090/ai/inventory-summary -H "Authorization: Bearer <jwt>"
# → 200, source: "azure", summary: real Slovenian narrative from o4-mini
```

The templated fallback still works when Azure 4xx-s or the env is blank —
the UI flips the badge from "Vir: Azure AI" to "Vir: lokalna analiza".

---

## 2026-05-17 — Initial release (closes Gap 6)

New microservice that aggregates inventory + warehouse + product data and
returns a natural-language analysis. When Azure OpenAI credentials are
configured it sends the aggregated facts to the model; otherwise it returns
a deterministic Slovenian templated summary so the mobile UI always renders
something useful.

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET`  | `/health`                  | service health + reports whether Azure is configured |
| `GET`  | `/ai/inventory-summary`    | full snapshot — summary, totals, alerts, reorder suggestions |
| `POST` | `/ai/reorder-suggestion`   | body `{ productId, warehouseId }` → matching suggestion or 404 |

### How it computes

- `src/data-fetcher.ts` — pulls `/inventory`, `/products`, `/warehouses` from
  the upstream services. Forwards the `X-User-*` headers the gateway adds so
  downstream services trust the context.
- `src/analytics/analyze.ts` — joins the three lists, flags items whose
  current quantity is below `minQuantity` (defaulting to 10 if a row has no
  threshold yet — Gap 13 fallback), and emits a reorder suggestion targeting
  `maxQuantity` or `2 × minQuantity`.
- `src/azure/openai-client.ts` — wraps the Azure Chat-Completions REST API
  with a single Slovenian system prompt. Caller passes the analysis facts
  and gets a 60-word narrative back.

### How to plug your Azure model in

Set these env vars (compose passes them through automatically):

```
AZURE_OPENAI_ENDPOINT     https://YOUR-RESOURCE.openai.azure.com
AZURE_OPENAI_API_KEY      <key from Azure portal>
AZURE_OPENAI_DEPLOYMENT   <deployment name, e.g. gpt-4o>
AZURE_OPENAI_API_VERSION  2024-08-01-preview     (override if you pin newer)
AZURE_OPENAI_MAX_TOKENS   600
AZURE_OPENAI_TEMPERATURE  0.4
```

No code changes needed — restart the container and `source` switches from
`template` to `azure` on the next call. Health endpoint reports
`azureConfigured: true` once the env is set.

### How to run

```bash
docker compose -f compose.yaml up -d --build ai-service
# verify:
curl http://localhost:8089/health
# behind the gateway (MANAGER token required):
curl http://localhost:8090/ai/inventory-summary -H "Authorization: Bearer <jwt>"
```

### Files

```
services/ai-service/
  package.json, tsconfig.json, Dockerfile
  src/main.ts
  src/config.ts
  src/types.ts
  src/data-fetcher.ts
  src/analytics/analyze.ts
  src/azure/openai-client.ts
  src/routes/inventory-summary.ts
  src/routes/reorder-suggestion.ts
```

### Compose

Added entry in `compose.yaml` mounting on host network port 8089. Both
mobile-gateway and ai-service know each other through `AI_SERVICE_URL` /
`INVENTORY_SERVICE_URL` env vars (default `http://localhost:80xx`).

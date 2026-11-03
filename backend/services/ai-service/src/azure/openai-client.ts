import { azureConfigured, config } from '../config';
import type { AnalysisResult } from '../analytics/analyze';

// Calls Azure OpenAI chat-completions REST endpoint with the computed
// analysis facts and asks for a tight Slovenian narrative. Returns the text
// when successful; returns null when Azure isn't configured or the call
// fails — caller falls back to the templated summary.
//
// === To plug your model in: ===
// Set these env vars (e.g. via compose.yaml or a .env file shipped with
// ai-service):
//   AZURE_OPENAI_ENDPOINT     = https://YOUR-RESOURCE.openai.azure.com
//   AZURE_OPENAI_API_KEY      = <key from Azure portal>
//   AZURE_OPENAI_DEPLOYMENT   = <deployment name, e.g. gpt-4o>
//   AZURE_OPENAI_API_VERSION  = 2024-08-01-preview   (override if needed)
// No code changes required — the rest of the prompt and request shape is
// already correct for the Azure Chat Completions API.
export async function summarizeWithAzure(analysis: AnalysisResult): Promise<string | null> {
  if (!azureConfigured()) return null;

  const { endpoint, apiKey, deployment, apiVersion, maxTokens, temperature } = config.azure;
  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`;

  const facts = JSON.stringify({
    totals: analysis.totals,
    alerts: analysis.alerts.slice(0, 10),
    reorderSuggestions: analysis.reorderSuggestions.slice(0, 10),
  });

  // o-series ("reasoning") models (o1, o3, o4, …) reject `max_tokens` and
  // require `max_completion_tokens`; they also only accept temperature=1.
  // Detect by deployment name prefix and switch shape accordingly.
  const isReasoning = /^o\d/i.test(deployment);
  const body: Record<string, unknown> = {
    messages: [
      {
        role: 'system',
        content:
          'Si analitik logistike. Pišeš v slovenščini, jasno in konkretno. ' +
          'Tvoja naloga je iz strukturiranih podatkov o zalogah pripraviti tri stavke za vodjo skladišča: ' +
          '(1) splošno stanje, (2) najnujnejše tveganje, (3) priporočilo za naslednje 24 ur. ' +
          'Brez markdown formatiranja. Brez ponavljanja podatkov, ki jih bo videl spodaj.',
      },
      {
        role: 'user',
        content: `Podatki:\n${facts}\nNapiši kratek povzetek (do 60 besed).`,
      },
    ],
  };
  if (isReasoning) {
    // o-series spends most tokens on internal reasoning. 600 was burned
    // entirely on `reasoning_tokens` with finish_reason=length and zero
    // visible output. Floor the budget so there's room for the actual reply.
    body['max_completion_tokens'] = Math.max(maxTokens, 4000);
    // temperature deliberately omitted — only the default (1) is accepted.
  } else {
    body['max_tokens']  = maxTokens;
    body['temperature'] = temperature;
  }

  // Retry once on transient network failures (DNS hiccup, TCP reset,
  // TLS interruption — very common on flaky cellular / hotspot). 4xx/5xx
  // from Azure itself are NOT retried — they're real protocol errors.
  const doFetch = async () => fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key':      apiKey,
    },
    body: JSON.stringify(body),
    // 30 s ceiling: bail before the gateway's 60 s upstream timeout fires.
    signal: AbortSignal.timeout(30_000),
  });

  let res: Response;
  try {
    res = await doFetch();
  } catch (firstErr) {
    console.warn(`[AI] Azure first attempt failed: ${(firstErr as Error).message} — retrying once`);
    try {
      res = await doFetch();
    } catch (secondErr) {
      console.warn(`[AI] Azure retry also failed: ${(secondErr as Error).message} — falling back to template`);
      return null;
    }
  }

  try {
    if (!res.ok) {
      const errBody = await res.text().catch(() => '<unreadable>');
      console.warn(`[AI] Azure call ${res.status} — falling back to template. body: ${errBody.slice(0, 500)}`);
      return null;
    }

    const json = await res.json() as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: unknown;
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text || text.length === 0) {
      console.warn(`[AI] Azure 200 but empty content. finish_reason=${json.choices?.[0]?.finish_reason}. usage=${JSON.stringify(json.usage)}. full=${JSON.stringify(json).slice(0, 400)}`);
      return null;
    }
    return text;
  } catch (err) {
    console.warn(`[AI] Azure call failed: ${(err as Error).message} — falling back to template`);
    return null;
  }
}

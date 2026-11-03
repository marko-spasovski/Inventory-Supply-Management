import 'dotenv/config';

export const config = {
  port: parseInt(process.env['PORT'] ?? '8089', 10),

  // Downstream services this aggregator reads from.
  services: {
    inventory: process.env['INVENTORY_SERVICE_URL'] ?? 'http://localhost:8086',
    warehouse: process.env['WAREHOUSE_SERVICE_URL'] ?? 'http://localhost:8084',
    product:   process.env['PRODUCT_SERVICE_URL']   ?? 'http://localhost:8085',
  },

  // Azure OpenAI configuration — leave blank to get templated summaries only.
  azure: {
    // `||` instead of `??` so an empty-string env (compose's `${VAR:-}`
    // default expansion) falls back to the inline default. With `??` the
    // empty string wins and Azure stays "not configured".
    endpoint:    process.env['AZURE_OPENAI_ENDPOINT']    || '',
    apiKey:      process.env['AZURE_OPENAI_API_KEY']     || '',
    deployment:  process.env['AZURE_OPENAI_DEPLOYMENT']  || '',
    apiVersion:  process.env['AZURE_OPENAI_API_VERSION'] || '',
    maxTokens:   parseInt(process.env['AZURE_OPENAI_MAX_TOKENS'] ?? '600', 10),
    temperature: parseFloat(process.env['AZURE_OPENAI_TEMPERATURE'] ?? '0.4'),
  },

  cors: {
    origins: (process.env['CORS_ORIGINS'] ?? '*').split(','),
  },
} as const;

export function azureConfigured(): boolean {
  return Boolean(config.azure.endpoint && config.azure.apiKey && config.azure.deployment);
}

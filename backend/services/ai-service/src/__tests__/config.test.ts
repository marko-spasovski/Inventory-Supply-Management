import { config, azureConfigured } from '../config';

describe('config', () => {
  it('has numeric port', () => {
    expect(typeof config.port).toBe('number');
  });

  it('lists downstream service URLs', () => {
    expect(config.services.inventory).toMatch(/^http/);
    expect(config.services.warehouse).toMatch(/^http/);
    expect(config.services.product).toMatch(/^http/);
  });

  it('has numeric Azure tuning params', () => {
    expect(typeof config.azure.maxTokens).toBe('number');
    expect(typeof config.azure.temperature).toBe('number');
  });

  it('azureConfigured() returns false when no env vars set', () => {
    // Default env should not have endpoint/apiKey/deployment populated
    if (!config.azure.endpoint || !config.azure.apiKey || !config.azure.deployment) {
      expect(azureConfigured()).toBe(false);
    }
  });
});

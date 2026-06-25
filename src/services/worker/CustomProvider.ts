import { resolveOpenRouterChatCompletionsUrl } from '../../shared/openrouter-base-url.js';
import { SettingsDefaultsManager } from '../../shared/SettingsDefaultsManager.js';
import { USER_SETTINGS_PATH } from '../../shared/paths.js';
import { logger } from '../../utils/logger.js';
import { OpenRouterProvider, type OpenRouterConfig } from './OpenRouterProvider.js';

/**
 * Custom OpenAI-compatible provider.
 *
 * A first-class `CLAUDE_MEM_PROVIDER=custom` that points at any
 * OpenAI-compatible `/chat/completions` endpoint via its own settings:
 *
 *   CLAUDE_MEM_CUSTOM_BASE_URL = http://100.104.227.128:8643/v1
 *   CLAUDE_MEM_CUSTOM_MODEL    = openai/fcm
 *   CLAUDE_MEM_CUSTOM_API_KEY  = <optional>
 *
 * It reuses OpenRouterProvider's generic OpenAI-compatible request/response
 * machinery (the same multi-turn loop, truncation, and error classification);
 * only config resolution and the API-key requirement differ. The API key is
 * optional so a local/keyless server (LM Studio, vLLM, a self-hosted gateway)
 * works without one.
 */
export class CustomProvider extends OpenRouterProvider {
  protected readonly providerName = 'Custom';
  protected readonly syntheticIdPrefix = 'custom';

  protected requireApiKey(): boolean {
    return false;
  }

  protected getConfig(): OpenRouterConfig {
    return getCustomConfig();
  }

  protected missingApiKeyError(): Error {
    return new Error('Custom provider base URL not configured. Set CLAUDE_MEM_CUSTOM_BASE_URL in settings.');
  }
}

function getCustomConfig(): OpenRouterConfig {
  const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);

  const apiKey = settings.CLAUDE_MEM_CUSTOM_API_KEY || '';

  // Model is passed verbatim — any OpenAI-compatible model id (e.g. openai/fcm).
  const rawModel: unknown = settings.CLAUDE_MEM_CUSTOM_MODEL;
  const model = typeof rawModel === 'string' && rawModel.trim() ? rawModel : '';

  // Reuse the shared resolver: a bare base URL gets `/chat/completions`
  // appended; a full chat-completions URL is used verbatim.
  const apiUrl = resolveOpenRouterChatCompletionsUrl(settings.CLAUDE_MEM_CUSTOM_BASE_URL || '');

  // Empty model would be sent as `model: ""`, which most endpoints reject with
  // an opaque 400 — surface the misconfiguration explicitly instead.
  if (!model) {
    logger.warn('SDK', 'Custom provider has no model configured; set CLAUDE_MEM_CUSTOM_MODEL', { apiUrl });
  }

  return { apiKey, model, apiUrl };
}

export function isCustomAvailable(): boolean {
  const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);
  return !!(settings.CLAUDE_MEM_CUSTOM_BASE_URL && settings.CLAUDE_MEM_CUSTOM_BASE_URL.trim());
}

export function isCustomSelected(): boolean {
  const settings = SettingsDefaultsManager.loadFromFile(USER_SETTINGS_PATH);
  return settings.CLAUDE_MEM_PROVIDER === 'custom';
}

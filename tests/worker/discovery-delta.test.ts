import { describe, it, expect } from 'bun:test';

import { OpenAICompatibleProvider, type ProviderQueryResult } from '../../src/services/worker/OpenAICompatibleProvider.js';
import type { ActiveSession } from '../../src/services/worker-types.js';

class TestProvider extends OpenAICompatibleProvider<{ apiKey: string; model: string }> {
  protected readonly providerName = 'Test';
  protected readonly syntheticIdPrefix = 'test';
  protected readonly requireNonEmptyToTruncate = false;
  protected readonly forwardEmptyMessageResponse = false;

  protected getConfig(): { apiKey: string; model: string } {
    return { apiKey: 'x', model: 'test-model' };
  }
  protected missingApiKeyError(): Error {
    return new Error('missing key');
  }
  protected async query(): Promise<ProviderQueryResult> {
    return { content: '' };
  }
  protected estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
  protected buildLastUsage(): ActiveSession['lastUsage'] {
    return null;
  }

  delta(session: ActiveSession, result: ProviderQueryResult): number {
    return this.discoveryDelta(session, result);
  }
}

function makeSession(): ActiveSession {
  return {} as ActiveSession;
}

describe('OpenAICompatibleProvider.discoveryDelta', () => {
  const provider = new TestProvider({} as never, {} as never);

  it('counts full prompt on first request, only growth afterwards', () => {
    const session = makeSession();

    // First request: whole prompt is new work.
    expect(provider.delta(session, { content: 'a', inputTokens: 1000, outputTokens: 50 })).toBe(1050);
    // Second request re-sends the same 1050-token history plus a 200-token new
    // chunk: only the growth and the new completion count.
    expect(provider.delta(session, { content: 'b', inputTokens: 1250, outputTokens: 40 })).toBe(290);
    // Third request with no prompt growth counts only the completion.
    expect(provider.delta(session, { content: 'c', inputTokens: 1250, outputTokens: 30 })).toBe(30);
  });

  it('never goes negative when history is truncated', () => {
    const session = makeSession();
    provider.delta(session, { content: 'a', inputTokens: 5000, outputTokens: 10 });

    expect(provider.delta(session, { content: 'b', inputTokens: 3000, outputTokens: 20 })).toBe(20);
    // Mark follows the shrunken prompt so later growth is measured from it.
    expect(provider.delta(session, { content: 'c', inputTokens: 3500, outputTokens: 20 })).toBe(520);
  });

  it('falls back to total_tokens when the gateway omits the breakdown', () => {
    const session = makeSession();

    expect(provider.delta(session, { content: 'a', tokensUsed: 700 })).toBe(700);
    expect(provider.delta(session, { content: 'b' })).toBe(0);
  });
});

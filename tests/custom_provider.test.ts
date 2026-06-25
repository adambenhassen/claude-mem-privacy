import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import { CustomProvider, isCustomAvailable, isCustomSelected } from '../src/services/worker/CustomProvider';
import { OpenRouterProvider } from '../src/services/worker/OpenRouterProvider';
import { SessionRoutes } from '../src/services/worker/http/routes/SessionRoutes';
import { DatabaseManager } from '../src/services/worker/DatabaseManager';
import { SessionManager } from '../src/services/worker/SessionManager';
import { ModeManager } from '../src/services/domain/ModeManager';
import { SettingsDefaultsManager } from '../src/shared/SettingsDefaultsManager';

const mockMode = {
  name: 'code',
  prompts: { init: 'init prompt', observation: 'obs prompt', summary: 'summary prompt' },
  observation_types: [{ id: 'discovery' }, { id: 'bugfix' }],
  observation_concepts: []
};

const observationXml = `
  <observation>
    <type>discovery</type>
    <title>Found bug</title>
    <subtitle>Null pointer</subtitle>
    <narrative>Found a null pointer in the code</narrative>
    <facts><fact>Null check missing</fact></facts>
    <concepts><concept>bug</concept></concepts>
    <files_read><file>src/main.ts</file></files_read>
    <files_modified></files_modified>
  </observation>
`;

// Settings the loadFromFile spy returns; mutated per-test before each call.
let customSettings: Record<string, string>;

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    sessionDbId: 1,
    contentSessionId: 'test-session',
    memorySessionId: 'mem-session-123',
    project: 'test-project',
    userPrompt: 'test prompt',
    conversationHistory: [],
    lastPromptNumber: 1,
    cumulativeInputTokens: 0,
    cumulativeOutputTokens: 0,
    pendingMessages: [],
    abortController: new AbortController(),
    generatorPromise: null,
    currentProvider: null,
    startTime: Date.now(),
    ...overrides,
  } as any;
}

describe('CustomProvider', () => {
  let agent: CustomProvider;
  let modeManagerSpy: ReturnType<typeof spyOn>;
  let loadFromFileSpy: ReturnType<typeof spyOn>;
  let originalFetch: typeof global.fetch;
  let mockStoreObservations: any;
  let mockSyncObservation: any;

  beforeEach(() => {
    customSettings = {
      CLAUDE_MEM_PROVIDER: 'custom',
      CLAUDE_MEM_CUSTOM_BASE_URL: 'http://localhost:8000/v1',
      CLAUDE_MEM_CUSTOM_MODEL: 'openai/fcm',
      CLAUDE_MEM_CUSTOM_API_KEY: '',
      CLAUDE_MEM_DATA_DIR: '/tmp/claude-mem-test',
    };

    modeManagerSpy = spyOn(ModeManager, 'getInstance').mockImplementation(() => ({
      getActiveMode: () => mockMode,
      loadMode: () => {},
    } as any));

    loadFromFileSpy = spyOn(SettingsDefaultsManager, 'loadFromFile').mockImplementation(() => ({
      ...SettingsDefaultsManager.getAllDefaults(),
      ...customSettings,
    }));

    mockStoreObservations = mock(() => ({ observationIds: [1], summaryId: 1, createdAtEpoch: Date.now() }));
    mockSyncObservation = mock(() => Promise.resolve());

    const mockSessionStore = {
      storeObservation: mock(() => ({ id: 1, createdAtEpoch: Date.now() })),
      storeObservations: mockStoreObservations,
      storeSummary: mock(() => ({ id: 1, createdAtEpoch: Date.now() })),
      markSessionCompleted: mock(() => {}),
      getSessionById: mock(() => ({ memory_session_id: 'mem-session-123' })),
      ensureMemorySessionIdRegistered: mock(() => {}),
      updateMemorySessionId: mock(() => {}),
    };

    const mockDbManager = {
      getSessionStore: () => mockSessionStore,
      getChromaSync: () => ({ syncObservation: mockSyncObservation, syncSummary: mock(() => Promise.resolve()) }),
    } as unknown as DatabaseManager;

    const mockSessionManager = {
      getMessageIterator: async function* () { yield* []; },
      confirmClaimedMessages: mock(() => Promise.resolve(0)),
      resetProcessingToPending: mock(() => Promise.resolve(0)),
      getMessageBuffer: () => ({
        markProcessed: mock(() => {}),
        confirmProcessed: mock(() => {}),
        cleanupProcessed: mock(() => 0),
        resetStuckMessages: mock(() => 0),
      }),
    } as unknown as SessionManager;

    agent = new CustomProvider(mockDbManager, mockSessionManager);
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    modeManagerSpy?.mockRestore();
    loadFromFileSpy?.mockRestore();
    mock.restore();
  });

  describe('availability + selection predicates', () => {
    it('isCustomSelected is true only when provider is custom', () => {
      expect(isCustomSelected()).toBe(true);
      customSettings.CLAUDE_MEM_PROVIDER = 'openrouter';
      expect(isCustomSelected()).toBe(false);
    });

    it('isCustomAvailable gates on a non-blank base URL', () => {
      expect(isCustomAvailable()).toBe(true);
      customSettings.CLAUDE_MEM_CUSTOM_BASE_URL = '   ';
      expect(isCustomAvailable()).toBe(false);
      customSettings.CLAUDE_MEM_CUSTOM_BASE_URL = '';
      expect(isCustomAvailable()).toBe(false);
    });
  });

  describe('config resolution', () => {
    it('targets <base>/chat/completions and passes the model verbatim, keyless', async () => {
      global.fetch = mock(() => Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: observationXml } }],
        usage: { total_tokens: 50 },
      }))));

      await agent.startSession(makeSession());

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, init] = (global.fetch as any).mock.calls[0];
      expect(url).toBe('http://localhost:8000/v1/chat/completions');
      const body = JSON.parse(init.body);
      expect(body.model).toBe('openai/fcm');
      // Keyless: no usage-accounting field is added for non-openrouter.ai hosts.
      expect(body.usage).toBeUndefined();
      // Empty API key still proceeds (requireApiKey() === false).
      expect(init.headers['Authorization']).toBe('Bearer ');
    });

    it('throws fail-fast when no model is configured (does not send model:"")', async () => {
      customSettings.CLAUDE_MEM_CUSTOM_MODEL = '';
      global.fetch = mock(() => Promise.resolve(new Response('{}')));

      await expect(agent.startSession(makeSession())).rejects.toThrow(/no model configured/i);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('requireApiKey gate', () => {
    it('keyless custom session proceeds and stores observations', async () => {
      global.fetch = mock(() => Promise.resolve(new Response(JSON.stringify({
        choices: [{ message: { content: observationXml } }],
        usage: { total_tokens: 50 },
      }))));

      await agent.startSession(makeSession());

      expect(mockStoreObservations).toHaveBeenCalled();
      expect(mockSyncObservation).toHaveBeenCalled();
    });

    it('base OpenRouter provider still rejects an empty API key', async () => {
      // Same keyless settings, but the un-overridden requireApiKey() === true.
      customSettings.CLAUDE_MEM_PROVIDER = 'openrouter';
      customSettings.CLAUDE_MEM_OPENROUTER_API_KEY = '';
      const orAgent = new OpenRouterProvider(agent['dbManager'], agent['sessionManager']);
      await expect(orAgent.startSession(makeSession())).rejects.toThrow(/API key not configured/i);
    });
  });

  describe('error labeling', () => {
    it('reports failures as "Custom", not "OpenRouter"', async () => {
      global.fetch = mock(() => Promise.resolve(new Response('bad model', { status: 400 })));

      await expect(agent.startSession(makeSession())).rejects.toThrow(/Custom bad request \(status 400\)/);
    });
  });

  // getSelectedProvider is the live selection path (getActiveAgent is unused).
  // It must fail loudly for a misconfigured custom selection rather than
  // silently degrading to Claude, and custom must win over other providers.
  describe('provider selection (getSelectedProvider)', () => {
    const routes = () => new SessionRoutes(
      null as any, null as any, null as any, null as any,
      null as any, null as any, null as any, null as any, null as any,
    );
    const select = () => (routes() as any).getSelectedProvider();

    it('returns "custom" when selected and available', () => {
      expect(select()).toBe('custom');
    });

    it('custom wins even when OpenRouter is also fully configured', () => {
      customSettings.CLAUDE_MEM_OPENROUTER_API_KEY = 'or-key';
      expect(select()).toBe('custom');
    });

    it('throws (no silent Claude fallback) when custom is selected but has no base URL', () => {
      customSettings.CLAUDE_MEM_CUSTOM_BASE_URL = '';
      expect(() => select()).toThrow(/CLAUDE_MEM_CUSTOM_BASE_URL/);
    });
  });
});

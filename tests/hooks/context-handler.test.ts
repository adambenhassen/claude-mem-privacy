import { describe, it, expect, beforeEach, afterAll, mock } from 'bun:test';

// Capture REAL modules BEFORE mocking so afterAll can restore them. bun's
// `mock.module` is process-global and sticky; mock.restore() does NOT undo it,
// so we re-register the real implementations to keep the suite order-independent.
import * as realWorkerUtils from '../../src/shared/worker-utils.js';
import * as realProjectName from '../../src/utils/project-name.js';
import * as realHookSettings from '../../src/shared/hook-settings.js';
import * as realOauth from '../../src/shared/oauth-token.js';
import * as realShouldTrack from '../../src/shared/should-track-project.js';

const realWorkerUtilsSnapshot = { ...realWorkerUtils };
const realProjectNameSnapshot = { ...realProjectName };
const realHookSettingsSnapshot = { ...realHookSettings };
const realOauthSnapshot = { ...realOauth };
const realShouldTrackSnapshot = { ...realShouldTrack };

const FALLBACK_BRAND = Symbol.for('claude-mem/worker-fallback');

let trackProject = true;
let workerCalls = 0;

mock.module('../../src/shared/should-track-project.js', () => ({
  shouldTrackProject: () => trackProject,
  shouldEmitProjectRow: () => true,
}));

mock.module('../../src/shared/worker-utils.js', () => ({
  getWorkerPort: () => 37777,
  executeWithWorkerFallback: async () => {
    workerCalls++;
    return { continue: true, reason: 'worker_unreachable', [FALLBACK_BRAND]: true };
  },
  isWorkerFallback: (r: any) => !!r && typeof r === 'object' && r[FALLBACK_BRAND] === true,
}));

mock.module('../../src/utils/project-name.js', () => ({
  getProjectContext: () => ({ allProjects: ['test-project'], primary: 'test-project' }),
}));

mock.module('../../src/shared/hook-settings.js', () => ({
  loadFromFileOnce: () => ({ CLAUDE_MEM_CONTEXT_SHOW_TERMINAL_OUTPUT: 'false' }),
}));

mock.module('../../src/shared/oauth-token.js', () => ({
  readStaleMarker: () => undefined,
}));

// Import after mocks so the handler binds to the mocked dependencies.
const { contextHandler } = await import('../../src/cli/handlers/context.js');

describe('contextHandler — project tracking gate', () => {
  beforeEach(() => {
    trackProject = true;
    workerCalls = 0;
  });

  afterAll(() => {
    mock.module('../../src/shared/should-track-project.js', () => realShouldTrackSnapshot);
    mock.module('../../src/shared/worker-utils.js', () => realWorkerUtilsSnapshot);
    mock.module('../../src/utils/project-name.js', () => realProjectNameSnapshot);
    mock.module('../../src/shared/hook-settings.js', () => realHookSettingsSnapshot);
    mock.module('../../src/shared/oauth-token.js', () => realOauthSnapshot);
  });

  it('skips context injection when the project is not tracked (excluded / not allow-listed)', async () => {
    trackProject = false;

    const result = await contextHandler.execute({
      sessionId: 's',
      cwd: '/some/excluded/dir',
      platform: 'claude-code',
    });

    expect(result.hookSpecificOutput?.additionalContext).toBe('');
    expect(result.systemMessage).toBeUndefined();
    expect(workerCalls).toBe(0);
  });

  it('injects context (queries the worker) when the project is tracked', async () => {
    trackProject = true;

    await contextHandler.execute({
      sessionId: 's',
      cwd: '/tracked/dir',
      platform: 'claude-code',
    });

    expect(workerCalls).toBeGreaterThan(0);
  });
});

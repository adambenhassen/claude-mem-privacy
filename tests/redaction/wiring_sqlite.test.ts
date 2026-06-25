import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { SessionStore } from '../../src/services/sqlite/SessionStore.js';
import { SettingsDefaultsManager } from '../../src/shared/SettingsDefaultsManager';

spyOn(SettingsDefaultsManager, 'loadFromFile').mockImplementation(
  () => SettingsDefaultsManager.getAllDefaults() as any
);

const TOKEN = 'ghp_0000000000000000000000000000000000';

describe('SQLite write redaction (choke point B1)', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore(':memory:');
  });
  afterEach(() => {
    store.close();
  });

  it('redacts user prompt text before storage', () => {
    store.createSDKSession('s1', 'proj', 'initial');
    store.saveUserPrompt('s1', 1, `please use ${TOKEN} as the token`);
    const stored = store.getUserPrompt('s1', 1);
    expect(stored).not.toContain(TOKEN);
    expect(stored).toContain('[REDACTED:GITHUB_PAT]');
  });

  it('redacts summary fields before storage', () => {
    const sid = store.createSDKSession('s2', 'proj', 'initial');
    store.updateMemorySessionId(sid, 'mem-1');
    store.storeSummary('mem-1', 'proj', {
      request: `fix auth with ${TOKEN}`,
      investigated: 'logs',
      learned: 'root cause',
      completed: 'done',
      next_steps: 'none',
      notes: null,
    });
    const stored = store.getSummaryForSession('mem-1');
    expect(stored?.request).not.toContain(TOKEN);
    expect(stored?.request).toContain('[REDACTED:GITHUB_PAT]');
  });
});

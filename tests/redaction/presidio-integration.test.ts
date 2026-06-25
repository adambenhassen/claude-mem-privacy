import { describe, it, expect } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { SettingsDefaultsManager } from '../../src/shared/SettingsDefaultsManager';
import { PresidioManager } from '../../src/services/redaction/PresidioManager';

// Heavy: spins the real Presidio sidecar, which on first run downloads the spaCy
// model (~560MB) via uv. Opt-in only, and skipped when uv is unavailable.
const uvPresent = (() => {
  try { return spawnSync('uv', ['--version'], { stdio: 'ignore' }).status === 0; } catch { return false; }
})();
const run = process.env.CLAUDE_MEM_RUN_PRESIDIO_IT === '1' && uvPresent;

describe.if(run)('Presidio sidecar (live)', () => {
  it('redacts PERSON and LOCATION via the real model', async () => {
    process.env.CLAUDE_MEM_REDACTION_PRESIDIO_ENABLED = 'true';
    process.env.CLAUDE_MEM_REDACTION_PRESIDIO_TIMEOUT_MS = '20000';
    process.env.CLAUDE_MEM_REDACTION_PRESIDIO_STARTUP_TIMEOUT_MS = '180000';
    PresidioManager.resetInstance();
    PresidioManager.__setSpawn(null);
    SettingsDefaultsManager; // ensure module loaded

    const { text } = await PresidioManager.getInstance().anonymize('My name is Jane Smith from Berlin', {});
    expect(text).toContain('[REDACTED:PERSON]');
    expect(text).toContain('[REDACTED:LOCATION]');
    await PresidioManager.getInstance().stop();
  }, 200000);
});

// Always have at least one assertion so the file is never "empty".
describe('Presidio integration harness', () => {
  it('is gated behind CLAUDE_MEM_RUN_PRESIDIO_IT=1 and uv presence', () => {
    expect(typeof run).toBe('boolean');
  });
});

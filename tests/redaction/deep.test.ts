import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { EventEmitter } from 'node:events';
import { SettingsDefaultsManager } from '../../src/shared/SettingsDefaultsManager';
import { redactForLLMDeep } from '../../src/shared/redaction/index';
import { PresidioManager } from '../../src/services/redaction/PresidioManager';

class FakeChild extends EventEmitter {
  pid = 99;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = {
    write: (line: string) => {
      const req = JSON.parse(line);
      // Pretend Presidio found a PERSON and replaced it.
      queueMicrotask(() =>
        this.stdout.emit('data', Buffer.from(JSON.stringify({
          id: req.id,
          text: req.text.replace('Jane Smith', '[REDACTED:PERSON]'),
          counts: { PERSON: 1 },
        }) + '\n'))
      );
      return true;
    },
    end: () => {},
  };
  kill() { return true; }
}

function settings(over: Record<string, string>) {
  return spyOn(SettingsDefaultsManager, 'loadFromFile').mockImplementation(
    () => ({ ...SettingsDefaultsManager.getAllDefaults(), ...over }) as any
  );
}

describe('redactForLLMDeep', () => {
  let s: ReturnType<typeof spyOn>;
  afterEach(() => {
    PresidioManager.__setSpawn(null);
    PresidioManager.resetInstance();
    s?.mockRestore();
  });

  it('with Presidio disabled, equals the regex result (no ML change)', async () => {
    s = settings({ CLAUDE_MEM_REDACTION_PRESIDIO_ENABLED: 'false' });
    PresidioManager.resetInstance();
    const out = await redactForLLMDeep('token ghp_0000000000000000000000000000000000 by Jane Smith');
    expect(out).toContain('[REDACTED:GITHUB_PAT]'); // regex ran
    expect(out).toContain('Jane Smith'); // ML did NOT run
  });

  it('with Presidio enabled, applies the ML pass on top of regex', async () => {
    s = settings({ CLAUDE_MEM_REDACTION_PRESIDIO_ENABLED: 'true', CLAUDE_MEM_REDACTION_PRESIDIO_TIMEOUT_MS: '300' });
    PresidioManager.resetInstance();
    PresidioManager.__setSpawn(() => {
      const c = new FakeChild();
      queueMicrotask(() => c.stdout.emit('data', Buffer.from(JSON.stringify({ ready: true }) + '\n')));
      return c as any;
    });
    const out = await redactForLLMDeep('token ghp_0000000000000000000000000000000000 by Jane Smith');
    expect(out).toContain('[REDACTED:GITHUB_PAT]'); // regex
    expect(out).toContain('[REDACTED:PERSON]');     // ML
    expect(out).not.toContain('Jane Smith');
  });
});

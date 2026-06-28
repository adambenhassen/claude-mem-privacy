import { describe, it, expect, afterEach, spyOn } from 'bun:test';
import { SettingsDefaultsManager } from '../../src/shared/SettingsDefaultsManager';
import { PresidioManager } from '../../src/services/redaction/PresidioManager';
import { redactTextDeep, __resetPresidioFailureWarning } from '../../src/shared/redaction/index';
import { logger } from '../../src/utils/logger';
import { logArgsText } from './leak-helpers';

const PAT = 'ghp_' + '0'.repeat(36);

describe('Presidio pass failure (fail-open but observable)', () => {
  let spies: ReturnType<typeof spyOn>[] = [];
  afterEach(() => {
    spies.forEach((s) => s.mockRestore());
    spies = [];
  });

  it('logs once (class only, never the input text) and returns the regex-only result when Presidio throws', async () => {
    spies.push(
      spyOn(SettingsDefaultsManager, 'loadFromFile').mockImplementation(
        () => ({ ...SettingsDefaultsManager.getAllDefaults(), CLAUDE_MEM_REDACTION_PRESIDIO_ENABLED: 'true' }) as any
      )
    );
    // Force the NER pass to blow up the way a broken dynamic import / unexpected
    // error would — the message embeds the input to prove it is never logged.
    spies.push(
      spyOn(PresidioManager, 'getInstance').mockImplementation(() => {
        throw new Error('boom SENSITIVE_INPUT_LEAK');
      })
    );
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    spies.push(warn);
    __resetPresidioFailureWarning();

    const out = await redactTextDeep(`secret SENSITIVE_INPUT_LEAK and token ${PAT}`, { surface: 'sqlite' });

    // Regex layer still ran (fail-open).
    expect(out).toContain('[REDACTED:GITHUB_PAT]');
    expect(out).not.toContain(PAT);
    // The disappearance of the NER layer is surfaced...
    expect(warn).toHaveBeenCalledTimes(1);
    // ...but neither the input text nor the error message leaks into the log
    // (Error-aware: a logged Error's .message would hide from JSON.stringify).
    for (const call of warn.mock.calls) {
      expect(logArgsText(call)).not.toContain('SENSITIVE_INPUT_LEAK');
    }

    // Warn-once: a second failing pass on a new value must NOT log again, else a
    // broken sidecar spams a line per field of every observation.
    await redactTextDeep(`another SENSITIVE_INPUT_LEAK ${PAT}`, { surface: 'chroma' });
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

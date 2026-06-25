import { describe, it, expect, spyOn } from 'bun:test';
import { SettingsDefaultsManager } from '../../src/shared/SettingsDefaultsManager';

spyOn(SettingsDefaultsManager, 'loadFromFile').mockImplementation(
  () => SettingsDefaultsManager.getAllDefaults() as any
);

import { buildObservationPrompt } from '../../src/sdk/prompts';

describe('prompt builder redaction (choke point A)', () => {
  it('redacts secrets inside observation prompts', () => {
    const prompt = buildObservationPrompt({
      id: 0,
      tool_name: 'Bash',
      tool_input: JSON.stringify({
        cmd: 'curl -H "Authorization: Bearer ghp_0000000000000000000000000000000000"',
      }),
      tool_output: JSON.stringify({ ok: true }),
      created_at_epoch: Date.now(),
    });
    expect(prompt).toContain('[REDACTED:');
    expect(prompt).not.toContain('ghp_0000000000000000000000000000000000');
  });
});

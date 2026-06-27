import { describe, it, expect, spyOn } from 'bun:test';
import * as configMod from '../../src/shared/redaction/config';
import { redactFields } from '../../src/shared/redaction/index';

describe('redactFields config resolution', () => {
  it('resolves the redaction config once for the whole object, not once per field', () => {
    const spy = spyOn(configMod, 'resolveRedactionConfig');
    redactFields({ a: 'x', b: 'y', c: 'z', d: 'w' }, ['a', 'b', 'c', 'd']);
    expect(spy.mock.calls.length).toBe(1);
    spy.mockRestore();
  });

  it('still applies redaction correctly when resolving once', () => {
    const TOKEN = 'ghp_' + '0'.repeat(36);
    const out = redactFields({ a: `use ${TOKEN}`, b: 'plain' }, ['a', 'b']);
    expect(out.a).toContain('[REDACTED:GITHUB_PAT]');
    expect(out.a).not.toContain(TOKEN);
    expect(out.b).toBe('plain');
  });
});

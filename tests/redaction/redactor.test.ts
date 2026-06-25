import { describe, it, expect, spyOn, mock } from 'bun:test';

mock.module('node:child_process', () => ({
  execFileSync: (_c: string, a: string[]) =>
    a.includes('user.name')
      ? 'Jane Doe\n'
      : a.includes('user.email')
        ? 'jane.doe@corp.test\n'
        : '',
}));

import { SettingsDefaultsManager } from '../../src/shared/SettingsDefaultsManager';
import { redact } from '../../src/shared/redaction/redactor';
import { __resetIdentityCache } from '../../src/shared/redaction/identity';

spyOn(SettingsDefaultsManager, 'loadFromFile').mockImplementation(
  () => SettingsDefaultsManager.getAllDefaults() as any
);

const MUST_REDACT = [
  'ghp_0000000000000000000000000000000000',
  'ctx7sk-EXAMPLE0000',
  'sk-lf-EXAMPLE0000',
  'sk-or-v1-' + '0'.repeat(64),
  'evil@notallowed.io',
  'Jane Doe',
  'postgresql://user:pass@db.internal/app',
  'eyJhbGc.eyJzdWI.SIGabc',
  '-----BEGIN OPENSSH PRIVATE KEY-----',
];

const MUST_NOT_REDACT = [
  'DATABASE_PASSWORD',
  'YOUR_API_KEY',
  '9a1b2c3d4e5f60718293a4b5c6d7e8f901234567',
  '192.0.2.40',
  'someone@example.com', // allowlisted domain, not the operator handle
];

describe('redact acceptance', () => {
  it('redacts every must-redact fixture', () => {
    __resetIdentityCache();
    for (const f of MUST_REDACT) {
      const { text } = redact(`prefix ${f} suffix`);
      expect(text).toContain('[REDACTED:');
      expect(text).not.toContain(f);
    }
  });

  it('leaves every must-not-redact fixture intact', () => {
    __resetIdentityCache();
    for (const f of MUST_NOT_REDACT) {
      expect(redact(f).text).toBe(f);
    }
  });

  it('redacts the operator identity from git config', () => {
    __resetIdentityCache();
    const { text } = redact('signed off by Jane Doe <jane.doe@corp.test>');
    expect(text).not.toContain('Jane Doe');
    expect(text).not.toContain('jane.doe@corp.test');
  });

  it('is idempotent', () => {
    __resetIdentityCache();
    const once = redact(MUST_REDACT.join(' ')).text;
    expect(redact(once).text).toBe(once);
  });

  it('returns counts without values', () => {
    __resetIdentityCache();
    const { counts } = redact('ghp_0000000000000000000000000000000000');
    expect(counts.GITHUB_PAT).toBe(1);
  });
});

describe('phone over-redaction guard', () => {
  it('does not redact ISO dates, versions, or doc IPs', () => {
    __resetIdentityCache();
    for (const f of ['2026-06-25', '12.34.56.78', '1.2.3', '192.0.2.40']) {
      expect(redact(f).text).toBe(f);
    }
  });
  it('redacts a real international phone number', () => {
    __resetIdentityCache();
    const { text } = redact('call me at +1 (415) 555-2671 today');
    expect(text).toContain('[REDACTED:PHONE]');
    expect(text).not.toContain('555-2671');
  });
});

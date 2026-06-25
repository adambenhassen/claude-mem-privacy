import { describe, it, expect } from 'bun:test';
import { STATIC_RULES, luhn, EMAIL_REGEX, PHONE_REGEX, POSTAL_REGEX } from '../../src/shared/redaction/patterns';

function redactWith(text: string): string {
  let out = text;
  for (const r of STATIC_RULES) {
    r.regex.lastIndex = 0;
    out = out.replace(r.regex, (...a) =>
      r.replace ? r.replace(...(a as [string])) : `[REDACTED:${r.label}]`
    );
    r.regex.lastIndex = 0;
  }
  return out;
}

describe('STATIC_RULES secrets', () => {
  it('redacts known token prefixes', () => {
    const cases: Array<[string, string]> = [
      ['ghp_0000000000000000000000000000000000', 'GITHUB_PAT'],
      ['ctx7sk-EXAMPLE0000', 'CONTEXT7_KEY'],
      ['sk-lf-EXAMPLE0000', 'LANGFUSE_KEY'],
      ['sk-or-v1-' + '0'.repeat(64), 'OPENROUTER_KEY'],
    ];
    for (const [input, label] of cases) {
      expect(redactWith(input)).toContain(`[REDACTED:${label}]`);
    }
  });

  it('redacts basic-auth URL userinfo only', () => {
    expect(redactWith('postgresql://user:pass@db.internal/app')).toBe(
      'postgresql://[REDACTED:BASIC_AUTH]@db.internal/app'
    );
  });

  it('redacts JWT and private-key header', () => {
    expect(redactWith('eyJhbGc.eyJzdWI.SIGabc')).toContain('[REDACTED:JWT]');
    expect(redactWith('-----BEGIN OPENSSH PRIVATE KEY-----')).toContain('[REDACTED:PRIVATE_KEY]');
  });

  it('does NOT redact env-var names or placeholders', () => {
    expect(redactWith('DATABASE_PASSWORD')).toBe('DATABASE_PASSWORD');
    expect(redactWith('api_key = YOUR_API_KEY')).toBe('api_key = YOUR_API_KEY');
  });

  it('does NOT redact git SHA or RFC-5737 doc IP', () => {
    expect(redactWith('9a1b2c3d4e5f60718293a4b5c6d7e8f901234567')).toBe(
      '9a1b2c3d4e5f60718293a4b5c6d7e8f901234567'
    );
    expect(redactWith('192.0.2.40')).toBe('192.0.2.40');
  });
});

describe('PII regexes', () => {
  it('email regex matches a real address', () => {
    EMAIL_REGEX.lastIndex = 0;
    expect('alice@acme.io'.match(EMAIL_REGEX)?.[0]).toBe('alice@acme.io');
  });
  it('phone regex matches an intl number', () => {
    PHONE_REGEX.lastIndex = 0;
    expect(PHONE_REGEX.test('+1 (415) 555-2671')).toBe(true);
  });
  it('postal regex matches a street address', () => {
    POSTAL_REGEX.lastIndex = 0;
    expect(POSTAL_REGEX.test('1600 Pennsylvania Ave')).toBe(true);
  });
});

describe('luhn', () => {
  it('validates a known-good test card and rejects a bad run', () => {
    expect(luhn('4242424242424242')).toBe(true);
    expect(luhn('4242424242424241')).toBe(false);
  });
});

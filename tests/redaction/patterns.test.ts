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

  it('redacts ssh public keys (rsa, ed25519, ecdsa, FIDO security-key)', () => {
    const body = 'AAAA' + 'B'.repeat(40);
    for (const type of [
      'ssh-rsa',
      'ssh-ed25519',
      'ecdsa-sha2-nistp256',
      'sk-ssh-ed25519@openssh.com',
      'sk-ecdsa-sha2-nistp256@openssh.com',
    ]) {
      const out = redactWith(`${type} ${body} user@host`);
      expect(out).toContain('[REDACTED:SSH_KEY]');
      expect(out).not.toContain(body);
    }
  });

  it('redacts prefixed/camelCase secret keys and opaque JSON tokens', () => {
    const cases = [
      'TunnelSecret: aGVsbG8xMjM0NTY3OA==',
      'CF_TUNNEL_TOKEN: c29tZXZhbHVlMTIz',
      'TOTP_ENCRYPTION_KEY=abcdef1234567890',
      'API_NINJAS_KEY: qwerty123456',
    ];
    for (const input of cases) {
      const out = redactWith(input);
      expect(out).toContain('[REDACTED:SECRET]');
    }
    expect(redactWith('eyJhIjoiYWJjIiwidCI6ImRlZiJ9xxxxxxxx')).toContain('[REDACTED:B64_JSON]');
    expect(redactWith('gsk_' + 'a'.repeat(20))).toContain('[REDACTED:GROQ_KEY]');
    expect(redactWith('0x4AAAAAAABBBBccccDDDD')).toContain('[REDACTED:TURNSTILE_KEY]');
  });

  it('redacts base64-encoded PEM and JWT (kubeconfig / k8s secret dumps)', () => {
    const b64pem = 'LS0tLS1CRUdJTi' + 'A'.repeat(60);
    const b64jwt = 'ZXlK' + 'B'.repeat(60);
    const out = redactWith(`client-key-data: ${b64pem}\ntoken: ${b64jwt}`);
    expect(out).toContain('[REDACTED:B64_PEM]');
    expect(out).toContain('[REDACTED:B64_JWT]');
    expect(out).not.toContain(b64pem);
    expect(out).not.toContain(b64jwt);
  });

  it('does NOT redact env-var names or placeholders', () => {
    expect(redactWith('DATABASE_PASSWORD')).toBe('DATABASE_PASSWORD');
    expect(redactWith('api_key = YOUR_API_KEY')).toBe('api_key = YOUR_API_KEY');
  });

  it('redacts a lowercase high-entropy assigned value (placeholder-flag regression)', () => {
    expect(redactWith('password=supersecret')).toContain('[REDACTED:SECRET]');
    expect(redactWith('password=supersecret')).not.toContain('supersecret');
  });

  it('validates IBAN checksum (redacts valid, skips invalid)', () => {
    expect(redactWith('DE89370400440532013000')).toContain('[REDACTED:IBAN]');
    expect(redactWith('AB12DEADBEEF123456')).toBe('AB12DEADBEEF123456');
  });

  it('does NOT treat hex-ish tokens as EU VAT', () => {
    expect(redactWith('DEADBEEF12')).toBe('DEADBEEF12');
  });

  it('does NOT redact git SHA or RFC-5737 doc IP', () => {
    expect(redactWith('9a1b2c3d4e5f60718293a4b5c6d7e8f901234567')).toBe(
      '9a1b2c3d4e5f60718293a4b5c6d7e8f901234567'
    );
    expect(redactWith('192.0.2.40')).toBe('192.0.2.40');
  });

  it('high-entropy catch-all redacts unknown mixed-alphabet secrets', () => {
    for (const tok of [
      'aB3xK9mQ2pL7vR4nT6wZ1yD8sF5gH0jUc',   // random base64url token
      'Xk92LmPq47zRtY3wNv8bQd1sHf6gKj0AeI',   // another
    ]) {
      const out = redactWith(`token ${tok}`);
      expect(out).toContain('[REDACTED:HIGH_ENTROPY]');
      expect(out).not.toContain(tok);
    }
  });

  it('high-entropy catch-all leaves SHAs, UUIDs, all-caps, and words alone', () => {
    const survivors = [
      '9a1b2c3d4e5f60718293a4b5c6d7e8f901234567',  // 40-char lowercase-hex git SHA
      'A1B2C3D4E5F60718293A4B5C6D7E8F9012345678',  // uppercase-hex (single case)
      '550e8400-e29b-41d4-a716-446655440000',      // UUID (single case + dashes)
      'DATABASE_CONNECTION_STRING_VALUE',          // ALL_CAPS env name (no lowercase)
      'getUserProfileByAccountIdentifier',         // camelCase identifier (no digit)
    ];
    for (const s of survivors) {
      expect(redactWith(s)).toBe(s);
    }
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

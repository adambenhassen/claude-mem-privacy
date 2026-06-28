import { describe, it, expect, spyOn } from 'bun:test';
import { SettingsDefaultsManager } from '../../src/shared/SettingsDefaultsManager';
import { resolveRedactionConfig, isEmailAllowed } from '../../src/shared/redaction/config';
import { logger } from '../../src/utils/logger';
import { logArgsText } from './leak-helpers';

function withSettings(over: Record<string, string>) {
  return spyOn(SettingsDefaultsManager, 'loadFromFile').mockImplementation(
    () => ({ ...SettingsDefaultsManager.getAllDefaults(), ...over }) as any
  );
}

describe('resolveRedactionConfig', () => {
  it('is enabled by default with no disabled categories', () => {
    const s = withSettings({});
    const c = resolveRedactionConfig();
    expect(c.enabled).toBe(true);
    expect(c.disabled.size).toBe(0);
    s.mockRestore();
  });

  it('honors kill switch and disabled list and project override', () => {
    const s = withSettings({
      CLAUDE_MEM_REDACTION_DISABLED_CATEGORIES: 'PHONE,POSTAL',
      CLAUDE_MEM_REDACTION_PROJECT_OVERRIDES: JSON.stringify({ secret_proj: { enabled: false } }),
    });
    expect(resolveRedactionConfig().disabled.has('PHONE')).toBe(true);
    expect(resolveRedactionConfig('secret_proj').enabled).toBe(false);
    s.mockRestore();
  });

  it('parses configured locale patterns into rules', () => {
    const s = withSettings({
      CLAUDE_MEM_REDACTION_LOCALE_PATTERNS: JSON.stringify({ FR_NIR: '[12]\\d{14}' }),
    });
    const c = resolveRedactionConfig();
    expect(c.localePatterns.some((r) => r.label === 'FR_NIR')).toBe(true);
    s.mockRestore();
  });

  it('drops unknown categories and warns instead of silently keeping them', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    const s = withSettings({ CLAUDE_MEM_REDACTION_DISABLED_CATEGORIES: 'PHONE,BOGUS' });
    const c = resolveRedactionConfig();
    expect(c.disabled.has('PHONE')).toBe(true);
    expect([...c.disabled]).not.toContain('BOGUS');
    expect(warn).toHaveBeenCalled();
    s.mockRestore();
    warn.mockRestore();
  });

  it('skips locale patterns with invalid labels or uncompilable regex (and warns)', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    const s = withSettings({
      CLAUDE_MEM_REDACTION_LOCALE_PATTERNS: JSON.stringify({ 'bad-label': '\\d{10}', GOOD_ID: '(' }),
    });
    const c = resolveRedactionConfig();
    expect(c.localePatterns.length).toBe(0); // bad label dropped, bad regex dropped
    expect(warn).toHaveBeenCalled();
    s.mockRestore();
    warn.mockRestore();
  });

  it('ignores a malformed project override (string disabledCategories not iterated char-by-char)', () => {
    const s = withSettings({
      CLAUDE_MEM_REDACTION_PROJECT_OVERRIDES: JSON.stringify({ proj: { disabledCategories: 'EMAIL' } }),
    });
    const c = resolveRedactionConfig('proj');
    // 'EMAIL' is a string, not an array → ignored, so no 'E'/'M'/'A' junk categories
    expect(c.disabled.size).toBe(0);
    s.mockRestore();
  });

  it('warns (without echoing the raw value) when locale patterns JSON is malformed, and does not throw', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    const s = withSettings({
      CLAUDE_MEM_REDACTION_LOCALE_PATTERNS: '{ not valid json PRIVATE_PATTERN_XYZ',
    });
    const c = resolveRedactionConfig();
    expect(c.localePatterns.length).toBe(0);
    expect(warn).toHaveBeenCalled();
    // The raw config value can contain private patterns — it must never be logged
    // (Error-aware: a leak via a logged Error would hide in non-enumerable .message).
    for (const call of warn.mock.calls) {
      expect(logArgsText(call)).not.toContain('PRIVATE_PATTERN_XYZ');
    }
    s.mockRestore();
    warn.mockRestore();
  });

  it('rejects a catastrophic (ReDoS) locale pattern without compiling or leaking its source', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    const s = withSettings({
      CLAUDE_MEM_REDACTION_LOCALE_PATTERNS: JSON.stringify({ EVIL_REDOS: '(a+)+$' }),
    });
    const c = resolveRedactionConfig();
    expect(c.localePatterns.some((r) => r.label === 'EVIL_REDOS')).toBe(false);
    expect(warn).toHaveBeenCalled();
    for (const call of warn.mock.calls) {
      expect(logArgsText(call)).not.toContain('(a+)+');
    }
    s.mockRestore();
    warn.mockRestore();
  });

  it('rejects a {n,}-brace nested quantifier (e.g. (.+){2,})', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    const s = withSettings({
      CLAUDE_MEM_REDACTION_LOCALE_PATTERNS: JSON.stringify({ BRACE_REDOS: '(.+){2,}' }),
    });
    const c = resolveRedactionConfig();
    expect(c.localePatterns.some((r) => r.label === 'BRACE_REDOS')).toBe(false);
    expect(warn).toHaveBeenCalled();
    s.mockRestore();
    warn.mockRestore();
  });

  it('does NOT over-block a safe UN-nested pattern that merely has two quantifiers', () => {
    // `(abc)+\d{2,}` is linear — a quantified group followed by an independent
    // quantifier, NOT a quantifier nested inside the quantified group.
    const s = withSettings({
      CLAUDE_MEM_REDACTION_LOCALE_PATTERNS: JSON.stringify({ SAFE_TWO_QUANT: '(abc)+\\d{2,}' }),
    });
    const c = resolveRedactionConfig();
    expect(c.localePatterns.some((r) => r.label === 'SAFE_TWO_QUANT')).toBe(true);
    s.mockRestore();
  });

  it('does NOT count quantifier chars inside a character class (e.g. ([+*])+)', () => {
    // The `+`/`*` live inside a character class as literals; the only real
    // quantifier is the outer `+`, so this is safe and must not be dropped.
    const s = withSettings({
      CLAUDE_MEM_REDACTION_LOCALE_PATTERNS: JSON.stringify({ CLASS_QUANT: '([+*])+' }),
    });
    const c = resolveRedactionConfig();
    expect(c.localePatterns.some((r) => r.label === 'CLASS_QUANT')).toBe(true);
    s.mockRestore();
  });

  it('rejects a nested-group catastrophic pattern (e.g. ((a+))+) that single-level scanning would miss', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    const s = withSettings({
      CLAUDE_MEM_REDACTION_LOCALE_PATTERNS: JSON.stringify({ NESTED_REDOS: '((a+))+$' }),
    });
    const c = resolveRedactionConfig();
    expect(c.localePatterns.some((r) => r.label === 'NESTED_REDOS')).toBe(false);
    expect(warn).toHaveBeenCalled();
    s.mockRestore();
    warn.mockRestore();
  });

  it('does NOT over-block a safe pattern whose group contains an ESCAPED quantifier char', () => {
    // `(a\+)+` matches repeats of the literal "a+" — linear, not catastrophic.
    const s = withSettings({
      CLAUDE_MEM_REDACTION_LOCALE_PATTERNS: JSON.stringify({ LITERAL_PLUS: '(a\\+)+' }),
    });
    const c = resolveRedactionConfig();
    expect(c.localePatterns.some((r) => r.label === 'LITERAL_PLUS')).toBe(true);
    s.mockRestore();
  });

  it('rejects an over-long locale pattern source', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    const s = withSettings({
      CLAUDE_MEM_REDACTION_LOCALE_PATTERNS: JSON.stringify({ TOO_LONG: 'a'.repeat(1000) }),
    });
    const c = resolveRedactionConfig();
    expect(c.localePatterns.some((r) => r.label === 'TOO_LONG')).toBe(false);
    expect(warn).toHaveBeenCalled();
    s.mockRestore();
    warn.mockRestore();
  });

  it('allowlists example.com and noreply by default', () => {
    expect(isEmailAllowed('x@example.com', [])).toBe(true);
    expect(isEmailAllowed('noreply@anything.io', [])).toBe(true);
    expect(isEmailAllowed('real@person.com', [])).toBe(false);
  });

  it('honors configured allowlist domains and addresses', () => {
    expect(isEmailAllowed('bot@vendor.io', ['@vendor.io'])).toBe(true);
    expect(isEmailAllowed('exact@person.com', ['exact@person.com'])).toBe(true);
  });
});

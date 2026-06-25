import { describe, it, expect, spyOn } from 'bun:test';
import { SettingsDefaultsManager } from '../../src/shared/SettingsDefaultsManager';
import { resolveRedactionConfig, isEmailAllowed } from '../../src/shared/redaction/config';
import { logger } from '../../src/utils/logger';

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

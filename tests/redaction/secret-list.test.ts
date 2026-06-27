import { describe, it, expect, afterEach, spyOn } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { redact } from '../../src/shared/redaction/redactor';
import { logger } from '../../src/utils/logger';

let prevDataDir: string | undefined;
let dir: string | undefined;

function useDataDir(): string {
  prevDataDir = process.env.CLAUDE_MEM_DATA_DIR;
  dir = mkdtempSync(join(tmpdir(), 'redact-secret-'));
  process.env.CLAUDE_MEM_DATA_DIR = dir;
  return dir;
}

function writeSecret(content: unknown) {
  writeFileSync(join(useDataDir(), 'redaction.local.json'), JSON.stringify(content));
}

function writeSecretRaw(raw: string) {
  writeFileSync(join(useDataDir(), 'redaction.local.json'), raw);
}

afterEach(() => {
  if (prevDataDir === undefined) delete process.env.CLAUDE_MEM_DATA_DIR;
  else process.env.CLAUDE_MEM_DATA_DIR = prevDataDir;
  if (dir) { try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ } dir = undefined; }
});

describe('private secret denylist (redaction.local.json)', () => {
  it('redacts literal terms as [REDACTED:CUSTOM]', () => {
    writeSecret({ terms: ['Jane Q. Personal', 'acct-998877'] });
    const { text } = redact('contact Jane Q. Personal about acct-998877 today');
    expect(text).not.toContain('Jane Q. Personal');
    expect(text).not.toContain('acct-998877');
    expect(text).toContain('[REDACTED:CUSTOM]');
  });

  it('redacts labeled regex patterns as [REDACTED:LABEL]', () => {
    writeSecret({ patterns: { BADGE: 'EMP-[0-9]{6}' } });
    const { text, counts } = redact('badge EMP-123456 issued');
    expect(text).toContain('[REDACTED:BADGE]');
    expect(text).not.toContain('EMP-123456');
    expect(counts.BADGE).toBe(1);
  });

  it('treats literal terms literally — regex metacharacters are escaped', () => {
    writeSecret({ terms: ['a.b+c'] });
    const { text } = redact('value a.b+c and axbyyc');
    expect(text).toContain('[REDACTED:CUSTOM]');
    expect(text).toContain('axbyyc'); // would match if "a.b+c" were treated as a regex
  });

  it('drops patterns with non-UPPER_SNAKE labels, keeps valid ones', () => {
    writeSecret({ patterns: { 'bad label': 'zzz', GOOD: 'qqq' } });
    const { text } = redact('zzz and qqq');
    expect(text).toContain('zzz');                // bad label ignored
    expect(text).toContain('[REDACTED:GOOD]');    // valid label applied
  });

  it('is a no-op when the file is absent', () => {
    useDataDir();
    const { text } = redact('nothing custom here');
    expect(text).toBe('nothing custom here');
  });

  it('is a no-op (and does not throw) when the denylist JSON is malformed, without echoing its contents', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    writeSecretRaw('{ terms: [ broken json PRIVATE_TERM_ABC');
    const { text } = redact('mentions PRIVATE_TERM_ABC verbatim');
    expect(text).toBe('mentions PRIVATE_TERM_ABC verbatim'); // not configured → unchanged, no crash
    expect(warn).toHaveBeenCalled();
    // The malformed file holds private terms — its contents must never reach the logs.
    for (const call of warn.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('PRIVATE_TERM_ABC');
    }
    warn.mockRestore();
  });

  it('skips an invalid denylist regex without leaking the pattern source to logs', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    writeSecret({ patterns: { BADGE: '(unclosed_group_PRIVATESRC' } });
    const { text } = redact('some ordinary text');
    expect(text).toBe('some ordinary text'); // invalid pattern dropped, no crash
    expect(warn).toHaveBeenCalled();
    for (const call of warn.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('unclosed_group_PRIVATESRC');
    }
    warn.mockRestore();
  });

  it('rejects a catastrophic denylist regex (ReDoS) without compiling or leaking it', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    writeSecret({ patterns: { EVIL: '(a+)+$' } });
    // If the pattern were compiled and run, this input would hang the redactor.
    const { text, counts } = redact('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!');
    expect(text).toBe('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!');
    expect(counts.EVIL).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    for (const call of warn.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('(a+)+');
    }
    warn.mockRestore();
  });

  it('warns (rather than silently skipping) when the denylist exists but is unreadable', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    const d = useDataDir();
    // A directory at the denylist path makes readFileSync throw EISDIR — an
    // existing-but-unreadable file must not be mistaken for "no denylist".
    mkdirSync(join(d, 'redaction.local.json'));
    const { text } = redact('hello world');
    expect(text).toBe('hello world');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

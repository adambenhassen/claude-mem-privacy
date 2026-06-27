import { describe, it, expect, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { redact } from '../../src/shared/redaction/redactor';

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
});

import { describe, it, expect, beforeEach, mock } from 'bun:test';

const calls: string[][] = [];
mock.module('node:child_process', () => ({
  execFileSync: (_cmd: string, args: string[]) => {
    calls.push(args);
    if (args.includes('user.name')) return 'Ada Lovelace\n';
    if (args.includes('user.email')) return 'ada.lovelace@analytical.engine\n';
    return '';
  },
}));

import {
  getOperatorIdentity,
  buildOperatorRules,
  __resetIdentityCache,
} from '../../src/shared/redaction/identity';

describe('operator identity', () => {
  beforeEach(() => __resetIdentityCache());

  it('derives name, email, and local-part handle', () => {
    const id = getOperatorIdentity();
    expect(id.names).toContain('Ada Lovelace');
    expect(id.emails).toContain('ada.lovelace@analytical.engine');
    expect(id.handles).toContain('ada.lovelace');
  });

  it('builds rules that redact each form', () => {
    let out = 'commit by Ada Lovelace <ada.lovelace@analytical.engine> aka ada.lovelace';
    for (const r of buildOperatorRules()) {
      r.regex.lastIndex = 0;
      out = out.replace(r.regex, `[REDACTED:${r.label}]`);
    }
    expect(out).not.toContain('Ada Lovelace');
    expect(out).not.toContain('ada.lovelace@analytical.engine');
  });
});

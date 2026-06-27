import { describe, it, expect, spyOn, mock } from 'bun:test';

// git binary not on PATH → execFileSync throws ENOENT for every call.
mock.module('node:child_process', () => ({
  execFileSync: () => {
    const e = new Error('spawn git ENOENT') as Error & { code?: string };
    e.code = 'ENOENT';
    throw e;
  },
}));

import { getOperatorIdentity, __resetIdentityCache } from '../../src/shared/redaction/identity';
import { logger } from '../../src/utils/logger';

describe('operator identity when git is unavailable', () => {
  it('warns once (not once per git call) so self-redaction silently disabling is visible', () => {
    const warn = spyOn(logger, 'warn').mockImplementation(() => {});
    __resetIdentityCache();

    const id = getOperatorIdentity();

    // A broken git invocation must not masquerade as a legitimately-empty identity.
    expect(id.names).toEqual([]);
    expect(id.emails).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(1);

    warn.mockRestore();
  });
});

import { describe, it, expect, spyOn, mock } from 'bun:test';

// git unusable → execFileSync throws a spawn-level error (code set, no exit
// status) for every call. The code is switched per-test below.
let gitErrorCode = 'ENOENT';
mock.module('node:child_process', () => ({
  execFileSync: () => {
    const e = new Error(`spawn git ${gitErrorCode}`) as Error & { code?: string };
    e.code = gitErrorCode;
    throw e;
  },
}));

import { getOperatorIdentity, __resetIdentityCache } from '../../src/shared/redaction/identity';
import { logger } from '../../src/utils/logger';

describe('operator identity when git is unavailable', () => {
  for (const code of ['ENOENT', 'EACCES']) {
    it(`warns once (not once per git call) on a ${code} spawn failure so self-redaction silently disabling is visible`, () => {
      gitErrorCode = code;
      const warn = spyOn(logger, 'warn').mockImplementation(() => {});
      __resetIdentityCache();

      const id = getOperatorIdentity();

      // A broken git invocation must not masquerade as a legitimately-empty identity.
      expect(id.names).toEqual([]);
      expect(id.emails).toEqual([]);
      expect(warn).toHaveBeenCalledTimes(1);

      warn.mockRestore();
    });
  }
});

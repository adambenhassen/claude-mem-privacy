import { describe, it, expect, beforeEach, afterEach, afterAll } from 'bun:test';
import { mock } from 'bun:test';
import { OBSERVER_SESSIONS_DIR } from '../../src/shared/paths.js';
import { normalize } from 'path';

// Mutable settings the mocked loader returns; tests mutate this between cases.
const mockSettings: { CLAUDE_MEM_ALLOWED_PROJECTS: string; CLAUDE_MEM_EXCLUDED_PROJECTS: string } = {
  CLAUDE_MEM_ALLOWED_PROJECTS: '',
  CLAUDE_MEM_EXCLUDED_PROJECTS: '',
};

mock.module('../../src/shared/hook-settings.js', () => ({
  loadFromFileOnce: () => mockSettings,
}));

// Import after mock so the module picks up the mocked dependency
const { shouldTrackProject } = await import('../../src/shared/should-track-project.js');

describe('shouldTrackProject', () => {
  let savedInternal: string | undefined;

  beforeEach(() => {
    savedInternal = process.env.CLAUDE_MEM_INTERNAL;
    delete process.env.CLAUDE_MEM_INTERNAL;
    mockSettings.CLAUDE_MEM_ALLOWED_PROJECTS = '';
    mockSettings.CLAUDE_MEM_EXCLUDED_PROJECTS = '';
  });

  afterEach(() => {
    if (savedInternal !== undefined) {
      process.env.CLAUDE_MEM_INTERNAL = savedInternal;
    } else {
      delete process.env.CLAUDE_MEM_INTERNAL;
    }
    // bun's mock.module is global; leave the shared object empty so this file
    // never leaks a non-empty allow-list into later test files.
    mockSettings.CLAUDE_MEM_ALLOWED_PROJECTS = '';
    mockSettings.CLAUDE_MEM_EXCLUDED_PROJECTS = '';
  });

  // Fully undo the hook-settings module mock so it cannot bleed across files.
  afterAll(() => {
    mock.restore();
  });

  describe('path normalization', () => {
    it('returns false when cwd matches OBSERVER_SESSIONS_DIR with forward slashes', () => {
      const forwardSlash = OBSERVER_SESSIONS_DIR.replace(/\\/g, '/');
      expect(shouldTrackProject(forwardSlash)).toBe(false);
    });

    it('returns false when cwd is a subdirectory of OBSERVER_SESSIONS_DIR (mixed separators)', () => {
      const forwardSlash = OBSERVER_SESSIONS_DIR.replace(/\\/g, '/');
      expect(shouldTrackProject(forwardSlash + '/some-session')).toBe(false);
    });

    it('returns false when cwd matches OBSERVER_SESSIONS_DIR exactly (native separators)', () => {
      expect(shouldTrackProject(OBSERVER_SESSIONS_DIR)).toBe(false);
    });

    it('returns true for an unrelated project path', () => {
      const unrelated = normalize('/tmp/my-project');
      expect(shouldTrackProject(unrelated)).toBe(true);
    });

    it('returns false when CLAUDE_MEM_INTERNAL is set', () => {
      process.env.CLAUDE_MEM_INTERNAL = '1';
      expect(shouldTrackProject('/any/path')).toBe(false);
    });
  });

  describe('allow-list', () => {
    it('tracks everything when allow-list is empty', () => {
      expect(shouldTrackProject('/Users/test/anything')).toBe(true);
    });

    it('tracks a project that matches the allow-list', () => {
      mockSettings.CLAUDE_MEM_ALLOWED_PROJECTS = '/Users/test/work/*';
      expect(shouldTrackProject('/Users/test/work/app')).toBe(true);
    });

    it('does NOT track a project that matches no allow-list pattern', () => {
      mockSettings.CLAUDE_MEM_ALLOWED_PROJECTS = '/Users/test/work/*';
      expect(shouldTrackProject('/Users/test/personal/app')).toBe(false);
    });

    it('exclude wins: a project matching both allow and exclude is not tracked', () => {
      mockSettings.CLAUDE_MEM_ALLOWED_PROJECTS = '/Users/test/work/*';
      mockSettings.CLAUDE_MEM_EXCLUDED_PROJECTS = '/Users/test/work/secret';
      expect(shouldTrackProject('/Users/test/work/secret')).toBe(false);
      expect(shouldTrackProject('/Users/test/work/app')).toBe(true);
    });
  });
});

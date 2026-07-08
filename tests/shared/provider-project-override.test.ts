import { describe, it, expect } from 'bun:test';
import { resolveProviderOverride } from '../../src/shared/provider-project-override';

describe('resolveProviderOverride', () => {
  const raw = '{"work-repo":"custom","side-project":"claude"}';

  it('returns { provider } for a bare-string entry', () => {
    expect(resolveProviderOverride('work-repo', raw)).toEqual({ provider: 'custom' });
    expect(resolveProviderOverride('side-project', raw)).toEqual({ provider: 'claude' });
  });

  it('returns { provider, model } for an object entry', () => {
    const r = '{"a":{"provider":"custom","model":"qwen2.5-coder"}}';
    expect(resolveProviderOverride('a', r)).toEqual({ provider: 'custom', model: 'qwen2.5-coder' });
  });

  it('object entry without a model omits model', () => {
    expect(resolveProviderOverride('a', '{"a":{"provider":"gemini"}}')).toEqual({ provider: 'gemini' });
  });

  it('blank/whitespace model is treated as unset', () => {
    expect(resolveProviderOverride('a', '{"a":{"provider":"custom","model":"  "}}')).toEqual({ provider: 'custom' });
  });

  it('returns { provider, model, effort } for an object entry with effort', () => {
    const r = '{"a":{"provider":"claude","model":"claude-sonnet-5","effort":"high"}}';
    expect(resolveProviderOverride('a', r)).toEqual({ provider: 'claude', model: 'claude-sonnet-5', effort: 'high' });
  });

  it('invalid effort value is treated as unset', () => {
    expect(resolveProviderOverride('a', '{"a":{"provider":"claude","effort":"max"}}')).toEqual({ provider: 'claude' });
  });

  it('returns null when the project has no entry', () => {
    expect(resolveProviderOverride('other', raw)).toBeNull();
  });

  it('returns null for empty project or empty map string', () => {
    expect(resolveProviderOverride(undefined, raw)).toBeNull();
    expect(resolveProviderOverride('work-repo', '')).toBeNull();
    expect(resolveProviderOverride('work-repo', '{}')).toBeNull();
  });

  it('ignores invalid JSON (falls back, no throw)', () => {
    expect(resolveProviderOverride('work-repo', '{not json')).toBeNull();
  });

  it('ignores an unknown or missing provider value', () => {
    expect(resolveProviderOverride('x', '{"x":"bogus"}')).toBeNull();
    expect(resolveProviderOverride('x', '{"x":123}')).toBeNull();
    expect(resolveProviderOverride('x', '{"x":{"provider":"bogus"}}')).toBeNull();
    expect(resolveProviderOverride('x', '{"x":{"model":"m"}}')).toBeNull();
  });

  it('ignores non-object JSON', () => {
    expect(resolveProviderOverride('x', '"custom"')).toBeNull();
    expect(resolveProviderOverride('x', 'null')).toBeNull();
    expect(resolveProviderOverride('x', '[1,2]')).toBeNull();
  });
});

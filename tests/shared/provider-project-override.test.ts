import { describe, it, expect } from 'bun:test';
import { resolveProviderOverride } from '../../src/shared/provider-project-override';

describe('resolveProviderOverride', () => {
  const raw = '{"work-repo":"custom","side-project":"claude"}';

  it('returns the overridden provider for a matching project', () => {
    expect(resolveProviderOverride('work-repo', raw)).toBe('custom');
    expect(resolveProviderOverride('side-project', raw)).toBe('claude');
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

  it('ignores an unknown provider value', () => {
    expect(resolveProviderOverride('x', '{"x":"bogus"}')).toBeNull();
    expect(resolveProviderOverride('x', '{"x":123}')).toBeNull();
  });

  it('ignores non-object JSON', () => {
    expect(resolveProviderOverride('x', '"custom"')).toBeNull();
    expect(resolveProviderOverride('x', 'null')).toBeNull();
    expect(resolveProviderOverride('x', '[1,2]')).toBeNull();
  });
});

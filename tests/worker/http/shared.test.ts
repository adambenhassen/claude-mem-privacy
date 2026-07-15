import { describe, expect, it } from 'bun:test';
import { isToolSkipped } from '../../../src/services/worker/http/shared.js';

describe('isToolSkipped', () => {
  const cfg = 'TodoWrite,mcp__llm-wiki__read_note,mcp__grafana__';

  it('matches exact tool names', () => {
    expect(isToolSkipped('TodoWrite', cfg)).toBe(true);
    expect(isToolSkipped('mcp__llm-wiki__read_note', cfg)).toBe(true);
  });

  it('matches a whole MCP server via `__` prefix entry', () => {
    expect(isToolSkipped('mcp__grafana__query_prometheus', cfg)).toBe(true);
    expect(isToolSkipped('mcp__grafana__anything_new', cfg)).toBe(true);
  });

  it('does not match unrelated tools', () => {
    expect(isToolSkipped('Read', cfg)).toBe(false);
    expect(isToolSkipped('mcp__other__tool', cfg)).toBe(false);
  });
});

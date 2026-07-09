import { describe, test, expect, beforeEach } from 'bun:test';
import {
  parseParamsB,
  filterAndRankModels,
  resolveAutoModels,
  __resetAutoModelCache,
  type OpenRouterModelInfo,
} from '../src/services/worker/openrouter-auto-model.js';

const model = (over: Partial<OpenRouterModelInfo> & { id: string }): OpenRouterModelInfo => ({
  context_length: 262144,
  created: 1_780_000_000,
  architecture: { modality: 'text->text' },
  ...over,
});

const ULTRA = model({ id: 'nvidia/nemotron-3-ultra-550b-a55b:free', context_length: 1_000_000 });
const SUPER = model({ id: 'nvidia/nemotron-3-super-120b-a12b:free', context_length: 1_000_000 });
const HY3 = model({ id: 'tencent/hy3:free', description: 'A large MoE model.' }); // unparseable size
const NANO = model({ id: 'nvidia/nemotron-3-nano-30b-a3b:free' });
const TINY = model({ id: 'liquid/lfm2.5-1.2b-instruct:free' }); // parses to 1.2 < 10
const EMBED = model({ id: 'nvidia/llama-nemotron-embed-vl-1b-v2:free', architecture: { modality: 'text->text' } });
const SAFETY = model({ id: 'nvidia/nemotron-3.5-content-safety:free' });
const LOWCTX = model({ id: 'openai/gpt-oss-120b:free', context_length: 32768 });
const PAID = model({ id: 'nvidia/nemotron-3-ultra-550b-a55b' });
const VISION = model({ id: 'some/vision-90b:free', architecture: { modality: 'text+image->text' } });

describe('parseParamsB', () => {
  test('parses total params from slug', () => {
    expect(parseParamsB(ULTRA)).toBe(550);
    expect(parseParamsB(SUPER)).toBe(120);
    expect(parseParamsB(TINY)).toBe(1.2);
  });
  test('falls back to description, else null', () => {
    expect(parseParamsB(model({ id: 'x/y:free', description: '295B total parameters' }))).toBe(295);
    expect(parseParamsB(HY3)).toBeNull();
  });
});

describe('filterAndRankModels', () => {
  test('filters and ranks by size desc, unparseable last, top 3', () => {
    const ranked = filterAndRankModels([TINY, HY3, SUPER, NANO, SAFETY, LOWCTX, PAID, VISION, ULTRA]);
    expect(ranked).toEqual([ULTRA.id, SUPER.id, HY3.id]);
  });
  test('excludes paid, low-context, non-text, blocklist, sub-10B', () => {
    const ranked = filterAndRankModels([TINY, NANO, SAFETY, LOWCTX, PAID, VISION, EMBED]);
    expect(ranked).toEqual([]);
  });
  test('ties break by context_length then created', () => {
    const a = model({ id: 'a/model-100b:free', context_length: 500_000, created: 1 });
    const b = model({ id: 'b/model-100b:free', context_length: 500_000, created: 2 });
    const c = model({ id: 'c/model-100b:free', context_length: 900_000, created: 1 });
    expect(filterAndRankModels([a, b, c])).toEqual([c.id, b.id, a.id]);
  });
});

describe('resolveAutoModels', () => {
  beforeEach(() => __resetAutoModelCache());

  const okFetch = (data: OpenRouterModelInfo[]) =>
    (async () => new Response(JSON.stringify({ data }), { status: 200 })) as unknown as typeof fetch;
  const failFetch = (async () => { throw new Error('network down'); }) as unknown as typeof fetch;

  test('returns ranked ids on success', async () => {
    expect(await resolveAutoModels(okFetch([ULTRA, SUPER]))).toEqual([ULTRA.id, SUPER.id]);
  });
  test('falls back to last-good list on failure', async () => {
    await resolveAutoModels(okFetch([ULTRA]));
    expect(await resolveAutoModels(failFetch)).toEqual([ULTRA.id]);
  });
  test('throws loudly with no last-good list', async () => {
    await expect(resolveAutoModels(failFetch)).rejects.toThrow(/discovery failed/);
  });
  test('zero candidates counts as failure', async () => {
    await expect(resolveAutoModels(okFetch([TINY]))).rejects.toThrow(/discovery failed/);
  });
});

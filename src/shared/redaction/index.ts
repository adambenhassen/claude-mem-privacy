/**
 * Public redaction API + count-only logging. The surfaces:
 *  - redactForLLM: pre-compression, applied at the shared prompt builders.
 *  - redactText / redactFields: pre-persistence (SQLite, Chroma).
 *
 * The `*Deep` variants are retained as async wrappers over the same synchronous
 * regex core; they used to add an optional Presidio NER pass, since removed.
 * Kept async so their callers (providers, persistence) need no signature change.
 *
 * Logging emits ONLY per-category counts — never the matched values.
 */

import { logger } from '../../utils/logger.js';
import { redact } from './redactor.js';
import { resolveRedactionConfig } from './config.js';

export { redact } from './redactor.js';
export type { RedactResult } from './redactor.js';

function logCounts(
  surface: string,
  project: string | undefined,
  counts: Record<string, number>
): void {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total > 0) {
    logger.info('REDACT', 'redaction applied', { surface, project, counts });
  }
}

export function redactForLLM(text: string, ctx: { project?: string } = {}): string {
  const { text: out, counts } = redact(text, ctx);
  logCounts('llm-input', ctx.project, counts);
  return out;
}

/**
 * Deep LLM-input redaction. Now identical to redactForLLM (regex core only);
 * kept as an async wrapper so callers that `await` it need no change.
 */
export async function redactForLLMDeep(text: string, ctx: { project?: string } = {}): Promise<string> {
  return redactForLLM(text, ctx);
}

/** Deep persistence redaction. Async wrapper over redactText (regex core only). */
export async function redactTextDeep(
  text: string,
  ctx: { project?: string; surface?: string } = {}
): Promise<string> {
  return redactText(text, ctx);
}

/** Deep variant of redactFields. Async wrapper over redactFields (regex core only). */
export async function redactFieldsDeep<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  ctx: { project?: string; surface?: string } = {}
): Promise<T> {
  return redactFields(obj, fields, ctx);
}

export function redactText(
  text: string,
  ctx: { project?: string; surface?: string } = {}
): string {
  const { text: out, counts } = redact(text, { project: ctx.project });
  logCounts(ctx.surface ?? 'persist', ctx.project, counts);
  return out;
}

export function redactFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  ctx: { project?: string; surface?: string } = {}
): T {
  const merged: Record<string, number> = {};
  const clone: T = { ...obj };
  // Resolve once for the whole object (reads settings + denylist, compiles rules)
  // and reuse across every field rather than paying that cost per field.
  const opts = { project: ctx.project, config: resolveRedactionConfig(ctx.project) };

  for (const f of fields) {
    const v = clone[f];
    if (typeof v === 'string') {
      const { text, counts } = redact(v, opts);
      clone[f] = text as T[keyof T];
      for (const [k, n] of Object.entries(counts)) merged[k] = (merged[k] ?? 0) + n;
    } else if (Array.isArray(v)) {
      clone[f] = v.map((item) => {
        if (typeof item !== 'string') return item;
        const { text, counts } = redact(item, opts);
        for (const [k, n] of Object.entries(counts)) merged[k] = (merged[k] ?? 0) + n;
        return text;
      }) as T[keyof T];
    }
  }

  logCounts(ctx.surface ?? 'persist', ctx.project, merged);
  return clone;
}

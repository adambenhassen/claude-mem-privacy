/**
 * Public redaction API + count-only logging. The surfaces:
 *  - redactForLLM: pre-compression, applied at the shared prompt builders.
 *  - redactText / redactFields: pre-persistence (SQLite, Chroma).
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
 * Whether the "Presidio NER pass unavailable" warning has already fired this
 * process. Presidio is enabled by default, so a broken sidecar would otherwise
 * log on every field of every observation — warn once, then stay quiet.
 */
let presidioFailureWarned = false;

/** Test seam: re-arm the once-per-process Presidio-failure warning. */
export function __resetPresidioFailureWarning(): void {
  presidioFailureWarned = false;
}

/**
 * Presidio-only pass over already-regexed text. Any sidecar failure (disabled,
 * crash, timeout) falls back to the input — never throws, never blocks beyond
 * the configured timeout. The `surface` tag flows into count-only logging.
 *
 * PresidioManager.anonymize() is built never to throw and to log its own state,
 * so this catch only fires on the unexpected (e.g. the dynamic import failing).
 * That silently drops the NER layer for free-form PII, so surface it once — with
 * the error CLASS only, never its message or the input text.
 */
async function presidioPass(
  regexed: string,
  ctx: { project?: string },
  surface: string
): Promise<string> {
  try {
    const { PresidioManager } = await import('../../services/redaction/PresidioManager.js');
    const { text: out, counts } = await PresidioManager.getInstance().anonymize(regexed, ctx);
    logCounts(surface, ctx.project, counts);
    return out;
  } catch (error) {
    if (!presidioFailureWarned) {
      presidioFailureWarned = true;
      logger.warn('REDACT', 'Presidio NER pass unavailable; using regex-only result', {
        surface,
        error: (error as Error)?.name,
      });
    }
    return regexed;
  }
}

/**
 * Deep LLM-input redaction: the synchronous regex core (always) PLUS, when the
 * optional Presidio sidecar is enabled, an ML NER pass for free-form PII
 * (names/locations/addresses).
 */
export async function redactForLLMDeep(text: string, ctx: { project?: string } = {}): Promise<string> {
  const regexed = redactForLLM(text, ctx);
  return presidioPass(regexed, ctx, 'llm-input-ner');
}

/**
 * Deep persistence redaction: the regex core PLUS the Presidio NER pass. Mirror
 * of redactText for surfaces (SQLite, Chroma) that persist free-form content.
 */
export async function redactTextDeep(
  text: string,
  ctx: { project?: string; surface?: string } = {}
): Promise<string> {
  const regexed = redactText(text, ctx);
  return presidioPass(regexed, { project: ctx.project }, `${ctx.surface ?? 'persist'}-ner`);
}

/**
 * Deep variant of redactFields: applies the regex core (merged count log) then
 * the Presidio NER pass to each listed string / string-array field.
 */
export async function redactFieldsDeep<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  ctx: { project?: string; surface?: string } = {}
): Promise<T> {
  const clone = redactFields(obj, fields, ctx);
  const opts = { project: ctx.project };
  const surface = `${ctx.surface ?? 'persist'}-ner`;

  for (const f of fields) {
    const v = clone[f];
    if (typeof v === 'string') {
      clone[f] = (await presidioPass(v, opts, surface)) as T[keyof T];
    } else if (Array.isArray(v)) {
      clone[f] = (await Promise.all(
        v.map((item) => (typeof item === 'string' ? presidioPass(item, opts, surface) : item))
      )) as T[keyof T];
    }
  }

  return clone;
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

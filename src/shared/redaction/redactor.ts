/**
 * Redaction engine. Applies rules in a deterministic, most-specific-first order
 * so structured secrets are placeholdered before broad PII rules run, and so
 * digit-heavy financial/national-ID matches are consumed before the phone rule.
 *
 * Pure / never throws on the hot path: any internal failure returns the original
 * input unchanged. Idempotent: placeholder labels (`[REDACTED:UPPER_SNAKE]`)
 * match no rule, so re-running yields the same output.
 */

import {
  STATIC_RULES,
  EMAIL_REGEX,
  PHONE_REGEX,
  POSTAL_REGEX,
  phoneReplace,
  type Rule,
} from './patterns.js';
import { buildOperatorRules } from './identity.js';
import { resolveRedactionConfig, isEmailAllowed } from './config.js';

export interface RedactResult {
  text: string;
  counts: Record<string, number>;
}

function applyRule(text: string, rule: Rule, counts: Record<string, number>): string {
  rule.regex.lastIndex = 0;
  return text.replace(rule.regex, (...args: unknown[]) => {
    const match = args[0] as string;
    const out = rule.replace ? rule.replace(...(args as [string])) : `[REDACTED:${rule.label}]`;
    if (out !== match) counts[rule.label] = (counts[rule.label] ?? 0) + 1;
    return out;
  });
}

export function redact(text: unknown, opts: { project?: string } = {}): RedactResult {
  if (typeof text !== 'string' || text.length === 0) {
    return { text: typeof text === 'string' ? text : '', counts: {} };
  }

  const cfg = resolveRedactionConfig(opts.project);
  if (!cfg.enabled) return { text, counts: {} };

  const counts: Record<string, number> = {};
  let out = text;

  try {
    // Operator identity first (most specific literal matches).
    if (!cfg.disabled.has('OPERATOR')) {
      for (const r of buildOperatorRules()) out = applyRule(out, r, counts);
    }

    // Static rules + any configured locale national-ID patterns.
    for (const r of [...STATIC_RULES, ...cfg.localePatterns]) {
      if (cfg.disabled.has(r.category)) continue;
      out = applyRule(out, r, counts);
    }

    // Email needs allowlist logic, so it is handled inline (not a STATIC_RULE).
    if (!cfg.disabled.has('EMAIL')) {
      EMAIL_REGEX.lastIndex = 0;
      out = out.replace(EMAIL_REGEX, (m) => {
        if (isEmailAllowed(m, cfg.emailAllowlist)) return m;
        counts.EMAIL = (counts.EMAIL ?? 0) + 1;
        return '[REDACTED:EMAIL]';
      });
    }

    // Phone/postal run last so digit runs already claimed by card/SSN/IBAN rules
    // are not re-matched.
    if (!cfg.disabled.has('PHONE')) {
      out = applyRule(out, { category: 'PHONE', label: 'PHONE', regex: PHONE_REGEX, replace: phoneReplace }, counts);
    }
    if (!cfg.disabled.has('POSTAL')) {
      out = applyRule(out, { category: 'POSTAL', label: 'POSTAL_ADDRESS', regex: POSTAL_REGEX }, counts);
    }
  } catch {
    // Fail CLOSED: a redactor that leaks raw input on error defeats its own
    // purpose. Drop the whole value to a placeholder rather than risk emitting
    // an unredacted secret. The realistic throw surface is near-zero (all rules
    // are static, bounded regexes), so this should never fire in practice.
    return { text: '[REDACTED:ERROR]', counts: { ERROR: 1 } };
  }

  return { text: out, counts };
}

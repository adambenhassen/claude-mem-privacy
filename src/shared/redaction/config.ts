/**
 * Resolves the effective redaction configuration from settings + per-project
 * overrides. Pure aside from reading settings (which itself never throws).
 */

import os from 'os';
import path from 'path';
import { readFileSync } from 'fs';
import { SettingsDefaultsManager, type SettingsDefaults } from '../SettingsDefaultsManager.js';
import { isCategory, type Category, type Rule } from './patterns.js';
import { logger } from '../../utils/logger.js';

/** Private denylist file, kept OUT of settings.json (and bug-report bundles). */
const SECRET_LIST_FILE = 'redaction.local.json';

/** Upper bound on an operator-supplied regex source (national-ID/secret patterns
 *  are short); anything longer is rejected as a ReDoS / footgun risk. */
const MAX_PATTERN_SOURCE_LENGTH = 200;

/** Escape a literal string so it matches verbatim when used as a RegExp source. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Heuristic ReDoS guard for operator-supplied regex sources (locale patterns and
 * the private denylist). These run on hot-path, partly attacker-influenced content
 * (tool output, prompts), so a catastrophic pattern would hang the worker.
 *
 * Rejects (a) over-long sources and (b) nested unbounded quantifiers (star height
 * >= 2) — the classic catastrophic shape, e.g. `(a+)+`, `(a*)*`, `(.+){2,}`. The
 * built-in pattern table (patterns.ts) is exempt: it is reviewed and bounded.
 */
function isSafePatternSource(src: string): boolean {
  if (src.length > MAX_PATTERN_SOURCE_LENGTH) return false;
  // Strip escaped chars (\+, \(, \), \d, …) first so a LITERAL quantifier/paren
  // isn't mistaken for a metacharacter. Then flag the catastrophic shape: a
  // quantified GROUP combined with >=2 unbounded quantifiers overall, i.e. nested
  // star height >= 2 (e.g. (a+)+, (a*)*, ((a+))+, (.+){2,}). Paren nesting is
  // irrelevant to the counts, so deeply-nested groups can't slip past.
  const cleaned = src.replace(/\\./g, '');
  const quantifiedGroup = /\)(?:[*+]|\{\d+,\})/.test(cleaned);
  const unboundedQuantifiers = (cleaned.match(/[*+]|\{\d+,\}/g) ?? []).length;
  return !(quantifiedGroup && unboundedQuantifiers >= 2);
}

/**
 * Compile an operator-supplied regex source into a Rule, or return null (with a
 * warning) when the source is unsafe or uncompilable. The source is NEVER logged
 * — for the private denylist it IS the secret, and even RegExp's own error
 * message embeds the source. Only the (validated, UPPER_SNAKE) label is logged.
 */
function compileConfiguredRule(category: Category, label: string, src: string, origin: string): Rule | null {
  if (!isSafePatternSource(src)) {
    logger.warn('REDACT', `Ignoring ${origin} pattern — source too long or potential ReDoS`, { label });
    return null;
  }
  try {
    return { category, label, regex: new RegExp(src, 'g') };
  } catch {
    // Intentionally omit the Error: its message contains the raw pattern source.
    logger.warn('REDACT', `Ignoring ${origin} pattern — invalid regular expression`, { label });
    return null;
  }
}

/**
 * Loads the operator's private denylist from ~/.claude-mem/redaction.local.json
 * — a plain JSON file (NOT settings.json) so the sensitive terms never land in
 * settings, bug reports, or casual config reads. Shape:
 *   { "terms": ["literal", ...], "patterns": { "LABEL": "regexSource", ... } }
 * Missing/invalid file is a silent no-op (never throws); all rules are CUSTOM
 * category so they can be toggled via CLAUDE_MEM_REDACTION_DISABLED_CATEGORIES.
 */
function loadSecretRules(): Rule[] {
  let raw: string;
  try {
    raw = readFileSync(path.join(dataDir(), SECRET_LIST_FILE), 'utf-8');
  } catch (error) {
    // ENOENT is the normal "no denylist configured" case. Any other error means
    // the file EXISTS but couldn't be read (permissions, EISDIR, fd exhaustion):
    // silently returning [] there would drop every operator secret with no signal,
    // so surface it. Log only the error code — never path contents.
    const code = (error as { code?: string }).code;
    if (code !== 'ENOENT') {
      logger.warn('REDACT', `Cannot read ${SECRET_LIST_FILE}; its denylist terms will NOT be redacted`, { code });
    }
    return [];
  }

  let parsed: { terms?: unknown; patterns?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Omit the Error: a JSON parse message can echo a fragment of the file, which
    // holds the operator's private terms.
    logger.warn('REDACT', `Ignoring ${SECRET_LIST_FILE} — invalid JSON`, {});
    return [];
  }

  const rules: Rule[] = [];

  // Literal terms → escaped regex under a single CUSTOM label.
  if (Array.isArray(parsed.terms)) {
    for (const term of parsed.terms) {
      if (typeof term === 'string' && term.length > 0) {
        rules.push({ category: 'CUSTOM', label: 'CUSTOM', regex: new RegExp(escapeRegex(term), 'g') });
      }
    }
  }

  // Labeled regex patterns (UPPER_SNAKE label keeps the placeholder un-rematchable).
  if (parsed.patterns && typeof parsed.patterns === 'object') {
    for (const [label, src] of Object.entries(parsed.patterns as Record<string, unknown>)) {
      if (!VALID_LABEL.test(label)) {
        logger.warn('REDACT', `Ignoring ${SECRET_LIST_FILE} pattern with invalid label (must be UPPER_SNAKE)`, { label });
        continue;
      }
      if (typeof src !== 'string') continue;
      const rule = compileConfiguredRule('CUSTOM', label, src, SECRET_LIST_FILE);
      if (rule) rules.push(rule);
    }
  }

  return rules;
}

/** Placeholder labels must be UPPER_SNAKE so they can't be re-matched (idempotency). */
const VALID_LABEL = /^[A-Z][A-Z0-9_]*$/;

export interface RedactionConfig {
  enabled: boolean;
  disabled: Set<Category>;
  emailAllowlist: string[];
  localePatterns: Rule[];
}

interface ProjectOverride {
  enabled?: boolean;
  disabledCategories?: string[];
  emailAllowlist?: string[];
}

function dataDir(): string {
  return process.env.CLAUDE_MEM_DATA_DIR || path.join(os.homedir(), '.claude-mem');
}

function csv(v: string): string[] {
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseJSON<T>(v: string, fallback: T, configName: string): T {
  if (!v) return fallback; // unset config → fallback, no warning
  try {
    return JSON.parse(v) as T;
  } catch {
    // Omit the raw value: the locale-patterns config can contain private regex
    // sources. Name the setting so a misconfiguration is still discoverable.
    logger.warn('REDACT', `Ignoring ${configName} — invalid JSON`, {});
    return fallback;
  }
}

export function isEmailAllowed(email: string, allowlist: string[]): boolean {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split('@');
  if (local === 'noreply' || local === 'no-reply') return true;
  if (domain === 'example.com' || domain === 'example.org' || domain === 'example.net') return true;
  for (const entry of allowlist) {
    const e = entry.toLowerCase();
    if (e.startsWith('@') && domain === e.slice(1)) return true;
    if (e === domain || e === lower) return true;
  }
  return false;
}

export interface PresidioConfig {
  enabled: boolean;
  timeoutMs: number;
  startupTimeoutMs: number;
  entities: string[];
  scoreThreshold: number;
}

export function getPresidioConfig(): PresidioConfig {
  const s = SettingsDefaultsManager.loadFromFile(path.join(dataDir(), 'settings.json'));
  const get = (k: keyof SettingsDefaults) => s[k] ?? '';
  const num = (k: keyof SettingsDefaults, fallback: number) => {
    const n = parseInt(get(k), 10);
    return Number.isFinite(n) ? n : fallback;
  };
  // Float-valued, and an explicit 0 (most-aggressive threshold) is meaningful, so
  // guard the empty/invalid case directly rather than with `|| fallback`.
  const float = (k: keyof SettingsDefaults, fallback: number) => {
    const raw = get(k);
    const n = Number(raw);
    return raw !== '' && Number.isFinite(n) ? n : fallback;
  };
  return {
    enabled: get('CLAUDE_MEM_REDACTION_PRESIDIO_ENABLED') === 'true',
    timeoutMs: num('CLAUDE_MEM_REDACTION_PRESIDIO_TIMEOUT_MS', 2000),
    startupTimeoutMs: num('CLAUDE_MEM_REDACTION_PRESIDIO_STARTUP_TIMEOUT_MS', 60000),
    entities: csv(get('CLAUDE_MEM_REDACTION_PRESIDIO_ENTITIES')),
    scoreThreshold: float('CLAUDE_MEM_REDACTION_PRESIDIO_SCORE_THRESHOLD', 0.5),
  };
}

export function resolveRedactionConfig(project?: string): RedactionConfig {
  const s = SettingsDefaultsManager.loadFromFile(path.join(dataDir(), 'settings.json'));
  const get = (k: keyof SettingsDefaults) => s[k] ?? '';

  let enabled = get('CLAUDE_MEM_REDACTION_ENABLED') !== 'false';
  const disabled = new Set<Category>();
  addCategories(disabled, csv(get('CLAUDE_MEM_REDACTION_DISABLED_CATEGORIES')));
  let emailAllowlist = csv(get('CLAUDE_MEM_REDACTION_EMAIL_ALLOWLIST'));

  const overrides = parseJSON<Record<string, ProjectOverride>>(
    get('CLAUDE_MEM_REDACTION_PROJECT_OVERRIDES'),
    {},
    'CLAUDE_MEM_REDACTION_PROJECT_OVERRIDES'
  );
  const o = project ? overrides[project] : undefined;
  if (o && typeof o === 'object') {
    if (o.enabled === false) enabled = false;
    if (Array.isArray(o.disabledCategories)) addCategories(disabled, o.disabledCategories);
    if (Array.isArray(o.emailAllowlist)) {
      emailAllowlist = [...emailAllowlist, ...o.emailAllowlist.filter((e) => typeof e === 'string')];
    }
  }

  const localeMap = parseJSON<Record<string, string>>(
    get('CLAUDE_MEM_REDACTION_LOCALE_PATTERNS'),
    {},
    'CLAUDE_MEM_REDACTION_LOCALE_PATTERNS'
  );
  const localePatterns: Rule[] = [];
  for (const [label, src] of Object.entries(localeMap)) {
    if (!VALID_LABEL.test(label)) {
      // A non-UPPER_SNAKE label would yield a placeholder a later pass could
      // re-match, breaking idempotency — drop it loudly.
      logger.warn('REDACT', 'Ignoring configured locale pattern with invalid label (must be UPPER_SNAKE)', { label });
      continue;
    }
    if (typeof src !== 'string') {
      logger.warn('REDACT', 'Ignoring configured locale pattern with non-string source', { label });
      continue;
    }
    const rule = compileConfiguredRule('NATIONAL_ID', label, src, 'configured locale');
    if (rule) localePatterns.push(rule);
  }

  localePatterns.push(...loadSecretRules());

  return { enabled, disabled, emailAllowlist, localePatterns };
}

/** Add only valid category names to the set; warn on (and drop) unknowns. */
function addCategories(set: Set<Category>, names: string[]): void {
  for (const name of names) {
    if (isCategory(name)) set.add(name);
    else logger.warn('REDACT', 'Ignoring unknown redaction category in config', { category: name });
  }
}

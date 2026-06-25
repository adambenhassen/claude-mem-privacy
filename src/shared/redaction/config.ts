/**
 * Resolves the effective redaction configuration from settings + per-project
 * overrides. Pure aside from reading settings (which itself never throws).
 */

import os from 'os';
import path from 'path';
import { SettingsDefaultsManager, type SettingsDefaults } from '../SettingsDefaultsManager.js';
import { isCategory, type Category, type Rule } from './patterns.js';
import { logger } from '../../utils/logger.js';

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

function parseJSON<T>(v: string, fallback: T): T {
  try {
    return JSON.parse(v) as T;
  } catch {
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
  return {
    enabled: get('CLAUDE_MEM_REDACTION_PRESIDIO_ENABLED') === 'true',
    timeoutMs: num('CLAUDE_MEM_REDACTION_PRESIDIO_TIMEOUT_MS', 2000),
    startupTimeoutMs: num('CLAUDE_MEM_REDACTION_PRESIDIO_STARTUP_TIMEOUT_MS', 60000),
    entities: csv(get('CLAUDE_MEM_REDACTION_PRESIDIO_ENTITIES')),
    scoreThreshold: Number(get('CLAUDE_MEM_REDACTION_PRESIDIO_SCORE_THRESHOLD')) || 0.5,
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
    {}
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
    {}
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
    try {
      localePatterns.push({ category: 'NATIONAL_ID', label, regex: new RegExp(src, 'g') });
    } catch (error) {
      // Skip an invalid configured regex rather than breaking the whole redactor
      // — but never silently: the operator asked for this rule and it isn't running.
      logger.warn('REDACT', 'Ignoring invalid configured locale redaction pattern', { label }, error as Error);
    }
  }

  return { enabled, disabled, emailAllowlist, localePatterns };
}

/** Add only valid category names to the set; warn on (and drop) unknowns. */
function addCategories(set: Set<Category>, names: string[]): void {
  for (const name of names) {
    if (isCategory(name)) set.add(name);
    else logger.warn('REDACT', 'Ignoring unknown redaction category in config', { category: name });
  }
}

/**
 * Runtime operator-identity derivation for self-redaction.
 *
 * HARD RULE: this module only READS git config. It must never set, override, or
 * write the operator's name/email anywhere — not to source, config, logs, or the
 * DB. The derived strings live only in this process's memory cache. We read via
 * execFileSync (never a shell) so untrusted cwd contents cannot inject commands.
 */

import { execFileSync } from 'node:child_process';
import { logger } from '../../utils/logger.js';
import type { Rule } from './patterns.js';

export interface OperatorIdentity {
  names: string[];
  emails: string[];
  handles: string[];
}

let cache: OperatorIdentity | null = null;
let gitMissingWarned = false;

function gitConfig(args: string[], cwd?: string): string {
  try {
    const out = execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return typeof out === 'string' ? out.trim() : '';
  } catch (error) {
    // A non-zero EXIT (an unset key) is the normal "no identity here" case and has
    // a numeric `status`. A SPAWN-level failure (git missing/not executable —
    // ENOENT, EACCES, …) sets an errno `code` and no `status`; there git couldn't
    // run at all, so operator self-redaction silently disables. Surface that once,
    // logging only the errno code (never a path), rather than letting it look like
    // a legitimately-empty identity.
    const e = error as { code?: string; status?: number | null };
    if (e.code && e.status == null && !gitMissingWarned) {
      gitMissingWarned = true;
      logger.warn('REDACT', 'git unavailable; operator self-redaction is disabled (cannot derive identity)', { code: e.code });
    }
    return '';
  }
}

export function getOperatorIdentity(cwd: string = process.cwd()): OperatorIdentity {
  if (cache) return cache;
  const names = new Set<string>();
  const emails = new Set<string>();
  const handles = new Set<string>();

  const add = (name: string, email: string) => {
    if (name) names.add(name);
    if (email) {
      emails.add(email);
      const local = email.split('@')[0] ?? '';
      // Only treat the local-part as a handle when it is distinctive enough that
      // it won't clobber common English words: it must contain a separator/digit
      // (e.g. "jane.doe", "asmith2") or be reasonably long (>= 6). A bare short
      // alpha local like "john" is skipped — the full-name rule still covers it.
      if (local.length >= 3 && (/[._\-0-9]/.test(local) || local.length >= 6)) {
        handles.add(local);
      }
    }
  };

  add(
    gitConfig(['config', '--global', 'user.name']),
    gitConfig(['config', '--global', 'user.email'])
  );
  // Best-effort repo-level email (cwd may not be a git repo — gitConfig swallows it).
  add('', gitConfig(['config', 'user.email'], cwd));

  cache = { names: [...names], emails: [...emails], handles: [...handles] };
  return cache;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds redaction rules from the derived identity. Emails come before names and
 * handles so a full operator email is replaced as one unit before the handle
 * rule could nibble its local-part.
 */
export function buildOperatorRules(id: OperatorIdentity = getOperatorIdentity()): Rule[] {
  const rules: Rule[] = [];
  for (const e of id.emails) {
    rules.push({ category: 'OPERATOR', label: 'OPERATOR_EMAIL', regex: new RegExp(esc(e), 'gi') });
  }
  for (const n of id.names) {
    rules.push({ category: 'OPERATOR', label: 'OPERATOR_NAME', regex: new RegExp(`\\b${esc(n)}\\b`, 'gi') });
  }
  for (const h of id.handles) {
    rules.push({ category: 'OPERATOR', label: 'OPERATOR_HANDLE', regex: new RegExp(`\\b${esc(h)}\\b`, 'gi') });
  }
  return rules;
}

/** Test seam: clears the cached identity so a mocked git config takes effect. */
export function __resetIdentityCache(): void {
  cache = null;
  gitMissingWarned = false;
}

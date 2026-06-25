/**
 * Typed pattern table for the redactor. Pure data + small helpers — no I/O, no
 * config, no identity. The engine (redactor.ts) owns ordering, idempotency, and
 * count accounting; this module owns *what* to match and *what label* to emit.
 *
 * Design rules baked in (do not regress):
 *  - Bounded quantifiers everywhere → linear scan, ReDoS-safe on hostile input.
 *  - NO generic long-hex rule and NO general IPv4 rule: those would redact git
 *    commit SHAs and RFC-5737 documentation IPs, which must survive.
 *  - Placeholder labels are `[REDACTED:UPPER_SNAKE]`, which match no rule here,
 *    so re-running the redactor is idempotent.
 */

export type Category =
  | 'SECRETS'
  | 'EMAIL'
  | 'OPERATOR'
  | 'PHONE'
  | 'POSTAL'
  | 'NATIONAL_ID'
  | 'FINANCIAL'
  | 'GEO';

export interface Rule {
  category: Category;
  label: string;
  regex: RegExp;
  /** Custom replacer; default emits `[REDACTED:<label>]`. */
  replace?: (match: string, ...groups: string[]) => string;
}

/**
 * Recognizes obvious non-secret values that must never be redacted on the value
 * side of a `key = value` assignment: doc placeholders, `${VAR}` refs, and
 * ALL_CAPS env-var names used as identifiers.
 */
const PLACEHOLDER =
  /^(?:your[_-]?\w*|changeme|your-key-here|example\w*|x{3,}|<[^>]*>|\$\{?\w+\}?|[A-Z][A-Z0-9_]{2,})$/i;

export function isPlaceholderValue(v: string): boolean {
  return PLACEHOLDER.test(v.trim());
}

/** Luhn checksum for credit-card validation. Accepts spaces/dashes. */
export function luhn(digits: string): boolean {
  const s = digits.replace(/[ -]/g, '');
  if (!/^\d{13,19}$/.test(s)) return false;
  let sum = 0;
  let alt = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = s.charCodeAt(i) - 48;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * PII regexes consumed directly by the engine (not in STATIC_RULES). EMAIL is
 * separate because it needs allowlist filtering; PHONE/POSTAL are separate so
 * the engine can run them last (after digit-heavy financial/national-ID rules
 * have already placeholdered their matches).
 */
export const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}\b/g;
export const PHONE_REGEX =
  /(?<![\w.])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{2,4}(?:[\s.-]\d{2,4}){1,3}(?![\w])/g;
export const POSTAL_REGEX =
  /\b\d{1,5}\s+(?:[A-Z][a-zA-Z]+\s){1,3}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Way|Square|Sq|Terrace|Ter)\b\.?/g;

export const STATIC_RULES: Rule[] = [
  // --- private keys (full block first, then bare header, then ssh pubkey body) ---
  {
    category: 'SECRETS',
    label: 'PRIVATE_KEY',
    regex: /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----[\s\S]{0,8000}?-----END (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g,
  },
  {
    category: 'SECRETS',
    label: 'PRIVATE_KEY',
    regex: /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g,
  },
  {
    category: 'SECRETS',
    label: 'SSH_KEY',
    regex: /\bssh-(?:rsa|ed25519|dss)\s+AAAA[A-Za-z0-9+/=]{20,}/g,
  },

  // --- JWT before generic key rules ---
  {
    category: 'SECRETS',
    label: 'JWT',
    regex: /\beyJ[A-Za-z0-9_-]{3,512}\.eyJ[A-Za-z0-9_-]{3,512}\.[A-Za-z0-9_-]{3,512}/g,
  },

  // --- specific provider prefixes (before generic sk-) ---
  { category: 'SECRETS', label: 'ANTHROPIC_KEY', regex: /\bsk-ant-[A-Za-z0-9_-]{8,}/g },
  { category: 'SECRETS', label: 'OPENROUTER_KEY', regex: /\bsk-or-v1-[A-Za-z0-9]{8,}/g },
  { category: 'SECRETS', label: 'LANGFUSE_KEY', regex: /\bsk-lf-[A-Za-z0-9-]{8,}/g },
  { category: 'SECRETS', label: 'OPENAI_PROJECT_KEY', regex: /\bsk-proj-[A-Za-z0-9_-]{8,}/g },
  { category: 'SECRETS', label: 'CONTEXT7_KEY', regex: /\bctx7sk-[A-Za-z0-9]{8,}/g },
  {
    category: 'SECRETS',
    label: 'GITHUB_PAT',
    regex: /\b(?:gh[opusr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g,
  },
  { category: 'SECRETS', label: 'GITLAB_PAT', regex: /\bglpat-[A-Za-z0-9_-]{20,}/g },
  { category: 'SECRETS', label: 'AWS_ACCESS_KEY', regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { category: 'SECRETS', label: 'GOOGLE_API_KEY', regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { category: 'SECRETS', label: 'SLACK_TOKEN', regex: /\bxox[baprs]-[A-Za-z0-9-]{8,}/g },
  { category: 'SECRETS', label: 'STRIPE_KEY', regex: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{8,}/g },
  { category: 'SECRETS', label: 'SENDGRID_KEY', regex: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g },
  { category: 'SECRETS', label: 'HUGGINGFACE_TOKEN', regex: /\bhf_[A-Za-z0-9]{16,}/g },
  { category: 'SECRETS', label: 'REPLICATE_TOKEN', regex: /\br8_[A-Za-z0-9]{16,}/g },
  { category: 'SECRETS', label: 'DIGITALOCEAN_TOKEN', regex: /\bdop_v1_[A-Za-z0-9]{32,}/g },
  { category: 'SECRETS', label: 'NPM_TOKEN', regex: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { category: 'SECRETS', label: 'PYPI_TOKEN', regex: /\bpypi-[A-Za-z0-9_-]{16,}/g },
  { category: 'SECRETS', label: 'SHOPIFY_TOKEN', regex: /\b(?:shpat|shppa)_[A-Fa-f0-9]{32}\b/g },
  { category: 'SECRETS', label: 'GENERIC_API_KEY', regex: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { category: 'SECRETS', label: 'BEARER_TOKEN', regex: /\bBearer\s+[A-Za-z0-9._-]{8,}/g },

  // --- basic-auth URL: replace only the user:pass@ userinfo, keep scheme+host ---
  {
    category: 'SECRETS',
    label: 'BASIC_AUTH',
    regex: /\b([a-z][a-z0-9+.-]*:\/\/)[^/\s:@]+:[^/\s@]+@/gi,
    replace: (_m, scheme) => `${scheme}[REDACTED:BASIC_AUTH]@`,
  },

  // --- generic assignment (value side only; skip names/placeholders) ---
  {
    category: 'SECRETS',
    label: 'SECRET',
    regex: /\b(password|passwd|secret|api[_-]?key|access[_-]?key|client[_-]?secret|auth[_-]?token)(\s*[:=]\s*)(?:"([^"]{1,200})"|'([^']{1,200})'|([^\s"']{8,200}))/gi,
    replace: (m, key, sep, dq, sq, bare) => {
      const val = dq ?? sq ?? bare ?? '';
      const quoted = dq !== undefined || sq !== undefined;
      if (isPlaceholderValue(val)) return m;
      if (!quoted && val.length < 8) return m;
      return `${key}${sep}[REDACTED:SECRET]`;
    },
  },

  // --- financial ---
  {
    category: 'FINANCIAL',
    label: 'CREDIT_CARD',
    regex: /\b(?:\d[ -]?){13,19}\b/g,
    replace: (m) => (luhn(m) ? '[REDACTED:CREDIT_CARD]' : m),
  },
  { category: 'FINANCIAL', label: 'IBAN', regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g },
  { category: 'FINANCIAL', label: 'ETH_ADDRESS', regex: /\b0x[0-9a-fA-F]{40}\b/g },
  {
    category: 'FINANCIAL',
    label: 'BTC_ADDRESS',
    regex: /\b(?:bc1[ac-hj-np-z02-9]{11,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g,
  },

  // --- national ID (built-in locales: US, EU, UA) ---
  {
    category: 'NATIONAL_ID',
    label: 'US_SSN',
    regex: /\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
  },
  { category: 'NATIONAL_ID', label: 'US_EIN', regex: /\b\d{2}-\d{7}\b/g },
  {
    category: 'NATIONAL_ID',
    label: 'EU_VAT',
    regex: /\b(?:AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK)[0-9A-Z]{8,12}\b/g,
  },
  {
    category: 'NATIONAL_ID',
    label: 'UA_TAX_ID', // context-gated to avoid matching unix timestamps / 10-digit numbers
    regex: /(?:ІПН|ИНН|РНОКПП|tax(?:payer)?\s*(?:id|number))\D{0,10}\d{10}\b/gi,
    replace: (m) => m.replace(/\d{10}\b/, '[REDACTED:UA_TAX_ID]'),
  },

  // --- precise geo coords (require >=3 decimals to skip "1,2"-style pairs) ---
  {
    category: 'GEO',
    label: 'GEO_COORD',
    regex: /\b[-+]?(?:90(?:\.0+)?|[0-8]?\d\.\d{3,}),\s*[-+]?(?:180(?:\.0+)?|1[0-7]\d\.\d{3,}|\d?\d\.\d{3,})\b/g,
  },
];

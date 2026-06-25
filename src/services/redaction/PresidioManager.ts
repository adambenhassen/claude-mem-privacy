/**
 * Manages the optional Presidio anonymizer sidecar — a long-lived `uv run`
 * Python process speaking a JSON-lines protocol over stdin/stdout. Used ONLY
 * for the opt-in ML PII pass before OpenAI-compatible LLM sends.
 *
 * HARD INVARIANTS (this sits on the compression hot path):
 *  - Never throws to callers. Every failure path returns the input text.
 *  - Never hangs: every request has a timeout; startup has a deadline.
 *  - Default-off; only spawns when enabled. On crash, restarts once, then
 *    disables itself for the rest of the process (logs once).
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { MARKETPLACE_ROOT } from '../../shared/paths.js';
import { logger } from '../../utils/logger.js';
import { getPresidioConfig, type PresidioConfig } from '../../shared/redaction/config.js';

export interface AnonymizeResult {
  text: string;
  counts: Record<string, number>;
}

type SpawnFn = (command: string, args: string[]) => ChildProcess;

interface Pending {
  resolve: (r: AnonymizeResult) => void;
  timer: ReturnType<typeof setTimeout>;
  fallback: string;
}

function resolveScriptPath(): string {
  const candidates = [
    path.join(MARKETPLACE_ROOT, 'plugin', 'scripts', 'presidio_service.py'),
    path.join(process.cwd(), 'plugin', 'scripts', 'presidio_service.py'),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[candidates.length - 1];
}

export class PresidioManager {
  private static instance: PresidioManager | null = null;
  private static spawnFn: SpawnFn | null = null;

  private child: ChildProcess | null = null;
  private starting: Promise<boolean> | null = null;
  private ready = false;
  private disabled = false;
  private restartedOnce = false;
  private idCounter = 0;
  private buffer = '';
  private readonly pending = new Map<number, Pending>();

  private constructor() {}

  static getInstance(): PresidioManager {
    if (!this.instance) this.instance = new PresidioManager();
    return this.instance;
  }

  /** Test seam: override the spawn function (pass null to restore default). */
  static __setSpawn(fn: SpawnFn | null): void {
    this.spawnFn = fn;
  }

  /** Test seam: drop the singleton + any child. */
  static resetInstance(): void {
    if (this.instance) void this.instance.stop();
    this.instance = null;
  }

  private doSpawn(): ChildProcess {
    if (PresidioManager.spawnFn) return PresidioManager.spawnFn('uv', []);
    const uv = process.platform === 'win32' ? 'uv.exe' : 'uv';
    return spawn(uv, ['run', resolveScriptPath()], { stdio: ['pipe', 'pipe', 'pipe'] });
  }

  private async start(cfg: PresidioConfig): Promise<boolean> {
    if (this.disabled) return false;
    if (this.ready && this.child) return true;
    if (this.starting) return this.starting;

    this.starting = new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        this.starting = null;
        resolve(ok);
      };

      let childProc: ChildProcess;
      try {
        childProc = this.doSpawn();
      } catch (error) {
        logger.warn('REDACT', 'Presidio sidecar spawn failed; disabling for this process', {}, error as Error);
        this.disabled = true;
        finish(false);
        return;
      }
      this.child = childProc;

      const startupTimer = setTimeout(() => {
        logger.warn('REDACT', 'Presidio sidecar startup timed out; disabling for this process');
        this.teardownChild();
        this.disabled = true;
        finish(false);
      }, cfg.startupTimeoutMs);

      childProc.stdout?.on('data', (chunk: Buffer) => {
        this.buffer += chunk.toString('utf8');
        let nl: number;
        while ((nl = this.buffer.indexOf('\n')) >= 0) {
          const line = this.buffer.slice(0, nl).trim();
          this.buffer = this.buffer.slice(nl + 1);
          if (!line) continue;
          let msg: any;
          try { msg = JSON.parse(line); } catch { continue; }
          if (msg.ready === true) {
            this.ready = true;
            clearTimeout(startupTimer);
            finish(true);
            continue;
          }
          if (typeof msg.id === 'number') this.resolvePending(msg);
        }
      });

      childProc.on('exit', () => this.handleChildGone(cfg));
      childProc.on('error', () => this.handleChildGone(cfg));
    });

    return this.starting;
  }

  private resolvePending(msg: { id: number; text?: string; counts?: Record<string, number> }): void {
    const p = this.pending.get(msg.id);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(msg.id);
    p.resolve({ text: typeof msg.text === 'string' ? msg.text : p.fallback, counts: msg.counts ?? {} });
  }

  private handleChildGone(cfg: PresidioConfig): void {
    const wasReady = this.ready;
    this.ready = false;
    this.child = null;
    this.starting = null;
    // Fail all in-flight requests back to their regex fallback.
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.resolve({ text: p.fallback, counts: {} });
    }
    this.pending.clear();
    if (this.disabled) return;
    if (this.restartedOnce) {
      this.disabled = true;
      logger.warn('REDACT', 'Presidio sidecar exited again; disabling ML pass for this process');
    } else if (wasReady) {
      this.restartedOnce = true;
      logger.warn('REDACT', 'Presidio sidecar exited; will restart once on next use');
    }
  }

  private teardownChild(): void {
    const c = this.child;
    this.child = null;
    this.ready = false;
    if (!c) return;
    try {
      if (typeof c.pid === 'number') c.kill('SIGTERM');
    } catch { /* best effort */ }
  }

  async anonymize(text: string, ctx: { project?: string } = {}): Promise<AnonymizeResult> {
    const fallback = { text, counts: {} };
    if (typeof text !== 'string' || text.length === 0) return fallback;

    let cfg: PresidioConfig;
    try { cfg = getPresidioConfig(); } catch { return fallback; }
    if (!cfg.enabled || this.disabled) return fallback;

    let ok = false;
    try { ok = await this.start(cfg); } catch { ok = false; }
    if (!ok || !this.child || !this.ready) return fallback;

    const id = ++this.idCounter;
    const request = JSON.stringify({ id, text, entities: cfg.entities, threshold: cfg.scoreThreshold }) + '\n';

    return new Promise<AnonymizeResult>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve(fallback);
      }, cfg.timeoutMs);
      this.pending.set(id, { resolve, timer, fallback: text });
      try {
        this.child!.stdin?.write(request);
      } catch {
        clearTimeout(timer);
        this.pending.delete(id);
        resolve(fallback);
      }
    });
  }

  async stop(): Promise<void> {
    this.teardownChild();
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.resolve({ text: p.fallback, counts: {} });
    }
    this.pending.clear();
    this.starting = null;
  }
}

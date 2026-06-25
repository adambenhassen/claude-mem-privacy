/**
 * Manages the optional Presidio anonymizer sidecar — a long-lived `uv run`
 * Python process speaking a JSON-lines protocol over stdin/stdout. Used ONLY
 * for the opt-in ML PII pass before OpenAI-compatible LLM sends.
 *
 * HARD INVARIANTS (this sits on the compression hot path):
 *  - Never throws to callers. Every failure path returns the input text.
 *  - Never hangs: every request has a timeout; startup has a deadline.
 *  - Default-off; only spawns when enabled. Any child death (a crash before OR
 *    after it reported ready) counts toward a one-restart budget; a second death
 *    disables the ML pass for the process. A reported init failure or a startup
 *    timeout disables immediately. All transitions log once (counts/error-class
 *    only, never input text).
 */

import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const SCRIPT_NAME = 'presidio_service.py';
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
  private static swept = false;

  private child: ChildProcess | null = null;
  private starting: Promise<boolean> | null = null;
  private ready = false;
  private disabled = false;
  private restartedOnce = false;
  private idCounter = 0;
  private buffer = '';
  private lastStderr = '';
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

    // Once per process, before our first spawn, reap any sidecar trees orphaned
    // by a prior worker that died ungracefully. Safe here: we have not spawned
    // our own sidecar yet, so every presidio_service.py is stale.
    if (!PresidioManager.swept && !PresidioManager.spawnFn) {
      PresidioManager.swept = true;
      try { await PresidioManager.sweepStaleSubprocesses(); } catch { /* best effort */ }
    }

    this.starting = new Promise<boolean>((resolve) => {
      let settled = false;
      let startupTimer: ReturnType<typeof setTimeout> | null = null;
      let gone = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        if (startupTimer) { clearTimeout(startupTimer); startupTimer = null; }
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
      this.lastStderr = '';

      startupTimer = setTimeout(() => {
        logger.warn('REDACT', 'Presidio sidecar startup timed out; disabling for this process', { stderrTail: this.lastStderr.slice(-300) });
        this.disabled = true;
        void this.teardownChild();
        finish(false);
      }, cfg.startupTimeoutMs);

      // Drain stderr so the OS pipe buffer can't fill (which would stall the
      // child), and keep a bounded tail for failure diagnostics. The sidecar
      // never writes input text to stderr — only tracebacks/warnings — so this
      // is safe to log.
      childProc.stderr?.on('data', (chunk: Buffer) => {
        this.lastStderr = (this.lastStderr + chunk.toString('utf8')).slice(-1000);
      });
      // An async stdin failure (e.g. EPIPE when the child dies mid-write) emits
      // 'error' on the stream; swallow it here — the 'exit'/'error' handlers
      // below fail any pending requests back to their regex fallback.
      childProc.stdin?.on('error', () => { /* handled via onGone */ });

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
            finish(true);
            continue;
          }
          if (msg.ready === false) {
            // The sidecar reported a fatal init failure (import / model load).
            // Disable immediately instead of waiting out the startup timeout.
            logger.warn('REDACT', 'Presidio sidecar failed to initialize; disabling ML pass for this process', {
              error: typeof msg.error === 'string' ? msg.error : undefined,
              stderrTail: this.lastStderr.slice(-300),
            });
            this.disabled = true;
            void this.teardownChild();
            finish(false);
            continue;
          }
          if (typeof msg.id === 'number') this.resolvePending(msg);
        }
      });

      const onGone = () => {
        if (gone) return; // 'error' then 'exit' can both fire — count once.
        gone = true;
        // A death before startup settled is a failed start: settle it (which
        // clears the startup timer) so we don't wait out the full timeout.
        if (!settled) finish(false);
        this.handleChildGone();
      };
      childProc.on('exit', onGone);
      childProc.on('error', onGone);
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

  private handleChildGone(): void {
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
    // Every child death counts toward the restart budget — including a crash
    // BEFORE the sidecar reported ready — so a sidecar that always dies on boot
    // disables after one retry instead of respawning on every call.
    if (this.restartedOnce) {
      this.disabled = true;
      logger.warn('REDACT', 'Presidio sidecar exited again; disabling ML pass for this process', { stderrTail: this.lastStderr.slice(-300) });
    } else {
      this.restartedOnce = true;
      logger.warn('REDACT', 'Presidio sidecar exited; will restart once on next use');
    }
  }

  private async teardownChild(): Promise<void> {
    const c = this.child;
    this.child = null;
    this.ready = false;
    if (!c || typeof c.pid !== 'number') return;
    // `uv run` spawns python as a child; SIGTERM to uv alone can orphan the
    // grandchild. Tree-kill the whole subtree (mirrors ChromaMcpManager).
    try {
      await PresidioManager.killProcessTree(c.pid);
    } catch { /* best effort */ }
  }

  /** Recursively collect descendant PIDs (leaves first). POSIX best-effort. */
  private static async collectDescendantPids(rootPid: number): Promise<number[]> {
    const seen = new Set<number>();
    const collected: number[] = [];
    async function walk(pid: number): Promise<void> {
      let stdout = '';
      try {
        stdout = (await execFileAsync('pgrep', ['-P', String(pid)], { timeout: 2_000 })).stdout;
      } catch {
        return;
      }
      for (const line of stdout.split('\n')) {
        const n = Number.parseInt(line.trim(), 10);
        if (Number.isFinite(n) && n > 0 && !seen.has(n)) {
          seen.add(n);
          await walk(n);
          collected.push(n);
        }
      }
    }
    await walk(rootPid);
    return collected;
  }

  /** Kill a process and all descendants. Windows: taskkill /T /F. POSIX: TERM then KILL. */
  private static async killProcessTree(pid: number): Promise<void> {
    if (process.platform === 'win32') {
      try {
        await execFileAsync('taskkill', ['/PID', String(pid), '/T', '/F'], { timeout: 5_000, windowsHide: true });
      } catch { /* already dead — fine */ }
      return;
    }
    try {
      const before = await PresidioManager.collectDescendantPids(pid);
      for (const child of before) { try { process.kill(child, 'SIGTERM'); } catch { /* gone */ } }
      try { process.kill(pid, 'SIGTERM'); } catch { /* gone */ }
      await new Promise((r) => setTimeout(r, 500));
      const after = await PresidioManager.collectDescendantPids(pid);
      for (const child of new Set([...before, ...after])) { try { process.kill(child, 'SIGKILL'); } catch { /* gone */ } }
      try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ }
    } catch { /* best effort */ }
  }

  /**
   * Pure parse helper: from `pgrep -lf` output ("<pid> <cmd>" per line) return
   * PIDs whose command references the sidecar script, excluding selfPid.
   */
  static parseStalePresidioPids(pgrepOutput: string, selfPid: number = process.pid): number[] {
    const pids: number[] = [];
    for (const line of pgrepOutput.split('\n')) {
      const trimmed = line.trim();
      const sp = trimmed.indexOf(' ');
      if (sp === -1) continue;
      const pid = Number.parseInt(trimmed.slice(0, sp), 10);
      const command = trimmed.slice(sp + 1);
      if (!Number.isFinite(pid) || pid <= 0 || pid === selfPid) continue;
      if (command.includes(SCRIPT_NAME)) pids.push(pid);
    }
    return pids;
  }

  /**
   * Reap presidio_service.py subprocess trees orphaned by a prior worker that
   * died ungracefully. Safe at worker startup: this process has not spawned its
   * own sidecar yet, so every presidio_service.py is stale. POSIX-only (pgrep).
   */
  static async sweepStaleSubprocesses(): Promise<void> {
    if (process.platform === 'win32') return;
    let stdout = '';
    try {
      stdout = (await execFileAsync('pgrep', ['-lf', SCRIPT_NAME], { timeout: 2_000 })).stdout;
    } catch (error) {
      const code = (error as { code?: string | number }).code;
      if (code === 1) return; // matched nothing — benign
      logger.warn('REDACT', 'Stale Presidio sweep skipped: pgrep failed — prior orphans may persist', {
        code: typeof code === 'string' || typeof code === 'number' ? code : undefined,
      });
      return;
    }
    const stale = PresidioManager.parseStalePresidioPids(stdout);
    if (stale.length === 0) return;
    logger.info('REDACT', 'Reaping orphaned Presidio subprocess tree(s) from a prior worker', { pids: stale });
    for (const pid of stale) {
      try { await PresidioManager.killProcessTree(pid); } catch { /* best effort */ }
    }
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
    await this.teardownChild();
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.resolve({ text: p.fallback, counts: {} });
    }
    this.pending.clear();
    this.starting = null;
  }
}

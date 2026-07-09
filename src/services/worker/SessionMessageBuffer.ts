import { EventEmitter } from 'events';
import type { PendingMessage, PendingMessageWithId } from '../worker-types.js';
import { logger } from '../../utils/logger.js';

const IDLE_TIMEOUT_MS = 3 * 60 * 1000;

interface BufferedMessage {
  id: number;
  message: PendingMessage;
  claimed: boolean;
  enqueuedAt: number;
}

export interface DrainOptions {
  sessionDbId: number;
  signal: AbortSignal;
  onIdleTimeout?: () => void;
  idleTimeoutMs?: number;
}

/**
 * Persistence delegate: mirrors the buffer into the `pending_messages` SQLite
 * table so unconfirmed work survives a worker restart. insert() returns the
 * durable row id (used as the message id) or 0 when the row was suppressed as
 * a duplicate by the UNIQUE(content_session_id, tool_use_id) index.
 */
export interface BufferPersistence {
  insert(sessionDbId: number, message: PendingMessage): number;
  remove(messageId: number): void;
  removeSession(sessionDbId: number): void;
}

/**
 * Per-session observation buffer: RAM for live control flow, write-through to
 * the durable `pending_messages` table (when persistence is attached) so
 * nothing is lost across worker restarts. A row is inserted on enqueue and
 * deleted on confirm (successful store), explicit clear(), an
 * unrecoverable-session drop during recovery, or the sdk_sessions FK CASCADE.
 * Surviving rows are reloaded by the startup sweep AND whenever their session
 * is re-created in RAM (SessionManager.restorePersistedForSession), so a
 * teardown mid-run doesn't strand them until the next restart.
 *
 * The old durable queue's respawn-on-pending loop was a retry storm; the
 * replacement is NOT that loop: failed generators reschedule with capped
 * exponential backoff (see SessionRoutes.scheduleRedrain), and startup
 * recovery runs once. The old queue's other failure — replaying fragments
 * into a cold reducer context — is avoided by persisting the conversation
 * history at every confirmed turn (sdk_sessions.conversation_history) and
 * restoring it on recovery.
 *
 * confirm()/resetClaimed() are in-process control flow within a live generator
 * pass; claims are deliberately not persisted (an unconfirmed row is pending
 * again after a restart, whatever its in-flight state was).
 */
export class SessionMessageBuffer {
  private readonly buffers = new Map<number, BufferedMessage[]>();
  private readonly events = new Map<number, EventEmitter>();
  private readonly seenToolUseIds = new Map<number, Set<string>>();
  private nextId = 1;
  private readonly persistence?: BufferPersistence;

  // Persistence is a constructor arg, not attach-later: ids minted before an
  // attach would share the number space with durable rowids and a confirm
  // could delete someone else's row.
  constructor(private readonly onMutate?: () => void, persistence?: BufferPersistence) {
    this.persistence = persistence;
  }

  /**
   * Preload rows recovered from the durable table at startup. Bypasses
   * persistence (the rows already exist) and seeds the dedup set so re-ingested
   * tool-uses are still suppressed.
   */
  restore(sessionDbId: number, rows: Array<{ id: number; message: PendingMessage; enqueuedAt: number }>): number {
    const list = this.getList(sessionDbId);
    const seen = this.getSeen(sessionDbId);
    for (const row of rows) {
      if (row.message.toolUseId) {
        seen.add(row.message.toolUseId);
      }
      list.push({ id: row.id, message: row.message, claimed: false, enqueuedAt: row.enqueuedAt });
      this.nextId = Math.max(this.nextId, row.id + 1);
    }
    if (rows.length > 0) {
      this.onMutate?.();
      this.signal(sessionDbId);
    }
    return rows.length;
  }

  /**
   * Append a message. Returns the assigned id, or 0 if suppressed as a
   * duplicate. Dedup matches the old partial UNIQUE(content_session_id,
   * tool_use_id) index: only observations that carry a toolUseId are deduped,
   * and only against others in the same session for this worker's lifetime.
   */
  enqueue(sessionDbId: number, message: PendingMessage): number {
    const toolUseId = message.toolUseId;
    if (toolUseId && this.getSeen(sessionDbId).has(toolUseId)) {
      return 0;
    }

    let id: number;
    if (this.persistence) {
      // May throw (DB error): the dedup set must not be marked yet, or a
      // retry of this tool-use would be suppressed as a duplicate and lost.
      id = this.persistence.insert(sessionDbId, message);
      if (id === 0) {
        // Durable UNIQUE index says duplicate (e.g. re-ingest after restart).
        if (toolUseId) this.getSeen(sessionDbId).add(toolUseId);
        return 0;
      }
    } else {
      id = this.nextId++;
    }
    if (toolUseId) {
      this.getSeen(sessionDbId).add(toolUseId);
    }
    this.getList(sessionDbId).push({ id, message, claimed: false, enqueuedAt: Date.now() });
    this.onMutate?.();
    this.signal(sessionDbId);
    return id;
  }

  /** Remove a stored message by id. Returns 1 if found, 0 otherwise. Pass sessionDbId when known for an O(1) list lookup. */
  confirm(messageId: number, sessionDbId?: number): number {
    const lists = sessionDbId !== undefined
      ? [this.buffers.get(sessionDbId) ?? []]
      : this.buffers.values();
    for (const list of lists) {
      const idx = list.findIndex(m => m.id === messageId);
      if (idx !== -1) {
        list.splice(idx, 1);
        // The observation is already stored; a failed row delete must not
        // abort the confirm loop. Ceiling: the leaked row is replayed on the
        // next restart, where the observations content-hash unique index
        // usually absorbs the duplicate. Log loud so the row id is findable.
        try {
          this.persistence?.remove(messageId);
        } catch (error) {
          logger.error('QUEUE', 'Failed to delete confirmed pending row — a restart may replay it', {
            data: { messageId }
          }, error instanceof Error ? error : new Error(String(error)));
        }
        this.onMutate?.();
        return 1;
      }
    }
    return 0;
  }

  /** Un-claim all messages for a session so the iterator re-yields them. */
  resetClaimed(sessionDbId: number): number {
    const list = this.buffers.get(sessionDbId);
    if (!list) return 0;
    let reset = 0;
    for (const m of list) {
      if (m.claimed) {
        m.claimed = false;
        reset++;
      }
    }
    if (reset > 0) {
      this.onMutate?.();
      this.signal(sessionDbId);
    }
    return reset;
  }

  /** Drop everything buffered for a session — an explicit discard, so the durable rows go too. */
  clear(sessionDbId: number): number {
    const cleared = this.buffers.get(sessionDbId)?.length ?? 0;
    this.buffers.delete(sessionDbId);
    this.persistence?.removeSession(sessionDbId);
    // Mirror dispose(): drop the dedup set too. Otherwise a clear() not followed
    // by dispose() leaves seenToolUseIds intact, so a later enqueue carrying a
    // previously-seen toolUseId is silently suppressed (returns 0) and lost.
    this.seenToolUseIds.delete(sessionDbId);
    if (cleared > 0) {
      this.onMutate?.();
    }
    return cleared;
  }

  /**
   * Forget a session's RAM state (buffer, dedup set, event emitter). Durable
   * rows are deliberately NOT touched: on a clean teardown the buffer is empty
   * (every message was confirmed), and on any other teardown the surviving rows
   * are exactly what startup recovery must reprocess.
   */
  dispose(sessionDbId: number): void {
    this.buffers.delete(sessionDbId);
    this.seenToolUseIds.delete(sessionDbId);
    this.events.get(sessionDbId)?.removeAllListeners();
    this.events.delete(sessionDbId);
  }

  getPendingCount(sessionDbId: number): number {
    return this.buffers.get(sessionDbId)?.length ?? 0;
  }

  getTotalDepth(): number {
    let total = 0;
    for (const list of this.buffers.values()) {
      total += list.length;
    }
    return total;
  }

  peekTypes(sessionDbId: number): Array<{ message_type: string; tool_name: string | null }> {
    return (this.buffers.get(sessionDbId) ?? []).map(m => ({
      message_type: m.message.type,
      tool_name: m.message.tool_name ?? null
    }));
  }

  /**
   * Drain buffered messages as they arrive. Yields one unclaimed message at a
   * time; when the buffer is empty it waits on the per-session event emitter
   * until a new message is enqueued, the abort signal fires, or the idle
   * timeout elapses (which triggers onIdleTimeout and ends the iterator so the
   * SDK subprocess is killed).
   */
  async *drain(options: DrainOptions): AsyncIterableIterator<PendingMessageWithId> {
    const { sessionDbId, signal, onIdleTimeout, idleTimeoutMs = IDLE_TIMEOUT_MS } = options;
    let lastActivityTime = Date.now();

    while (!signal.aborted) {
      const claimed = this.claimNext(sessionDbId);
      if (claimed) {
        lastActivityTime = Date.now();
        yield {
          ...claimed.message,
          _persistentId: claimed.id,
          _originalTimestamp: claimed.enqueuedAt
        };
        continue;
      }

      const received = await this.waitForMessage(sessionDbId, signal, idleTimeoutMs);
      if (!received && !signal.aborted) {
        const idleDuration = Date.now() - lastActivityTime;
        if (idleDuration >= idleTimeoutMs) {
          logger.info('SESSION', 'Idle timeout reached, triggering abort to kill subprocess', {
            sessionDbId,
            idleDurationMs: idleDuration,
            thresholdMs: idleTimeoutMs
          });
          onIdleTimeout?.();
          return;
        }
      } else {
        lastActivityTime = Date.now();
      }
    }
  }

  private claimNext(sessionDbId: number): BufferedMessage | null {
    const list = this.buffers.get(sessionDbId);
    if (!list) return null;
    const next = list.find(m => !m.claimed);
    if (!next) return null;
    next.claimed = true;
    this.onMutate?.();
    return next;
  }

  private waitForMessage(sessionDbId: number, signal: AbortSignal, timeoutMs: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const events = this.getEvents(sessionDbId);
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
        events.off('message', onMessage);
        signal.removeEventListener('abort', onAbort);
      };

      const onMessage = () => {
        cleanup();
        resolve(true);
      };
      const onAbort = () => {
        cleanup();
        resolve(false);
      };
      const onTimeout = () => {
        cleanup();
        resolve(false);
      };

      events.once('message', onMessage);
      signal.addEventListener('abort', onAbort, { once: true });
      timeoutId = setTimeout(onTimeout, timeoutMs);
    });
  }

  private getList(sessionDbId: number): BufferedMessage[] {
    let list = this.buffers.get(sessionDbId);
    if (!list) {
      list = [];
      this.buffers.set(sessionDbId, list);
    }
    return list;
  }

  private getSeen(sessionDbId: number): Set<string> {
    let seen = this.seenToolUseIds.get(sessionDbId);
    if (!seen) {
      seen = new Set<string>();
      this.seenToolUseIds.set(sessionDbId, seen);
    }
    return seen;
  }

  private getEvents(sessionDbId: number): EventEmitter {
    let events = this.events.get(sessionDbId);
    if (!events) {
      events = new EventEmitter();
      this.events.set(sessionDbId, events);
    }
    return events;
  }

  private signal(sessionDbId: number): void {
    this.events.get(sessionDbId)?.emit('message');
  }
}

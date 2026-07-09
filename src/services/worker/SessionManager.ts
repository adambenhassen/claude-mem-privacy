import { existsSync } from 'fs';
import { DatabaseManager } from './DatabaseManager.js';
import { observerSdkTranscriptPath } from '../../shared/paths.js';
import { logger } from '../../utils/logger.js';
import { toError } from '../../utils/to-error.js';
import type { ActiveSession, PendingMessage, PendingMessageWithId, ObservationData } from '../worker-types.js';
import { SessionMessageBuffer } from './SessionMessageBuffer.js';
import { getSdkProcessForSession, ensureSdkProcessExit } from '../../supervisor/process-registry.js';
import { getSupervisor } from '../../supervisor/index.js';
import { telemetryBuffer } from '../telemetry/buffer.js';

export class SessionManager {
  private dbManager: DatabaseManager;
  private sessions: Map<number, ActiveSession> = new Map();
  private onSessionDeletedCallback?: () => void;
  private onPendingMutate?: () => void;
  // Write-through durability: mirror the RAM buffer into pending_messages so
  // unconfirmed work survives worker restarts (rows deleted on confirm).
  private readonly buffer = new SessionMessageBuffer(() => this.onPendingMutate?.(), {
    insert: (sessionDbId, message) => {
      const contentSessionId =
        this.sessions.get(sessionDbId)?.contentSessionId
        ?? this.dbManager.getSessionById(sessionDbId).content_session_id;
      return this.dbManager.getSessionStore().insertPendingMessage({
        sessionDbId,
        contentSessionId,
        messageType: message.type,
        toolName: message.tool_name,
        toolInput: message.tool_input !== undefined ? String(message.tool_input) : undefined,
        toolResponse: message.tool_response !== undefined ? String(message.tool_response) : undefined,
        cwd: message.cwd,
        lastAssistantMessage: message.last_assistant_message,
        promptNumber: message.prompt_number,
        toolUseId: message.toolUseId,
        agentId: message.agentId,
        agentType: message.agentType,
      });
    },
    remove: (messageId) => this.dbManager.getSessionStore().deletePendingMessage(messageId),
    removeSession: (sessionDbId) => this.dbManager.getSessionStore().deletePendingMessagesForSession(sessionDbId),
  });

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * Startup sweep: rehydrate every session that still has unconfirmed durable
   * rows from previous worker runs (initializeSession does the actual restore).
   * Returns the session ids that got work restored so the caller can start
   * generators. Rows are deleted ONLY when their session row is genuinely gone
   * (they can never be processed); any other failure keeps the rows durable
   * for the next sweep or the session's next ingest.
   */
  recoverPersistedMessages(): number[] {
    const store = this.dbManager.getSessionStore();
    const recovered: number[] = [];
    for (const sessionDbId of store.getSessionIdsWithPendingMessages()) {
      if (!store.sessionExists(sessionDbId)) {
        logger.warn('SESSION', 'Dropping pending messages whose session row no longer exists', { sessionId: sessionDbId });
        store.deletePendingMessagesForSession(sessionDbId);
        continue;
      }
      try {
        this.initializeSession(sessionDbId);
        if (this.buffer.getPendingCount(sessionDbId) > 0) {
          recovered.push(sessionDbId);
        }
      } catch (error) {
        // Transient failure (locked DB, …): keep the rows — they are retried
        // on the next restart or this session's next ingest. Never delete here.
        logger.error('SESSION', 'Failed to rehydrate session with pending messages; rows kept for retry', {
          sessionId: sessionDbId,
        }, toError(error));
      }
    }
    return recovered;
  }

  /**
   * Reload any unconfirmed durable rows (and the reducer-context snapshot) for
   * a session that is not in RAM — on startup recovery AND whenever a session
   * is re-created mid-run (idle cull / SIGTERM / abort torn it down while rows
   * survived). Without this, orphaned rows would wait for a restart while the
   * durable UNIQUE index suppressed every re-ingest of the same tool-use.
   * Never throws: a failed restore keeps the rows durable and the session
   * usable; the rows get another chance on the next initialize or restart.
   */
  private restorePersistedForSession(session: ActiveSession): void {
    const sessionDbId = session.sessionDbId;
    try {
      const store = this.dbManager.getSessionStore();
      const rows = store.getPersistedPendingMessagesForSession(sessionDbId);
      if (rows.length === 0) return;

      // Restore the reducer context saved at the last confirmed turn, so the
      // recovered fragments are processed with the same conversation context
      // they would have had before the teardown (no cold-context replay).
      const historyJson = store.getConversationHistory(sessionDbId);
      if (historyJson) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(historyJson);
        } catch {
          logger.warn('SESSION', 'Ignoring unparseable persisted conversation history', { sessionId: sessionDbId });
        }
        if (Array.isArray(parsed)) {
          session.conversationHistory = parsed;
        } else if (parsed !== undefined) {
          logger.warn('SESSION', 'Persisted conversation history is not an array — starting with cold context', { sessionId: sessionDbId });
        }
      }

      const valid = rows.filter(row => {
        if (row.message_type === 'observation' || row.message_type === 'summarize') return true;
        // Unknown type can never drain; keeping it would strand the row forever.
        logger.warn('SESSION', 'Dropping pending message with unknown message_type', {
          sessionId: sessionDbId, data: { id: row.id, message_type: row.message_type }
        });
        store.deletePendingMessage(row.id);
        return false;
      });

      this.buffer.restore(sessionDbId, valid.map(row => ({
        id: row.id,
        enqueuedAt: row.created_at_epoch,
        message: {
          type: row.message_type as PendingMessage['type'],
          tool_name: row.tool_name ?? undefined,
          tool_input: row.tool_input ?? undefined,
          tool_response: row.tool_response ?? undefined,
          prompt_number: row.prompt_number ?? undefined,
          cwd: row.cwd ?? undefined,
          last_assistant_message: row.last_assistant_message ?? undefined,
          agentId: row.agent_id ?? undefined,
          agentType: row.agent_type ?? undefined,
          toolUseId: row.tool_use_id ?? undefined,
        } satisfies PendingMessage,
      })));
      logger.info('SESSION', 'Restored persisted pending messages', {
        sessionId: sessionDbId,
        count: valid.length,
      });
    } catch (error) {
      logger.error('SESSION', 'Failed to restore persisted pending messages; rows kept for retry', {
        sessionId: sessionDbId,
      }, toError(error));
    }
  }

  setOnSessionDeleted(callback: () => void): void {
    this.onSessionDeletedCallback = callback;
  }

  setOnPendingMutate(cb: () => void): void {
    this.onPendingMutate = cb;
  }

  initializeSession(sessionDbId: number, currentUserPrompt?: string, promptNumber?: number): ActiveSession {
    logger.debug('SESSION', 'initializeSession called', {
      sessionDbId,
      promptNumber,
      has_currentUserPrompt: !!currentUserPrompt
    });

    let session = this.sessions.get(sessionDbId);
    if (session) {
      logger.debug('SESSION', 'Returning cached session', {
        sessionDbId,
        contentSessionId: session.contentSessionId,
        lastPromptNumber: session.lastPromptNumber
      });

      const dbSession = this.dbManager.getSessionById(sessionDbId);
      if (dbSession.project && dbSession.project !== session.project) {
        logger.debug('SESSION', 'Updating project from database', {
          sessionDbId,
          oldProject: session.project,
          newProject: dbSession.project
        });
        session.project = dbSession.project;
      }
      if (dbSession.platform_source && dbSession.platform_source !== session.platformSource) {
        session.platformSource = dbSession.platform_source;
      }

      if (currentUserPrompt) {
        logger.debug('SESSION', 'Updating userPrompt for continuation', {
          sessionDbId,
          promptNumber,
          // Lengths only — never the raw prompt text (PII) in logs.
          oldPromptLength: session.userPrompt.length,
          newPromptLength: currentUserPrompt.length
        });
        session.userPrompt = currentUserPrompt;
        session.lastPromptNumber = promptNumber || session.lastPromptNumber;
      } else {
        logger.debug('SESSION', 'No currentUserPrompt provided for existing session', {
          sessionDbId,
          promptNumber,
          cachedPromptLength: session.userPrompt.length
        });
      }
      return session;
    }

    const dbSession = this.dbManager.getSessionById(sessionDbId);

    logger.debug('SESSION', 'Fetched session from database', {
      sessionDbId,
      content_session_id: dbSession.content_session_id,
      memory_session_id: dbSession.memory_session_id
    });

    // A memory_session_id from a previous worker run is resumable when the
    // SDK's on-disk transcript for it still exists — the SDK rebuilds context
    // from that file, so a restart doesn't lose it. Without a transcript
    // (synthetic OpenAI-compat ids, deleted files) discard it as before
    // (Issue #817: blind resume of a stale id wedged sessions).
    let resumableMemorySessionId: string | null = null;
    if (dbSession.memory_session_id) {
      const id = dbSession.memory_session_id;
      if (/^[A-Za-z0-9-]+$/.test(id) && existsSync(observerSdkTranscriptPath(id))) {
        resumableMemorySessionId = id;
        logger.info('SESSION', 'Previous memory session has an on-disk SDK transcript — will resume it', {
          sessionDbId,
          memorySessionId: id
        });
      } else {
        logger.warn('SESSION', `Discarding stale memory_session_id from previous worker instance (Issue #817)`, {
          sessionDbId,
          staleMemorySessionId: id,
          reason: 'no SDK transcript on disk - will capture new ID'
        });
      }
    }

    const userPrompt = currentUserPrompt || dbSession.user_prompt;

    if (!currentUserPrompt) {
      logger.debug('SESSION', 'No currentUserPrompt provided for new session, using database', {
        sessionDbId,
        promptNumber,
        dbPromptLength: dbSession.user_prompt.length
      });
    } else {
      logger.debug('SESSION', 'Initializing session with fresh userPrompt', {
        sessionDbId,
        promptNumber,
        userPromptLength: currentUserPrompt.length
      });
    }

    session = {
      sessionDbId,
      contentSessionId: dbSession.content_session_id,
      memorySessionId: resumableMemorySessionId,  // resume when the SDK transcript survives, else fresh
      project: dbSession.project,
      platformSource: dbSession.platform_source,
      userPrompt,
      pendingMessages: [],
      abortController: new AbortController(),
      generatorPromise: null,
      lastPromptNumber: promptNumber || this.dbManager.getSessionStore().getPromptNumberFromUserPrompts(dbSession.content_session_id),
      startTime: Date.now(),
      cumulativeInputTokens: 0,
      cumulativeOutputTokens: 0,
      earliestPendingTimestamp: null,
      claimedMessageIds: [],
      conversationHistory: [],  // Initialize empty - will be populated by agents
      currentProvider: null,  // Will be set when generator starts
      consecutiveRestarts: 0,
      consecutiveInvalidOutputs: 0,
      lastGeneratorActivity: Date.now(),  // Initialize for stale detection (Issue #1099)
      pendingAgentId: null,   // Subagent identity carried from the most recent claimed message
      pendingAgentType: null
    };

    logger.debug('SESSION', 'Creating new session object', {
      sessionDbId,
      contentSessionId: dbSession.content_session_id,
      dbMemorySessionId: dbSession.memory_session_id || '(none in DB)',
      memorySessionId: resumableMemorySessionId ?? '(cleared - will capture fresh from SDK)',
      lastPromptNumber: promptNumber || this.dbManager.getSessionStore().getPromptNumberFromUserPrompts(dbSession.content_session_id)
    });

    this.sessions.set(sessionDbId, session);

    // Reload any durable rows a previous teardown (worker restart, idle cull,
    // abort) left behind for this session — never throws.
    this.restorePersistedForSession(session);

    logger.info('SESSION', 'Session initialized', {
      sessionId: sessionDbId,
      project: session.project,
      contentSessionId: session.contentSessionId,
      queueDepth: 0,
      hasGenerator: false
    });

    return session;
  }

  getSession(sessionDbId: number): ActiveSession | undefined {
    return this.sessions.get(sessionDbId);
  }

  async queueObservation(sessionDbId: number, data: ObservationData): Promise<void> {
    let session = this.sessions.get(sessionDbId);
    if (!session) {
      session = this.initializeSession(sessionDbId);
    }

    const message: PendingMessage = {
      type: 'observation',
      tool_name: data.tool_name,
      tool_input: data.tool_input,
      tool_response: data.tool_response,
      prompt_number: data.prompt_number,
      cwd: data.cwd,
      agentId: data.agentId,
      agentType: data.agentType,
      toolUseId: data.toolUseId,
    };

    const messageId = this.buffer.enqueue(sessionDbId, message);
    const queueDepth = this.buffer.getPendingCount(sessionDbId);
    const toolSummary = logger.formatTool(data.tool_name, data.tool_input);
    if (messageId === 0) {
      logger.debug('QUEUE', `DUP_SUPPRESSED | sessionDbId=${sessionDbId} | type=observation | tool=${toolSummary} | toolUseId=${data.toolUseId ?? 'null'} | depth=${queueDepth}`, {
        sessionId: sessionDbId
      });
    } else {
      logger.info('QUEUE', `ENQUEUED | sessionDbId=${sessionDbId} | messageId=${messageId} | type=observation | tool=${toolSummary} | depth=${queueDepth}`, {
        sessionId: sessionDbId
      });
    }
  }

  async queueSummarize(sessionDbId: number, lastAssistantMessage?: string): Promise<void> {
    let session = this.sessions.get(sessionDbId);
    if (!session) {
      session = this.initializeSession(sessionDbId);
    }

    const message: PendingMessage = {
      type: 'summarize',
      last_assistant_message: lastAssistantMessage
    };

    const messageId = this.buffer.enqueue(sessionDbId, message);
    const queueDepth = this.buffer.getPendingCount(sessionDbId);
    if (messageId === 0) {
      logger.debug('QUEUE', `DUP_SUPPRESSED | sessionDbId=${sessionDbId} | type=summarize | depth=${queueDepth}`, {
        sessionId: sessionDbId
      });
    } else {
      logger.info('QUEUE', `ENQUEUED | sessionDbId=${sessionDbId} | messageId=${messageId} | type=summarize | depth=${queueDepth}`, {
        sessionId: sessionDbId
      });
    }
  }

  async clearPendingForSession(sessionDbId: number): Promise<number> {
    return this.buffer.clear(sessionDbId);
  }

  async resetProcessingToPending(sessionDbId: number): Promise<number> {
    const session = this.sessions.get(sessionDbId);
    if (session) {
      session.claimedMessageIds = [];
    }
    return this.buffer.resetClaimed(sessionDbId);
  }

  async confirmClaimedMessages(sessionDbId: number): Promise<number> {
    const session = this.sessions.get(sessionDbId);
    const claimedIds = session?.claimedMessageIds ?? [];
    let confirmed = 0;
    for (const messageId of claimedIds) {
      confirmed += this.buffer.confirm(messageId, sessionDbId);
    }
    if (session) {
      session.claimedMessageIds = [];
      session.earliestPendingTimestamp = null;
      session.redrainAttempts = 0;  // successful drain resets the redrain backoff
      // Snapshot the reducer context at every confirmed turn, so restart
      // recovery resumes with the context that produced the last stored
      // observations. Never let a snapshot failure fail the confirm.
      try {
        this.dbManager.getSessionStore().saveConversationHistory(
          sessionDbId, JSON.stringify(session.conversationHistory));
      } catch (error) {
        logger.warn('SESSION', 'Failed to persist conversation history snapshot', {
          sessionId: sessionDbId
        }, toError(error));
      }
    }
    return confirmed;
  }

  /**
   * Kill and respawn a poisoned SDK session while PRESERVING the in-RAM pending
   * messages (plan-11, #2485). A session that keeps emitting non-XML/poisoned
   * output wedges the pipeline at zero observations; aborting the generator and
   * killing the SDK subprocess forces a fresh spawn on the next ingest, but the
   * buffered tool-use fragments must survive so they get reprocessed.
   *
   * Unlike deleteSession this does NOT dispose the SessionMessageBuffer and does
   * NOT remove the session from the active map: it un-claims any in-flight
   * messages (so the next generator re-yields them), aborts the current
   * generator with a 'poisoned' reason, and ensures the SDK subprocess exits.
   * The next ensureGeneratorRunning starts a clean generator.
   */
  async respawnPoisonedSession(sessionDbId: number): Promise<void> {
    const session = this.sessions.get(sessionDbId);
    if (!session) {
      return;
    }

    const preservedPending = this.buffer.getPendingCount(sessionDbId);
    logger.warn('SESSION', 'Respawning poisoned SDK session, preserving pending messages', {
      sessionId: sessionDbId,
      preservedPending,
      consecutiveInvalidOutputs: session.consecutiveInvalidOutputs,
    });

    // Re-yield anything claimed-but-unconfirmed so the fresh generator picks it up.
    await this.resetProcessingToPending(sessionDbId);

    // Drop stale conversation context: the poisoned turns are what wedged it.
    // Clear the persisted snapshot too — a restart must not resurrect it. A
    // failed clear must not abort the respawn (the abort + SDK kill below
    // still have to run); the snapshot gets overwritten on the next confirm.
    session.conversationHistory = [];
    try {
      this.dbManager.getSessionStore().saveConversationHistory(sessionDbId, null);
    } catch (error) {
      logger.warn('SESSION', 'Failed to clear persisted history during poison respawn', {
        sessionId: sessionDbId
      }, toError(error));
    }
    session.consecutiveInvalidOutputs = 0;
    session.memorySessionId = null;  // force a fresh SDK session id on respawn

    session.abortReason = 'poisoned';
    session.abortController.abort();

    const tracked = getSdkProcessForSession(sessionDbId);
    if (tracked && tracked.process.exitCode === null) {
      await ensureSdkProcessExit(tracked, 5000);
    }
  }

  async deleteSession(sessionDbId: number): Promise<void> {
    const session = this.sessions.get(sessionDbId);
    if (!session) {
      return;
    }

    // Phase 2: emit this session's single observer_turn_rollup at session end,
    // while the session still exists. flushSession removes the bucket, so the
    // matching call in removeSessionImmediate (or a re-entry here) is a safe
    // no-op. Never throws — telemetry is fire-and-forget.
    telemetryBuffer.flushSession(sessionDbId, 'session_end');

    const sessionDuration = Date.now() - session.startTime;

    if (session.respawnTimer) {
      clearTimeout(session.respawnTimer);
      session.respawnTimer = undefined;
    }

    session.abortReason = 'shutdown';
    session.abortController.abort();

    if (session.generatorPromise) {
      const generatorDone = session.generatorPromise.catch(() => {
        logger.debug('SYSTEM', 'Generator already failed, cleaning up', { sessionId: session.sessionDbId });
      });
      const timeoutDone = new Promise<void>(resolve => {
        AbortSignal.timeout(30_000).addEventListener('abort', () => resolve(), { once: true });
      });
      await Promise.race([generatorDone, timeoutDone]).then(() => {}, () => {
        logger.warn('SESSION', 'Generator did not exit within 30s after abort, forcing cleanup (#1099)', { sessionDbId });
      });
    }

    const tracked = getSdkProcessForSession(sessionDbId);
    if (tracked && tracked.process.exitCode === null) {
      logger.debug('SESSION', `Waiting for subprocess PID ${tracked.pid} (pgid ${tracked.pgid}) to exit`, {
        sessionId: sessionDbId,
        pid: tracked.pid,
        pgid: tracked.pgid
      });
      await ensureSdkProcessExit(tracked, 5000);
    }

    try {
      await getSupervisor().getRegistry().reapSession(sessionDbId);
    } catch (error) {
      if (error instanceof Error) {
        logger.warn('SESSION', 'Supervisor reapSession failed (non-blocking)', {
          sessionId: sessionDbId
        }, error);
      } else {
        logger.warn('SESSION', 'Supervisor reapSession failed (non-blocking) with non-Error', {
          sessionId: sessionDbId
        }, new Error(String(error)));
      }
    }

    this.clearPersistedHistoryIfDrained(sessionDbId);
    this.buffer.dispose(sessionDbId);
    this.sessions.delete(sessionDbId);
    logger.info('SESSION', 'Session deleted', {
      sessionId: sessionDbId,
      duration: `${(sessionDuration / 1000).toFixed(1)}s`,
      project: session.project
    });

    if (this.onSessionDeletedCallback) {
      this.onSessionDeletedCallback();
    }
  }

  removeSessionImmediate(sessionDbId: number): void {
    const session = this.sessions.get(sessionDbId);
    if (!session) return;

    // Phase 2: same session-end rollup as deleteSession. Whichever teardown
    // path runs first flushes; flushSession removes the bucket so the second is
    // a no-op (guards against the deleteSession/removeSessionImmediate pair).
    telemetryBuffer.flushSession(sessionDbId, 'session_end');

    if (session.respawnTimer) {
      clearTimeout(session.respawnTimer);
      session.respawnTimer = undefined;
    }

    this.clearPersistedHistoryIfDrained(sessionDbId);
    this.buffer.dispose(sessionDbId);
    this.sessions.delete(sessionDbId);
    logger.info('SESSION', 'Session removed from active sessions', {
      sessionId: sessionDbId,
      project: session.project
    });

    if (this.onSessionDeletedCallback) {
      this.onSessionDeletedCallback();
    }
  }

  /**
   * On teardown: a fully drained session's history snapshot is dead weight —
   * clear it. If unconfirmed work remains (rows survive in pending_messages),
   * keep the snapshot: startup recovery needs it to resume with real context.
   * Best-effort — teardown must not fail on a snapshot cleanup.
   */
  private clearPersistedHistoryIfDrained(sessionDbId: number): void {
    if (this.buffer.getPendingCount(sessionDbId) > 0) return;
    try {
      this.dbManager.getSessionStore().saveConversationHistory(sessionDbId, null);
    } catch (error) {
      logger.warn('SESSION', 'Failed to clear persisted conversation history', {
        sessionId: sessionDbId
      }, toError(error));
    }
  }

  async shutdownAll(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(sessionIds.map(id => this.deleteSession(id)));
  }

  async hasPendingMessages(): Promise<boolean> {
    return this.getTotalQueueDepth() > 0;
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  getTotalQueueDepth(): number {
    return this.buffer.getTotalDepth();
  }

  async getTotalActiveWork(): Promise<number> {
    return this.getTotalQueueDepth();
  }

  async isAnySessionProcessing(): Promise<boolean> {
    return this.getTotalQueueDepth() > 0;
  }

  async *getMessageIterator(sessionDbId: number): AsyncIterableIterator<PendingMessageWithId> {
    let session = this.sessions.get(sessionDbId);
    if (!session) {
      session = this.initializeSession(sessionDbId);
    }

    // Re-yield anything a prior generator pass claimed but did not confirm.
    await this.resetProcessingToPending(sessionDbId);

    for await (const message of this.buffer.drain({
      sessionDbId,
      signal: session.abortController.signal,
      onIdleTimeout: () => {
        logger.info('SESSION', 'Triggering abort due to idle timeout to kill subprocess', { sessionDbId });
        session.idleTimedOut = true;
        session.abortReason = 'idle';
        session.abortController.abort();
      }
    })) {
      session.claimedMessageIds.push(message._persistentId);
      if (session.earliestPendingTimestamp === null) {
        session.earliestPendingTimestamp = message._originalTimestamp;
      } else {
        session.earliestPendingTimestamp = Math.min(session.earliestPendingTimestamp, message._originalTimestamp);
      }

      session.lastGeneratorActivity = Date.now();

      yield message;
    }
  }

  /** Read-only access to the in-RAM buffer for diagnostics. */
  getMessageBuffer(): SessionMessageBuffer {
    return this.buffer;
  }
}

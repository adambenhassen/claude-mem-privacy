import type { ActiveSession } from '../../worker-types.js';
import type { SessionManager } from '../SessionManager.js';
import type { SessionCompletionHandler } from './SessionCompletionHandler.js';
import { logger } from '../../../utils/logger.js';
import { getSdkProcessForSession, ensureSdkProcessExit } from '../../../supervisor/process-registry.js';

export interface GeneratorExitDependencies {
  sessionManager: SessionManager;
  completionHandler: SessionCompletionHandler;
}

/**
 * Post-generator-exit handler.
 *
 * The generator's message iterator only ends on abort (idle / shutdown) or when
 * the provider throws, so an exit means this generator is done. Two paths:
 *
 * - preserveForRedrain (any non-abort failure with work still buffered): keep
 *   the session and its buffer alive; the CALLER (SessionRoutes' finally)
 *   schedules the backoff redrain — this handler only preserves.
 * - otherwise: finalize and remove the session. Buffered work is mirrored in
 *   the durable pending_messages table (deleted on confirm), so anything
 *   unconfirmed at teardown survives and is reloaded when the session is next
 *   initialized or at the startup recovery sweep.
 *
 * This is not the old respawn-on-pending retry storm: redrains are backoff-
 * paced and armed only from the failure path, never from "rows exist".
 */
export async function handleGeneratorExit(
  session: ActiveSession,
  reason: ActiveSession['abortReason'],
  deps: GeneratorExitDependencies,
  opts?: { preserveForRedrain?: boolean }
): Promise<void> {
  const { sessionManager, completionHandler } = deps;
  const sessionDbId = session.sessionDbId;

  const tracked = getSdkProcessForSession(sessionDbId);
  if (tracked && !tracked.process.killed && tracked.process.exitCode === null) {
    await ensureSdkProcessExit(tracked, 5000);
  }

  session.generatorPromise = null;
  session.currentProvider = null;

  if (opts?.preserveForRedrain) {
    // Generator failed with work still buffered (network outage, provider
    // error, …): keep the session and its in-RAM buffer alive so the caller's
    // scheduled redrain can start a fresh generator that re-yields the
    // un-claimed messages. No finalize, no dispose.
    logger.warn('SESSION', 'Generator failed with work still buffered — preserving session for redrain', {
      sessionId: sessionDbId,
      pending: sessionManager.getMessageBuffer().getPendingCount(sessionDbId),
    });
    return;
  }

  logger.info('SESSION', 'Generator exited — finalizing session', { sessionId: sessionDbId, reason });

  try {
    await completionHandler.finalizeSession(sessionDbId);
  } catch (e) {
    const normalized = e instanceof Error ? e : new Error(String(e));
    logger.error('SESSION', 'Finalization failed; forcing in-memory session removal', {
      sessionId: sessionDbId,
      reason
    }, normalized);
  } finally {
    sessionManager.removeSessionImmediate(sessionDbId);
  }
}

import { describe, test, expect } from 'bun:test';
import { SessionStore } from '../../src/services/sqlite/SessionStore.js';
import { SessionMessageBuffer, type BufferPersistence } from '../../src/services/worker/SessionMessageBuffer.js';

function makeStore(): SessionStore {
  const store = new SessionStore(':memory:');
  store.db.run(`
    INSERT INTO sdk_sessions (content_session_id, memory_session_id, project, user_prompt, started_at, started_at_epoch)
    VALUES ('content-1', NULL, 'proj', 'prompt', '2026-01-01', 1)
  `);
  return store;
}

function sessionDbId(store: SessionStore): number {
  return (store.db.query('SELECT id FROM sdk_sessions LIMIT 1').get() as { id: number }).id;
}

describe('pending_messages durability', () => {
  test('insert / delete round-trip and duplicate suppression', () => {
    const store = makeStore();
    const sid = sessionDbId(store);

    const id1 = store.insertPendingMessage({
      sessionDbId: sid, contentSessionId: 'content-1', messageType: 'observation',
      toolName: 'Bash', toolInput: '{"cmd":"ls"}', toolResponse: '{"out":"x"}',
      cwd: '/tmp/p', promptNumber: 3, toolUseId: 'tu-1', agentId: 'a1', agentType: 'explore',
    });
    expect(id1).toBeGreaterThan(0);

    // Same (content_session_id, tool_use_id) → suppressed by the unique index.
    const dup = store.insertPendingMessage({
      sessionDbId: sid, contentSessionId: 'content-1', messageType: 'observation', toolUseId: 'tu-1',
    });
    expect(dup).toBe(0);

    const rows = store.getPersistedPendingMessagesForSession(sid);
    expect(rows.length).toBe(1);
    expect(rows[0].tool_name).toBe('Bash');
    expect(rows[0].agent_id).toBe('a1');
    expect(rows[0].agent_type).toBe('explore');

    store.deletePendingMessage(id1);
    expect(store.getPersistedPendingMessagesForSession(sid).length).toBe(0);
  });

  test('buffer write-through: enqueue persists, confirm deletes, dispose keeps rows, restore reloads', () => {
    const store = makeStore();
    const sid = sessionDbId(store);
    const persistence: BufferPersistence = {
      insert: (sessionDbId, m) => store.insertPendingMessage({
        sessionDbId, contentSessionId: 'content-1', messageType: m.type,
        toolName: m.tool_name, toolUseId: m.toolUseId,
      }),
      remove: id => store.deletePendingMessage(id),
      removeSession: id => store.deletePendingMessagesForSession(id),
    };

    const buffer = new SessionMessageBuffer(undefined, persistence);
    const id1 = buffer.enqueue(sid, { type: 'observation', tool_name: 'Read', toolUseId: 'tu-a' });
    const id2 = buffer.enqueue(sid, { type: 'observation', tool_name: 'Edit', toolUseId: 'tu-b' });
    expect(store.getPersistedPendingMessagesForSession(sid).length).toBe(2);

    // Confirm = successful store → durable row goes away.
    expect(buffer.confirm(id1)).toBe(1);
    expect(store.getPersistedPendingMessagesForSession(sid).map(r => r.id)).toEqual([id2]);

    // Teardown with unconfirmed work: RAM gone, durable row survives.
    buffer.dispose(sid);
    expect(buffer.getPendingCount(sid)).toBe(0);
    expect(store.getPersistedPendingMessagesForSession(sid).length).toBe(1);

    // "Restart": a fresh buffer restores the surviving row, dedup set seeded.
    const buffer2 = new SessionMessageBuffer(undefined, persistence);
    const rows = store.getPersistedPendingMessagesForSession(sid);
    buffer2.restore(sid, rows.map(r => ({
      id: r.id,
      enqueuedAt: r.created_at_epoch,
      message: { type: r.message_type, tool_name: r.tool_name ?? undefined, toolUseId: r.tool_use_id ?? undefined },
    })));
    expect(buffer2.getPendingCount(sid)).toBe(1);
    expect(buffer2.enqueue(sid, { type: 'observation', tool_name: 'Edit', toolUseId: 'tu-b' })).toBe(0);
  });

  test('a throwing insert leaves the dedup set unmarked so a retry succeeds', () => {
    const store = makeStore();
    const sid = sessionDbId(store);
    let failNext = true;
    const buffer = new SessionMessageBuffer(undefined, {
      insert: (sessionDbId, m) => {
        if (failNext) { failNext = false; throw new Error('SQLITE_BUSY'); }
        return store.insertPendingMessage({
          sessionDbId, contentSessionId: 'content-1', messageType: m.type,
          toolName: m.tool_name, toolUseId: m.toolUseId,
        });
      },
      remove: id => store.deletePendingMessage(id),
      removeSession: id => store.deletePendingMessagesForSession(id),
    });

    expect(() => buffer.enqueue(sid, { type: 'observation', tool_name: 'Read', toolUseId: 'tu-retry' })).toThrow();
    // Retry of the same tool-use must NOT be suppressed as a duplicate.
    expect(buffer.enqueue(sid, { type: 'observation', tool_name: 'Read', toolUseId: 'tu-retry' })).toBeGreaterThan(0);
  });

  test('insertPendingMessage fails loud when OR IGNORE suppression is not a duplicate', () => {
    const store = makeStore();
    // Nonexistent session → FK violation. SQLite throws this natively even
    // under OR IGNORE (which only swallows UNIQUE/NOT NULL/CHECK); the
    // post-hoc dup verification covers those swallowed classes. Either way:
    // loud failure, never a silent 0.
    expect(() => store.insertPendingMessage({
      sessionDbId: 999999, contentSessionId: 'nope', messageType: 'observation', toolUseId: 'tu-fk',
    })).toThrow();
  });

  test('conversation history snapshot: save, read back, clear', () => {
    const store = makeStore();
    const sid = sessionDbId(store);

    expect(store.getConversationHistory(sid)).toBeNull();

    const history = JSON.stringify([
      { role: 'user', content: 'init' },
      { role: 'assistant', content: 'ack' },
    ]);
    store.saveConversationHistory(sid, history);
    expect(store.getConversationHistory(sid)).toBe(history);

    store.saveConversationHistory(sid, null);
    expect(store.getConversationHistory(sid)).toBeNull();
  });
});


import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import type { Request, Response } from 'express';
import { EventEmitter } from 'node:events';
import { logger } from '../../../../src/utils/logger.js';
import { SettingsDefaultsManager } from '../../../../src/shared/SettingsDefaultsManager.js';
import { PresidioManager } from '../../../../src/services/redaction/PresidioManager.js';

mock.module('../../../../src/shared/paths.js', () => ({
  getPackageRoot: () => '/tmp/test',
}));
mock.module('../../../../src/shared/worker-utils.js', () => ({
  getWorkerPort: () => 37777,
}));

import { MemoryRoutes } from '../../../../src/services/worker/http/routes/MemoryRoutes.js';

let loggerSpies: ReturnType<typeof spyOn>[] = [];
const PAT = 'ghp_' + '0'.repeat(36);

// Fake Presidio sidecar: redacts the literal "Jane Smith" -> PERSON. Used only
// by the deep-PII test; other tests run with Presidio off (the suite default).
class FakeChild extends EventEmitter {
  pid = 999999999;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = {
    write: (line: string) => {
      try {
        const req = JSON.parse(line);
        const text = String(req.text).replace(/Jane Smith/g, '[REDACTED:PERSON]');
        const counts = text !== String(req.text) ? { PERSON: 1 } : {};
        queueMicrotask(() => this.stdout.emit('data', Buffer.from(JSON.stringify({ id: req.id, text, counts }) + '\n')));
      } catch { /* ignore */ }
      return true;
    },
    end: () => {},
    on: () => {},
  };
  emitReady() { this.stdout.emit('data', Buffer.from(JSON.stringify({ ready: true }) + '\n')); }
}

function createMockReqRes(body: any): { req: Partial<Request>; res: Partial<Response>; jsonSpy: ReturnType<typeof mock>; statusSpy: ReturnType<typeof mock> } {
  const jsonSpy = mock(() => {});
  const statusSpy = mock(() => ({ json: jsonSpy }));
  return {
    req: { body, path: '/api/memory/save', query: {} } as Partial<Request>,
    res: { json: jsonSpy, status: statusSpy } as unknown as Partial<Response>,
    jsonSpy,
    statusSpy,
  };
}

function captureChain(mockApp: any, targetPath: string): (req: Request, res: Response) => unknown {
  let middleware: ((req: Request, res: Response, next: () => void) => void) | undefined;
  let handler: ((req: Request, res: Response) => unknown) | undefined;
  mockApp.post = mock((path: string, ...rest: any[]) => {
    if (path !== targetPath) return;
    if (rest.length === 1) {
      handler = rest[0];
    } else {
      middleware = rest[0];
      handler = rest[1];
    }
  });
  return (req: Request, res: Response): unknown => {
    if (!middleware) {
      return handler!(req, res);
    }
    let nextCalled = false;
    middleware(req, res, () => {
      nextCalled = true;
    });
    if (nextCalled) return handler!(req, res);
  };
}

describe('MemoryRoutes — POST /api/memory/save (#2116)', () => {
  let routes: MemoryRoutes;
  let mockStoreObservation: ReturnType<typeof mock>;
  let mockGetOrCreateManualSession: ReturnType<typeof mock>;
  let storeObservationCalls: any[][] = [];

  beforeEach(() => {
    loggerSpies = [
      spyOn(logger, 'info').mockImplementation(() => {}),
      spyOn(logger, 'debug').mockImplementation(() => {}),
      spyOn(logger, 'warn').mockImplementation(() => {}),
      spyOn(logger, 'error').mockImplementation(() => {}),
      spyOn(logger, 'failure').mockImplementation(() => {}),
    ];

    storeObservationCalls = [];
    mockStoreObservation = mock((...args: any[]) => {
      storeObservationCalls.push(args);
      return { id: 42, createdAtEpoch: 1234567890 };
    });
    mockGetOrCreateManualSession = mock((project: string) => `manual-${project}`);

    const mockDbManager = {
      getSessionStore: () => ({
        storeObservation: mockStoreObservation,
        getOrCreateManualSession: mockGetOrCreateManualSession,
      }),
      getChromaSync: () => null,
    };

    routes = new MemoryRoutes(mockDbManager as any, 'claude-mem');
  });

  afterEach(() => {
    loggerSpies.forEach(spy => spy.mockRestore());
    PresidioManager.__setSpawn(null);
    mock.restore();
  });

  function buildHandler(): (req: Request, res: Response) => unknown {
    const mockApp: any = {
      get: mock(() => {}),
      delete: mock(() => {}),
      use: mock(() => {}),
    };
    const handler = captureChain(mockApp, '/api/memory/save');
    routes.setupRoutes(mockApp as any);
    return handler;
  }

  it('persists arbitrary metadata as JSON-encoded string', async () => {
    const handler = buildHandler();
    const metadata = {
      obsidian_note: 'note',
      claude_mem_version: '12.4.4',
      custom_key: 'value',
    };
    const { req, res } = createMockReqRes({ text: 'hello', metadata });
    await handler(req as Request, res as Response);

    expect(mockStoreObservation).toHaveBeenCalledTimes(1);
    const observationArg = storeObservationCalls[0][2];
    expect(observationArg.metadata).toBe(JSON.stringify(metadata));
  });

  it('passes metadata: null when none provided', async () => {
    const handler = buildHandler();
    const { req, res } = createMockReqRes({ text: 'hello' });
    await handler(req as Request, res as Response);

    const observationArg = storeObservationCalls[0][2];
    expect(observationArg.metadata).toBeNull();
  });

  it('uses top-level project when present', async () => {
    const handler = buildHandler();
    const { req, res } = createMockReqRes({
      text: 'hello',
      project: 'top-level-project',
      metadata: { project: 'metadata-project' },
    });
    await handler(req as Request, res as Response);

    expect(mockGetOrCreateManualSession).toHaveBeenCalledWith('top-level-project');
    expect(storeObservationCalls[0][1]).toBe('top-level-project');
  });

  it('falls back to metadata.project when top-level project is omitted (#2116)', async () => {
    const handler = buildHandler();
    const { req, res } = createMockReqRes({
      text: 'hello',
      metadata: { project: 'my-custom-project' },
    });
    await handler(req as Request, res as Response);

    expect(mockGetOrCreateManualSession).toHaveBeenCalledWith('my-custom-project');
    expect(storeObservationCalls[0][1]).toBe('my-custom-project');
  });

  it('falls back to defaultProject when no project supplied anywhere', async () => {
    const handler = buildHandler();
    const { req, res } = createMockReqRes({ text: 'hello' });
    await handler(req as Request, res as Response);

    expect(mockGetOrCreateManualSession).toHaveBeenCalledWith('claude-mem');
    expect(storeObservationCalls[0][1]).toBe('claude-mem');
  });

  it('rejects unknown top-level fields with HTTP 400 (no silent drop)', async () => {
    const handler = buildHandler();
    const { req, res, statusSpy } = createMockReqRes({ text: 'hello', foo: 'bar' });
    await handler(req as Request, res as Response);

    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(mockStoreObservation).not.toHaveBeenCalled();
  });

  it('rejects empty/missing text with HTTP 400', async () => {
    const handler = buildHandler();
    const { req, res, statusSpy } = createMockReqRes({});
    await handler(req as Request, res as Response);

    expect(statusSpy).toHaveBeenCalledWith(400);
    expect(mockStoreObservation).not.toHaveBeenCalled();
  });

  it('redacts secrets in the stored observation and does NOT echo them in the response title', async () => {
    const handler = buildHandler();
    const { req, res, jsonSpy } = createMockReqRes({ text: `leak ${PAT} here` });
    await handler(req as Request, res as Response);

    const observationArg = storeObservationCalls[0][2];
    expect(observationArg.narrative).not.toContain(PAT);
    expect(observationArg.narrative).toContain('[REDACTED:GITHUB_PAT]');

    const responsePayload = jsonSpy.mock.calls[0][0] as { title: string };
    expect(responsePayload.title).not.toContain(PAT);
    expect(responsePayload.title).toContain('[REDACTED:GITHUB_PAT]');
  });

  it('applies the Presidio NER pass to stored free-form PII when enabled', async () => {
    const settingsSpy = spyOn(SettingsDefaultsManager, 'loadFromFile').mockImplementation(
      () => ({ ...SettingsDefaultsManager.getAllDefaults(), CLAUDE_MEM_REDACTION_PRESIDIO_ENABLED: 'true' }) as any
    );
    PresidioManager.resetInstance();
    PresidioManager.__setSpawn(() => {
      const child = new FakeChild();
      queueMicrotask(() => child.emitReady());
      return child as any;
    });

    const handler = buildHandler();
    const { req, res } = createMockReqRes({ text: 'pairing with Jane Smith on the parser' });
    await handler(req as Request, res as Response);

    const observationArg = storeObservationCalls[0][2];
    expect(observationArg.narrative).not.toContain('Jane Smith');
    expect(observationArg.narrative).toContain('[REDACTED:PERSON]');

    settingsSpy.mockRestore();
  });
});

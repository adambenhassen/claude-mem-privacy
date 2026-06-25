import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { EventEmitter } from 'node:events';
import { SettingsDefaultsManager } from '../../src/shared/SettingsDefaultsManager';
import { PresidioManager } from '../../src/services/redaction/PresidioManager';

type Responder = ((req: any, child: FakeChild) => void) | null;

class FakeChild extends EventEmitter {
  pid = 999999999; // non-existent PID: tree-kill's process.kill hits ESRCH safely
  killed = false;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  responder: Responder;
  stdin: { write: (s: string) => boolean; end: () => void };
  constructor(responder: Responder) {
    super();
    this.responder = responder;
    this.stdin = {
      write: (line: string) => {
        if (this.responder) {
          try { this.responder(JSON.parse(line), this); } catch { /* ignore */ }
        }
        return true;
      },
      end: () => {},
    };
  }
  emitLine(obj: unknown) { this.stdout.emit('data', Buffer.from(JSON.stringify(obj) + '\n')); }
}

let child: FakeChild;
let spawnCalls = 0;

function installFakeSpawn(responder: Responder, autoReady = true) {
  spawnCalls = 0;
  PresidioManager.__setSpawn(() => {
    spawnCalls++;
    child = new FakeChild(responder);
    if (autoReady) queueMicrotask(() => child.emitLine({ ready: true }));
    return child as any;
  });
}

const echoPersonResponder: Responder = (req, c) =>
  queueMicrotask(() => c.emitLine({ id: req.id, text: '[REDACTED:PERSON]', counts: { PERSON: 1 } }));

function settings(over: Record<string, string>) {
  return spyOn(SettingsDefaultsManager, 'loadFromFile').mockImplementation(
    () => ({ ...SettingsDefaultsManager.getAllDefaults(), ...over }) as any
  );
}

describe('PresidioManager', () => {
  let settingsSpy: ReturnType<typeof spyOn>;
  beforeEach(() => {
    settingsSpy = settings({ CLAUDE_MEM_REDACTION_PRESIDIO_ENABLED: 'true', CLAUDE_MEM_REDACTION_PRESIDIO_TIMEOUT_MS: '150' });
    PresidioManager.resetInstance();
  });
  afterEach(() => {
    PresidioManager.__setSpawn(null);
    settingsSpy.mockRestore();
  });

  it('does not spawn when disabled', async () => {
    settingsSpy.mockRestore();
    settingsSpy = settings({ CLAUDE_MEM_REDACTION_PRESIDIO_ENABLED: 'false' });
    PresidioManager.resetInstance();
    installFakeSpawn(echoPersonResponder);
    const res = await PresidioManager.getInstance().anonymize('hello Jane', {});
    expect(res).toEqual({ text: 'hello Jane', counts: {} });
    expect(spawnCalls).toBe(0);
  });

  it('anonymizes via id-correlated JSON line', async () => {
    installFakeSpawn(echoPersonResponder);
    const res = await PresidioManager.getInstance().anonymize('My name is Jane', {});
    expect(res.text).toBe('[REDACTED:PERSON]');
    expect(res.counts.PERSON).toBe(1);
    expect(spawnCalls).toBe(1);
  });

  it('falls back to input on per-call timeout', async () => {
    installFakeSpawn(null); // never responds
    const res = await PresidioManager.getInstance().anonymize('hello Jane', {});
    expect(res).toEqual({ text: 'hello Jane', counts: {} });
  });

  it('parseStalePresidioPids matches the script, excludes self and non-matches', () => {
    const out = [
      '111 uv run /x/plugin/scripts/presidio_service.py',
      '222 python /other/thing.py',
      `${process.pid} uv run /x/plugin/scripts/presidio_service.py`, // self — excluded
      '333 uv run /y/plugin/scripts/presidio_service.py',
    ].join('\n');
    expect(PresidioManager.parseStalePresidioPids(out)).toEqual([111, 333]);
  });

  it('restarts once after a crash, then disables after a second crash', async () => {
    installFakeSpawn(echoPersonResponder);
    const mgr = PresidioManager.getInstance();

    expect((await mgr.anonymize('My name is Jane', {})).text).toBe('[REDACTED:PERSON]');
    expect(spawnCalls).toBe(1);

    child.emit('exit', 1, null); // first crash -> restart allowed
    expect((await mgr.anonymize('My name is Jane', {})).text).toBe('[REDACTED:PERSON]');
    expect(spawnCalls).toBe(2); // restarted

    child.emit('exit', 1, null); // second crash -> disable
    const res = await mgr.anonymize('hello Jane', {});
    expect(res.text).toBe('hello Jane'); // fell back, no further spawn
    expect(spawnCalls).toBe(2);
  });
});

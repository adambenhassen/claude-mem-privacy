import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { EventEmitter } from 'node:events';
import { SettingsDefaultsManager } from '../../src/shared/SettingsDefaultsManager';
import { PresidioManager } from '../../src/services/redaction/PresidioManager';
import { redactTextDeep, redactFieldsDeep } from '../../src/shared/redaction/index';

type Responder = ((req: any, child: FakeChild) => void) | null;

class FakeChild extends EventEmitter {
  pid = 999999999; // non-existent PID: tree-kill hits ESRCH safely
  killed = false;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  responder: Responder;
  stdin: { write: (s: string) => boolean; end: () => void; on: () => void };
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
      on: () => {},
    };
  }
  emitLine(obj: unknown) { this.stdout.emit('data', Buffer.from(JSON.stringify(obj) + '\n')); }
}

// Responder that mimics Presidio: redacts the literal "Jane Smith" -> PERSON.
const personResponder: Responder = (req, c) =>
  queueMicrotask(() => {
    const text = String(req.text).replace(/Jane Smith/g, '[REDACTED:PERSON]');
    const counts = text !== String(req.text) ? { PERSON: 1 } : {};
    c.emitLine({ id: req.id, text, counts });
  });

function installFakeSpawn(responder: Responder) {
  PresidioManager.__setSpawn(() => {
    const child = new FakeChild(responder);
    queueMicrotask(() => child.emitLine({ ready: true }));
    return child as any;
  });
}

function settings(over: Record<string, string>) {
  return spyOn(SettingsDefaultsManager, 'loadFromFile').mockImplementation(
    () => ({ ...SettingsDefaultsManager.getAllDefaults(), ...over }) as any
  );
}

const PAT = 'ghp_' + '0'.repeat(36);

describe('deep redaction (regex + Presidio)', () => {
  let settingsSpy: ReturnType<typeof spyOn>;
  afterEach(() => {
    PresidioManager.__setSpawn(null);
    settingsSpy?.mockRestore();
  });

  it('redactTextDeep applies BOTH the regex secret pass and the Presidio NER pass', async () => {
    settingsSpy = settings({ CLAUDE_MEM_REDACTION_PRESIDIO_ENABLED: 'true', CLAUDE_MEM_REDACTION_PRESIDIO_TIMEOUT_MS: '150' });
    PresidioManager.resetInstance();
    installFakeSpawn(personResponder);

    const out = await redactTextDeep(`token ${PAT} from Jane Smith`, { surface: 'sqlite' });

    expect(out).toContain('[REDACTED:GITHUB_PAT]'); // regex layer
    expect(out).toContain('[REDACTED:PERSON]');     // Presidio layer
    expect(out).not.toContain('Jane Smith');
    expect(out).not.toContain('ghp_');
  });

  it('redactTextDeep falls back to regex-only when Presidio is disabled', async () => {
    settingsSpy = settings({ CLAUDE_MEM_REDACTION_PRESIDIO_ENABLED: 'false' });
    PresidioManager.resetInstance();
    installFakeSpawn(personResponder);

    const out = await redactTextDeep(`token ${PAT} from Jane Smith`, { surface: 'sqlite' });

    expect(out).toContain('[REDACTED:GITHUB_PAT]'); // regex still runs
    expect(out).toContain('Jane Smith');            // NER skipped → name survives
  });

  it('redactFieldsDeep deep-redacts string fields and array fields', async () => {
    settingsSpy = settings({ CLAUDE_MEM_REDACTION_PRESIDIO_ENABLED: 'true', CLAUDE_MEM_REDACTION_PRESIDIO_TIMEOUT_MS: '150' });
    PresidioManager.resetInstance();
    installFakeSpawn(personResponder);

    const obs = {
      title: 'Jane Smith',
      narrative: `pushed ${PAT}`,
      concepts: ['Jane Smith', 'pattern'],
      type: 'discovery',
    };

    const safe = await redactFieldsDeep(obs, ['title', 'narrative', 'concepts'], { surface: 'sqlite' });

    expect(safe.title).toBe('[REDACTED:PERSON]');
    expect(safe.narrative).toContain('[REDACTED:GITHUB_PAT]');
    expect(safe.concepts[0]).toBe('[REDACTED:PERSON]');
    expect(safe.concepts[1]).toBe('pattern'); // untouched
    expect(safe.type).toBe('discovery');       // non-listed field untouched
  });
});

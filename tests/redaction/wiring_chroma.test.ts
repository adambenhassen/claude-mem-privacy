import { describe, it, expect, spyOn, beforeEach, afterEach } from 'bun:test';
import { EventEmitter } from 'node:events';
import { SettingsDefaultsManager } from '../../src/shared/SettingsDefaultsManager';
import { PresidioManager } from '../../src/services/redaction/PresidioManager';

spyOn(SettingsDefaultsManager, 'loadFromFile').mockImplementation(
  () => SettingsDefaultsManager.getAllDefaults() as any
);

import { ChromaSync } from '../../src/services/sync/ChromaSync';
import { ChromaMcpManager } from '../../src/services/sync/ChromaMcpManager';

const TOKEN = 'ghp_0000000000000000000000000000000000';

// Fake Presidio sidecar: redacts the literal "Jane Smith" -> PERSON, passes
// everything else through unchanged. Lets the deep Chroma pass run without uv.
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

function captureAddDocuments() {
  const calls: Array<{ tool: string; args: any }> = [];
  const stubMcp = { callTool: async (tool: string, args: any) => { calls.push({ tool, args }); return {}; } };
  const mgrSpy = spyOn(ChromaMcpManager, 'getInstance').mockReturnValue(stubMcp as any);
  return { calls, mgrSpy };
}

describe('Chroma write redaction (choke point B2)', () => {
  beforeEach(() => {
    PresidioManager.resetInstance();
    PresidioManager.__setSpawn(() => {
      const child = new FakeChild();
      queueMicrotask(() => child.emitReady());
      return child as any;
    });
  });
  afterEach(() => {
    PresidioManager.__setSpawn(null);
  });

  it('redacts secrets (regex layer) before chroma_add_documents', async () => {
    const { calls, mgrSpy } = captureAddDocuments();
    const sync = new ChromaSync('proj');
    spyOn(sync as any, 'ensureCollectionExists').mockImplementation(async () => {});

    await (sync as any).addDocuments([
      {
        id: 'obs_1_narrative',
        document: `narrative referencing ${TOKEN}`,
        metadata: { project: 'proj', doc_type: 'observation', title: `title ${TOKEN}` },
      },
    ]);
    mgrSpy.mockRestore();

    const add = calls.find((c) => c.tool === 'chroma_add_documents');
    expect(add).toBeDefined();
    const docs: string[] = add!.args.documents;
    expect(docs[0]).not.toContain(TOKEN);
    expect(docs[0]).toContain('[REDACTED:GITHUB_PAT]');
    expect(JSON.stringify(add!.args.metadatas[0])).not.toContain(TOKEN);
  });

  it('redacts free-form PII (Presidio layer) before chroma_add_documents', async () => {
    const { calls, mgrSpy } = captureAddDocuments();
    const sync = new ChromaSync('proj');
    spyOn(sync as any, 'ensureCollectionExists').mockImplementation(async () => {});

    await (sync as any).addDocuments([
      {
        id: 'obs_2_narrative',
        document: 'pairing session with Jane Smith on the parser',
        metadata: { project: 'proj', doc_type: 'observation', title: 'note from Jane Smith' },
      },
    ]);
    mgrSpy.mockRestore();

    const add = calls.find((c) => c.tool === 'chroma_add_documents');
    expect(add).toBeDefined();
    const docs: string[] = add!.args.documents;
    expect(docs[0]).not.toContain('Jane Smith');
    expect(docs[0]).toContain('[REDACTED:PERSON]');
    expect(JSON.stringify(add!.args.metadatas[0])).not.toContain('Jane Smith');
  });
});

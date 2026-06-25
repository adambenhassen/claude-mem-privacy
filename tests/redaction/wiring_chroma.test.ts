import { describe, it, expect, spyOn } from 'bun:test';
import { SettingsDefaultsManager } from '../../src/shared/SettingsDefaultsManager';

spyOn(SettingsDefaultsManager, 'loadFromFile').mockImplementation(
  () => SettingsDefaultsManager.getAllDefaults() as any
);

import { ChromaSync } from '../../src/services/sync/ChromaSync';
import { ChromaMcpManager } from '../../src/services/sync/ChromaMcpManager';

const TOKEN = 'ghp_0000000000000000000000000000000000';

describe('Chroma write redaction (choke point B2)', () => {
  it('redacts document text before chroma_add_documents', async () => {
    const calls: Array<{ tool: string; args: any }> = [];
    const stubMcp = {
      callTool: async (tool: string, args: any) => {
        calls.push({ tool, args });
        return {};
      },
    };
    const mgrSpy = spyOn(ChromaMcpManager, 'getInstance').mockReturnValue(stubMcp as any);

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
    // metadata title redacted too
    const meta = add!.args.metadatas[0];
    expect(JSON.stringify(meta)).not.toContain(TOKEN);
  });
});

import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { openWorkspace } from './workspace';

describe('atomic workspace persistence', () => {
  it('rejects an earlier workspace generation even when revision numbers match after a reset', async () => {
    const repo = await openWorkspace(new IDBFactory());
    const old = await repo.load();
    const fresh = await repo.reset();
    expect(fresh.revision).toBe(old.revision);
    await expect(repo.save(old, old.revision)).rejects.toMatchObject({ kind: 'conflict' });
    expect(await repo.load()).toEqual(fresh);
    repo.close();
  });
  it('initializes one valid workspace and retains it after reopening', async () => {
    const factory = new IDBFactory();
    const a = await openWorkspace(factory);
    const first = await a.load();
    a.close();
    const b = await openWorkspace(factory);
    expect(await b.load()).toEqual(first);
    b.close();
  });
  it('persists nested scene and match edits in one commit', async () => {
    const repo = await openWorkspace(new IDBFactory());
    const data = await repo.load();
    data.projects[0]!.home.score = 8;
    data.projects[0]!.scenes[0]!.x = 100;
    expect(await repo.save(data, 0)).toBe(1);
    expect(await repo.load()).toMatchObject({
      revision: 1,
      projects: [{ home: { score: 8 }, scenes: [{ x: 100 }, {}, {}, {}] }],
    });
    repo.close();
  });
  it('rejects stale revisions without clobbering the newer document', async () => {
    const factory = new IDBFactory();
    const a = await openWorkspace(factory);
    const b = await openWorkspace(factory);
    const original = await a.load();
    const stale = structuredClone(original);
    original.projects[0]!.name = 'Winner';
    await a.save(original, 0);
    stale.projects[0]!.name = 'Stale';
    await expect(b.save(stale, 0)).rejects.toMatchObject({ kind: 'conflict' });
    expect((await a.load()).projects[0]!.name).toBe('Winner');
    a.close();
    b.close();
  });
  it('serializes competing writers so exactly one wins', async () => {
    const factory = new IDBFactory();
    const a = await openWorkspace(factory);
    const b = await openWorkspace(factory);
    const first = await a.load();
    const results = await Promise.allSettled([a.save(first, 0), b.save(first, 0)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await a.load()).revision).toBe(1);
    a.close();
    b.close();
  });
  it('rejects invalid edits before touching the saved workspace', async () => {
    const repo = await openWorkspace(new IDBFactory());
    const data = await repo.load();
    data.projects[0]!.scenes = [];
    await expect(repo.save(data, 0)).rejects.toThrow();
    expect((await repo.load()).projects[0]!.scenes).toHaveLength(4);
    repo.close();
  });
  it('preserves unreadable data until an explicit reset', async () => {
    const factory = new IDBFactory();
    const repo = await openWorkspace(factory);
    await repo.load();
    await new Promise<void>((resolve) => {
      const r = factory.open('raftrame-studio');
      r.onsuccess = () => {
        const db = r.result;
        const tx = db.transaction('documents', 'readwrite');
        tx.objectStore('documents').put({ broken: true }, 'workspace');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
    await expect(repo.load()).rejects.toMatchObject({ kind: 'corrupt', raw: { broken: true } });
    await expect(repo.load()).rejects.toMatchObject({ kind: 'corrupt' });
    const reset = await repo.reset();
    expect(reset.projects).toHaveLength(1);
    expect(await repo.load()).toEqual(reset);
    repo.close();
  });
});

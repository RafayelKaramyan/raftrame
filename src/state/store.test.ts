import { describe, expect, it } from 'vitest';
import { initialWorkspace } from '../domain/seeds';
import { StudioStore } from './store';
import { WorkspaceError, type Repository } from '../storage/workspace';
import type { Workspace } from '../domain/model';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function memoryRepository() {
  let document = initialWorkspace();
  const repository: Repository = {
    load: async () => structuredClone(document),
    save: async (workspace, revision) => {
      document = { ...structuredClone(workspace), revision: revision + 1 };
      return revision + 1;
    },
    reset: async () => {
      document = initialWorkspace();
      return document;
    },
    close: () => {},
  };
  return repository;
}
describe('save queue and refresh ownership', () => {
  it('saves a newer edit after an earlier in-flight snapshot without replacing it in memory', async () => {
    const repo = memoryRepository();
    const first = deferred<number>();
    const calls: { revision: number; name: string }[] = [];
    repo.save = async (workspace, revision) => {
      calls.push({ revision, name: workspace.projects[0]!.name });
      return calls.length === 1 ? first.promise : revision + 1;
    };
    const store = new StudioStore(
      async () => repo,
      () => null,
    );
    await store.initialize();
    store.edit((p) => ({ ...p, name: 'First edit' }));
    const saving = store.flush();
    store.edit((p) => ({ ...p, name: 'Second edit' }));
    first.resolve(1);
    await saving;
    expect(calls).toEqual([
      { revision: 0, name: 'First edit' },
      { revision: 1, name: 'Second edit' },
    ]);
    expect(store.snapshot().history!.present.name).toBe('Second edit');
    expect(store.snapshot().workspace!.revision).toBe(2);
    expect(store.snapshot().status).toBe('saved');
  });
  it('preserves a local edit that arrives while another tab’s document is being read', async () => {
    const repo = memoryRepository();
    const store = new StudioStore(
      async () => repo,
      () => null,
    );
    await store.initialize();
    const read = deferred<Workspace>();
    repo.load = () => read.promise;
    const loading = store.loadLatest();
    store.edit((p) => ({ ...p, name: 'Keep my edit' }));
    const remote = structuredClone(store.snapshot().workspace!);
    remote.revision = 1;
    remote.projects[0]!.name = 'Remote name';
    read.resolve(remote);
    await loading;
    expect(store.snapshot().history!.present.name).toBe('Keep my edit');
    expect(store.snapshot().status).toBe('conflict');
  });
  it('keeps rejected edits available and saves the same data on retry', async () => {
    const repo = memoryRepository();
    const original = repo.save;
    let fail = true;
    repo.save = async (...args) => {
      if (fail) {
        fail = false;
        throw new WorkspaceError('storage', 'Rejected write');
      }
      return original(...args);
    };
    const store = new StudioStore(
      async () => repo,
      () => null,
    );
    await store.initialize();
    store.edit((p) => ({ ...p, name: 'Unsaved but retained' }));
    await store.flush();
    expect(store.snapshot().status).toBe('error');
    expect(store.snapshot().history!.present.name).toBe('Unsaved but retained');
    await store.flush();
    expect(store.snapshot().status).toBe('saved');
    expect((await repo.load()).projects[0]!.name).toBe('Unsaved but retained');
  });
});

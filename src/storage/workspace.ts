import { initialWorkspace } from '../domain/seeds';
import { workspaceSchema, type Workspace } from '../domain/model';

export class WorkspaceError extends Error {
  constructor(
    public readonly kind: 'conflict' | 'corrupt' | 'storage',
    message: string,
    public readonly raw?: unknown,
  ) {
    super(message);
  }
}
export interface Repository {
  load: () => Promise<Workspace>;
  save: (workspace: Workspace, expectedRevision: number) => Promise<number>;
  reset: () => Promise<Workspace>;
  close: () => void;
}
export function openWorkspace(
  factory: IDBFactory = indexedDB,
  name = 'raftrame-studio',
): Promise<Repository> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('documents');
    request.onerror = () =>
      reject(new WorkspaceError('storage', 'Browser storage could not be opened.'));
    request.onblocked = () =>
      reject(new WorkspaceError('storage', 'Close older Raftrame tabs and retry.'));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      const transact = <T>(
        mode: IDBTransactionMode,
        action: (
          store: IDBObjectStore,
          finish: (value: T) => void,
          fail: (error: Error) => void,
        ) => void,
      ): Promise<T> =>
        new Promise((done, fail) => {
          const transaction = db.transaction('documents', mode);
          let value: T;
          let failure: Error | undefined;
          transaction.oncomplete = () => done(value);
          transaction.onabort = transaction.onerror = () =>
            fail(
              failure ??
                new WorkspaceError(
                  'storage',
                  'Your edit is in memory. Storage rejected the save; export a project copy or retry.',
                ),
            );
          action(
            transaction.objectStore('documents'),
            (result) => {
              value = result;
            },
            (error) => {
              failure = error;
              transaction.abort();
            },
          );
        });
      resolve({
        load: () =>
          transact('readwrite', (store, finish, fail) => {
            const read = store.get('workspace');
            read.onsuccess = () => {
              if (read.result === undefined) {
                const fresh = initialWorkspace();
                store.put(fresh, 'workspace');
                finish(fresh);
                return;
              }
              const parsed = workspaceSchema.safeParse(read.result);
              if (!parsed.success) {
                fail(
                  new WorkspaceError(
                    'corrupt',
                    'The saved workspace could not be read. Its original data has been preserved.',
                    read.result,
                  ),
                );
                return;
              }
              finish(parsed.data);
            };
          }),
        save: async (workspace, expectedRevision) => {
          const parsed = workspaceSchema.parse(workspace);
          return transact('readwrite', (store, finish, fail) => {
            const read = store.get('workspace');
            read.onsuccess = () => {
              const saved = workspaceSchema.safeParse(read.result);
              if (!saved.success) {
                fail(
                  new WorkspaceError(
                    'corrupt',
                    'The stored workspace changed into an unreadable document.',
                    read.result,
                  ),
                );
                return;
              }
              if (saved.data.revision !== expectedRevision || saved.data.epoch !== parsed.epoch) {
                fail(
                  new WorkspaceError(
                    'conflict',
                    'Another tab saved a newer workspace. Export your local project before loading its version.',
                  ),
                );
                return;
              }
              const revision = expectedRevision + 1;
              store.put({ ...parsed, revision }, 'workspace');
              finish(revision);
            };
          });
        },
        reset: () =>
          transact('readwrite', (store, finish) => {
            const fresh = initialWorkspace();
            store.put(fresh, 'workspace');
            finish(fresh);
          }),
        close: () => db.close(),
      });
    };
  });
}

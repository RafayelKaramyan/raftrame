import { projectSchema, type Project, type Workspace } from '../domain/model';
import { cloneProject, createProject } from '../domain/seeds';
import { commit, redo, startHistory, undo, type History } from '../domain/history';
import { openWorkspace, WorkspaceError, type Repository } from '../storage/workspace';

export interface StudioState {
  workspace: Workspace | null;
  history: History | null;
  selectedSceneId: string | null;
  status: 'loading' | 'saved' | 'saving' | 'error' | 'conflict' | 'corrupt';
  error: string;
  raw?: unknown;
}
export class StudioStore {
  private state: StudioState = {
    workspace: null,
    history: null,
    selectedSceneId: null,
    status: 'loading',
    error: '',
  };
  private listeners = new Set<() => void>();
  private repository: Repository | null = null;
  private pending = 0;
  private saved = 0;
  private saving = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private channel: BroadcastChannel | null = null;
  snapshot = (): StudioState => this.state;
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  private emit(state: StudioState): void {
    this.state = state;
    for (const fn of this.listeners) fn();
  }
  async initialize(): Promise<void> {
    try {
      this.repository = await openWorkspace();
      const workspace = await this.repository.load();
      this.adopt(workspace);
      if ('BroadcastChannel' in globalThis) {
        this.channel = new BroadcastChannel('raftrame-revisions');
        this.channel.onmessage = (event: MessageEvent<unknown>) => {
          if (
            typeof event.data !== 'number' ||
            event.data <= (this.state.workspace?.revision ?? -1)
          )
            return;
          if (this.pending !== this.saved || this.saving)
            this.emit({
              ...this.state,
              status: 'conflict',
              error:
                'Another tab saved a newer workspace. Export your local project before loading its version.',
            });
          else void this.loadLatest();
        };
      }
    } catch (error) {
      this.report(error);
    }
  }
  private adopt(workspace: Workspace): void {
    const project = workspace.projects.find((p) => p.id === workspace.activeId)!;
    this.pending = 0;
    this.saved = 0;
    this.emit({
      workspace,
      history: startHistory(project),
      selectedSceneId: project.scenes[0]!.id,
      status: 'saved',
      error: '',
    });
  }
  private report(error: unknown): void {
    const kind = error instanceof WorkspaceError ? error.kind : 'error';
    this.emit({
      ...this.state,
      status: kind === 'storage' ? 'error' : kind,
      error: error instanceof Error ? error.message : 'The workspace could not be saved.',
      raw: error instanceof WorkspaceError ? error.raw : undefined,
    });
  }
  selectScene = (id: string): void => {
    if (this.state.history?.present.scenes.some((s) => s.id === id))
      this.emit({ ...this.state, selectedSceneId: id });
  };
  edit = (transform: (project: Project) => Project): void => {
    const { history } = this.state;
    if (!history) return;
    const project = projectSchema.parse(transform(structuredClone(history.present)));
    if (JSON.stringify(project) === JSON.stringify(history.present)) return;
    this.applyHistory(commit(history, { ...project, updatedAt: new Date().toISOString() }));
  };
  undo = (): void => {
    if (this.state.history) this.applyHistory(undo(this.state.history));
  };
  redo = (): void => {
    if (this.state.history) this.applyHistory(redo(this.state.history));
  };
  private applyHistory(history: History): void {
    if (history === this.state.history || !this.state.workspace) return;
    const workspace = {
      ...this.state.workspace,
      projects: this.state.workspace.projects.map((p) =>
        p.id === history.present.id ? history.present : p,
      ),
    };
    const selectedSceneId = history.present.scenes.some((s) => s.id === this.state.selectedSceneId)
      ? this.state.selectedSceneId
      : history.present.scenes[0]!.id;
    this.emit({ ...this.state, history, workspace, selectedSceneId });
    this.changed();
  }
  private changed(): void {
    this.pending++;
    if (['conflict', 'corrupt', 'error'].includes(this.state.status)) return;
    this.emit({ ...this.state, status: 'saving' });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 250);
  }
  flush = async (): Promise<void> => {
    if (
      this.saving ||
      !this.repository ||
      !this.state.workspace ||
      ['conflict', 'corrupt'].includes(this.state.status)
    )
      return;
    this.saving = true;
    this.emit({ ...this.state, status: 'saving', error: '' });
    try {
      while (this.saved < this.pending) {
        const generation = this.pending;
        const workspace = this.state.workspace!;
        const revision = await this.repository.save(workspace, workspace.revision);
        this.saved = generation;
        this.emit({ ...this.state, workspace: { ...this.state.workspace!, revision } });
        this.channel?.postMessage(revision);
      }
      this.emit({ ...this.state, status: 'saved' });
    } catch (error) {
      this.report(error);
    } finally {
      this.saving = false;
    }
  };
  open = (id: string): void => {
    const workspace = this.state.workspace;
    const project = workspace?.projects.find((p) => p.id === id);
    if (!workspace || !project) return;
    this.emit({
      ...this.state,
      workspace: { ...workspace, activeId: id },
      history: startHistory(project),
      selectedSceneId: project.scenes[0]!.id,
    });
    this.changed();
  };
  add = (source?: Project): string | null => {
    const workspace = this.state.workspace;
    if (!workspace || workspace.projects.length >= 24) return null;
    const project = source ? cloneProject(source, source.name) : createProject();
    if (!source) project.name = 'Untitled match';
    this.emit({
      ...this.state,
      workspace: { ...workspace, activeId: project.id, projects: [...workspace.projects, project] },
      history: startHistory(project),
      selectedSceneId: project.scenes[0]!.id,
    });
    this.changed();
    return project.id;
  };
  remove = (id: string): void => {
    const workspace = this.state.workspace;
    if (!workspace || workspace.projects.length <= 1) return;
    const projects = workspace.projects.filter((p) => p.id !== id);
    const activeId = workspace.activeId === id ? projects[0]!.id : workspace.activeId;
    const project = projects.find((p) => p.id === activeId)!;
    this.emit({
      ...this.state,
      workspace: { ...workspace, projects, activeId },
      history: startHistory(project),
      selectedSceneId: project.scenes[0]!.id,
    });
    this.changed();
  };
  loadLatest = async (): Promise<void> => {
    clearTimeout(this.timer);
    try {
      if (this.repository) this.adopt(await this.repository.load());
    } catch (error) {
      this.report(error);
    }
  };
  reset = async (): Promise<void> => {
    try {
      if (this.repository) this.adopt(await this.repository.reset());
    } catch (error) {
      this.report(error);
    }
  };
}
export const studioStore = new StudioStore();

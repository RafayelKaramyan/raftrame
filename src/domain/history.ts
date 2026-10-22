import type { Project } from './model';
export interface History {
  past: Project[];
  present: Project;
  future: Project[];
}
export function startHistory(project: Project): History {
  return { past: [], present: project, future: [] };
}
export function commit(history: History, project: Project): History {
  if (JSON.stringify(history.present) === JSON.stringify(project)) return history;
  return { past: [...history.past.slice(-49), history.present], present: project, future: [] };
}
export function undo(history: History): History {
  const project = history.past.at(-1);
  return project
    ? {
        past: history.past.slice(0, -1),
        present: project,
        future: [history.present, ...history.future],
      }
    : history;
}
export function redo(history: History): History {
  const project = history.future[0];
  return project
    ? {
        past: [...history.past, history.present],
        present: project,
        future: history.future.slice(1),
      }
    : history;
}

import type { Project, Scene, SceneKind, Workspace } from './model';
import { newId } from './id';

export function createScene(kind: SceneKind): Scene {
  return {
    id: newId(),
    kind,
    durationMs: kind === 'scoreboard' ? 9000 : 6000,
    entranceMs: 700,
    x: 0,
    y: 0,
  };
}
export function createProject(theme: Project['theme'] = 'electric'): Project {
  return {
    id: newId(),
    name: 'Northstar / Eastport',
    competition: 'The evening league',
    venue: 'Northstar Stadium · Matchday 08',
    home: { name: 'Northstar FC', short: 'NOR', color: '#ff593c', score: 2 },
    away: { name: 'Eastport United', short: 'EAS', color: '#86b7ed', score: 1 },
    scorer: 'Adrian Cole',
    minute: 67,
    lineup: [
      'J. Mercer',
      'L. Reid',
      'M. Hayes',
      'O. Clarke',
      'T. Ellis',
      'N. Brooks',
      'E. Lane',
      'R. West',
      'A. Cole',
      'F. Moss',
      'K. Vale',
    ],
    theme,
    scenes: (['matchup', 'scoreboard', 'lineup', 'goal'] as SceneKind[]).map(createScene),
    updatedAt: new Date().toISOString(),
  };
}
export function initialWorkspace(): Workspace {
  const project = createProject();
  return { version: 1, epoch: newId(), revision: 0, activeId: project.id, projects: [project] };
}
export function cloneProject(project: Project, name = `${project.name} — copy`): Project {
  return {
    ...structuredClone(project),
    id: newId(),
    name: name.slice(0, 80),
    scenes: project.scenes.map((scene) => ({ ...scene, id: newId() })),
    updatedAt: new Date().toISOString(),
  };
}

import { z } from 'zod';

export const SCENE_KINDS = ['matchup', 'scoreboard', 'lineup', 'goal'] as const;
export type SceneKind = (typeof SCENE_KINDS)[number];
export const sceneLabels: Record<SceneKind, string> = {
  matchup: 'Match opener',
  scoreboard: 'Scoreboard',
  lineup: 'Starting eleven',
  goal: 'Goal moment',
};

const color = z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a six-digit hex color.');
const shortText = z.string().trim().min(1).max(40);
const teamSchema = z
  .object({
    name: shortText,
    short: z.string().trim().min(2).max(4),
    color,
    score: z.number().int().min(0).max(99),
  })
  .strict();
export const sceneSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(SCENE_KINDS),
    durationMs: z.number().int().min(2400).max(15000),
    entranceMs: z.number().int().min(0).max(1200),
    x: z.number().int().min(-200).max(200),
    y: z.number().int().min(-140).max(140),
  })
  .strict();
export const projectSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(80),
    competition: shortText,
    venue: z.string().trim().min(1).max(60),
    home: teamSchema,
    away: teamSchema,
    scorer: shortText,
    minute: z.number().int().min(1).max(130),
    lineup: z.array(shortText).length(11),
    theme: z.enum(['electric', 'paper', 'ember']),
    scenes: z.array(sceneSchema).min(1).max(12),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((project, ctx) => {
    if (new Set(project.scenes.map((s) => s.id)).size !== project.scenes.length) {
      ctx.addIssue({ code: 'custom', path: ['scenes'], message: 'Scene IDs must be unique.' });
    }
  });
export type Project = z.infer<typeof projectSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type Team = Project['home'];
export const workspaceSchema = z
  .object({
    version: z.literal(1),
    epoch: z.string().uuid().default('00000000-0000-4000-8000-000000000000'),
    revision: z.number().int().nonnegative(),
    activeId: z.string().uuid(),
    projects: z.array(projectSchema).min(1).max(24),
  })
  .strict()
  .superRefine((workspace, ctx) => {
    const ids = workspace.projects.map((p) => p.id);
    if (!ids.includes(workspace.activeId) || new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'Workspace project references are invalid.' });
    }
  });
export type Workspace = z.infer<typeof workspaceSchema>;
export const packageSchema = z
  .object({
    format: z.literal('raftrame-project'),
    version: z.literal(1),
    project: projectSchema,
  })
  .strict();

export const palettes = {
  electric: {
    background: '#11163f',
    ink: '#ffffff',
    muted: '#a9b1dd',
    accent: '#ff593c',
    panel: '#212956',
  },
  paper: {
    background: '#eae8e0',
    ink: '#18213b',
    muted: '#555d70',
    accent: '#b73320',
    panel: '#dcdad2',
  },
  ember: {
    background: '#2c1420',
    ink: '#fff1df',
    muted: '#d7afbb',
    accent: '#ffb54f',
    panel: '#492335',
  },
} as const;

export function totalDuration(project: Project): number {
  return project.scenes.reduce((total, scene) => total + scene.durationMs, 0);
}
export function sceneStart(project: Project, index: number): number {
  return project.scenes.slice(0, index).reduce((total, scene) => total + scene.durationMs, 0);
}
export function locateScene(
  project: Project,
  timeMs: number,
): { scene: Scene; index: number; localMs: number } {
  const bounded = Math.max(
    0,
    Math.min(Number.isFinite(timeMs) ? timeMs : 0, totalDuration(project)),
  );
  let start = 0;
  for (let index = 0; index < project.scenes.length; index++) {
    const scene = project.scenes[index]!;
    if (bounded < start + scene.durationMs || index === project.scenes.length - 1) {
      return { scene, index, localMs: bounded - start };
    }
    start += scene.durationMs;
  }
  throw new Error('A project needs at least one scene.');
}
export function timecode(ms: number): string {
  const ticks = Math.max(0, Math.round(ms / 100));
  return `${String(Math.floor(ticks / 600)).padStart(2, '0')}:${String(Math.floor(ticks / 10) % 60).padStart(2, '0')}.${ticks % 10}`;
}
export function parseProjectFile(text: string): Project {
  if (new TextEncoder().encode(text).length > 1_000_000)
    throw new Error('Project files must be smaller than 1 MB.');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  const result = packageSchema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      `Invalid project: ${issue?.path.join('.') || 'format'} — ${issue?.message ?? 'unsupported document'}`,
    );
  }
  return result.data.project;
}
export function serializeProject(project: Project): string {
  return JSON.stringify(
    { format: 'raftrame-project', version: 1, project: projectSchema.parse(project) },
    null,
    2,
  );
}

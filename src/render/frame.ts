import { locateScene, palettes, type Project } from '../domain/model';

interface Base {
  id: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
}
export type Shape =
  | (Base & { type: 'rect'; width: number; height: number; radius?: number })
  | (Base & { type: 'circle'; radius: number; stroke?: number })
  | (Base & { type: 'poly'; points: number[] })
  | (Base & {
      type: 'text';
      text: string;
      size: number;
      font: 'display' | 'sans' | 'mono';
      align?: 'left' | 'center' | 'right';
    });
export interface Frame {
  shapes: Shape[];
  sceneId: string;
  title: string;
}
export const WIDTH = 1920;
export const HEIGHT = 1080;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (t: number) => 1 - (1 - clamp(t)) ** 4;

// No renderer state, elapsed-frame accumulation or random values enter the scene evaluation.
export function evaluateFrame(project: Project, timeMs: number, reducedMotion = false): Frame {
  const { scene, localMs } = locateScene(project, timeMs);
  const p = palettes[project.theme];
  const shapes: Shape[] = [];
  const enter = (delay = 0) =>
    reducedMotion || scene.entranceMs === 0 ? 1 : ease((localMs - delay) / scene.entranceMs);
  const base = (id: string, x: number, y: number, color: string, alpha = 1): Base => ({
    id,
    x,
    y,
    color,
    alpha,
  });
  const rect = (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    alpha = 1,
    radius = 0,
  ) => shapes.push({ ...base(id, x, y, color, alpha), type: 'rect', width, height, radius });
  const circle = (
    id: string,
    x: number,
    y: number,
    radius: number,
    color: string,
    alpha = 1,
    stroke?: number,
  ) => shapes.push({ ...base(id, x, y, color, alpha), type: 'circle', radius, stroke });
  const text = (
    id: string,
    value: string,
    x: number,
    y: number,
    size: number,
    color = p.ink as string,
    font: 'display' | 'sans' | 'mono' = 'display',
    align: 'left' | 'center' | 'right' = 'left',
    alpha = 1,
  ) =>
    shapes.push({ ...base(id, x, y, color, alpha), type: 'text', text: value, size, font, align });
  const badge = (
    id: string,
    x: number,
    y: number,
    color: string,
    short: string,
    scale = 1,
    alpha = 1,
  ) => {
    circle(`${id}-outer`, x, y, 92 * scale, color, alpha, 2 * scale);
    shapes.push({
      ...base(`${id}-shield`, x, y, color, alpha),
      type: 'poly',
      points: [
        -54 * scale,
        -63 * scale,
        54 * scale,
        -63 * scale,
        54 * scale,
        24 * scale,
        0,
        74 * scale,
        -54 * scale,
        24 * scale,
      ],
    });
    text(
      `${id}-short`,
      short,
      x,
      y - 28 * scale,
      50 * scale,
      project.theme === 'paper' ? '#ffffff' : '#10153d',
      'display',
      'center',
      alpha,
    );
    rect(
      `${id}-bar`,
      x - 17 * scale,
      y + 33 * scale,
      34 * scale,
      5 * scale,
      project.theme === 'paper' ? '#ffffff' : '#10153d',
      alpha,
    );
  };

  rect('background', 0, 0, WIDTH, HEIGHT, p.background);
  for (let i = 1; i < 16; i++) rect(`grid-x-${i}`, i * 120, 0, 1, HEIGHT, p.ink, 0.035);
  for (let i = 1; i < 9; i++) rect(`grid-y-${i}`, 0, i * 120, WIDTH, 1, p.ink, 0.035);
  circle('orbit-1', 1740, 160, 450, p.muted, 0.12, 1);
  circle('orbit-2', 1740, 160, 360, p.muted, 0.1, 1);
  text('ghost-round', '08', 1860, 180, 700, p.muted, 'display', 'right', 0.055);
  rect('top-accent', 96, 91, 12, 12, p.accent);
  text('competition', project.competition.toUpperCase(), 130, 82, 27, p.ink, 'mono');
  text('channel', 'RF / MOTION SERIES', 1824, 82, 24, p.muted, 'mono', 'right');
  rect('bottom-rule', 96, 941, 1728, 1, p.muted, 0.35);
  text('venue', project.venue.toUpperCase(), 96, 977, 23, p.muted, 'mono');
  text('series', 'THE GAME. IN EVERY FRAME.', 1824, 977, 23, p.muted, 'mono', 'right');
  const contentStart = shapes.length;
  const homeWord = project.home.name.toUpperCase().split(' ')[0] ?? project.home.short;
  const awayWord = project.away.name.toUpperCase().split(' ')[0] ?? project.away.short;

  if (scene.kind === 'matchup') {
    const a = enter(60),
      b = enter(180),
      c = enter(280);
    text('eyebrow', 'THIS IS MATCHDAY', 960, 216, 26, p.muted, 'mono', 'center', a);
    badge('home', 485 - (1 - a) * 100, 440, project.home.color, project.home.short, 1.2, a);
    badge('away', 1435 + (1 - b) * 100, 440, project.away.color, project.away.short, 1.2, b);
    text(
      'home-name',
      homeWord,
      485,
      610 + (1 - a) * 70,
      Math.min(146, (900 / Math.max(5, homeWord.length)) * 2),
      p.ink,
      'display',
      'center',
      a,
    );
    text(
      'away-name',
      awayWord,
      1435,
      610 + (1 - b) * 70,
      Math.min(146, (900 / Math.max(5, awayWord.length)) * 2),
      p.ink,
      'display',
      'center',
      b,
    );
    text('home-sub', project.home.name.toUpperCase(), 485, 788, 24, p.muted, 'mono', 'center', a);
    text('away-sub', project.away.name.toUpperCase(), 1435, 788, 24, p.muted, 'mono', 'center', b);
    shapes.push({
      ...base('versus-slash', 960, 411, p.accent, c),
      type: 'poly',
      points: [18, -76, 45, -76, -18, 140, -45, 140],
    });
    text('versus', 'VS', 960, 665, 29, p.accent, 'mono', 'center', c);
  } else if (scene.kind === 'scoreboard') {
    const a = enter(),
      b = enter(160);
    rect('live-pill', 843, 203, 234, 54, p.accent, a, 27);
    text(
      'minute',
      `${project.minute}′  ·  SECOND HALF`,
      960,
      214,
      22,
      '#11163f',
      'mono',
      'center',
      a,
    );
    badge('home', 380 - (1 - a) * 80, 492, project.home.color, project.home.short, 0.9, a);
    badge('away', 1540 + (1 - a) * 80, 492, project.away.color, project.away.short, 0.9, a);
    const homeSize = project.home.score > 9 ? 310 : 470;
    const awaySize = project.away.score > 9 ? 310 : 470;
    text(
      'home-score',
      String(project.home.score),
      790,
      297 + (470 - homeSize) / 2 + (1 - b) * 100,
      homeSize,
      p.ink,
      'display',
      'center',
      b,
    );
    text(
      'away-score',
      String(project.away.score),
      1130,
      297 + (470 - awaySize) / 2 + (1 - b) * 100,
      awaySize,
      p.ink,
      'display',
      'center',
      b,
    );
    rect('score-separator', 943, 523, 34, 8, p.accent, b);
    text(
      'home-name',
      project.home.name.toUpperCase(),
      380,
      660,
      Math.min(44, 620 / (project.home.name.length * 0.55)),
      p.ink,
      'display',
      'center',
      a,
    );
    text(
      'away-name',
      project.away.name.toUpperCase(),
      1540,
      660,
      Math.min(44, 620 / (project.away.name.length * 0.55)),
      p.ink,
      'display',
      'center',
      a,
    );
    text('score-caption', 'EVERY SECOND COUNTS.', 960, 823, 27, p.muted, 'mono', 'center', b);
  } else if (scene.kind === 'lineup') {
    const a = enter();
    text('lineup-title', 'THE STARTING', 120, 261 + (1 - a) * 50, 122, p.ink, 'display', 'left', a);
    text('lineup-title2', 'ELEVEN.', 120, 383 + (1 - a) * 50, 192, p.accent, 'display', 'left', a);
    text(
      'lineup-team',
      project.home.name.toUpperCase(),
      126,
      627,
      Math.min(30, 690 / (project.home.name.length * 0.6)),
      p.muted,
      'mono',
      'left',
      a,
    );
    badge('home', 235, 796, project.home.color, project.home.short, 0.6, a);
    const positions = [
      [1370, 800],
      [1070, 650],
      [1270, 650],
      [1470, 650],
      [1670, 650],
      [1120, 470],
      [1370, 470],
      [1620, 470],
      [1120, 280],
      [1370, 250],
      [1620, 280],
    ];
    rect('pitch-bg', 945, 185, 824, 700, p.panel, 0.6, 16);
    rect('pitch-top', 980, 215, 754, 1, p.muted, 0.4);
    rect('pitch-bottom', 980, 850, 754, 1, p.muted, 0.4);
    rect('pitch-left', 980, 215, 1, 636, p.muted, 0.4);
    rect('pitch-right', 1734, 215, 1, 636, p.muted, 0.4);
    rect('halfway', 980, 530, 754, 1, p.muted, 0.2);
    circle('center-circle', 1357, 530, 88, p.muted, 0.2, 1);
    positions.forEach(([x, y], i) => {
      const n = enter(i * 42);
      circle(`player-${i}`, x!, y! + (1 - n) * 35, 25, project.home.color, n);
      text(
        `number-${i}`,
        String(i + 1).padStart(2, '0'),
        x!,
        y! - 19 + (1 - n) * 35,
        29,
        '#11163f',
        'display',
        'center',
        n,
      );
      text(
        `name-${i}`,
        project.lineup[i]!.toUpperCase().slice(0, 17),
        x!,
        y! + 36 + (1 - n) * 35,
        19,
        p.ink,
        'mono',
        'center',
        n,
      );
    });
  } else {
    const a = enter(),
      b = enter(140);
    rect('goal-stripe', 96, 210, 1728 * a, 12, p.accent);
    text('goal-title', 'GOOOAL!', 960 - (1 - a) * 260, 230, 410, p.accent, 'display', 'center', a);
    text(
      'scorer',
      project.scorer.toUpperCase(),
      960,
      680 + (1 - b) * 60,
      Math.min(104, 1640 / (project.scorer.length * 0.55)),
      p.ink,
      'display',
      'center',
      b,
    );
    text(
      'goal-minute',
      `${project.home.name.toUpperCase()}  /  ${project.minute}′`,
      960,
      817,
      28,
      p.muted,
      'mono',
      'center',
      b,
    );
    for (let i = 0; i < 12; i++) {
      const t = reducedMotion ? 0.7 : clamp((localMs - 180) / 1400);
      const angle = (i * Math.PI) / 6;
      rect(
        `confetti-${i}`,
        960 + Math.cos(angle) * (420 + t * 340),
        490 + Math.sin(angle) * (160 + t * 230),
        8,
        22,
        i % 2 ? p.accent : p.ink,
        (1 - t) * b * 0.7,
      );
    }
  }
  for (let i = contentStart; i < shapes.length; i++) {
    shapes[i]!.x += scene.x;
    shapes[i]!.y += scene.y;
  }
  return {
    shapes,
    sceneId: scene.id,
    title: `${project.home.name} versus ${project.away.name} — ${scene.kind}`,
  };
}

import { describe, expect, it } from 'vitest';
import {
  locateScene,
  parseProjectFile,
  projectSchema,
  serializeProject,
  timecode,
  totalDuration,
} from './model';
import { cloneProject, createProject } from './seeds';
import { commit, redo, startHistory, undo } from './history';
import { evaluateFrame } from '../render/frame';
import { frameToSvg } from '../render/svg';
import { newId } from './id';

describe('portable project contracts', () => {
  it('generates version-four identities without relying on a secure-context UUID API', () => {
    const ids = Array.from({ length: 100 }, newId);
    expect(new Set(ids).size).toBe(100);
    expect(
      ids.every((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id),
      ),
    ).toBe(true);
  });
  it('round-trips the complete editable project', () => {
    const p = createProject();
    expect(parseProjectFile(serializeProject(p))).toEqual(p);
  });
  it('creates a separate identity for an imported or duplicated project', () => {
    const p = createProject();
    const copy = cloneProject(p);
    expect(copy.id).not.toBe(p.id);
    expect(copy.scenes.every((s) => !p.scenes.some((o) => o.id === s.id))).toBe(true);
    expect(copy.home).toEqual(p.home);
  });
  it('rejects unsupported versions', () => {
    const v = JSON.parse(serializeProject(createProject()));
    v.version = 2;
    expect(() => parseProjectFile(JSON.stringify(v))).toThrow(/Invalid project/);
  });
  it('rejects malformed JSON', () => {
    expect(() => parseProjectFile('{broken')).toThrow('valid JSON');
  });
  it('rejects documents over the UTF-8 byte budget before parsing', () => {
    expect(() => parseProjectFile('ֆ'.repeat(500001))).toThrow('1 MB');
  });
  it('rejects executable or unknown fields rather than preserving them', () => {
    const p = { ...createProject(), script: 'alert(1)' };
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it('rejects duplicate scene identities', () => {
    const p = createProject();
    p.scenes[1]!.id = p.scenes[0]!.id;
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it.each([[], Array.from({ length: 13 }, () => createProject().scenes[0]!)])(
    'rejects an unusable scene count',
    (scenes) => {
      expect(projectSchema.safeParse({ ...createProject(), scenes }).success).toBe(false);
    },
  );
  it('rejects nonfinite positions and fractional scores', () => {
    const p = createProject();
    p.scenes[0]!.x = NaN;
    p.home.score = 2.1;
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
  it('requires eleven named players', () => {
    const p = createProject();
    p.lineup.pop();
    expect(projectSchema.safeParse(p).success).toBe(false);
  });
});
describe('timeline and reversible editing', () => {
  it('resolves exact cuts into the following scene', () => {
    const p = createProject();
    expect(locateScene(p, p.scenes[0]!.durationMs).index).toBe(1);
    expect(locateScene(p, totalDuration(p)).index).toBe(3);
  });
  it('clamps invalid and negative playheads to a usable frame', () => {
    const p = createProject();
    expect(locateScene(p, -200).localMs).toBe(0);
    expect(locateScene(p, NaN).index).toBe(0);
    expect(locateScene(p, Infinity).index).toBe(0);
  });
  it('formats rounded timecodes through minute boundaries', () => {
    expect(timecode(59999)).toBe('01:00.0');
    expect(timecode(-1)).toBe('00:00.0');
    expect(timecode(12500)).toBe('00:12.5');
  });
  it('undoes and redoes without mutating older snapshots', () => {
    const p = createProject();
    const h = commit(startHistory(p), { ...p, name: 'The final' });
    expect(undo(h).present.name).toBe(p.name);
    expect(redo(undo(h)).present.name).toBe('The final');
    expect(p.name).toBe('Northstar / Eastport');
  });
  it('discards the redo branch after a different edit', () => {
    const p = createProject();
    const h = undo(commit(startHistory(p), { ...p, name: 'First' }));
    expect(commit(h, { ...p, name: 'Second' }).future).toEqual([]);
  });
  it('bounds history and ignores unchanged edits', () => {
    let h = startHistory(createProject());
    expect(commit(h, h.present)).toBe(h);
    for (let i = 0; i < 70; i++) h = commit(h, { ...h.present, name: `Edit ${i}` });
    expect(h.past).toHaveLength(50);
  });
});
describe('renderer-independent motion evaluation', () => {
  it('reproduces a frame after arbitrary forward and backward seeks', () => {
    const p = createProject();
    const first = evaluateFrame(p, 410);
    evaluateFrame(p, 20100);
    evaluateFrame(p, 0);
    expect(evaluateFrame(p, 410)).toEqual(first);
  });
  it('does not change the source document during evaluation', () => {
    const p = createProject();
    const before = serializeProject(p);
    for (let i = 0; i < 20; i++) evaluateFrame(p, i * 250);
    expect(serializeProject(p)).toBe(before);
  });
  it('keeps every scene fully composed with reduced motion', () => {
    const p = createProject();
    for (const s of p.scenes) {
      const single = { ...p, scenes: [s] };
      const frame = evaluateFrame(single, 0, true);
      expect(
        frame.shapes
          .filter((n) => n.type === 'text' && !n.id.startsWith('ghost'))
          .every((n) => n.alpha === 1),
      ).toBe(true);
    }
  });
  it('keeps overlays fixed while moving the composition', () => {
    const p = createProject();
    const original = evaluateFrame(p, 2200);
    p.scenes[0]!.x = 100;
    const moved = evaluateFrame(p, 2200);
    expect(
      moved.shapes.find((n) => n.id === 'home-name')!.x -
        original.shapes.find((n) => n.id === 'home-name')!.x,
    ).toBe(100);
    expect(moved.shapes.find((n) => n.id === 'competition')!.x).toBe(
      original.shapes.find((n) => n.id === 'competition')!.x,
    );
  });
  it('escapes text before vector rendering', () => {
    const p = createProject();
    p.competition = '<script>alert("x")</script>';
    const svg = frameToSvg(evaluateFrame(p, 2000));
    expect(svg).not.toContain('<SCRIPT>');
    expect(svg).toContain('&lt;SCRIPT&gt;');
    expect(svg).not.toContain('<script>');
  });
});

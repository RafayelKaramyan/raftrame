import { useEffect, useRef, useState } from 'react';
import { Move, Scan, Sparkles } from 'lucide-react';
import { evaluateFrame } from '../render/frame';
import { frameToSvg } from '../render/svg';
import { locateScene, type Project, type Scene } from '../domain/model';
import type { Transport } from '../domain/transport';
import { IconButton } from './Primitives';

export function Stage({
  project,
  transport,
  reducedMotion,
  focus,
  onFocus,
  onPosition,
  onSelect,
}: {
  project: Project;
  transport: Transport;
  reducedMotion: boolean;
  focus: boolean;
  onFocus: () => void;
  onPosition: (scene: Scene, x: number, y: number) => void;
  onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<Awaited<
    ReturnType<typeof import('../render/pixi').createRenderer>
  > | null>(null);
  const latest = useRef({ project, reducedMotion });
  const drag = useRef<{
    scene: Scene;
    x: number;
    y: number;
    dx: number;
    dy: number;
    moved: boolean;
  } | null>(null);
  const [backend, setBackend] = useState<'loading' | 'webgl' | 'svg'>('loading');
  const [guides, setGuides] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const fallback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    latest.current = { project, reducedMotion };
  }, [project, reducedMotion]);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const draw = () => {
      const frame = evaluateFrame(
        latest.current.project,
        transport.snapshot().timeMs,
        latest.current.reducedMotion,
      );
      if (renderer.current) renderer.current.draw(frame);
      else if (fallback.current) fallback.current.innerHTML = frameToSvg(frame);
    };
    const unsubscribe = transport.subscribeFrame(draw);
    draw();
    void (async () => {
      try {
        await document.fonts.ready;
        const { createRenderer } = await import('../render/pixi');
        if (cancelled || !host.current) return;
        const box = host.current.getBoundingClientRect();
        const engine = await createRenderer(host.current, box.width, box.height);
        if (cancelled) {
          engine.destroy();
          return;
        }
        renderer.current = engine;
        const contextLost = (event: Event) => {
          event.preventDefault();
          renderer.current = null;
          engine.canvas.style.visibility = 'hidden';
          setBackend('svg');
          draw();
        };
        engine.canvas.addEventListener('webglcontextlost', contextLost);
        dispose = () => {
          engine.canvas.removeEventListener('webglcontextlost', contextLost);
          engine.destroy();
        };
        setBackend('webgl');
        draw();
      } catch {
        if (!cancelled) {
          setBackend('svg');
          draw();
        }
      }
    })();
    return () => {
      cancelled = true;
      unsubscribe();
      dispose?.();
      renderer.current = null;
    };
  }, [transport]);
  useEffect(() => {
    const frame = evaluateFrame(project, transport.snapshot().timeMs, reducedMotion);
    if (renderer.current) renderer.current.draw(frame);
    else if (fallback.current) fallback.current.innerHTML = frameToSvg(frame);
  }, [project, reducedMotion, transport]);
  const positionFromKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!moveMode || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
      return;
    event.preventDefault();
    transport.pause();
    const scene = locateScene(project, transport.snapshot().timeMs).scene;
    const step = event.shiftKey ? 10 : 2;
    onPosition(
      scene,
      scene.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
      scene.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0),
    );
  };
  return (
    <section className={`stage-panel ${focus ? 'is-focus' : ''}`} aria-label="Motion preview">
      <div className="stage-heading">
        <span>
          <i /> PROGRAM PREVIEW{' '}
          <span className="stage-renderer">
            {backend === 'webgl' ? 'WEBGL' : backend === 'svg' ? 'VECTOR' : 'LOADING'}
          </span>
        </span>
        <div>
          <button
            className={moveMode ? 'stage-tool selected' : 'stage-tool'}
            aria-pressed={moveMode}
            onClick={() => setMoveMode(!moveMode)}
          >
            <Move size={13} /> Move composition
          </button>
          <button
            className={guides ? 'stage-tool selected' : 'stage-tool'}
            aria-pressed={guides}
            onClick={() => setGuides(!guides)}
          >
            Safe area
          </button>
          <IconButton label={focus ? 'Exit focus view' : 'Focus view'} onClick={onFocus}>
            <Scan size={16} />
          </IconButton>
        </div>
      </div>
      <div
        className={`stage-viewport ${moveMode ? 'move-mode' : ''}`}
        tabIndex={moveMode ? 0 : undefined}
        role={moveMode ? 'group' : undefined}
        aria-label={
          moveMode
            ? 'Move active scene. Use arrow keys, or Shift and arrow keys for larger steps.'
            : undefined
        }
        onKeyDown={positionFromKey}
        onPointerDown={(event) => {
          if (!moveMode || event.button !== 0) return;
          transport.pause();
          const scene = locateScene(project, transport.snapshot().timeMs).scene;
          onSelect(scene.id);
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { scene, x: event.clientX, y: event.clientY, dx: 0, dy: 0, moved: false };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const box = event.currentTarget.getBoundingClientRect();
          const dx = Math.round(((event.clientX - drag.current.x) * 1920) / box.width);
          const dy = Math.round(((event.clientY - drag.current.y) * 1080) / box.height);
          drag.current.dx = dx;
          drag.current.dy = dy;
          drag.current.moved = Math.abs(dx) + Math.abs(dy) > 4;
          const preview = structuredClone(project);
          const scene = preview.scenes.find((s) => s.id === drag.current!.scene.id)!;
          scene.x = Math.max(-200, Math.min(200, scene.x + dx));
          scene.y = Math.max(-140, Math.min(140, scene.y + dy));
          const frame = evaluateFrame(preview, transport.snapshot().timeMs, reducedMotion);
          if (renderer.current) renderer.current.draw(frame);
          else if (fallback.current) fallback.current.innerHTML = frameToSvg(frame);
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (d?.moved) onPosition(d.scene, d.scene.x + d.dx, d.scene.y + d.dy);
          else if (d) transport.seek(transport.snapshot().timeMs);
        }}
        onPointerCancel={() => {
          drag.current = null;
          transport.seek(transport.snapshot().timeMs);
        }}
      >
        <div
          ref={fallback}
          className={`stage-vector ${backend === 'webgl' ? 'concealed' : ''}`}
          aria-hidden="true"
        />
        <div ref={host} className="stage-canvas" />
        {guides && (
          <div className="safe-area" aria-hidden="true">
            <span>90% TITLE SAFE</span>
          </div>
        )}
        <span className="sr-only">
          {project.home.name} versus {project.away.name}. Score {project.home.score} to{' '}
          {project.away.score}. {project.scorer}, minute {project.minute}. The editable scene
          content is also available in the inspector.
        </span>
      </div>
      <div className="stage-foot">
        <span>
          <Sparkles size={13} />
          {moveMode
            ? 'Drag the composition · Arrow keys to fine-tune'
            : reducedMotion
              ? 'Reduced motion · complete compositions'
              : 'Every moment, intentionally composed.'}
        </span>
        <span>
          1920 × 1080 <b>16:9</b>
        </span>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Film,
  FolderOpen,
  Plus,
  Redo2,
  Undo2,
  Upload,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  locateScene,
  parseProjectFile,
  sceneLabels,
  sceneStart,
  serializeProject,
  timecode,
  totalDuration,
  SCENE_KINDS,
  type Scene,
  type SceneKind,
} from '../domain/model';
import { createScene } from '../domain/seeds';
import { newId } from '../domain/id';
import { Transport } from '../domain/transport';
import { useReducedMotion, useStudio } from '../state/hooks';
import { studioStore } from '../state/store';
import { evaluateFrame } from '../render/frame';
import { framePng } from '../render/export';
import { Dialog, Field, IconButton } from '../ui/Primitives';
import { downloadFile } from '../ui/download';
import { Stage } from '../ui/Stage';
import { FramePreview } from '../ui/FramePreview';
import { Inspector } from '../ui/Inspector';
import { Timeline } from '../ui/Timeline';

const descriptions: Record<SceneKind, string> = {
  matchup: 'Two sides. One stage. Set the tone.',
  scoreboard: 'Keep the score front and center.',
  lineup: 'Let your starting eleven take their places.',
  goal: 'A moment worth making some noise for.',
};
export default function Studio() {
  const state = useStudio();
  const project = state.history!.present;
  const selected = project.scenes.find((s) => s.id === state.selectedSceneId) ?? project.scenes[0]!;
  const transport = useMemo(() => new Transport(), []);
  const reducedMotion = useReducedMotion();
  const [focus, setFocus] = useState(false);
  const [dialog, setDialog] = useState<'add' | 'export' | 'rename' | 'delete' | null>(null);
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    transport.setDuration(totalDuration(project));
  }, [transport, project]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      const target = event.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) studioStore.redo();
        else studioStore.undo();
      }
      if (event.code === 'Space' && !target.closest('button,a')) {
        event.preventDefault();
        transport.toggle();
      }
      if (event.key === 'Escape') setFocus(false);
    };
    const visibility = () => {
      if (document.hidden) {
        transport.pause();
        void studioStore.flush();
      }
    };
    window.addEventListener('keydown', keyboard);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      transport.destroy();
      window.removeEventListener('keydown', keyboard);
      document.removeEventListener('visibilitychange', visibility);
      void studioStore.flush();
    };
  }, [transport]);
  useEffect(() => {
    if (reducedMotion) transport.pause();
  }, [reducedMotion, transport]);
  const choose = (id: string) => {
    const index = project.scenes.findIndex((s) => s.id === id);
    transport.pause();
    transport.seek(
      sceneStart(project, index) + Math.min(1500, project.scenes[index]!.durationMs / 2),
    );
    studioStore.selectScene(id);
  };
  const openDialog = (next: typeof dialog) => {
    transport.pause();
    setDialog(next);
    setMessage('');
  };
  const addScene = (kind: SceneKind) => {
    if (project.scenes.length >= 12) return;
    const scene = createScene(kind);
    studioStore.edit((p) => ({ ...p, scenes: [...p.scenes, scene] }));
    studioStore.selectScene(scene.id);
    transport.setDuration(totalDuration(project) + scene.durationMs);
    transport.seek(totalDuration(project) + 1500);
    setDialog(null);
  };
  const position = (scene: Scene, x: number, y: number) =>
    studioStore.edit((p) => ({
      ...p,
      scenes: p.scenes.map((s) =>
        s.id === scene.id
          ? { ...s, x: Math.max(-200, Math.min(200, x)), y: Math.max(-140, Math.min(140, y)) }
          : s,
      ),
    }));
  const move = (direction: -1 | 1) => {
    transport.pause();
    studioStore.edit((p) => {
      const scenes = [...p.scenes];
      const from = scenes.findIndex((s) => s.id === selected.id);
      const to = from + direction;
      if (to < 0 || to >= scenes.length) return p;
      [scenes[from], scenes[to]] = [scenes[to]!, scenes[from]!];
      return { ...p, scenes };
    });
  };
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error('Project files must be smaller than 1 MB.');
      const imported = parseProjectFile(await file.text());
      if (!studioStore.add(imported))
        throw new Error('Your workspace holds 24 projects. Remove one before importing.');
      transport.seek(2200);
      setMessage('Project imported as a separate, editable copy.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'This project could not be imported.');
    }
  };
  const filename =
    project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'raftrame-project';
  return (
    <main id="main" className={`studio-page ${focus ? 'focus-mode' : ''}`}>
      <div className="project-bar">
        <div className="project-identity">
          <Link to="/projects" className="project-back" aria-label="Open projects">
            <FolderOpen size={18} />
          </Link>
          <div>
            <div className="project-path">
              WORKSPACE <ChevronRight size={10} /> MATCH GRAPHICS
            </div>
            <button className="project-title" onClick={() => openDialog('rename')}>
              {project.name}
              <ChevronRight size={17} />
            </button>
          </div>
          <span
            className={`save-state ${state.status === 'saved' ? 'is-saved' : ''}`}
            role="status"
          >
            {state.status === 'saved' ? <Check size={12} /> : <i />}
            {state.status === 'saved'
              ? 'Saved on this browser'
              : state.status === 'saving'
                ? 'Saving…'
                : 'Unsaved changes'}
          </span>
        </div>
        <div className="project-tools">
          <div className="history-buttons">
            <IconButton
              label="Undo edit"
              disabled={!state.history!.past.length}
              onClick={studioStore.undo}
            >
              <Undo2 size={16} />
            </IconButton>
            <IconButton
              label="Redo edit"
              disabled={!state.history!.future.length}
              onClick={studioStore.redo}
            >
              <Redo2 size={16} />
            </IconButton>
          </div>
          <button
            className="button secondary import-button"
            onClick={() => importInput.current?.click()}
          >
            <Upload size={14} />
            Import
          </button>
          <button className="button primary" onClick={() => openDialog('export')}>
            <ArrowUpRight size={16} />
            Export project
          </button>
          <input
            className="sr-only"
            tabIndex={-1}
            ref={importInput}
            type="file"
            accept=".json,application/json"
            aria-label="Import project file"
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>
      {message && (
        <div className="notice" role="status">
          {message}
          <button onClick={() => setMessage('')}>Dismiss</button>
        </div>
      )}
      <div className="workspace-intro">
        <div>
          <span className="eyebrow">THE CREATIVE DESK / 01</span>
          <h1>
            Make the moment <em>move.</em>
          </h1>
        </div>
        <p>
          You bring the game.
          <br />
          We give it a stage.
        </p>
      </div>
      <div className="editor-grid">
        <div className="editor-left">
          <Stage
            project={project}
            transport={transport}
            reducedMotion={reducedMotion}
            focus={focus}
            onFocus={() => setFocus(!focus)}
            onPosition={position}
            onSelect={studioStore.selectScene}
          />
          <div className="scenes-heading">
            <h2>
              <Film size={14} />
              Your sequence <span>{String(project.scenes.length).padStart(2, '0')}</span>
            </h2>
            <button
              className="text-button"
              disabled={project.scenes.length >= 12}
              onClick={() => openDialog('add')}
            >
              <Plus size={14} />
              Add scene
            </button>
          </div>
          <div className="scene-filmstrip" aria-label="Scene sequence">
            {project.scenes.map((scene, i) => (
              <button
                key={scene.id}
                className={`scene-card ${scene.id === selected.id ? 'selected' : ''}`}
                aria-pressed={scene.id === selected.id}
                onClick={() => choose(scene.id)}
                aria-label={`Select scene ${i + 1}: ${sceneLabels[scene.kind]}`}
              >
                <div className="scene-thumb">
                  <FramePreview project={project} timeMs={sceneStart(project, i) + 1500} />
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {scene.id === selected.id && <i />}
                </div>
                <span className="scene-card-label">
                  {sceneLabels[scene.kind]}
                  <small>{(scene.durationMs / 1000).toFixed(1)}s</small>
                </span>
              </button>
            ))}
          </div>
          <Timeline project={project} transport={transport} onSelect={studioStore.selectScene} />
        </div>
        <Inspector
          project={project}
          scene={selected}
          onMove={move}
          onDelete={() => openDialog('delete')}
          onDuplicate={() => {
            const scene = { ...selected, id: newId() };
            studioStore.edit((p) => {
              const scenes = [...p.scenes];
              scenes.splice(scenes.findIndex((s) => s.id === selected.id) + 1, 0, scene);
              return { ...p, scenes };
            });
            studioStore.selectScene(scene.id);
          }}
        />
      </div>
      <div className="workspace-foot">
        <span>
          <i /> YOUR LOCAL CREATIVE SPACE
        </span>
        <span>
          4 scene styles <b>·</b> {timecode(totalDuration(project))} running time <b>·</b> 16:9
          canvas
        </span>
        <Link to="/guide">
          A little direction <ArrowUpRight size={12} />
        </Link>
      </div>
      {dialog === 'rename' && (
        <Dialog title="Project details" onClose={() => setDialog(null)}>
          <p className="dialog-lead">A name for your next big moment.</p>
          <Field
            label="Project name"
            value={project.name}
            maxLength={80}
            onCommit={(name) => studioStore.edit((p) => ({ ...p, name }))}
          />
          <button className="button primary full-width" onClick={() => setDialog(null)}>
            Done
            <Check size={15} />
          </button>
        </Dialog>
      )}
      {dialog === 'add' && (
        <Dialog title="Every scene has a purpose." onClose={() => setDialog(null)}>
          <p className="dialog-lead">Choose the next chapter in your sequence.</p>
          <div className="add-scene-options">
            {SCENE_KINDS.map((kind, i) => (
              <button key={kind} onClick={() => addScene(kind)}>
                <span className="add-number">0{i + 1}</span>
                <span>
                  <strong>{sceneLabels[kind]}</strong>
                  <small>{descriptions[kind]}</small>
                </span>
                <Plus size={18} />
              </button>
            ))}
          </div>
          <p className="fine-print">Up to 12 scenes per project. Reorder them in the inspector.</p>
        </Dialog>
      )}
      {dialog === 'delete' && (
        <Dialog title="Remove this scene?" onClose={() => setDialog(null)}>
          <p className="dialog-lead">
            “{sceneLabels[selected.kind]}” will leave the sequence. You can bring it back with Undo.
          </p>
          <div className="dialog-actions">
            <button className="button secondary" onClick={() => setDialog(null)}>
              Keep scene
            </button>
            <button
              className="button danger"
              onClick={() => {
                studioStore.edit((p) => ({
                  ...p,
                  scenes: p.scenes.filter((s) => s.id !== selected.id),
                }));
                setDialog(null);
              }}
            >
              Remove scene
            </button>
          </div>
        </Dialog>
      )}
      {dialog === 'export' && (
        <Dialog title="Take your work with you." onClose={() => setDialog(null)}>
          <p className="dialog-lead">Your project, ready for its next stage.</p>
          <FramePreview
            project={project}
            timeMs={transport.snapshot().timeMs}
            className="export-preview"
          />
          <div className="export-meta">
            <span>CURRENT FRAME</span>
            <code>{timecode(transport.snapshot().timeMs)}</code>
          </div>
          <div className="export-options">
            <button
              onClick={() => {
                downloadFile(
                  serializeProject(project),
                  `${filename}.raftrame.json`,
                  'application/json',
                );
                setMessage(
                  'Editable project exported. Import this file to continue on another browser.',
                );
              }}
            >
              <Copy size={20} />
              <span>
                <strong>Editable project</strong>
                <small>JSON · all scenes, match data and styling</small>
              </span>
              <ArrowDownToLine size={17} />
            </button>
            <button
              disabled={exporting}
              onClick={() => {
                setExporting(true);
                void framePng(evaluateFrame(project, transport.snapshot().timeMs, reducedMotion))
                  .then((blob) => {
                    downloadFile(
                      blob,
                      `${filename}-${Math.round(transport.snapshot().timeMs)}.png`,
                      'image/png',
                    );
                    setMessage('A 1920 × 1080 PNG frame has been exported.');
                  })
                  .catch((error: unknown) =>
                    setMessage(error instanceof Error ? error.message : 'Image export failed.'),
                  )
                  .finally(() => setExporting(false));
              }}
            >
              <Film size={20} />
              <span>
                <strong>{exporting ? 'Rendering frame…' : 'Still frame'}</strong>
                <small>PNG · 1920 × 1080 · current playhead</small>
              </span>
              <ArrowDownToLine size={17} />
            </button>
          </div>
          <p className="fine-print">
            Projects stay on this browser. Keep an editable copy as your backup. Video encoding is
            outside this studio’s current scope.
          </p>
          {message && (
            <p role="status" className="export-message">
              {message}
            </p>
          )}
        </Dialog>
      )}
      {focus && (
        <button className="focus-exit button secondary" onClick={() => setFocus(false)}>
          <ArrowLeft size={15} />
          Back to the desk
        </button>
      )}
      <span className="sr-only" aria-live="polite">
        {locateScene(project, transport.snapshot().timeMs).scene.kind} scene ready.
      </span>
    </main>
  );
}

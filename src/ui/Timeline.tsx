import {
  ChevronFirst,
  ChevronLast,
  Play,
  Pause,
  Repeat2,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import {
  locateScene,
  sceneLabels,
  sceneStart,
  timecode,
  totalDuration,
  type Project,
} from '../domain/model';
import type { Transport } from '../domain/transport';
import { usePlayback } from '../state/hooks';
import { IconButton } from './Primitives';

export function Timeline({
  project,
  transport,
  onSelect,
}: {
  project: Project;
  transport: Transport;
  onSelect: (id: string) => void;
}) {
  const playback = usePlayback(transport);
  const total = totalDuration(project);
  const current = locateScene(project, playback.timeMs);
  const ticks = Array.from({ length: Math.floor(total / 5000) + 1 }, (_, i) => i * 5000);
  const jump = (index: number) => {
    const safe = Math.max(0, Math.min(project.scenes.length - 1, index));
    transport.pause();
    transport.seek(sceneStart(project, safe));
    onSelect(project.scenes[safe]!.id);
  };
  return (
    <section className="timeline" aria-label="Timeline">
      <div className="transport">
        <div className="time-display">
          <strong data-testid="timecode">{timecode(playback.timeMs)}</strong>
          <span>/ {timecode(total)}</span>
        </div>
        <div className="transport-buttons">
          <IconButton
            label="Go to start"
            onClick={() => {
              transport.pause();
              transport.seek(0);
            }}
          >
            <ChevronFirst size={17} />
          </IconButton>
          <IconButton label="Previous scene" onClick={() => jump(current.index - 1)}>
            <SkipBack size={15} />
          </IconButton>
          <button
            className="play-button"
            aria-label={playback.playing ? 'Pause playback' : 'Play timeline'}
            onClick={() => transport.toggle()}
          >
            {playback.playing ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </button>
          <IconButton label="Next scene" onClick={() => jump(current.index + 1)}>
            <SkipForward size={15} />
          </IconButton>
          <IconButton
            label="Go to end"
            onClick={() => {
              transport.pause();
              transport.seek(total);
            }}
          >
            <ChevronLast size={17} />
          </IconButton>
        </div>
        <div className="play-options">
          <IconButton
            label="Loop playback"
            aria-pressed={playback.loop}
            onClick={() => transport.setLoop(!playback.loop)}
          >
            <Repeat2 size={16} />
          </IconButton>
          <label>
            <span className="sr-only">Playback speed</span>
            <select
              value={playback.speed}
              onChange={(e) => transport.setSpeed(Number(e.target.value))}
            >
              <option value="0.5">0.5×</option>
              <option value="1">1×</option>
              <option value="1.5">1.5×</option>
              <option value="2">2×</option>
            </select>
          </label>
        </div>
      </div>
      <div className="timeline-scroll">
        <div className="timeline-grid">
          <div className="track-label ruler-label">SECONDS</div>
          <div className="ruler">
            {ticks.map((tick) => (
              <span key={tick} style={{ left: `${(tick / total) * 100}%` }}>
                {String(tick / 1000).padStart(2, '0')}
              </span>
            ))}
          </div>
          <div className="track-label">
            <i className="track-dot purple" /> SCENES
          </div>
          <div className="scene-track">
            {project.scenes.map((scene, i) => (
              <button
                key={scene.id}
                className={`timeline-scene ${scene.id === current.scene.id ? 'active' : ''}`}
                style={{ width: `${(scene.durationMs / total) * 100}%` }}
                title={`${sceneLabels[scene.kind]} at ${timecode(sceneStart(project, i))}`}
                onClick={() => {
                  jump(i);
                  transport.seek(sceneStart(project, i) + Math.min(1500, scene.durationMs / 2));
                }}
              >
                {String(i + 1).padStart(2, '0')}
                <span>{sceneLabels[scene.kind]}</span>
              </button>
            ))}
          </div>
          <div className="track-label">
            <i className="track-dot orange" /> REVEALS
          </div>
          <div className="reveal-track">
            {project.scenes.map((scene, i) => (
              <span
                key={scene.id}
                title={`${scene.entranceMs} ms entrance`}
                style={{
                  left: `${(sceneStart(project, i) / total) * 100}%`,
                  width: `${(scene.entranceMs / total) * 100}%`,
                }}
              />
            ))}
          </div>
          <div className="playhead-lane">
            <div className="playhead" style={{ left: `${(playback.timeMs / total) * 100}%` }}>
              <i />
            </div>
          </div>
          <input
            className="scrubber"
            type="range"
            aria-label="Playhead position"
            aria-valuetext={timecode(playback.timeMs)}
            min={0}
            max={total}
            step={100}
            value={playback.timeMs}
            onPointerDown={() => transport.pause()}
            onChange={(e) => {
              transport.pause();
              transport.seek(Number(e.target.value));
            }}
          />
        </div>
      </div>
      <div className="timeline-caption">
        <span>Drag the red playhead to find your frame.</span>
        <span>
          <kbd>Space</kbd> Play / pause
        </span>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { ArrowDown, ArrowUp, Copy, RotateCcw, SlidersHorizontal, Trash2 } from 'lucide-react';
import { palettes, sceneLabels, type Project, type Scene } from '../domain/model';
import { studioStore } from '../state/store';
import { Field, IconButton } from './Primitives';

export function Inspector({
  project,
  scene,
  onDuplicate,
  onDelete,
  onMove,
}: {
  project: Project;
  scene: Scene;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [tab, setTab] = useState<'scene' | 'match' | 'style'>('scene');
  const [lineupError, setLineupError] = useState('');
  const editScene = (patch: Partial<Scene>) =>
    studioStore.edit((p) => ({
      ...p,
      scenes: p.scenes.map((s) => (s.id === scene.id ? { ...s, ...patch } : s)),
    }));
  const index = project.scenes.findIndex((s) => s.id === scene.id);
  return (
    <aside className="inspector" aria-label="Scene inspector">
      <div className="inspector-heading">
        <span>
          <SlidersHorizontal size={14} /> INSPECTOR
        </span>
        <span>{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className="inspector-tabs">
        {(['scene', 'match', 'style'] as const).map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="inspector-body">
        {tab === 'scene' && (
          <>
            <div className="inspector-title">
              <span className="eyebrow">SELECTED SCENE</span>
              <h2>{sceneLabels[scene.kind]}</h2>
              <p>Give the moment room to breathe.</p>
            </div>
            <div className="field-pair">
              <Field
                label="Duration · seconds"
                value={scene.durationMs / 1000}
                type="number"
                min={2.4}
                max={15}
                step={0.1}
                onCommit={(v) => editScene({ durationMs: Math.round(Number(v) * 1000) })}
              />
              <Field
                label="Entrance · ms"
                value={scene.entranceMs}
                type="number"
                min={0}
                max={1200}
                step={50}
                onCommit={(v) => editScene({ entranceMs: Number(v) })}
              />
            </div>
            <div className="inspector-section">
              <h3>Composition position</h3>
              <div className="field-pair">
                <Field
                  label="Horizontal · px"
                  value={scene.x}
                  type="number"
                  min={-200}
                  max={200}
                  step={1}
                  onCommit={(v) => editScene({ x: Number(v) })}
                />
                <Field
                  label="Vertical · px"
                  value={scene.y}
                  type="number"
                  min={-140}
                  max={140}
                  step={1}
                  onCommit={(v) => editScene({ y: Number(v) })}
                />
              </div>
              <button className="text-button" onClick={() => editScene({ x: 0, y: 0 })}>
                <RotateCcw size={12} /> Reset position
              </button>
            </div>
            <div className="inspector-section">
              <h3>Scene order</h3>
              <div className="scene-actions">
                <IconButton
                  label="Move scene earlier"
                  disabled={index === 0}
                  onClick={() => onMove(-1)}
                >
                  <ArrowUp size={15} />
                </IconButton>
                <IconButton
                  label="Move scene later"
                  disabled={index === project.scenes.length - 1}
                  onClick={() => onMove(1)}
                >
                  <ArrowDown size={15} />
                </IconButton>
                <IconButton
                  label="Duplicate scene"
                  disabled={project.scenes.length >= 12}
                  onClick={onDuplicate}
                >
                  <Copy size={15} />
                </IconButton>
                <IconButton
                  label="Delete scene"
                  disabled={project.scenes.length === 1}
                  onClick={onDelete}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </div>
            <div className="inspector-note">
              <i />
              The red track below shows this scene’s entrance. Set it to zero for a clean cut.
            </div>
          </>
        )}
        {tab === 'match' && (
          <>
            <div className="inspector-title">
              <span className="eyebrow">THE FIXTURE</span>
              <h2>Make it yours.</h2>
              <p>One match. Every scene stays in sync.</p>
            </div>
            {(['home', 'away'] as const).map((side) => (
              <div className="inspector-section team-fields" key={side}>
                <h3>
                  <i style={{ background: project[side].color }} />{' '}
                  {side === 'home' ? 'Home team' : 'Away team'}
                </h3>
                <Field
                  label={`${side === 'home' ? 'Home' : 'Away'} team name`}
                  value={project[side].name}
                  maxLength={40}
                  onCommit={(v) =>
                    studioStore.edit((p) => ({ ...p, [side]: { ...p[side], name: v } }))
                  }
                />
                <div className="field-pair">
                  <Field
                    label={`${side === 'home' ? 'Home' : 'Away'} abbreviation`}
                    value={project[side].short}
                    maxLength={4}
                    minLength={2}
                    onCommit={(v) => {
                      if (v.length >= 2)
                        studioStore.edit((p) => ({
                          ...p,
                          [side]: { ...p[side], short: v.toUpperCase() },
                        }));
                    }}
                  />
                  <Field
                    label={`${side === 'home' ? 'Home' : 'Away'} score`}
                    type="number"
                    value={project[side].score}
                    min={0}
                    max={99}
                    step={1}
                    onCommit={(v) =>
                      studioStore.edit((p) => ({ ...p, [side]: { ...p[side], score: Number(v) } }))
                    }
                  />
                </div>
              </div>
            ))}
            <Field
              label="Goal scorer"
              value={project.scorer}
              maxLength={40}
              onCommit={(v) => studioStore.edit((p) => ({ ...p, scorer: v }))}
            />
            <Field
              label="Match minute"
              value={project.minute}
              type="number"
              min={1}
              max={130}
              step={1}
              onCommit={(v) => studioStore.edit((p) => ({ ...p, minute: Number(v) }))}
            />
            <Field
              label="Competition"
              value={project.competition}
              maxLength={40}
              onCommit={(v) => studioStore.edit((p) => ({ ...p, competition: v }))}
            />
            <Field
              label="Venue / matchday"
              value={project.venue}
              onCommit={(v) => studioStore.edit((p) => ({ ...p, venue: v }))}
            />
            <label className="field">
              <span>Starting eleven · one per line</span>
              <textarea
                key={project.lineup.join('\n')}
                defaultValue={project.lineup.join('\n')}
                rows={11}
                aria-invalid={lineupError ? true : undefined}
                aria-describedby="lineup-error"
                onBlur={(e) => {
                  const lineup = e.currentTarget.value
                    .split('\n')
                    .map((v) => v.trim())
                    .filter(Boolean);
                  if (lineup.length !== 11 || lineup.some((name) => name.length > 40)) {
                    setLineupError('Enter exactly 11 names, up to 40 characters each.');
                    return;
                  }
                  setLineupError('');
                  studioStore.edit((p) => ({ ...p, lineup }));
                }}
              />
              <small
                id="lineup-error"
                className="field-error"
                role={lineupError ? 'alert' : undefined}
              >
                {lineupError || 'Names are fictional. Change them to tell your story.'}
              </small>
            </label>
          </>
        )}
        {tab === 'style' && (
          <>
            <div className="inspector-title">
              <span className="eyebrow">ART DIRECTION</span>
              <h2>Find your tone.</h2>
              <p>A considered palette. A different energy.</p>
            </div>
            <div className="theme-options">
              {(['electric', 'paper', 'ember'] as const).map((theme) => (
                <button
                  key={theme}
                  className={project.theme === theme ? 'active' : ''}
                  aria-pressed={project.theme === theme}
                  onClick={() => studioStore.edit((p) => ({ ...p, theme }))}
                >
                  <span className="theme-swatches">
                    {[palettes[theme].background, palettes[theme].ink, palettes[theme].accent].map(
                      (color) => (
                        <i key={color} style={{ background: color }} />
                      ),
                    )}
                  </span>
                  <span>
                    {theme === 'electric'
                      ? 'Night session'
                      : theme === 'paper'
                        ? 'Press edition'
                        : 'Afterglow'}
                  </span>
                  <b>{project.theme === theme ? 'Selected' : 'Apply'}</b>
                </button>
              ))}
            </div>
            <div className="inspector-section">
              <h3>Team colors</h3>
              {(['home', 'away'] as const).map((side) => (
                <label className="color-field" key={side}>
                  <span>{side === 'home' ? 'Home' : 'Away'} accent</span>
                  <span>
                    <code>{project[side].color.toUpperCase()}</code>
                    <input
                      type="color"
                      aria-label={`${side === 'home' ? 'Home' : 'Away'} team color`}
                      value={project[side].color}
                      onChange={(e) =>
                        studioStore.edit((p) => ({
                          ...p,
                          [side]: { ...p[side], color: e.target.value },
                        }))
                      }
                    />
                  </span>
                </label>
              ))}
            </div>
            <div className="type-specimen">
              <small>BARLOW CONDENSED / 700</small>
              <strong>
                BUILT FOR
                <br />
                THE BIG
                <br />
                <em>MOMENT.</em>
              </strong>
            </div>
          </>
        )}
      </div>
      <div className="inspector-footer">
        Changes apply on leaving a field. <kbd>Enter ↵</kbd>
      </div>
    </aside>
  );
}

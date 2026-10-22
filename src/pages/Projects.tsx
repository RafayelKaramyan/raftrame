import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Copy, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cloneProject, createProject } from '../domain/seeds';
import { totalDuration, type Project } from '../domain/model';
import { useStudio } from '../state/hooks';
import { studioStore } from '../state/store';
import { FramePreview } from '../ui/FramePreview';
import { Dialog, IconButton } from '../ui/Primitives';

const directions = [
  {
    theme: 'electric' as const,
    name: 'Night session',
    description: 'Electric evenings. Stadium energy.',
    label: '01 / BOLD & ELECTRIC',
  },
  {
    theme: 'paper' as const,
    name: 'Press edition',
    description: 'A quieter take on the beautiful game.',
    label: '02 / CLEAN & CONSIDERED',
  },
  {
    theme: 'ember' as const,
    name: 'Afterglow',
    description: 'Warm tones. A moment that lingers.',
    label: '03 / WARM & EXPRESSIVE',
  },
];
export default function Projects() {
  const { workspace } = useStudio();
  const [query, setQuery] = useState('');
  const [remove, setRemove] = useState<Project | null>(null);
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const start = (project?: Project) => {
    if (studioStore.add(project)) navigate('/');
    else setNotice('Your workspace holds 24 projects. Remove one to make room.');
  };
  const projects = workspace!.projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main id="main" className="collection-page">
      <div className="collection-intro">
        <div>
          <span className="eyebrow">YOUR CREATIVE WORKSPACE</span>
          <h1>
            Good things
            <br />
            start with <em>a frame.</em>
          </h1>
          <p>A season of ideas. A home for every one of them.</p>
        </div>
        <div className="collection-stamp">
          <span>RF</span>
          <i>
            MADE TO MOVE
            <br />
            EST. 2026
          </i>
        </div>
      </div>
      {notice && (
        <div role="status" className="notice">
          {notice}
        </div>
      )}
      <section aria-labelledby="projects-title">
        <div className="section-heading">
          <h2 id="projects-title">
            Your projects <span>{String(workspace!.projects.length).padStart(2, '0')}</span>
          </h2>
          <div>
            <label className="search-field">
              <Search size={14} />
              <input
                type="search"
                placeholder="Find a project"
                aria-label="Find a project"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button className="button primary" onClick={() => start()}>
              <Plus size={15} />
              New project
            </button>
          </div>
        </div>
        <div className="project-collection">
          {projects.map((p) => (
            <article className="project-card" key={p.id}>
              <button
                className="project-cover"
                onClick={() => {
                  studioStore.open(p.id);
                  navigate('/');
                }}
                aria-label={`Open ${p.name}`}
              >
                <FramePreview project={p} />
                <span>
                  OPEN STUDIO <ArrowUpRight size={14} />
                </span>
              </button>
              <div className="project-card-info">
                <div>
                  <h3>{p.name}</h3>
                  <p>
                    {p.scenes.length} scenes <b>·</b> {(totalDuration(p) / 1000).toFixed(1)} seconds{' '}
                    <b>·</b> {p.theme}
                  </p>
                </div>
                <div>
                  <IconButton label={`Duplicate ${p.name}`} onClick={() => start(cloneProject(p))}>
                    <Copy size={15} />
                  </IconButton>
                  <IconButton
                    label={`Delete ${p.name}`}
                    disabled={workspace!.projects.length === 1}
                    onClick={() => setRemove(p)}
                  >
                    <Trash2 size={15} />
                  </IconButton>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!projects.length && (
          <div className="empty-state">
            <Search size={24} />
            <h3>No frames by that name.</h3>
            <p>Try a shorter search or start a fresh project.</p>
            <button className="button secondary" onClick={() => setQuery('')}>
              Clear search
            </button>
          </div>
        )}
      </section>
      <section className="directions-section" aria-labelledby="directions-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THREE WAYS TO SET THE TONE</span>
            <h2 id="directions-title">Start with a direction.</h2>
          </div>
          <p>Same game. A different point of view.</p>
        </div>
        <div className="direction-cards">
          {directions.map((d) => (
            <button
              key={d.theme}
              className={`direction-card ${d.theme}`}
              onClick={() => {
                const p = createProject(d.theme);
                p.name = `${d.name} / new match`;
                start(p);
              }}
            >
              <span>{d.label}</span>
              <strong>
                {d.name.split(' ')[0]}
                <br />
                <em>{d.name.split(' ').slice(1).join(' ') || 'session.'}</em>
              </strong>
              <small>
                {d.description}
                <ArrowRight size={18} />
              </small>
            </button>
          ))}
        </div>
      </section>
      <footer className="collection-footer">
        <span>KEEP YOUR IDEAS IN PLAY.</span>
        <p>Saved on this browser. Export an editable copy to carry a project elsewhere.</p>
      </footer>
      {remove && (
        <Dialog title="Remove this project?" onClose={() => setRemove(null)}>
          <p className="dialog-lead">
            “{remove.name}” and its scenes will be removed from this browser. Export a copy first if
            you want to keep it.
          </p>
          <div className="dialog-actions">
            <button className="button secondary" onClick={() => setRemove(null)}>
              Keep project
            </button>
            <button
              className="button danger"
              onClick={() => {
                studioStore.remove(remove.id);
                setRemove(null);
              }}
            >
              Remove project
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}

import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { ArrowUpRight, CircleHelp, Download, Radio, RefreshCw } from 'lucide-react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useStudio } from './state/hooks';
import { studioStore } from './state/store';
import Studio from './pages/Studio';
import Projects from './pages/Projects';
import Guide from './pages/Guide';
import { Dialog } from './ui/Primitives';
import { downloadFile } from './ui/download';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Studio rendering stopped.', error, info.componentStack);
  }
  render() {
    return this.state.failed ? (
      <div className="startup">
        <h1>The studio needs a fresh frame.</h1>
        <p>Your saved projects remain on this browser.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload the studio
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${pathname === '/projects' ? 'Projects' : pathname === '/guide' ? 'Field notes' : 'Studio'} — Raftrame`;
    document.getElementById('main')?.setAttribute('tabindex', '-1');
    document.getElementById('main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function WorkspaceApp() {
  const state = useStudio();
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      const current = studioStore.snapshot();
      if (current.workspace && current.status !== 'saved') event.preventDefault();
    };
    const hidden = () => {
      if (document.hidden) void studioStore.flush();
    };
    window.addEventListener('beforeunload', leave);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('beforeunload', leave);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);
  if (!state.workspace) {
    return (
      <div className="startup">
        <div className="brand-symbol">
          R<span />
        </div>
        <span className="eyebrow">RAFTRAME / SPORTS MOTION STUDIO</span>
        <h1>
          {state.status === 'loading' ? 'Setting the stage.' : 'Let’s recover your workspace.'}
        </h1>
        <p>{state.error || 'A moment for your next big moment.'}</p>
        {state.status !== 'loading' && (
          <div className="dialog-actions">
            {state.raw !== undefined && (
              <button
                className="button secondary"
                onClick={() =>
                  downloadFile(
                    JSON.stringify(state.raw, null, 2),
                    'raftrame-recovery.json',
                    'application/json',
                  )
                }
              >
                <Download size={16} />
                Save original data
              </button>
            )}
            <button
              className="button primary"
              onClick={() =>
                state.status === 'corrupt' ? setConfirmReset(true) : void studioStore.initialize()
              }
            >
              {state.status === 'corrupt' ? 'Start a fresh workspace' : 'Retry opening'}
            </button>
          </div>
        )}
        {confirmReset && (
          <Dialog title="Start a fresh workspace?" onClose={() => setConfirmReset(false)}>
            <p className="dialog-lead">
              This replaces the unreadable workspace on this browser. Save its original data first
              if you want to keep a recovery copy.
            </p>
            <div className="dialog-actions">
              <button className="button secondary" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button
                className="button danger"
                onClick={() => {
                  void studioStore.reset();
                  setConfirmReset(false);
                }}
              >
                Replace workspace
              </button>
            </div>
          </Dialog>
        )}
      </div>
    );
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to workspace
      </a>
      <header className="app-header">
        <Link className="brand" to="/" aria-label="Raftrame studio home">
          <span className="brand-symbol">
            R<span />
          </span>
          <strong>
            raftrame<span>™</span>
          </strong>
          <i>
            SPORTS
            <br />
            MOTION STUDIO
          </i>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink end to="/">
            Studio
          </NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/guide">
            Field notes
            <ArrowUpRight size={11} />
          </NavLink>
        </nav>
        <div className="header-note">
          <Radio size={14} />
          <span>MAKE THE MOMENT MOVE</span>
        </div>
        <Link className="mobile-help" to="/guide" aria-label="Open field notes">
          <CircleHelp size={20} />
        </Link>
      </header>
      {['error', 'conflict', 'corrupt'].includes(state.status) && (
        <div className="storage-alert" role="alert">
          <strong>{state.error}</strong>
          <button
            className="button secondary"
            onClick={() =>
              state.status === 'error' ? void studioStore.flush() : void studioStore.loadLatest()
            }
          >
            <RefreshCw size={13} />
            {state.status === 'error' ? 'Retry save' : 'Load saved workspace'}
          </button>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Studio />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/guide" element={<Guide />} />
        <Route
          path="*"
          element={
            <main id="main" className="startup">
              <span className="eyebrow">FRAME NOT FOUND</span>
              <h1>This scene isn’t in the sequence.</h1>
              <Link className="button primary" to="/">
                Back to the studio
                <ArrowUpRight size={16} />
              </Link>
            </main>
          }
        />
      </Routes>
      <RouteFocus />
    </>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <WorkspaceApp />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

import { ArrowUpRight, Clock3, Layers2, Move, PackageOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStudio } from '../state/hooks';
import { FramePreview } from '../ui/FramePreview';

export default function Guide() {
  const project = useStudio().history!.present;
  return (
    <main id="main" className="guide-page">
      <span className="eyebrow">FIELD NOTES / A LITTLE DIRECTION</span>
      <h1>
        A good moment.
        <br />
        <em>A little intention.</em>
      </h1>
      <p className="guide-intro">
        A small studio for the big moments in sport. Here is how to make a sequence that feels like
        yours.
      </p>
      <div className="guide-feature">
        <FramePreview project={project} />
        <div>
          <span>01 — THE OPENING</span>
          <h2>
            Set the stage.
            <br />
            Then set the tone.
          </h2>
          <p>
            Choose a project direction, open Match in the inspector, and change your teams, score
            and competition. All four scene styles use the same match data.
          </p>
          <Link className="button primary" to="/">
            Make your first edit
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
      <div className="guide-cards">
        <article>
          <Layers2 />
          <span>02 / THE SEQUENCE</span>
          <h2>A story in scenes.</h2>
          <p>
            Add an opener, scoreboard, starting eleven or goal moment. Duplicate a scene, move it
            earlier or later, or remove it. Undo brings your last edit back.
          </p>
        </article>
        <article>
          <Clock3 />
          <span>03 / THE TIMING</span>
          <h2>Every second matters.</h2>
          <p>
            Each scene lasts 2.4–15 seconds. Entrance controls its reveal; zero gives a clean cut.
            Drag the timeline or use its arrow keys to inspect a precise moment.
          </p>
        </article>
        <article>
          <Move />
          <span>04 / THE COMPOSITION</span>
          <h2>A little to the left.</h2>
          <p>
            Enable Move composition to drag the active scene. Arrow keys move it 2 pixels; Shift
            plus an arrow moves it 10. The inspector gives you exact positions.
          </p>
        </article>
        <article>
          <PackageOpen />
          <span>05 / THE HANDOFF</span>
          <h2>Keep a copy in play.</h2>
          <p>
            Export an editable JSON project and import it as a new copy. Export the current frame as
            a full-size PNG. This version makes still images and editable projects.
          </p>
        </article>
      </div>
      <div className="guide-bottom">
        <section>
          <span className="eyebrow">A FEW USEFUL SHORTCUTS</span>
          <dl>
            <div>
              <dt>Play / pause</dt>
              <dd>
                <kbd>Space</kbd>
              </dd>
            </div>
            <div>
              <dt>Undo an edit</dt>
              <dd>
                <kbd>Ctrl / ⌘</kbd> + <kbd>Z</kbd>
              </dd>
            </div>
            <div>
              <dt>Redo an edit</dt>
              <dd>
                <kbd>Ctrl / ⌘</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd>
              </dd>
            </div>
            <div>
              <dt>Close a dialog / leave focus view</dt>
              <dd>
                <kbd>Esc</kbd>
              </dd>
            </div>
          </dl>
          <p className="fine-print">
            Shortcuts stay out of text fields. Project history is kept for the current editing
            session.
          </p>
        </section>
        <section>
          <span className="eyebrow">GOOD TO KNOW</span>
          <h2>
            Made with care.
            <br />
            Saved close to home.
          </h2>
          <p>
            Your work is saved on this browser. A saved indicator confirms each write. Keep an
            exported copy before clearing browser data or changing devices.
          </p>
          <p>
            Playback pauses when you leave the tab. Your reduced motion preference removes animated
            reveals while preserving complete scenes. Play starts only when you ask.
          </p>
          <p className="fine-print">
            Independent portfolio product by Rafayel Karamyan. Teams and matches are fictional. No
            affiliation with a league, broadcaster or employer.
          </p>
        </section>
      </div>
    </main>
  );
}

import { evaluateFrame } from '../render/frame';
import { frameToSvg } from '../render/svg';
import type { Project } from '../domain/model';
export function FramePreview({
  project,
  timeMs = 2200,
  className = '',
}: {
  project: Project;
  timeMs?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`frame-preview ${className}`}
      dangerouslySetInnerHTML={{ __html: frameToSvg(evaluateFrame(project, timeMs, true)) }}
    />
  );
}

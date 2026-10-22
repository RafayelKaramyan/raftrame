# Code walkthrough

A useful interview walkthrough starts with an edit and follows it into a saved frame.

1. Open `src/pages/Studio.tsx` and `src/ui/Inspector.tsx`. Change a duration or score. Inputs commit validated values on blur, and scene commands use immutable document transformations.
2. Follow `StudioStore.edit` into `src/state/store.ts` and `src/domain/history.ts`. Explain why the document, selected scene and playhead have different lifetimes. Undo changes the document; seeking does not create a history entry.
3. Read `locateScene` and `evaluateFrame`. Pick a time exactly on a scene boundary, then seek forward and back. Explain why absolute-time evaluation gives the same result without replaying earlier frames.
4. Open `src/domain/transport.ts`. Compare frame listeners with UI listeners. Explain pause cleanup, looping, project shrink and why the clock starts paused.
5. Read `src/render/pixi.ts`. Show the retained node map and why position/opacity changes do not require recreating every text object. Compare the SVG serializer and Canvas export.
6. Inspect `src/storage/workspace.ts`. Find the read/write transaction, revision guard and workspace generation. Describe the outcome when two tabs save the same revision.
7. Read the save queue in `src/state/store.ts`. Consider a second edit arriving while the first save is pending, a rejected write, and an unreadable stored record. Explain what remains in memory and which recovery action the user controls.
8. Review the domain tests and browser suite. Distinguish automated emulation from physical devices and describe the limitations in the validation record.

Practical extensions include additional scene primitives, true keyframe authoring, video export and cloud collaboration. Each would need explicit product scope and its own validation; they are not present features.

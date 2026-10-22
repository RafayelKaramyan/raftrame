# Architecture

Raftrame separates document editing, timeline evaluation, playback and rendering. A saved document describes creative intent; it contains neither GPU objects nor clock state.

## Document and history

`src/domain/model.ts` defines strict Zod contracts for projects, scenes, the workspace and portable files. It limits string lengths, colors, scores, positions, scene durations and document size. Scene IDs and project references must be consistent. A project import is validated before any workspace change and receives fresh project and scene identities.

`src/domain/history.ts` keeps immutable document snapshots. Committing a different edit discards the redo branch. The bounded history retains 50 earlier snapshots and is separate from persistence. Selection and playback do not enter document history. Switching projects starts a new session history for the chosen project.

## Deterministic scenes

`src/render/frame.ts` locates the active scene and computes its primitives from the absolute time. A scene boundary selects the next scene; the terminal time selects the last scene at its end. Entrance easing and staggered text/player movement use local scene time. A zero entrance is a cut. Reduced motion removes the reveals while keeping complete scenes.

Composition offsets affect the scene's content, while the competition and framing overlay remain fixed. A pointer drag previews offsets without committing every pointer event; pointer release makes one history entry. Keyboard movement and inspector inputs use the same document updates.

`src/render/pixi.ts` creates a lazily imported WebGL renderer with a retained object map. Text and geometry only change when their signatures change; transforms and opacity are updated per frame. The renderer owns and destroys its Pixi resources. `Stage.tsx` cancels asynchronous initialization when unmounted and falls back to SVG on unavailable or lost WebGL context.

`src/render/svg.ts` serializes the same primitives with escaped text. It is used for thumbnails and fallback display. `src/render/export.ts` draws the primitives to a 1920 × 1080 Canvas 2D image. Browser rasterizers and font metrics can produce small differences between backends.

## Transport

`src/domain/transport.ts` is an external clock with separate renderer and React subscriptions. Rendering follows animation frames; React subscribers are notified at most every 50 ms during playback. Seeking notifies immediately. Pausing cancels the next callback. The transport supports bounded seeks, speed, looping, exact terminal stop and restart from the endpoint. Visibility changes pause playback rather than trying to catch up in the background.

## Persistence and recovery

`src/storage/workspace.ts` stores the workspace in one IndexedDB record. The read, revision comparison and write occur in one read/write transaction. A generation UUID rejects an older workspace even if a reset reuses a revision number. A constant legacy generation normalizes pre-release records that lack the field.

`src/state/store.ts` owns the sequential save queue and in-memory history. A successful older snapshot advances the saved revision without replacing newer edits already in memory. Rejected writes leave edits available for retry and export. BroadcastChannel carries revision notifications; the database transaction remains the authority for conflicts.

Unreadable data is preserved. The recovery screen can export the original record and requires a separate explicit replacement action. There is no claim that browser storage is permanent or shared with another device.

## UI and deployment

React pages provide the studio, project gallery and field notes. Native dialogs supply background inertness and focus containment. The router retains the trailing deployment-base slash, and the Pages workflow copies the entry document to `404.html` for static client routing.

No server, secret, external sports feed, paid service or user account is needed to run the product.

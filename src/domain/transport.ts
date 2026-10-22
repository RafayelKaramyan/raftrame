export interface Playback {
  timeMs: number;
  playing: boolean;
  speed: number;
  loop: boolean;
}
export interface Clock {
  request: (callback: FrameRequestCallback) => number;
  cancel: (id: number) => void;
}
const clock: Clock = {
  request: (fn) => requestAnimationFrame(fn),
  cancel: (id) => cancelAnimationFrame(id),
};

// The renderer receives every frame. React subscribers receive at most 20 updates per second.
export class Transport {
  private value: Playback = { timeMs: 2200, playing: false, speed: 1, loop: true };
  private duration = 27000;
  private listeners = new Set<() => void>();
  private frameListeners = new Set<(value: Playback) => void>();
  private requestId: number | null = null;
  private previous: number | null = null;
  private lastNotification = 0;
  constructor(private readonly timer: Clock = clock) {}
  snapshot = (): Playback => this.value;
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  subscribeFrame = (fn: (value: Playback) => void): (() => void) => {
    this.frameListeners.add(fn);
    return () => this.frameListeners.delete(fn);
  };
  private notify = (ui = true): void => {
    for (const fn of this.frameListeners) fn(this.value);
    if (ui) for (const fn of this.listeners) fn();
  };
  setDuration(duration: number): void {
    this.duration = Math.max(1, duration);
    this.seek(this.value.timeMs);
  }
  seek(timeMs: number): void {
    this.value = {
      ...this.value,
      timeMs: Math.max(0, Math.min(this.duration, Number.isFinite(timeMs) ? timeMs : 0)),
    };
    this.previous = null;
    this.notify();
  }
  setSpeed(speed: number): void {
    if ([0.5, 1, 1.5, 2].includes(speed)) {
      this.value = { ...this.value, speed };
      this.notify();
    }
  }
  setLoop(loop: boolean): void {
    this.value = { ...this.value, loop };
    this.notify();
  }
  play(): void {
    if (this.value.playing) return;
    this.value = {
      ...this.value,
      playing: true,
      timeMs: this.value.timeMs >= this.duration ? 0 : this.value.timeMs,
    };
    this.previous = null;
    this.notify();
    this.requestId = this.timer.request(this.tick);
  }
  pause(): void {
    if (this.requestId !== null) this.timer.cancel(this.requestId);
    this.requestId = null;
    this.previous = null;
    this.value = { ...this.value, playing: false };
    this.notify();
  }
  toggle(): void {
    if (this.value.playing) this.pause();
    else this.play();
  }
  private tick = (now: number): void => {
    if (!this.value.playing) return;
    const delta = this.previous === null ? 0 : Math.max(0, now - this.previous) * this.value.speed;
    this.previous = now;
    let next = this.value.timeMs + delta;
    if (next >= this.duration) {
      if (this.value.loop) next %= this.duration;
      else {
        this.value = { ...this.value, timeMs: this.duration };
        this.pause();
        return;
      }
    }
    this.value = { ...this.value, timeMs: next };
    const updateUI = now - this.lastNotification >= 50;
    this.notify(updateUI);
    if (updateUI) this.lastNotification = now;
    this.requestId = this.timer.request(this.tick);
  };
  destroy(): void {
    this.pause();
    this.listeners.clear();
    this.frameListeners.clear();
  }
}

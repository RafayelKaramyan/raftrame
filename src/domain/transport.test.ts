import { describe, expect, it } from 'vitest';
import { Transport, type Clock } from './transport';
function harness() {
  let next = 0;
  const queued = new Map<number, FrameRequestCallback>();
  const clock: Clock = {
    request: (fn) => {
      queued.set(++next, fn);
      return next;
    },
    cancel: (id) => {
      queued.delete(id);
    },
  };
  const transport = new Transport(clock);
  const step = (now: number) => {
    const [id, fn] = [...queued][0]!;
    queued.delete(id);
    fn(now);
  };
  return { transport, step, queued };
}
describe('playback clock', () => {
  it('starts paused and never schedules frames until play is requested', () => {
    const { transport, queued } = harness();
    expect(transport.snapshot().playing).toBe(false);
    expect(queued.size).toBe(0);
  });
  it('advances from the requested time and applies playback speed', () => {
    const { transport, step } = harness();
    transport.seek(0);
    transport.setSpeed(2);
    transport.play();
    step(100);
    step(600);
    expect(transport.snapshot().timeMs).toBe(1000);
  });
  it('cancels pending callbacks on pause', () => {
    const { transport, queued } = harness();
    transport.play();
    transport.pause();
    expect(queued.size).toBe(0);
    expect(transport.snapshot().playing).toBe(false);
  });
  it('stops exactly at the end when looping is disabled', () => {
    const { transport, step, queued } = harness();
    transport.setDuration(3000);
    transport.seek(2800);
    transport.setLoop(false);
    transport.play();
    step(0);
    step(500);
    expect(transport.snapshot()).toMatchObject({ timeMs: 3000, playing: false });
    expect(queued.size).toBe(0);
  });
  it('wraps elapsed time on loop, including long frames', () => {
    const { transport, step } = harness();
    transport.setDuration(3000);
    transport.seek(2800);
    transport.play();
    step(0);
    step(6500);
    expect(transport.snapshot().timeMs).toBe(300);
  });
  it('restarts from zero when played at the end', () => {
    const { transport } = harness();
    transport.setDuration(3000);
    transport.seek(3000);
    transport.play();
    expect(transport.snapshot().timeMs).toBe(0);
  });
  it('clamps seeks and project shrink without creating invalid frames', () => {
    const { transport } = harness();
    transport.seek(-200);
    expect(transport.snapshot().timeMs).toBe(0);
    transport.seek(20000);
    transport.setDuration(4000);
    expect(transport.snapshot().timeMs).toBe(4000);
    transport.seek(NaN);
    expect(transport.snapshot().timeMs).toBe(0);
  });
  it('delivers rendering frames more often than UI notifications', () => {
    const { transport, step } = harness();
    let frames = 0,
      ui = 0;
    transport.subscribe(() => ui++);
    transport.subscribeFrame(() => frames++);
    transport.play();
    for (let i = 0; i < 20; i++) step(i * 10);
    expect(frames).toBeGreaterThan(ui);
  });
  it('removes listeners and callbacks on destruction', () => {
    const { transport, queued } = harness();
    let frames = 0;
    transport.subscribeFrame(() => frames++);
    transport.play();
    transport.destroy();
    const before = frames;
    transport.seek(0);
    expect(frames).toBe(before);
    expect(queued.size).toBe(0);
  });
});

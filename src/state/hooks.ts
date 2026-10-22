import { useEffect, useState, useSyncExternalStore } from 'react';
import { studioStore } from './store';
import type { Transport } from '../domain/transport';
export const useStudio = () => useSyncExternalStore(studioStore.subscribe, studioStore.snapshot);
export const usePlayback = (transport: Transport) =>
  useSyncExternalStore(transport.subscribe, transport.snapshot);
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

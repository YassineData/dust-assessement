import { useState } from 'react';

// Charts, gauges and donuts animate once per page load (~500ms), never again on
// tab switches or re-renders, and never when the user prefers reduced motion.
const played = new Set<string>();

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const CHART_ANIMATION_MS = 500;

export const useAnimateOnce = (key: string): boolean => {
  const [animate] = useState(() => {
    if (prefersReducedMotion() || played.has(key)) return false;
    played.add(key);
    return true;
  });
  return animate;
};

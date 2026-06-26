import { useState, useEffect } from 'react';
import { departureLabel } from '../i18n/format';

// Live "Departs in Xh Ym" countdown that re-renders itself on a 30s cadence so
// the value ticks down on its own (and flips to "Departing now" the moment the
// scheduled time passes) without waiting for the screen to reload. The label is
// minute-grained, so 30s keeps it fresh while staying far cheaper than a
// per-second re-render across every booking card on screen.
export function useDepartureLabel(fromIso, t) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!fromIso) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, [fromIso]);
  return departureLabel(fromIso, t);
}

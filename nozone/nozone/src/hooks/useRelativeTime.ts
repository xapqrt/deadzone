import { useEffect, useState } from 'react';

/**
 * Returns a relative time string (e.g. '45s ago', '3m ago') for a given Date.
 * Re-computes on an interval (default 30s) to keep UI fresh.
 */
export function useRelativeTime(date: Date | null | undefined, refreshMs: number = 30000): string {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!date) return; // No interval needed if never synced
    const id = setInterval(() => setTick(t => t + 1), refreshMs);
    return () => clearInterval(id);
  }, [date, refreshMs]);

  if (!date) return 'Never';
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return sec + 's ago';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  const d = Math.floor(hr / 24);
  return d + 'd ago';
}

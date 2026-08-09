import { useEffect, useState } from 'react';

// No dependency needed for a single breakpoint check — matchMedia's own
// 'change' event is all this requires. Used by ExploreSection to switch
// between the mobile bottom-sheet layout and the desktop side-panel layout.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

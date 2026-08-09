import { useEffect, useMemo, useState } from 'react';
import { fetchExploreZone } from '../lib/api';
import { normalizeText, CANONICAL_CATEGORY_ORDER } from '../lib/poiCategories';
import type { GuidePoi, CitySummary, ZoneSummary } from '../lib/types';
import type { SheetSnap } from '../components/explore/BottomSheet';

// Module-level (not component state): survives leaving the Explore tab and
// coming back, so re-selecting a city already seen this session doesn't
// refetch it. Never holds the home zone — the home zone's POIs always come
// from the main guidebook payload (see fetchExploreZone's doc comment in
// api.ts: that endpoint returns the zone's UNCURATED full catalog, which
// would silently drop the host's guide_apartment_pois ordering/exclusions).
const zonePoiCache = new Map<string, { pois: GuidePoi[]; cities: CitySummary[]; zone: ZoneSummary }>();

export type ZoneStatus = 'idle' | 'loading' | 'error';

export interface UseExploreStateOptions {
  apartmentSlug: string;
  lang: string;
  homeZone: ZoneSummary;
  homePois: GuidePoi[];
  homeCities: CitySummary[];
}

export function useExploreState({ apartmentSlug, lang, homeZone, homePois, homeCities }: UseExploreStateOptions) {
  const [activeZoneSlug, setActiveZoneSlugState] = useState(homeZone.slug);
  const [zoneStatus, setZoneStatus] = useState<ZoneStatus>('idle');
  const [remoteZone, setRemoteZone] = useState<{ pois: GuidePoi[]; zone: ZoneSummary } | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const isHomeZone = activeZoneSlug === homeZone.slug;

  // Filters. Toggles are a guest preference kept across city switches
  // (both true by default — see the plan: paid/free start ON together);
  // category resets per zone below, since a category from one city rarely
  // makes sense in another.
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [freeOn, setFreeOn] = useState(true);
  const [paidOn, setPaidOn] = useState(true);

  const [selectedPoiId, setSelectedPoiIdState] = useState<string | null>(null);
  const [detailPoiId, setDetailPoiId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SheetSnap>('peek');

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isHomeZone) {
      // Nothing to fetch — but still clear stale data from a PREVIOUS away
      // zone so isHomeZone consumers never briefly see the last city's list.
      setRemoteZone(null);
      setZoneStatus('idle');
      return;
    }
    const cacheKey = `${activeZoneSlug}:${lang}`;
    const cached = zonePoiCache.get(cacheKey);
    if (cached) {
      setRemoteZone({ pois: cached.pois, zone: cached.zone });
      setZoneStatus('idle');
      return;
    }
    let cancelled = false;
    setZoneStatus('loading');
    fetchExploreZone(apartmentSlug, activeZoneSlug, lang)
      .then(result => {
        if (cancelled) return;
        if (!result.success) throw new Error(result.error || 'explore_fetch_failed');
        const zone: ZoneSummary = result.zone;
        const pois: GuidePoi[] = result.pois || [];
        const cities: CitySummary[] = result.cities || [];
        zonePoiCache.set(cacheKey, { pois, cities, zone });
        setRemoteZone({ pois, zone });
        setZoneStatus('idle');
      })
      .catch(() => {
        if (!cancelled) setZoneStatus('error');
      });
    return () => { cancelled = true; };
  }, [activeZoneSlug, lang, apartmentSlug, isHomeZone, reloadTick]);

  const activeZone: ZoneSummary = isHomeZone ? homeZone : (remoteZone?.zone ?? homeZone);
  const zonePois: GuidePoi[] = isHomeZone ? homePois : (remoteZone?.pois ?? []);

  // The city picker always prefers the freshest list seen for the ACTIVE
  // zone's own /explore response (every response embeds the full sibling
  // list), falling back to the one already in the main guidebook payload so
  // the picker has something to show before any /explore call resolves.
  const cities: CitySummary[] = useMemo(() => {
    if (!isHomeZone) {
      const cached = zonePoiCache.get(`${activeZoneSlug}:${lang}`);
      if (cached) return cached.cities;
    }
    return homeCities;
  }, [isHomeZone, activeZoneSlug, lang, homeCities]);

  const setActiveZone = (slug: string) => {
    if (slug === activeZoneSlug) return;
    setActiveZoneSlugState(slug);
    setActiveCategory('all');
    setSelectedPoiIdState(null);
    setDetailPoiId(null);
    setSnap('peek');
    setSearchOpen(false);
    setSearchQuery('');
  };

  const retry = () => setReloadTick(t => t + 1);

  // Categories actually present in the active zone, canonical order first
  // (playas/cultura/naturaleza/actividades/restaurantes/compras/otro), then
  // any unmapped slug in whatever order it first appears.
  const categories = useMemo(() => {
    const present = Array.from(new Set(zonePois.map(p => (p.category || '').trim().toLowerCase()).filter(Boolean)));
    present.sort((a, b) => {
      const ia = CANONICAL_CATEGORY_ORDER.indexOf(a);
      const ib = CANONICAL_CATEGORY_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return present;
  }, [zonePois]);

  // A category chosen in a previous city that doesn't exist in the new one
  // (e.g. "Playas" then switching to a landlocked-feeling zone with none)
  // falls back to "all" instead of silently showing an empty list.
  useEffect(() => {
    if (activeCategory !== 'all' && !categories.includes(activeCategory)) {
      setActiveCategory('all');
    }
  }, [categories, activeCategory]);

  const visiblePois = useMemo(() => {
    return zonePois.filter(p => {
      if (activeCategory !== 'all' && (p.category || '').trim().toLowerCase() !== activeCategory) return false;
      const access = p.access_type || 'free';
      if (access === 'free') return freeOn;
      if (access === 'paid') return paidOn;
      return freeOn || paidOn; // 'mixed' matches either toggle being on
    });
  }, [zonePois, activeCategory, freeOn, paidOn]);

  // Search matches city names always, and POI names/descriptions within the
  // ACTIVE zone once there's a query — not a cross-zone text search (no
  // endpoint returns that, and it would undercut the "one city at a time"
  // model the whole tab is built around).
  const normalizedQuery = normalizeText(searchQuery);
  const cityResults = useMemo(
    () => (normalizedQuery ? cities.filter(c => normalizeText(c.name).includes(normalizedQuery)) : cities),
    [cities, normalizedQuery]
  );
  const poiSearchResults = useMemo(
    () => (normalizedQuery
      ? zonePois.filter(p => normalizeText(p.name).includes(normalizedQuery) || normalizeText(p.description || '').includes(normalizedQuery))
      : []),
    [zonePois, normalizedQuery]
  );

  const selectedPoi = useMemo(() => zonePois.find(p => p.id === selectedPoiId) ?? null, [zonePois, selectedPoiId]);
  const detailPoi = useMemo(() => zonePois.find(p => p.id === detailPoiId) ?? null, [zonePois, detailPoiId]);

  const selectPoi = (id: string | null) => {
    setSelectedPoiIdState(id);
    // Fully expanded covers the map entirely — collapse one notch so picking
    // a pin (or a list row) always leaves the map visible alongside the card.
    if (id) setSnap(s => (s === 'full' ? 'half' : s));
  };

  return {
    activeZone,
    isHomeZone,
    cities,
    setActiveZone,
    zoneStatus,
    retry,

    categories,
    activeCategory,
    setActiveCategory,
    access: { free: freeOn, paid: paidOn },
    toggleFree: () => setFreeOn(v => !v),
    togglePaid: () => setPaidOn(v => !v),

    visiblePois,

    selectedPoiId,
    selectedPoi,
    selectPoi,
    clearSelection: () => selectPoi(null),

    detailPoi,
    openDetail: (id: string) => setDetailPoiId(id),
    closeDetail: () => setDetailPoiId(null),

    snap,
    setSnap,

    search: {
      open: searchOpen,
      setOpen: setSearchOpen,
      query: searchQuery,
      setQuery: setSearchQuery,
      cityResults,
      poiResults: poiSearchResults,
    },
  };
}

export type ExploreState = ReturnType<typeof useExploreState>;

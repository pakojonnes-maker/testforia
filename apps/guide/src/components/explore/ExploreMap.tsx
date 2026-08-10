import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { GuidePoi, ZoneSummary } from '../../lib/types';
import { createPoiPin } from './mapPins';

type MappablePoi = GuidePoi & { latitude: number; longitude: number };

// tsconfig has strict:false, so `poi.latitude: number | null` doesn't narrow
// on its own — a NaN or null here would leave the map blank with no console
// error (L.latLngBounds silently drops invalid points), so every POI must
// pass through this filter before touching Leaflet.
function isMappable(p: GuidePoi): p is MappablePoi {
  return typeof p.latitude === 'number' && !Number.isNaN(p.latitude) && typeof p.longitude === 'number' && !Number.isNaN(p.longitude);
}

interface ExploreMapProps {
  pois: GuidePoi[];
  zone: ZoneSummary;
  selectedPoiId: string | null;
  onSelectPoi: (id: string) => void;
  /** Px reserved by floating UI (top bar, sheet peek) so fitBounds doesn't tuck pins under them. */
  topInset: number;
  bottomInset: number;
}

// Refits to the visible POIs whenever the SET changes (zone switch, category
// filter, free/paid toggles) — deliberately NOT keyed on selection, so tapping
// a pin (see PanToSelected below) never triggers a jarring re-zoom.
function MapController({ pois, zone, topInset, bottomInset }: { pois: MappablePoi[]; zone: ZoneSummary; topInset: number; bottomInset: number }) {
  const map = useMap();
  const poiKey = pois.map(p => p.id).join(',');

  useEffect(() => {
    if (pois.length === 0) {
      // Every POI filtered out (or a city with none yet) — fall back to
      // centering on the city itself rather than leaving the last view stuck.
      if (zone.latitude != null && zone.longitude != null) {
        map.setView([zone.latitude, zone.longitude], 13);
      }
      return;
    }
    const bounds = L.latLngBounds(pois.map(p => [p.latitude, p.longitude] as [number, number]));
    map.fitBounds(bounds, {
      paddingTopLeft: [24, topInset + 16],
      paddingBottomRight: [24, bottomInset + 16],
      maxZoom: 15,
      animate: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone.id, poiKey, topInset, bottomInset]);

  return null;
}

// Separate from MapController on purpose: panning to a selected pin must
// never re-trigger fitBounds (that would fight the guest's own pan/zoom).
function PanToSelected({ poi, bottomInset }: { poi: MappablePoi | null; bottomInset: number }) {
  const map = useMap();
  useEffect(() => {
    if (!poi) return;
    const z = map.getZoom();
    // Offset the target point upward by half the reserved bottom space, so the
    // pin lands above the sheet's peek card instead of right at its edge.
    const point = map.project([poi.latitude, poi.longitude], z).subtract([0, bottomInset / 2]);
    map.panTo(map.unproject(point, z), { animate: true, duration: 0.35 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poi?.id]);
  return null;
}

export default function ExploreMap({ pois, zone, selectedPoiId, onSelectPoi, topInset, bottomInset }: ExploreMapProps) {
  const mappablePois = useMemo(() => pois.filter(isMappable), [pois]);
  const selectedPoi = useMemo(() => mappablePois.find(p => p.id === selectedPoiId) ?? null, [mappablePois, selectedPoiId]);

  // Only used for the FIRST paint, before MapController's fitBounds/setView
  // runs — picked once per zone, not recomputed on every filter change (that
  // would fight fitBounds and cause a visible jump-then-fit on every toggle).
  const initialCenter = useMemo((): [number, number] => {
    if (zone.latitude != null && zone.longitude != null) return [zone.latitude, zone.longitude];
    if (mappablePois.length > 0) return [mappablePois[0].latitude, mappablePois[0].longitude];
    return [36.7213, -4.4213]; // Málaga capital — same last-resort fallback as the legacy MapModal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone.id]);

  return (
    // zoomControl={false}: hides Leaflet's default +/- button widget. Pinch
    // (touchZoom), double-tap (doubleClickZoom) and scroll (scrollWheelZoom
    // below) are separate Leaflet options, all true by default — removing
    // the button doesn't touch them, gesture zoom keeps working as-is.
    <MapContainer center={initialCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController pois={mappablePois} zone={zone} topInset={topInset} bottomInset={bottomInset} />
      <PanToSelected poi={selectedPoi} bottomInset={bottomInset} />
      {mappablePois.map(poi => (
        <Marker
          key={poi.id}
          position={[poi.latitude, poi.longitude]}
          icon={createPoiPin({
            category: poi.category,
            isPaid: poi.access_type === 'paid' || poi.access_type === 'mixed',
            priceLabel: poi.price_display || undefined,
            selected: poi.id === selectedPoiId,
          })}
          zIndexOffset={poi.id === selectedPoiId ? 1000 : 0}
          eventHandlers={{ click: () => onSelectPoi(poi.id) }}
        />
      ))}
    </MapContainer>
  );
}

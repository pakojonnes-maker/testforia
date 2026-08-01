import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getTranslation, getCategoryLabel } from '../lib/i18n';

// Fix leaflet default icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface POI {
  id: string;
  name: string;
  category: string;
  latitude?: number;
  longitude?: number;
  description?: string;
}

interface MapModalProps {
  pois: POI[];
  onClose: () => void;
  zoneName: string;
  lang: string;
}

export default function MapModal({ pois, onClose, zoneName, lang }: MapModalProps) {
  const validPois = pois.filter(p => p.latitude && p.longitude);
  const center: [number, number] = validPois.length > 0
    ? [validPois[0].latitude!, validPois[0].longitude!]
    : [36.7213, -4.4213]; // Nerja default

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-on-background/60 animate-[fadeIn_0.2s_ease]"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full h-full md:h-[90vh] md:w-[90vw] md:max-w-4xl md:mx-auto md:my-auto overflow-hidden bg-surface-container-lowest border border-on-background/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-surface-container-lowest border-b border-on-background/10">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-background">{zoneName}</h3>
            <p className="font-label-sm text-label-sm text-on-surface-variant">{getTranslation('places_on_map', lang).replace('{count}', String(validPois.length))}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-warm-sand transition-colors"
          >
            <span className="material-symbols-outlined text-on-background">close</span>
          </button>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {validPois.length > 0 ? (
            <MapContainer
              center={center}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {validPois.map(poi => (
                <Marker key={poi.id} position={[poi.latitude!, poi.longitude!]}>
                  <Popup>
                    <div className="font-sans">
                      <strong className="text-sm">{poi.name}</strong>
                      <p className="text-xs text-gray-500 mt-1">{getCategoryLabel(poi.category, lang)}</p>
                      {poi.description && <p className="text-xs mt-1">{poi.description}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-on-surface-variant">
              <p className="font-body-md text-body-md">{getTranslation('no_coordinates', lang)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

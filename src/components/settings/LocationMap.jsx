import { useMemo } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [-14.235, -51.9253];
const TILE_URL = import.meta.env.VITE_MAP_TILES_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = import.meta.env.VITE_MAP_TILES_ATTRIBUTION || '&copy; OpenStreetMap contributors';

function MapInteraction({ onChange }) {
  useMapEvents({
    click(event) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

export default function LocationMap({ latitude, longitude, onChange }) {
  const hasPoint = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const center = hasPoint ? [Number(latitude), Number(longitude)] : DEFAULT_CENTER;
  const markerIcon = useMemo(() => L.divIcon({
    className: 'market-location-marker',
    html: '<span aria-hidden="true">●</span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  }), []);

  return (
    <div role="region" aria-label="Mapa da localização" className="space-y-2">
      <div className="h-72 overflow-hidden rounded-2xl border border-gray-200 shadow-inner">
        <MapContainer center={center} zoom={hasPoint ? 17 : 4} scrollWheelZoom className="h-full w-full">
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <MapInteraction onChange={onChange} />
          {hasPoint && (
            <Marker
              position={center}
              icon={markerIcon}
              draggable
              eventHandlers={{ dragend: event => onChange(event.target.getLatLng()) }}
            />
          )}
          {!hasPoint && <CircleMarker center={DEFAULT_CENTER} radius={4} pathOptions={{ color: '#0f766e' }} />}
        </MapContainer>
      </div>
      <p className="text-xs text-gray-500">Arraste o marcador ou toque no mapa para ajustar a precisão.</p>
    </div>
  );
}

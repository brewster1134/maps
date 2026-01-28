import React from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from 'react-leaflet';
import { POI, Location } from '../types';
import '../styles/Map.scss';

interface MapComponentProps {
  origin: Location | null;
  destination: Location | null;
  pois: POI[];
  roundTrip: boolean;
  routeCoordinates: [number, number][];
}

export const MapComponent: React.FC<MapComponentProps> = ({
  origin,
  destination,
  pois,
  roundTrip,
  routeCoordinates,
}) => {
  return (
    <div className='map-container'>
      <MapContainer
        center={[36.7783, -119.4179]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          attribution='&copy; OpenStreetMap contributors'
        />
        {origin && (
          <Marker position={[origin.lat, origin.lng]}>
            <Popup>Origin</Popup>
          </Marker>
        )}
        {destination && !roundTrip && (
          <Marker position={[destination.lat, destination.lng]}>
            <Popup>Destination</Popup>
          </Marker>
        )}
        {pois.map((poi) => (
          <Marker key={poi.id} position={[Number(poi.lat), Number(poi.lng)]}>
            <Popup>
              {poi.sequence ? `#${poi.sequence} - ` : ''}
              {poi.name}
            </Popup>
          </Marker>
        ))}
        {routeCoordinates.length > 0 && (
          <Polyline positions={routeCoordinates} color='blue' weight={4} />
        )}
      </MapContainer>
    </div>
  );
};

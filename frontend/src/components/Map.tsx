import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import { POI, Location } from '../types';
import { getPOIVisitStatus } from '../utils/location';
import '../styles/Map.scss';

interface MapComponentProps {
  destination: Location | null;
  origin: Location | null;
  pendingPoi?: POI | null;
  pois: POI[];
  roundTrip: boolean;
  routeCoordinates: [number, number][];
}

// Helper to create numbered marker icon
const createNumberedIcon = (
  number: number,
  state: 'default' | 'current' | 'visited',
): L.DivIcon => {
  const colors = {
    default: { bg: '#3388ff', text: '#ffffff' },
    current: { bg: '#2ecc71', text: '#ffffff' },
    visited: { bg: '#95a5a6', text: '#ffffff' },
  };

  const color = colors[state];

  return new L.DivIcon({
    className: 'numbered-marker',
    html: `
      <div style="
        background-color: ${color.bg};
        color: ${color.text};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: ${number > 99 ? '10px' : '12px'};
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        transform: rotate(-45deg);
        position: relative;
      ">
        <span style="transform: rotate(45deg);">${number}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

export const MapComponent: React.FC<MapComponentProps> = ({
  destination,
  origin,
  pendingPoi,
  pois,
  roundTrip,
  routeCoordinates,
}) => {
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Get user's location
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 27000,
        },
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Calculate visit status
  const visitStatus = getPOIVisitStatus(userLocation, pois);

  // Helper to get icon for POI
  const getIconForPOI = (poi: POI, index: number): L.DivIcon => {
    const sequenceNumber = poi.sequence || index + 1;

    if (index === visitStatus.currentIndex) {
      return createNumberedIcon(sequenceNumber, 'current');
    } else if (visitStatus.visitedIndices.includes(index)) {
      return createNumberedIcon(sequenceNumber, 'visited');
    } else {
      return createNumberedIcon(sequenceNumber, 'default');
    }
  };

  // Split route into visited and unvisited segments
  const getRouteSegments = () => {
    if (routeCoordinates.length === 0 || visitStatus.currentIndex < 0) {
      return {
        visitedRoute: [],
        upcomingRoute: routeCoordinates,
      };
    }

    const currentPOI = pois[visitStatus.currentIndex];
    if (!currentPOI) {
      return {
        visitedRoute: [],
        upcomingRoute: routeCoordinates,
      };
    }

    const currentPOICoord: [number, number] = [
      Number(currentPOI.lat),
      Number(currentPOI.lng),
    ];

    let closestRouteIndex = 0;
    let minDistance = Infinity;

    routeCoordinates.forEach((coord, index) => {
      const distance = Math.sqrt(
        Math.pow(coord[0] - currentPOICoord[0], 2) +
          Math.pow(coord[1] - currentPOICoord[1], 2),
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestRouteIndex = index;
      }
    });

    return {
      visitedRoute: routeCoordinates.slice(0, closestRouteIndex + 1),
      upcomingRoute: routeCoordinates.slice(closestRouteIndex),
    };
  };

  const { visitedRoute, upcomingRoute } = getRouteSegments();

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
          <Marker
            position={[origin.lat, origin.lng]}
            icon={
              new L.DivIcon({
                className: 'origin-marker',
                html: `
                <div style="
                  background-color: #e74c3c;
                  color: white;
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  border: 2px solid white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 14px;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                ">
                  A
                </div>
              `,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16],
              })
            }
          >
            <Popup>Origin</Popup>
          </Marker>
        )}

        {destination && !roundTrip && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={
              new L.DivIcon({
                className: 'destination-marker',
                html: `
                <div style="
                  background-color: #e74c3c;
                  color: white;
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  border: 2px solid white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  font-size: 14px;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                ">
                  B
                </div>
              `,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16],
              })
            }
          >
            <Popup>Destination</Popup>
          </Marker>
        )}

        {pois.map((poi, index) => (
          <Marker
            key={poi.id}
            position={[Number(poi.lat), Number(poi.lng)]}
            icon={getIconForPOI(poi, index)}
          >
            <Popup>
              {poi.sequence ? `#${poi.sequence} - ` : ''}
              {poi.name}
              {index === visitStatus.currentIndex && ' (Current)'}
              {visitStatus.visitedIndices.includes(index) && ' (Visited)'}
            </Popup>
          </Marker>
        ))}

        {/* Visited portion of route (grey) */}
        {visitedRoute.length > 0 && (
          <Polyline
            positions={visitedRoute}
            color='#888888'
            weight={4}
            opacity={0.5}
          />
        )}

        {/* Upcoming portion of route (blue) */}
        {upcomingRoute.length > 0 && (
          <Polyline positions={upcomingRoute} color='blue' weight={4} />
        )}

        {pendingPoi && (
          <Marker
            position={[Number(pendingPoi.lat), Number(pendingPoi.lng)]}
            icon={
              new L.DivIcon({
                className: 'pending-poi-marker',
                html: `
          <div style="
            background-color: #f39c12;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 2px dashed white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            opacity: 0.9;
          ">
            +
          </div>
        `,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
              })
            }
          >
            <Popup>
              <strong>New POI (not added yet)</strong>
              <br />
              {pendingPoi.name}
            </Popup>
          </Marker>
        )}

        {/* Show user's current location with pulsing blue dot */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={
              new L.DivIcon({
                className: 'user-location-marker',
                html: `
                <div style="
                  position: relative;
                  width: 20px;
                  height: 20px;
                ">
                  <!-- Outer pulsing ring -->
                  <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background-color: rgba(66, 133, 244, 0.3);
                    animation: pulse 2s infinite;
                  "></div>
                  <!-- Inner blue dot -->
                  <div style="
                    position: absolute;
                    top: 5px;
                    left: 5px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background-color: #4285f4;
                    border: 2px solid white;
                    box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
                  "></div>
                </div>
              `,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                popupAnchor: [0, -10],
              })
            }
          >
            <Popup>Your Current Location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

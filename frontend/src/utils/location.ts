import { POI } from '../types';

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number },
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export interface POIVisitStatus {
  currentIndex: number; // Index of closest POI (-1 if too far)
  visitedIndices: number[]; // Indices of POIs before current
}

/**
 * Determine which POIs have been "visited" based on current location
 * Assumes user is at/near the closest POI, and all previous POIs are visited
 */
export function getPOIVisitStatus(
  userLocation: { lat: number; lng: number } | null,
  pois: POI[],
  maxDistanceMiles: number = 5,
): POIVisitStatus {
  // If no location or no POIs, nothing is visited
  if (!userLocation || pois.length === 0) {
    return { currentIndex: -1, visitedIndices: [] };
  }

  // Find closest POI
  let closestIndex = 0;
  let minDistance = Infinity;

  pois.forEach((poi, index) => {
    const distance = calculateDistance(userLocation, {
      lat: Number(poi.lat),
      lng: Number(poi.lng),
    });

    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  // If user is too far from any POI, don't mark anything as visited
  if (minDistance > maxDistanceMiles) {
    return { currentIndex: -1, visitedIndices: [] };
  }

  // All POIs before the closest one are considered visited
  const visitedIndices = Array.from({ length: closestIndex }, (_, i) => i);

  return {
    currentIndex: closestIndex,
    visitedIndices,
  };
}

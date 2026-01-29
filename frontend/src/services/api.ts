import {
  POI,
  Location,
  GeoResult,
  MatrixStatus,
  OptimizedTrip,
  RouteData,
} from '../types';

const API_URL = '/api';

// ---------- POI ENDPOINTS ----------
export async function fetchPOIs(): Promise<POI[]> {
  const res = await fetch(`${API_URL}/pois-with-sequence`);
  return res.json();
}

export async function createPOI(poi: {
  name: string;
  lat: number;
  lng: number;
  notes?: string;
}): Promise<POI> {
  const res = await fetch(`${API_URL}/pois`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(poi),
  });
  return res.json();
}

export async function deletePOI(id: string): Promise<void> {
  await fetch(`${API_URL}/pois/${id}`, { method: 'DELETE' });
}

// ---------- MATRIX ENDPOINTS ----------
export async function fetchMatrixStatus(): Promise<MatrixStatus> {
  const res = await fetch(`${API_URL}/matrix-status`);
  return res.json();
}

export async function buildMatrix(): Promise<{
  message: string;
  totalPOIs: number;
  totalPairs: number;
}> {
  const res = await fetch(`${API_URL}/build-matrix`, { method: 'POST' });
  return res.json();
}

// ---------- OPTIMIZATION ENDPOINTS ----------
export async function fetchOptimizedTrip(): Promise<OptimizedTrip | null> {
  const res = await fetch(`${API_URL}/optimized-trip`);
  return res.json();
}

export async function optimizeTrip(params: {
  origin: Location;
  destination?: Location;
  pois: POI[];
  roundTrip: boolean;
}): Promise<RouteData> {
  const res = await fetch(`${API_URL}/optimize-trip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(
      errorData.error || errorData.message || 'Optimization failed',
    );
  }

  return res.json();
}

// ---------- OPTIMIZATION ENDPOINTS ----------
export async function reverseOptimizedRoute(): Promise<OptimizedTrip> {
  const res = await fetch(`${API_URL}/pois-reverse`, {
    method: 'POST',
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to reverse route');
  }

  return res.json();
}

// ---------- GEOCODING ENDPOINTS ----------
export async function searchLocation(query: string): Promise<GeoResult[]> {
  const res = await fetch(
    `${API_URL}/geocode?query=${encodeURIComponent(query)}`,
  );
  return res.json();
}

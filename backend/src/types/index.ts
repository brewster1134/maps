export interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  notes?: string;
  createdAt?: string;
}

export interface DistanceMatrix {
  distances: Record<string, number>;
  durations: Record<string, number>;
  lastUpdated: string | null;
}

export interface MatrixStatus {
  calculated: number;
  skipped: number;
  failed: number;
  total: number;
}

export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export interface OptimizedPOI {
  lat: number;
  lng: number;
  sequence: number;
  name?: string;
}

export interface OptimizedTrip {
  origin: Location;
  destination: Location | null;
  roundTrip: boolean;
  optimizedOrder: OptimizedPOI[];
  lastOptimized: string;
}

export interface ValhallaRouteResponse {
  trip: {
    summary: { length: number; time: number };
    legs: Array<{ shape?: string }>;
  };
}

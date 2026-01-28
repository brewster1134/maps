export interface POI {
  id?: string;
  name: string;
  lat: number | string;
  lng: number | string;
  notes?: string;
  sequence?: number;
  createdAt?: string;
}

export interface Location {
  lat: number;
  lng: number;
  name?: string;
}

export interface GeoResult {
  lat: string;
  lon: string;
  display_name: string;
}

export interface RouteLeg {
  shape?: string;
}

export interface RouteTrip {
  legs: RouteLeg[];
  summary: { length: number; time: number };
}

export interface RouteData {
  route: {
    trip?: RouteTrip;
  };
  optimizedOrder?: POI[];
  message?: string;
  optimizedCount?: number;
  totalCount?: number;
}

export interface MatrixStatus {
  calculatedPairs: number;
  totalPairs: number;
  percentComplete: string;
  missingPairs: number;
  lastUpdated?: string;
  sampleMissing?: Array<{ poi1: string; poi2: string }>;
}

export interface OptimizedTrip {
  origin: Location;
  destination: Location | null;
  roundTrip: boolean;
  optimizedOrder: Array<{
    lat: number;
    lng: number;
    sequence: number;
    name?: string;
  }>;
  lastOptimized: string;
}

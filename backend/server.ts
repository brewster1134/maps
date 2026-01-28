import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

// ---------- CONFIG ----------
const VROOM_URL = process.env.VROOM_URL || 'http://localhost:3000';
const VALHALLA_URL = process.env.VALHALLA_URL || 'http://localhost:8002';
const NOMINATIM_URL = process.env.NOMINATIM_URL || 'http://localhost:8080';
const POI_FILE = '/data/pois/pois.json';
const MATRIX_FILE = '/data/pois/distance_matrix.json';

// Ensure POI directory exists
await fs.mkdir('/data/pois', { recursive: true }).catch(() => {});

// ---------- TYPES ----------
interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  notes?: string;
  sequence?: number;
  optimizedUpTo?: number;
  fullyOptimized?: boolean;
  createdAt?: string;
  lastOptimized?: string;
}

interface DistanceMatrix {
  distances: Record<string, number>;
  durations: Record<string, number>;
  lastUpdated: string | null;
}

interface MatrixStatus {
  calculated: number;
  skipped: number;
  failed: number;
  total: number;
}

interface Location {
  lat: number;
  lng: number;
  name?: string;
}

interface ValhallaRouteResponse {
  trip: {
    summary: { length: number; time: number };
  };
}

// ---------- FILE OPS ----------
async function loadPOIs(): Promise<POI[]> {
  try {
    const data = await fs.readFile(POI_FILE, 'utf-8');
    return JSON.parse(data) as POI[];
  } catch {
    return [];
  }
}

async function savePOIs(pois: POI[]): Promise<void> {
  await fs.writeFile(POI_FILE, JSON.stringify(pois, null, 2));
}

async function loadMatrix(): Promise<DistanceMatrix> {
  try {
    const data = await fs.readFile(MATRIX_FILE, 'utf-8');
    return JSON.parse(data) as DistanceMatrix;
  } catch {
    return { distances: {}, durations: {}, lastUpdated: null };
  }
}

async function saveMatrix(matrix: DistanceMatrix): Promise<void> {
  await fs.writeFile(MATRIX_FILE, JSON.stringify(matrix, null, 2));
}

// ---------- MATRIX HELPERS ----------
function getMatrixKey(id1: string, id2: string) {
  return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
}

async function calculateDistance(
  poi1: POI,
  poi2: POI,
): Promise<{ distance: number; duration: number } | null> {
  try {
    const response = await axios.post<ValhallaRouteResponse>(
      `${VALHALLA_URL}/route`,
      {
        locations: [
          { lat: poi1.lat, lon: poi1.lng },
          { lat: poi2.lat, lon: poi2.lng },
        ],
        costing: 'auto',
        directions_options: { units: 'kilometers' },
      },
      { timeout: 30000 },
    );

    const summary = response.data.trip.summary;
    return { distance: summary.length, duration: summary.time };
  } catch (error: any) {
    console.error(
      `Failed to calculate distance between ${poi1.id} and ${poi2.id}:`,
      error.message,
    );
    return null;
  }
}

async function buildDistanceMatrix(
  pois: POI[],
  onProgress?: (status: MatrixStatus) => void,
): Promise<MatrixStatus> {
  const matrix = await loadMatrix();
  const totalPairs = (pois.length * (pois.length - 1)) / 2;
  let calculated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < pois.length; i++) {
    for (let j = i + 1; j < pois.length; j++) {
      const poi1 = pois[i];
      const poi2 = pois[j];
      const key = getMatrixKey(poi1.id, poi2.id);

      if (matrix.distances[key] !== undefined) {
        skipped++;
        onProgress?.({ calculated, skipped, failed, total: totalPairs });
        continue;
      }

      const result = await calculateDistance(poi1, poi2);

      if (result) {
        matrix.distances[key] = result.distance;
        matrix.durations[key] = result.duration;
        calculated++;

        if (calculated % 10 === 0) {
          matrix.lastUpdated = new Date().toISOString();
          await saveMatrix(matrix);
        }
      } else {
        failed++;
      }

      onProgress?.({ calculated, skipped, failed, total: totalPairs });

      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  matrix.lastUpdated = new Date().toISOString();
  await saveMatrix(matrix);
  return { calculated, skipped, failed, total: totalPairs };
}

// ---------- EXPRESS ROUTES ----------

// GET POIs
app.get('/api/pois', async (_req: Request, res: Response) => {
  const pois = await loadPOIs();
  res.json(pois);
});

// ADD POI
app.post('/api/pois', async (req: Request, res: Response) => {
  const pois = await loadPOIs();
  const body = req.body as Partial<POI>;
  const newPOI: POI = {
    id: Date.now().toString(),
    lat: Number(body.lat),
    lng: Number(body.lng),
    name: body.name || '',
    notes: body.notes,
    createdAt: new Date().toISOString(),
  };
  pois.push(newPOI);
  await savePOIs(pois);
  res.json(newPOI);
});

// UPDATE POI
app.put('/api/pois/:id', async (req: Request, res: Response) => {
  const pois = await loadPOIs();
  const index = pois.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'POI not found' });
  pois[index] = { ...pois[index], ...req.body };
  await savePOIs(pois);
  res.json(pois[index]);
});

// DELETE POI
app.delete('/api/pois/:id', async (req: Request, res: Response) => {
  const pois = await loadPOIs();
  const filtered = pois.filter((p) => p.id !== req.params.id);
  await savePOIs(filtered);
  res.json({ success: true });
});

// MATRIX STATUS
app.get('/api/matrix-status', async (_req: Request, res: Response) => {
  const pois = await loadPOIs();
  const matrix = await loadMatrix();
  const totalPairs = (pois.length * (pois.length - 1)) / 2;
  const calculatedPairs = Object.keys(matrix.distances).length;
  const missingPairs = totalPairs - calculatedPairs;

  res.json({
    totalPOIs: pois.length,
    totalPairs,
    calculatedPairs,
    missingPairs,
    percentComplete:
      totalPairs > 0
        ? ((calculatedPairs / totalPairs) * 100).toFixed(1)
        : '100',
    lastUpdated: matrix.lastUpdated,
  });
});

// BUILD MATRIX
app.post('/api/build-matrix', async (_req: Request, res: Response) => {
  const pois = await loadPOIs();
  if (pois.length === 0)
    return res.status(400).json({ error: 'No POIs to build matrix for' });

  buildDistanceMatrix(pois).catch((err) =>
    console.error('Matrix building error:', err),
  );
  res.json({
    message: 'Matrix building started',
    totalPOIs: pois.length,
    totalPairs: (pois.length * (pois.length - 1)) / 2,
  });
});

// OPTIMIZE TRIP
app.post('/api/optimize-trip', async (req: Request, res: Response) => {
  try {
    const { origin, destination, pois, roundTrip } = req.body as {
      origin: Location;
      destination?: Location;
      pois: POI[];
      roundTrip: boolean;
    };

    if (!pois || pois.length === 0)
      return res.status(400).json({ error: 'No POIs to optimize' });

    const matrix = await loadMatrix();
    const totalPairs = (pois.length * (pois.length - 1)) / 2;
    const calculatedPairs = pois.reduce(
      (count, poi1, i) =>
        count +
        pois.slice(i + 1).reduce((innerCount, poi2) => {
          const key = getMatrixKey(poi1.id, poi2.id);
          return innerCount + (matrix.distances[key] !== undefined ? 1 : 0);
        }, 0),
      0,
    );

    if (calculatedPairs < totalPairs) {
      return res.status(400).json({
        error: 'Distance matrix incomplete',
        message: `Matrix is ${((calculatedPairs / totalPairs) * 100).toFixed(1)}% complete. Build matrix first.`,
      });
    }

    // VROOM request
    const vroomRequest = {
      vehicles: [
        {
          id: 1,
          start: [origin.lng, origin.lat],
          end: roundTrip
            ? [origin.lng, origin.lat]
            : destination
              ? [destination.lng, destination.lat]
              : [origin.lng, origin.lat],
          profile: 'auto',
        },
      ],
      jobs: pois.map((poi, idx) => ({
        id: idx + 1,
        location: [poi.lng, poi.lat],
        service: 300,
      })),
      options: { g: true },
    };

    const vroomResponse = await axios.post(`${VROOM_URL}/`, vroomRequest, {
      timeout: 600000,
    });
    const route = vroomResponse.data.routes[0];
    const optimizedOrder: POI[] = route.steps
      .filter((s: any) => s.type === 'job')
      .map((s: any) => pois[s.job - 1]);

    // Full route from Valhalla
    const waypoints = [
      { lat: origin.lat, lon: origin.lng },
      ...optimizedOrder.map((poi) => ({ lat: poi.lat, lon: poi.lng })),
      roundTrip
        ? { lat: origin.lat, lon: origin.lng }
        : destination
          ? { lat: destination.lat, lon: destination.lng }
          : { lat: origin.lat, lon: origin.lng },
    ];

    const valhallaResponse = await axios.post(`${VALHALLA_URL}/route`, {
      locations: waypoints,
      costing: 'auto',
      directions_options: { units: 'miles' },
    });

    res.json({
      vroom: vroomResponse.data,
      route: valhallaResponse.data,
      optimizedOrder,
      autoSaved: true,
      fullyOptimized: true,
    });
  } catch (error: any) {
    console.error('Optimization error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Optimization failed',
      details: error.response?.data || error.message,
    });
  }
});

// GEOCODE
app.get('/api/geocode', async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string;
    const response = await axios.get(`${NOMINATIM_URL}/search`, {
      params: { q: query, format: 'json', limit: 10 },
      headers: { 'User-Agent': 'OSM-Trip-Planner/1.0' },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

// ---------- START SERVER ----------
const PORT = 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

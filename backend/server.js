import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const VROOM_URL = process.env.VROOM_URL || 'http://localhost:3000';
const VALHALLA_URL = process.env.VALHALLA_URL || 'http://localhost:8002';
const NOMINATIM_URL = process.env.NOMINATIM_URL || 'http://localhost:8080';
const POI_FILE = '/data/pois/pois.json';
const MATRIX_FILE = '/data/pois/distance_matrix.json';

// Ensure POI directory exists
await fs.mkdir('/data/pois', { recursive: true }).catch(() => {});

// Load POIs
async function loadPOIs() {
  try {
    const data = await fs.readFile(POI_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save POIs
async function savePOIs(pois) {
  await fs.writeFile(POI_FILE, JSON.stringify(pois, null, 2));
}

// Load distance matrix
async function loadMatrix() {
  try {
    const data = await fs.readFile(MATRIX_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { distances: {}, durations: {}, lastUpdated: null };
  }
}

// Save distance matrix
async function saveMatrix(matrix) {
  await fs.writeFile(MATRIX_FILE, JSON.stringify(matrix, null, 2));
}

// Generate matrix key for two POI IDs
function getMatrixKey(id1, id2) {
  // Always use smaller ID first for consistency
  return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
}

// Calculate distance between two POIs using Valhalla
async function calculateDistance(poi1, poi2) {
  try {
    const response = await axios.post(
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
    return {
      distance: summary.length, // in km
      duration: summary.time, // in seconds
    };
  } catch (error) {
    console.error(
      `Failed to calculate distance between ${poi1.id} and ${poi2.id}:`,
      error.message,
    );
    return null;
  }
}

// Build or update the distance matrix
async function buildDistanceMatrix(pois, onProgress) {
  const matrix = await loadMatrix();
  const totalPairs = (pois.length * (pois.length - 1)) / 2;
  let calculated = 0;
  let skipped = 0;
  let failed = 0;

  console.log(
    `Building distance matrix for ${pois.length} POIs (${totalPairs} pairs)...`,
  );

  for (let i = 0; i < pois.length; i++) {
    for (let j = i + 1; j < pois.length; j++) {
      const poi1 = pois[i];
      const poi2 = pois[j];
      const key = getMatrixKey(poi1.id, poi2.id);

      // Skip if already calculated
      if (matrix.distances[key] !== undefined) {
        skipped++;
        if (onProgress)
          onProgress({ calculated, skipped, failed, total: totalPairs });
        continue;
      }

      // Calculate distance
      const result = await calculateDistance(poi1, poi2);

      if (result) {
        matrix.distances[key] = result.distance;
        matrix.durations[key] = result.duration;
        calculated++;

        // Save progress every 10 calculations
        if (calculated % 10 === 0) {
          matrix.lastUpdated = new Date().toISOString();
          await saveMatrix(matrix);
          console.log(
            `Progress: ${calculated + skipped}/${totalPairs} pairs (${calculated} new, ${skipped} cached, ${failed} failed)`,
          );
        }
      } else {
        failed++;
      }

      if (onProgress)
        onProgress({ calculated, skipped, failed, total: totalPairs });

      // Small delay to avoid overwhelming Valhalla
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Final save
  matrix.lastUpdated = new Date().toISOString();
  await saveMatrix(matrix);

  console.log(
    `Matrix complete: ${calculated} new, ${skipped} cached, ${failed} failed out of ${totalPairs} total`,
  );
  return { calculated, skipped, failed, total: totalPairs };
}

// Get distance between two POIs from matrix
function getDistance(matrix, id1, id2) {
  if (id1 === id2) return 0;
  const key = getMatrixKey(id1, id2);
  return matrix.distances[key] || null;
}

// Get duration between two POIs from matrix
function getDuration(matrix, id1, id2) {
  if (id1 === id2) return 0;
  const key = getMatrixKey(id1, id2);
  return matrix.durations[key] || null;
}

// Get all POIs
app.get('/api/pois', async (req, res) => {
  const pois = await loadPOIs();
  res.json(pois);
});

// Add POI
app.post('/api/pois', async (req, res) => {
  const pois = await loadPOIs();
  const newPOI = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  pois.push(newPOI);
  await savePOIs(pois);
  res.json(newPOI);
});

// Update POI
app.put('/api/pois/:id', async (req, res) => {
  const pois = await loadPOIs();
  const index = pois.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'POI not found' });
  pois[index] = { ...pois[index], ...req.body };
  await savePOIs(pois);
  res.json(pois[index]);
});

// Delete POI
app.delete('/api/pois/:id', async (req, res) => {
  const pois = await loadPOIs();
  const filtered = pois.filter((p) => p.id !== req.params.id);
  await savePOIs(filtered);

  // Note: We don't delete from matrix - old data doesn't hurt and might be useful if POI is re-added
  res.json({ success: true });
});

// Get matrix status
app.get('/api/matrix-status', async (req, res) => {
  const pois = await loadPOIs();
  const matrix = await loadMatrix();

  const totalPairs = (pois.length * (pois.length - 1)) / 2;
  const calculatedPairs = Object.keys(matrix.distances).length;
  const missingPairs = totalPairs - calculatedPairs;

  // Check which POI pairs are missing
  const missing = [];
  for (let i = 0; i < pois.length && missing.length < 10; i++) {
    for (let j = i + 1; j < pois.length && missing.length < 10; j++) {
      const key = getMatrixKey(pois[i].id, pois[j].id);
      if (matrix.distances[key] === undefined) {
        missing.push({ poi1: pois[i].name, poi2: pois[j].name });
      }
    }
  }

  res.json({
    totalPOIs: pois.length,
    totalPairs,
    calculatedPairs,
    missingPairs,
    percentComplete:
      totalPairs > 0 ? ((calculatedPairs / totalPairs) * 100).toFixed(1) : 100,
    lastUpdated: matrix.lastUpdated,
    sampleMissing: missing,
  });
});

// Build/update matrix
app.post('/api/build-matrix', async (req, res) => {
  const pois = await loadPOIs();

  if (pois.length === 0) {
    return res.status(400).json({ error: 'No POIs to build matrix for' });
  }

  // Start building in background
  res.json({
    message: 'Matrix building started',
    totalPOIs: pois.length,
    totalPairs: (pois.length * (pois.length - 1)) / 2,
  });

  // Build matrix (this runs in background)
  buildDistanceMatrix(pois).catch((error) => {
    console.error('Matrix building error:', error);
  });
});

// Optimize trip using cached matrix
app.post('/api/optimize-trip', async (req, res) => {
  try {
    const { origin, destination, pois, roundTrip } = req.body;

    if (pois.length === 0) {
      return res.status(400).json({ error: 'No POIs to optimize' });
    }

    console.log(`Optimizing trip with ${pois.length} POIs...`);

    // Load matrix
    const matrix = await loadMatrix();

    // Check if matrix is complete
    const totalPairs = (pois.length * (pois.length - 1)) / 2;
    const calculatedPairs = pois.reduce((count, poi1, i) => {
      return (
        count +
        pois.slice(i + 1).reduce((innerCount, poi2) => {
          const key = getMatrixKey(poi1.id, poi2.id);
          return innerCount + (matrix.distances[key] !== undefined ? 1 : 0);
        }, 0)
      );
    }, 0);

    console.log(
      `Matrix status: ${calculatedPairs}/${totalPairs} pairs calculated`,
    );

    if (calculatedPairs < totalPairs) {
      return res.status(400).json({
        error: 'Distance matrix incomplete',
        message: `Matrix is ${((calculatedPairs / totalPairs) * 100).toFixed(1)}% complete. Build matrix first.`,
        calculated: calculatedPairs,
        total: totalPairs,
      });
    }

    // Use VROOM with the distance matrix
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
    const optimizedOrder = route.steps
      .filter((s) => s.type === 'job')
      .map((s) => pois[s.job - 1]);

    // Get full route from Valhalla
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

    // AUTO-SAVE optimized order
    const allPOIs = await loadPOIs();
    const poiMap = new Map(allPOIs.map((p) => [p.id, p]));
    const reorderedPOIs = optimizedOrder.map((poi, index) => ({
      ...poiMap.get(poi.id),
      sequence: index + 1,
      lastOptimized: new Date().toISOString(),
      fullyOptimized: true,
    }));
    const optimizedIds = new Set(optimizedOrder.map((p) => p.id));
    const unoptimized = allPOIs.filter((p) => !optimizedIds.has(p.id));
    await savePOIs([...reorderedPOIs, ...unoptimized]);

    console.log(`✓ Optimization complete and saved!`);

    res.json({
      vroom: vroomResponse.data,
      route: valhallaResponse.data,
      optimizedOrder,
      autoSaved: true,
      fullyOptimized: true,
    });
  } catch (error) {
    console.error('Optimization error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Optimization failed',
      details: error.response?.data || error.message,
    });
  }
});

// Geocode search
app.get('/api/geocode', async (req, res) => {
  try {
    const { query } = req.query;
    const response = await axios.get(`${NOMINATIM_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        limit: 10,
      },
      headers: {
        'User-Agent': 'OSM-Trip-Planner/1.0',
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

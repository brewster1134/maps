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
const POI_FILE = '/data/pois/pois.json';

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
  res.json({ success: true });
});

// Optimize trip
app.post('/api/optimize-trip', async (req, res) => {
  try {
    const { origin, destination, pois, roundTrip } = req.body;

    // Build VROOM request
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
        },
      ],
      jobs: pois.map((poi, idx) => ({
        id: idx + 1,
        location: [poi.lng, poi.lat],
        service: 300,
      })),
      options: {
        g: true,
      },
    };

    // Call VROOM
    const vroomResponse = await axios.post(`${VROOM_URL}/`, vroomRequest);

    // Get detailed route from Valhalla
    const route = vroomResponse.data.routes[0];
    const waypoints = [
      { lat: origin.lat, lon: origin.lng },
      ...route.steps
        .filter((s) => s.type === 'job')
        .map((s) => {
          const poi = pois[s.job - 1];
          return { lat: poi.lat, lon: poi.lng };
        }),
      roundTrip
        ? { lat: origin.lat, lon: origin.lng }
        : destination
          ? { lat: destination.lat, lon: destination.lng }
          : { lat: origin.lat, lon: origin.lng },
    ];

    const valhallaRequest = {
      locations: waypoints,
      costing: 'auto',
      directions_options: { units: 'miles' },
    };

    const valhallaResponse = await axios.post(
      `${VALHALLA_URL}/route`,
      valhallaRequest,
    );

    res.json({
      vroom: vroomResponse.data,
      route: valhallaResponse.data,
      optimizedOrder: route.steps
        .filter((s) => s.type === 'job')
        .map((s) => pois[s.job - 1]),
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
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search`,
      {
        params: {
          q: query,
          format: 'json',
          limit: 5,
        },
        headers: {
          'User-Agent': 'maps/1.0',
        },
      },
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

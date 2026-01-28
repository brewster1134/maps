import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { ensureDataDir } from './utils/storage.js';

// Routes
import poisRoutes from './routes/pois.js';
import matrixRoutes from './routes/matrix.js';
import optimizeRoutes from './routes/optimize.js';
import geocodeRoutes from './routes/geocode.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
await ensureDataDir();

// Mount routes
app.use('/api', poisRoutes);
app.use('/api', matrixRoutes);
app.use('/api', optimizeRoutes);
app.use('/api', geocodeRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(config.server.port, () => {
  console.log(`🚀 Backend running on port ${config.server.port}`);
  console.log(`📍 Data directory: ${config.files.dataDir}`);
  console.log(`🗺️  VROOM: ${config.vroom.url}`);
  console.log(`🛣️  Valhalla: ${config.valhalla.url}`);
  console.log(`📍 Nominatim: ${config.nominatim.url}`);
});

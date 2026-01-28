import fs from 'fs';

interface Bounds {
  viewbox: string;
  bounded: number;
  region?: string;
  generated?: string;
}

function loadBounds(): Bounds | null {
  const boundsPath = process.env.BOUNDS_FILE || '/app/config/bounds.json';

  try {
    if (fs.existsSync(boundsPath)) {
      const boundsData = fs.readFileSync(boundsPath, 'utf-8');
      const bounds = JSON.parse(boundsData);
      console.log(`✓ Loaded geographic bounds for region: ${bounds.region}`);
      console.log(`  Viewbox: ${bounds.viewbox}`);
      console.log(`  From: ${boundsPath}`);
      return bounds;
    }
  } catch (error) {
    console.error('Failed to load bounds:', error);
  }

  console.warn(
    `⚠ No bounds file found at ${boundsPath} - geocoding searches will be unrestricted`,
  );
  return null;
}

export const config = {
  vroom: {
    url: process.env.VROOM_URL || 'http://localhost:3000',
  },
  valhalla: {
    url: process.env.VALHALLA_URL || 'http://localhost:8002',
  },
  nominatim: {
    url: process.env.NOMINATIM_URL || 'http://localhost:8080',
    bounds: loadBounds(),
  },
  server: {
    port: parseInt(process.env.PORT || '3001'),
  },
  files: {
    dataDir: process.env.DATA_DIR || '/data/pois',
    poisFile: process.env.POIS_FILE || '/data/pois/pois.json',
    matrixFile: process.env.MATRIX_FILE || '/data/pois/distance_matrix.json',
    optimizedFile:
      process.env.OPTIMIZED_FILE || '/data/pois/optimized_pois.json',
  },
  matrix: {
    coordinatePrecision: parseInt(process.env.COORDINATE_PRECISION || '6'),
    saveInterval: parseInt(process.env.SAVE_INTERVAL || '10'),
    requestDelay: parseInt(process.env.REQUEST_DELAY || '100'),
  },
};

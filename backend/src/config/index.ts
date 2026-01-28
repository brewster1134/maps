export const config = {
  vroom: {
    url: process.env.VROOM_URL || 'http://localhost:3000',
  },
  valhalla: {
    url: process.env.VALHALLA_URL || 'http://localhost:8002',
  },
  nominatim: {
    url: process.env.NOMINATIM_URL || 'http://localhost:8080',
  },
  server: {
    port: parseInt(process.env.PORT || '3001'),
  },
  files: {
    dataDir: '/data/pois',
    poisFile: '/data/pois/pois.json',
    matrixFile: '/data/pois/distance_matrix.json',
    optimizedFile: '/data/pois/optimized_pois.json',
  },
  matrix: {
    coordinatePrecision: 6, // decimal places for lat/lng in matrix keys
    saveInterval: 10, // save matrix every N calculations
    requestDelay: 100, // ms delay between Valhalla requests
  },
};

# Trip Planner Backend

Self-hosted trip planning backend using VROOM, Valhalla, and Nominatim.

## Project Structure

```
src/
├── server.ts              # Main entry point
├── config/
│   └── index.ts          # Configuration and environment variables
├── types/
│   └── index.ts          # TypeScript interfaces
├── utils/
│   ├── storage.ts        # File I/O operations
│   └── matrix.ts         # Matrix utilities
├── services/
│   ├── matrix.ts         # Distance matrix building
│   └── optimizer.ts      # Trip optimization logic
└── routes/
    ├── pois.ts           # POI CRUD endpoints
    ├── matrix.ts         # Matrix status/building endpoints
    ├── optimize.ts       # Trip optimization endpoints
    └── geocode.ts        # Location search endpoints
```

## Data Files

- **`pois.json`** - Source of truth for POI locations and metadata
- **`distance_matrix.json`** - Cached pairwise distances (location-based keys)
- **`optimized_pois.json`** - Current trip state with sequence numbers

## API Endpoints

### POIs

- `GET /api/pois` - Get all POIs (normalized)
- `GET /api/pois-with-sequence` - Get POIs with sequence numbers
- `POST /api/pois` - Add new POI
- `PUT /api/pois/:id` - Update POI
- `DELETE /api/pois/:id` - Delete POI

### Matrix

- `GET /api/matrix-status` - Get matrix completeness status
- `POST /api/build-matrix` - Build distance matrix (background)

### Optimization

- `GET /api/optimized-trip` - Get current optimized trip state
- `POST /api/optimize-trip` - Optimize trip with origin/destination

### Geocoding

- `GET /api/geocode?query=...` - Search for locations

## Development

```bash
# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Clean build artifacts
npm run clean
```

## Configuration

Environment variables (set in docker-compose.yml or .env):

- `VROOM_URL` - VROOM service URL (default: http://localhost:3000)
- `VALHALLA_URL` - Valhalla service URL (default: http://localhost:8002)
- `NOMINATIM_URL` - Nominatim service URL (default: http://localhost:8080)
- `PORT` - Server port (default: 3001)

## How It Works

1. **Add POIs** → System creates placeholder entries in distance matrix
2. **Build Matrix** → Calculates all missing distances, saves incrementally
3. **Optimize Trip** → Uses cached matrix for fast VROOM optimization
4. **Save State** → Stores optimized order in `optimized_pois.json`

The distance matrix uses lat/lng coordinates as keys, making it stable across POI deletions/additions and reusable for the same locations.

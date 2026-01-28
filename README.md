# Maps!

Self-hosted trip planning application using OpenStreetMap data with VROOM optimization, Valhalla routing, and Nominatim geocoding.

## Prerequisites

- Docker & Docker Compose
- At least 8GB RAM
- 20GB+ disk space for map data

## First Time Setup

#### Clone and Setup Directory Structure

```bash
git clone https://github.com/brewster1134/maps.git
cd maps
```

#### Download Map Data

Download the region you want from [Geofabrik](https://download.geofabrik.de/):

```bash
# Example: California
wget -P data/pbf https://download.geofabrik.de/north-america/us/california-latest.osm.pbf -o
```

**Note:** Startup with new map files will take awhile to build tiles and import data

#### Build & Start

```bash
# Build all containers
docker-compose build

# Start all services
docker-compose up -d

# Watch logs to monitor initialization
docker-compose logs -f
```

#### Access the Application

Open your browser to: **http://localhost:8080**

### Development

For rapid development with hot-reload:

```bash
# Start in development mode
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**What happens in dev mode:**

- Frontend: Hot-reload on file changes (Vite dev server)
- Backend: Hot-reload on file changes (ts-node with watch)
- Source code mounted as volumes
- No rebuild needed for code changes

### Production

```bash
# Build optimized production images
docker-compose build --no-cache

# Start in detached mode
docker-compose up -d

# Verify all services are running
docker-compose ps
```

**Production mode includes:**

- Frontend: Compiled and served via Nginx
- Backend: Compiled TypeScript to JavaScript
- Optimized for performance
- Automatic restart on failure

## Useful Commands

### Service Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart backend
docker-compose restart frontend

# Rebuild and restart a service
docker-compose up -d --build backend
```

### Logs & Debugging

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f valhalla

# View last 100 lines
docker-compose logs --tail=100 backend

# Save logs to file
docker-compose logs backend > backend-logs.txt
```

### Container Management

```bash
# List running containers
docker-compose ps

# Execute command in container
docker-compose exec backend sh
docker-compose exec frontend sh

# View resource usage
docker stats

# Remove all containers and volumes (CAUTION: deletes data)
docker-compose down -v
```

### Database & Data Management

```bash
# Backup POI data
cp -r data/pois data/pois-backup-$(date +%Y%m%d)

# View POI data
cat data/pois/pois.json | jq .
cat data/pois/distance_matrix.json | jq '.distances | length'
cat data/pois/optimized_pois.json | jq .

# Clear optimization (keeps POIs and matrix)
rm data/pois/optimized_pois.json

# Reset matrix (keeps POIs)
rm data/pois/distance_matrix.json

# Full reset (CAUTION: deletes all data)
rm -rf data/pois/*
```

### Updating Map Data

To update your map region:

```bash
# Stop services
docker-compose down

# Download new map data
wget -P data/pbf https://download.geofabrik.de/north-america/us-west-latest.osm.pbf

# Remove old tiles to force rebuild
docker volume rm maps_valhalla-tiles
docker volume rm maps_nominatim-db

# Rebuild and restart
docker-compose build --no-cache valhalla nominatim
docker-compose up -d
```

### Troubleshooting

#### Services won't start

```bash
# Check logs for errors
docker-compose logs

# Ensure ports aren't in use
lsof -i :8080  # Nginx
lsof -i :3001  # Backend
lsof -i :8002  # Valhalla
lsof -i :3000  # VROOM
```

### Frontend not updating in dev mode

```bash
# Restart with clean build
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Backend API errors

```bash
# Check backend logs
docker-compose logs -f backend

# Verify backend can reach other services
docker-compose exec backend ping valhalla
docker-compose exec backend ping vroom
docker-compose exec backend ping nominatim
```

### Out of memory errors

```bash
# Increase Docker memory limit (Docker Desktop)
# Settings - Resources - Memory - 8GB+

# Check current usage
docker stats
```

### Valhalla tile building failed

```bash
# Clear and rebuild
docker-compose down
docker volume rm maps_valhalla-tiles
docker-compose up -d valhalla

# Watch build progress
docker-compose logs -f valhalla
```

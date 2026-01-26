# OSM Trip Planner - Self-Hosted Mapping & Route Optimization

Complete self-hosted solution for planning optimized road trips with OpenStreetMap data.

## Quick Start

1. Download California OSM data:
   ```bash
   wget https://download.geofabrik.de/north-america/us/california-latest.osm.pbf -P data/pbf/
   ```

2. Start everything:
   ```bash
   docker-compose up -d
   ```

3. Wait 15-30 minutes for first-time tile building (watch with: `docker-compose logs -f valhalla`)

4. Access at: http://localhost:8080

## Add More Regions

Download more PBF files to `data/pbf/` and restart:
```bash
wget https://download.geofabrik.de/north-america/us/nevada-latest.osm.pbf -P data/pbf/
docker-compose restart valhalla
```

Browse regions: https://download.geofabrik.de/

## Features

- Self-hosted routing with Valhalla
- Trip optimization with VROOM (hundreds of POIs)
- Persistent POI storage
- Round-trip optimization
- Interactive map interface

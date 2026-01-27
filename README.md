# Maps

## Get data

- Download OSM data to data/pbf folder

```bash
wget https://download.geofabrik.de/north-america/us/california-latest.osm.pbf -P data/pbf/
```

- Start everything:

```bash
docker compose up -d
```

- first-time tile building can take awhile (watch with: `docker-compose logs -f valhalla`)

- visit page at http://localhost:8080

## Add More Regions

Browse regions: https://download.geofabrik.de/
Download more PBF files to `data/pbf/` and restart:

```bash
wget https://download.geofabrik.de/north-america/us/nevada-latest.osm.pbf -P data/pbf/
docker-compose restart valhalla
```

## Dev

### Changes to frontend code

```sh
docker-compose build --no-cache frontend
docker-compose up -d
```

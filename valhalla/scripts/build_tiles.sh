#!/bin/bash
set -e

TILE_DIR="/data/valhalla"
PBF_DIR="/data/pbf"
CONFIG_FILE="/data/valhalla/valhalla.json"

mkdir -p $TILE_DIR

if [ ! -f "$TILE_DIR/.build_complete" ]; then
  echo "Building Valhalla tiles..."

  PBF_FILES=$(find $PBF_DIR -name "*.pbf" 2>/dev/null | tr '\n' ' ')

  if [ -z "$PBF_FILES" ]; then
    echo "No PBF files found!"
    exit 1
  fi

  echo "Found PBF files: $PBF_FILES"

  # Generate config
  valhalla_build_config \
    --mjolnir-tile-dir ${TILE_DIR} \
    --mjolnir-admin ${TILE_DIR}/admin.sqlite \
    --mjolnir-timezone ${TILE_DIR}/tz_world.sqlite \
    --additional-data-elevation ${TILE_DIR}/elevation \
    > ${CONFIG_FILE}

  # Increase limits for large-scale optimization
  cat ${CONFIG_FILE} | jq '.service_limits.auto.max_matrix_distance = 50000000 |
    .service_limits.auto.max_matrix_locations = 500 |
    .service_limits.auto.max_matrix_location_pairs = 250000 |
    .service_limits.auto.max_distance = 50000000' > ${CONFIG_FILE}.tmp
  mv ${CONFIG_FILE}.tmp ${CONFIG_FILE}

  echo "Updated config with higher limits:"
  cat ${CONFIG_FILE} | jq '.service_limits.auto'

  # Build tiles
  valhalla_build_tiles -c ${CONFIG_FILE} $PBF_FILES

  touch $TILE_DIR/.build_complete
  echo "Tile building complete!"
else
  echo "Tiles already built, skipping..."
fi

# Check if config exists
if [ ! -f "${CONFIG_FILE}" ]; then
  echo "Config file missing, generating..."
  valhalla_build_config --mjolnir-tile-dir ${TILE_DIR} > ${CONFIG_FILE}

  # Apply same limits
  cat ${CONFIG_FILE} | jq '.service_limits.auto.max_matrix_distance = 50000000 |
    .service_limits.auto.max_matrix_locations = 500 |
    .service_limits.auto.max_matrix_location_pairs = 250000 |
    .service_limits.auto.max_distance = 50000000' > ${CONFIG_FILE}.tmp
  mv ${CONFIG_FILE}.tmp ${CONFIG_FILE}
fi

echo "Starting Valhalla with config:"
cat ${CONFIG_FILE} | jq '.service_limits.auto'

# Start server
exec valhalla_service ${CONFIG_FILE} 1

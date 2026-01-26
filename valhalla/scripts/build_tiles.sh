#!/bin/bash
set -e

TILE_DIR="/data/valhalla"
PBF_DIR="/data/pbf"

mkdir -p $TILE_DIR

# Check if tiles already exist and PBF files haven't changed
REBUILD=false
if [ ! -f "$TILE_DIR/.build_complete" ]; then
  REBUILD=true
else
  # Check if any PBF files are newer than the build marker
  if [ -n "$(find $PBF_DIR -name '*.pbf' -newer $TILE_DIR/.build_complete 2>/dev/null)" ]; then
    echo "New or updated PBF files detected, rebuilding tiles..."
    REBUILD=true
  fi
fi

if [ "$REBUILD" = true ]; then
  echo "Building Valhalla tiles from PBF files..."

  # Find all PBF files
  PBF_FILES=$(find $PBF_DIR -name "*.pbf" 2>/dev/null | tr '\n' ' ')

  if [ -z "$PBF_FILES" ]; then
    echo "No PBF files found in $PBF_DIR"
    echo "Please add OSM PBF files to the data/pbf directory"
    exit 1
  fi

  echo "Found PBF files: $PBF_FILES"

  # Build tiles
  valhalla_build_tiles -c /valhalla.json $PBF_FILES

  # Build admins
  valhalla_build_admins -c /valhalla.json $(echo $PBF_FILES | awk '{print $1}')

  touch $TILE_DIR/.build_complete
  echo "Tile building complete!"
else
  echo "Tiles are up to date, skipping rebuild"
fi

# Start Valhalla server
exec valhalla_service /valhalla.json 1

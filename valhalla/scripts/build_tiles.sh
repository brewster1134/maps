#!/bin/bash
set -e

TILE_DIR="/data/valhalla"
PBF_DIR="/data/pbf"
CONFIG_FILE="${TILE_DIR}/valhalla.json"
HASH_FILE="${TILE_DIR}/.pbf_hashes"
THREADS=4   # lower thread count to save memory

mkdir -p "${TILE_DIR}"

# Gather PBFs
PBF_FILES=$(find "${PBF_DIR}" -name "*.pbf" 2>/dev/null | sort)
if [ -z "${PBF_FILES}" ]; then
  echo "No PBF files found in ${PBF_DIR}"
  exit 1
fi

echo "Found PBF files:"
echo "${PBF_FILES}"

# Load previous hashes
declare -A PREV_HASHES
if [ -f "${HASH_FILE}" ]; then
  while read line; do
    PBF_NAME=$(echo "$line" | cut -d':' -f1)
    PBF_HASH=$(echo "$line" | cut -d':' -f2)
    PREV_HASHES["$PBF_NAME"]="$PBF_HASH"
  done < "$HASH_FILE"
fi

# Generate config if missing
if [ ! -f "${CONFIG_FILE}" ]; then
  echo "Generating Valhalla config..."
  valhalla_build_config \
    --mjolnir-tile-dir "${TILE_DIR}" \
    --mjolnir-admin "${TILE_DIR}/admin.sqlite" \
    --mjolnir-timezone "${TILE_DIR}/tz_world.sqlite" \
    --additional-data-elevation "${TILE_DIR}/elevation" \
    > "${CONFIG_FILE}"
fi

# Apply config tweaks only via JSON (no overrides in script)
jq '
  .mjolnir.use_tiles_ignore_tar = true
' "${CONFIG_FILE}" > "${CONFIG_FILE}.tmp" && mv "${CONFIG_FILE}.tmp" "${CONFIG_FILE}"

# Build tiles per PBF
for PBF in ${PBF_FILES}; do
  PBF_HASH=$(sha256sum "$PBF" | cut -d' ' -f1)
  PBF_NAME=$(basename "$PBF")

  if [ "${PREV_HASHES[$PBF_NAME]}" == "$PBF_HASH" ]; then
    echo "Skipping unchanged PBF: $PBF_NAME"
    continue
  fi

  echo "Building tiles for new/changed PBF: $PBF_NAME"
  valhalla_build_tiles -c "${CONFIG_FILE}" -j $THREADS "$PBF"

  # Save/update hash
  PREV_HASHES["$PBF_NAME"]="$PBF_HASH"
done

# Write hashes back to file
> "$HASH_FILE"
for key in "${!PREV_HASHES[@]}"; do
  echo "$key:${PREV_HASHES[$key]}" >> "$HASH_FILE"
done

echo "Tile build complete for all new/changed PBFs"
echo "Starting Valhalla service..."
exec valhalla_service "${CONFIG_FILE}" 1

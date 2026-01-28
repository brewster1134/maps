#!/usr/bin/env python3

import osmium
import json
import os
import sys
from pathlib import Path
from datetime import datetime

PBF_DIR = "/data/pbf"
BOUNDS_FILE = os.environ.get("BOUNDS_FILE", "/app/config/bounds.json")

print("=== Extracting bounds from PBF files ===")
print(f"PBF_DIR: {PBF_DIR}")
print(f"BOUNDS_FILE: {BOUNDS_FILE}")

# Find PBF file
pbf_files = list(Path(PBF_DIR).glob("*.pbf")) + list(Path(PBF_DIR).glob("*.osm.pbf"))

if not pbf_files:
    print(f"❌ No PBF files found in {PBF_DIR}")
    sys.exit(0)

pbf_file = str(pbf_files[0])
print(f"✓ Found PBF file: {pbf_file}")

# Extract bounds using osmium
try:
    reader = osmium.io.Reader(pbf_file, osmium.osm.osm_entity_bits.NOTHING)
    header = reader.header()
    box = header.box()

    if not box.valid():
        print("❌ PBF file has no valid bounding box")
        sys.exit(0)

    # Get bounds - osmium uses bottom_left and top_right
    min_lon = box.bottom_left.lon
    min_lat = box.bottom_left.lat
    max_lon = box.top_right.lon
    max_lat = box.top_right.lat

    print(f"Extracted bounds:")
    print(f"  MIN_LON: {min_lon}")
    print(f"  MIN_LAT: {min_lat}")
    print(f"  MAX_LON: {max_lon}")
    print(f"  MAX_LAT: {max_lat}")

    # Create bounds JSON
    region_name = Path(pbf_file).stem.replace("-latest", "").replace(".osm", "")
    bounds = {
        "viewbox": f"{min_lon},{min_lat},{max_lon},{max_lat}",
        "bounded": 1,
        "region": region_name,
        "generated": datetime.utcnow().isoformat() + "Z"
    }

    # Create directory if needed
    Path(BOUNDS_FILE).parent.mkdir(parents=True, exist_ok=True)

    # Write bounds file
    with open(BOUNDS_FILE, 'w') as f:
        json.dump(bounds, f, indent=2)

    print(f"✓ Bounds saved to {BOUNDS_FILE}")
    print("Contents:")
    print(json.dumps(bounds, indent=2))
    print("===========================")

except Exception as e:
    print(f"❌ Failed to extract bounds: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(0)

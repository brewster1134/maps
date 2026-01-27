FROM ghcr.io/valhalla/valhalla:latest

COPY valhalla.json /valhalla.json
COPY scripts/build_tiles.sh /build_tiles.sh

RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*
RUN chmod +x /build_tiles.sh

ENTRYPOINT ["/build_tiles.sh"]

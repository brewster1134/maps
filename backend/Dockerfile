FROM node:18-slim

# Install Python and osmium library for bounds extraction
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    pip3 install --break-system-packages osmium && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json .
RUN npm ci --include prod

COPY . .
COPY scripts/extract_bounds.py /app/scripts/
RUN chmod +x /app/scripts/extract_bounds.py

RUN npm run build

EXPOSE 3001

CMD ["/bin/sh", "-c", "python3 /app/scripts/extract_bounds.py && npm run start"]

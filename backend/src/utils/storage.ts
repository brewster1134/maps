import fs from 'fs/promises';
import { config } from '../config/index.js';
import { POI, DistanceMatrix, OptimizedTrip } from '../types/index.js';

export async function ensureDataDir(): Promise<void> {
  await fs.mkdir(config.files.dataDir, { recursive: true }).catch(() => {});
}

// ---------- POI STORAGE ----------
export async function loadPOIs(): Promise<POI[]> {
  try {
    const data = await fs.readFile(config.files.poisFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function savePOIs(pois: POI[]): Promise<void> {
  await fs.writeFile(config.files.poisFile, JSON.stringify(pois, null, 2));
}

// ---------- MATRIX STORAGE ----------
export async function loadMatrix(): Promise<DistanceMatrix> {
  try {
    const data = await fs.readFile(config.files.matrixFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { distances: {}, durations: {}, lastUpdated: null };
  }
}

export async function saveMatrix(matrix: DistanceMatrix): Promise<void> {
  await fs.writeFile(
    config.files.matrixFile,
    JSON.stringify(matrix, null, 2),
  );
}

// ---------- OPTIMIZED TRIP STORAGE ----------
export async function loadOptimizedTrip(): Promise<OptimizedTrip | null> {
  try {
    const data = await fs.readFile(config.files.optimizedFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveOptimizedTrip(trip: OptimizedTrip): Promise<void> {
  await fs.writeFile(
    config.files.optimizedFile,
    JSON.stringify(trip, null, 2),
  );
}

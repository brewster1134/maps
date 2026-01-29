import { Router, Request, Response } from 'express';
import {
  loadPOIs,
  savePOIs,
  loadOptimizedTrip,
  saveOptimizedTrip,
} from '../utils/storage.js';
import { initializeMissingMatrixEntries } from '../services/matrix.js';
import { POI, type OptimizedPOI } from '../types/index.js';

const router = Router();

/**
 * GET /api/pois
 * Get all POIs with normalization (ensures id and createdAt exist)
 */
router.get('/pois', async (_req: Request, res: Response) => {
  const pois = await loadPOIs();

  // Ensure all POIs have required fields
  let needsSave = false;
  const normalizedPOIs = pois.map((poi) => {
    if (!poi.id) {
      needsSave = true;
      return {
        ...poi,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        createdAt: poi.createdAt || new Date().toISOString(),
      };
    }
    return poi;
  });

  if (needsSave) {
    await savePOIs(normalizedPOIs);
  }

  // Initialize matrix entries for any missing pairs
  await initializeMissingMatrixEntries(normalizedPOIs);

  res.json(normalizedPOIs);
});

/**
 * GET /api/pois-with-sequence
 * Get POIs merged with sequence numbers from optimized trip
 */
router.get('/pois-with-sequence', async (_req: Request, res: Response) => {
  const pois = await loadPOIs();
  const optimizedTrip = await loadOptimizedTrip();

  if (!optimizedTrip) {
    return res.json(pois);
  }

  // Merge POI data with sequence numbers
  const poisWithSequence = pois.map((poi) => {
    const optimizedPOI = optimizedTrip.optimizedOrder.find(
      (op) =>
        Math.abs(op.lat - poi.lat) < 0.000001 &&
        Math.abs(op.lng - poi.lng) < 0.000001,
    );

    return optimizedPOI ? { ...poi, sequence: optimizedPOI.sequence } : poi;
  }) as Array<POI & { sequence?: number }>;

  // Sort by sequence if available
  poisWithSequence.sort((a, b) => {
    if (a.sequence && b.sequence) return a.sequence - b.sequence;
    if (a.sequence) return -1;
    if (b.sequence) return 1;
    return 0;
  });

  res.json(poisWithSequence);
});

/**
 * POST /api/pois
 * Add a new POI
 */
router.post('/pois', async (req: Request, res: Response) => {
  const pois = await loadPOIs();
  const newPOI: POI = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  pois.push(newPOI);
  await savePOIs(pois);

  // Initialize matrix entries for the new POI
  await initializeMissingMatrixEntries(pois);

  res.json(newPOI);
});

/**
 * POST /api/pois-reverse
 * Reverse the optimized route sequence
 */
router.post('/pois-reverse', async (_req: Request, res: Response) => {
  try {
    const optimizedTrip = await loadOptimizedTrip();

    if (
      !optimizedTrip ||
      !optimizedTrip.optimizedOrder ||
      optimizedTrip.optimizedOrder.length === 0
    ) {
      return res
        .status(404)
        .json({ error: 'No optimized route found to reverse' });
    }

    // Reverse the POI array and renumber sequences
    const reversedOrder = [...optimizedTrip.optimizedOrder]
      .reverse()
      .map((poi, index) => ({
        ...poi,
        sequence: index + 1,
      }));

    // Create reversed trip
    const reversedTrip = {
      ...optimizedTrip,
      optimizedOrder: reversedOrder,
      lastOptimized: new Date().toISOString(),
    };

    // Save it
    await saveOptimizedTrip(reversedTrip);

    res.json(reversedTrip);
  } catch (error) {
    console.error('Error reversing route:', error);
    res.status(500).json({ error: 'Failed to reverse route' });
  }
});

/**
 * PUT /api/pois/:id
 * Update an existing POI
 */
router.put('/pois/:id', async (req: Request, res: Response) => {
  const pois = await loadPOIs();
  const index = pois.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'POI not found' });

  const oldPOI = pois[index];
  pois[index] = { ...pois[index], ...req.body };
  await savePOIs(pois);

  // If coordinates changed, initialize new matrix entries
  if (oldPOI.lat !== pois[index].lat || oldPOI.lng !== pois[index].lng) {
    await initializeMissingMatrixEntries(pois);
  }

  res.json(pois[index]);
});

/**
 * DELETE /api/pois/:id
 * Delete a POI
 */
router.delete('/pois/:id', async (req: Request, res: Response) => {
  const pois = await loadPOIs();
  const filtered = pois.filter((p) => p.id !== req.params.id);
  await savePOIs(filtered);

  // Note: We don't delete from matrix - old data doesn't hurt and might be useful if POI is re-added
  res.json({ success: true });
});

export default router;

import { Router } from 'express';
import { loadPOIs, loadMatrix } from '../utils/storage.js';
import { getMatrixKey, isMatrixEntryCalculated } from '../utils/matrix.js';
import { buildDistanceMatrix } from '../services/matrix.js';
const router = Router();
/**
 * GET /api/matrix-status
 * Get current status of the distance matrix
 */
router.get('/matrix-status', async (_req, res) => {
    const pois = await loadPOIs();
    const matrix = await loadMatrix();
    const totalPairs = (pois.length * (pois.length - 1)) / 2;
    // Count calculated pairs (value >= 0)
    const calculatedPairs = pois.reduce((count, poi1, i) => count +
        pois.slice(i + 1).reduce((innerCount, poi2) => {
            const key = getMatrixKey(poi1, poi2);
            return (innerCount + (isMatrixEntryCalculated(matrix.distances, key) ? 1 : 0));
        }, 0), 0);
    const missingPairs = totalPairs - calculatedPairs;
    // Check which POI pairs are missing (sample first 10)
    const missing = [];
    for (let i = 0; i < pois.length && missing.length < 10; i++) {
        for (let j = i + 1; j < pois.length && missing.length < 10; j++) {
            const key = getMatrixKey(pois[i], pois[j]);
            if (!isMatrixEntryCalculated(matrix.distances, key)) {
                missing.push({ poi1: pois[i].name, poi2: pois[j].name });
            }
        }
    }
    res.json({
        totalPOIs: pois.length,
        totalPairs,
        calculatedPairs,
        missingPairs,
        percentComplete: totalPairs > 0
            ? ((calculatedPairs / totalPairs) * 100).toFixed(1)
            : '100',
        lastUpdated: matrix.lastUpdated,
        sampleMissing: missing,
    });
});
/**
 * POST /api/build-matrix
 * Start building the distance matrix in the background
 */
router.post('/build-matrix', async (_req, res) => {
    const pois = await loadPOIs();
    if (pois.length === 0)
        return res.status(400).json({ error: 'No POIs to build matrix for' });
    res.json({
        message: 'Matrix building started',
        totalPOIs: pois.length,
        totalPairs: (pois.length * (pois.length - 1)) / 2,
    });
    // Build matrix (this runs in background)
    buildDistanceMatrix(pois).catch((error) => {
        console.error('Matrix building error:', error);
    });
});
export default router;

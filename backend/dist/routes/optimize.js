import { Router } from 'express';
import { loadOptimizedTrip, saveOptimizedTrip } from '../utils/storage.js';
import { optimizeTrip } from '../services/optimizer.js';
const router = Router();
/**
 * GET /api/optimized-trip
 * Get the current optimized trip state
 */
router.get('/optimized-trip', async (_req, res) => {
    const optimizedTrip = await loadOptimizedTrip();
    res.json(optimizedTrip);
});
/**
 * POST /api/optimize-trip
 * Optimize a trip using VROOM and Valhalla
 */
router.post('/optimize-trip', async (req, res) => {
    try {
        const { origin, destination, pois, roundTrip } = req.body;
        if (!pois || pois.length === 0)
            return res.status(400).json({ error: 'No POIs to optimize' });
        const result = await optimizeTrip({
            origin,
            destination,
            pois,
            roundTrip,
        });
        // Save optimized trip state
        await saveOptimizedTrip(result.optimizedTrip);
        res.json({
            vroom: result.vroomData,
            route: result.valhallaRoute,
            optimizedOrder: result.optimizedOrder,
            autoSaved: true,
            fullyOptimized: true,
        });
    }
    catch (error) {
        console.error('Optimization error:', error.message);
        // Check if it's a matrix incomplete error
        if (error.message.includes('Distance matrix incomplete')) {
            const match = error.message.match(/(\d+)\/(\d+)/);
            if (match) {
                const calculated = parseInt(match[1]);
                const total = parseInt(match[2]);
                return res.status(400).json({
                    error: 'Distance matrix incomplete',
                    message: `Matrix is ${((calculated / total) * 100).toFixed(1)}% complete. Build matrix first.`,
                    calculated,
                    total,
                });
            }
        }
        res.status(500).json({
            error: 'Optimization failed',
            details: error.message,
        });
    }
});
export default router;

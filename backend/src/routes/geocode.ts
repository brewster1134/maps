import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config/index.js';

const router = Router();

/**
 * GET /api/geocode
 * Search for locations using Nominatim geocoding service
 */
router.get('/geocode', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const response = await axios.get(`${config.nominatim.url}/search`, {
      params: {
        q: query,
        format: 'json',
        limit: 10,
      },
      headers: {
        'User-Agent': 'OSM-Trip-Planner/1.0',
      },
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

export default router;

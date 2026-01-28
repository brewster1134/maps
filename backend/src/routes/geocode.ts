import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config/index.js';

const router = Router();

/**
 * GET /api/geocode
 * Search for locations using Nominatim geocoding service
 * Falls back to online Nominatim for POI searches if local results are poor
 */
router.get('/geocode', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    console.log(`\n===== GEOCODE SEARCH =====`);
    console.log(`Query: "${query}"`);

    // Build search params with bounds if available
    const searchParams: any = {
      q: query,
      format: 'json',
      limit: 10,
      countrycodes: 'us',
    };

    // Add bounds if loaded
    if (config.nominatim.bounds) {
      searchParams.viewbox = config.nominatim.bounds.viewbox;
      searchParams.bounded = config.nominatim.bounds.bounded;
      console.log(`Using bounds: ${config.nominatim.bounds.viewbox}`);
    }

    // Try local Nominatim first
    let localResponse;
    try {
      localResponse = await axios.get(`${config.nominatim.url}/search`, {
        params: searchParams,
        headers: {
          'User-Agent': 'OSM-Trip-Planner/1.0',
        },
        timeout: 5000,
      });

      console.log(`Local results: ${localResponse.data.length} found`);
      if (localResponse.data.length > 0) {
        console.log(`Sample local result:`, {
          display_name: localResponse.data[0].display_name,
          type: localResponse.data[0].type,
          class: localResponse.data[0].class,
          lat: localResponse.data[0].lat,
          lon: localResponse.data[0].lon,
        });
      }
    } catch (localError: any) {
      console.log(`Local Nominatim failed:`, localError.message);
      localResponse = { data: [] };
    }

    // If we got good results from local, return them
    if (localResponse.data && localResponse.data.length >= 3) {
      console.log(
        `✓ Returning ${localResponse.data.length} local results (threshold met)`,
      );
      console.log(`==========================\n`);
      return res.json(localResponse.data);
    }

    // If local results are sparse, try online Nominatim as fallback
    console.log(
      `Local results sparse (${localResponse.data.length}), trying online fallback...`,
    );

    try {
      const onlineResponse = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        {
          params: searchParams,
          headers: {
            'User-Agent': 'OSM-Trip-Planner/1.0',
          },
          timeout: 5000,
        },
      );

      console.log(`Online results: ${onlineResponse.data.length} found`);
      if (onlineResponse.data.length > 0) {
        console.log(`Sample online result:`, {
          display_name: onlineResponse.data[0].display_name,
          type: onlineResponse.data[0].type,
          class: onlineResponse.data[0].class,
        });
      }

      // Combine results, preferring local if any exist
      const combinedResults = [
        ...(localResponse.data || []),
        ...(onlineResponse.data || []),
      ];

      // Remove duplicates based on place_id
      const uniqueResults = combinedResults.filter(
        (result, index, self) =>
          index === self.findIndex((r) => r.place_id === result.place_id),
      );

      console.log(
        `✓ Returning ${uniqueResults.slice(0, 10).length} combined results`,
      );
      console.log(`==========================\n`);
      res.json(uniqueResults.slice(0, 10));
    } catch (onlineError: any) {
      console.log(`✗ Online fallback failed: ${onlineError.message}`);
      console.log(
        `✓ Returning ${localResponse.data.length} local results only`,
      );
      console.log(`==========================\n`);
      res.json(localResponse.data || []);
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    console.log(`==========================\n`);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

export default router;

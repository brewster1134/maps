import axios from 'axios';
import { config } from '../config/index.js';
import { loadMatrix } from '../utils/storage.js';
import { countCalculatedPairs } from '../utils/matrix.js';
/**
 * Validate that all POI pairs have been calculated in the matrix
 */
export async function validateMatrixComplete(pois) {
    const matrix = await loadMatrix();
    const totalPairs = (pois.length * (pois.length - 1)) / 2;
    const calculatedPairs = countCalculatedPairs(pois, matrix.distances);
    return {
        complete: calculatedPairs >= totalPairs,
        calculated: calculatedPairs,
        total: totalPairs,
    };
}
/**
 * Optimize trip using VROOM for TSP and Valhalla for actual routing
 */
export async function optimizeTrip(request) {
    const { origin, destination, pois, roundTrip } = request;
    // Validate matrix completeness
    const matrixStatus = await validateMatrixComplete(pois);
    if (!matrixStatus.complete) {
        throw new Error(`Distance matrix incomplete: ${matrixStatus.calculated}/${matrixStatus.total} pairs calculated`);
    }
    console.log(`Optimizing trip with ${pois.length} POIs...`);
    // VROOM request for TSP optimization
    const vroomRequest = {
        vehicles: [
            {
                id: 1,
                start: [origin.lng, origin.lat],
                end: roundTrip
                    ? [origin.lng, origin.lat]
                    : destination
                        ? [destination.lng, destination.lat]
                        : [origin.lng, origin.lat],
                profile: 'auto',
            },
        ],
        jobs: pois.map((poi, idx) => ({
            id: idx + 1,
            location: [poi.lng, poi.lat],
            service: 300,
        })),
        options: { g: true },
    };
    const vroomResponse = await axios.post(`${config.vroom.url}/`, vroomRequest, {
        timeout: 600000,
    });
    const route = vroomResponse.data.routes[0];
    const optimizedOrder = route.steps
        .filter((s) => s.type === 'job')
        .map((s, index) => {
        const poi = pois[s.job - 1];
        return {
            lat: poi.lat,
            lng: poi.lng,
            sequence: index + 1,
            name: poi.name,
        };
    });
    // Get full route from Valhalla with detailed geometry
    const waypoints = [
        { lat: origin.lat, lon: origin.lng },
        ...optimizedOrder.map((poi) => ({ lat: poi.lat, lon: poi.lng })),
        roundTrip
            ? { lat: origin.lat, lon: origin.lng }
            : destination
                ? { lat: destination.lat, lon: destination.lng }
                : { lat: origin.lat, lon: origin.lng },
    ];
    const valhallaResponse = await axios.post(`${config.valhalla.url}/route`, {
        locations: waypoints,
        costing: 'auto',
        directions_options: { units: 'miles' },
    });
    // Create optimized trip object
    const optimizedTrip = {
        origin,
        destination: roundTrip ? null : destination || null,
        roundTrip,
        optimizedOrder,
        lastOptimized: new Date().toISOString(),
    };
    console.log(`✓ Optimization complete!`);
    return {
        vroomData: vroomResponse.data,
        valhallaRoute: valhallaResponse.data,
        optimizedOrder,
        optimizedTrip,
    };
}

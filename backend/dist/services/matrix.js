import axios from 'axios';
import { config } from '../config/index.js';
import { loadMatrix, saveMatrix } from '../utils/storage.js';
import { getMatrixKey, isMatrixEntryCalculated } from '../utils/matrix.js';
/**
 * Calculate distance between two POIs using Valhalla routing engine
 */
export async function calculateDistance(poi1, poi2) {
    try {
        const response = await axios.post(`${config.valhalla.url}/route`, {
            locations: [
                { lat: Number(poi1.lat), lon: Number(poi1.lng) },
                { lat: Number(poi2.lat), lon: Number(poi2.lng) },
            ],
            costing: 'auto',
            directions_options: { units: 'kilometers' },
        }, { timeout: 30000 });
        const summary = response.data.trip.summary;
        return {
            distance: summary.length,
            duration: summary.time,
        };
    }
    catch (error) {
        console.error(`Failed to calculate distance between ${poi1.name} and ${poi2.name}:`, error.message);
        return null;
    }
}
/**
 * Initialize missing matrix entries with placeholder values (-1)
 */
export async function initializeMissingMatrixEntries(pois) {
    const matrix = await loadMatrix();
    let addedEntries = 0;
    for (let i = 0; i < pois.length; i++) {
        for (let j = i + 1; j < pois.length; j++) {
            const key = getMatrixKey(pois[i], pois[j]);
            // Add placeholder if missing
            if (matrix.distances[key] === undefined) {
                matrix.distances[key] = -1; // -1 indicates "needs calculation"
                matrix.durations[key] = -1;
                addedEntries++;
            }
        }
    }
    if (addedEntries > 0) {
        console.log(`Initialized ${addedEntries} missing matrix entries`);
        await saveMatrix(matrix);
    }
}
/**
 * Build or update the distance matrix by calculating missing entries
 */
export async function buildDistanceMatrix(pois, onProgress) {
    const matrix = await loadMatrix();
    const totalPairs = (pois.length * (pois.length - 1)) / 2;
    let calculated = 0;
    let skipped = 0;
    let failed = 0;
    console.log(`Building distance matrix for ${pois.length} POIs (${totalPairs} pairs)...`);
    for (let i = 0; i < pois.length; i++) {
        for (let j = i + 1; j < pois.length; j++) {
            const poi1 = pois[i];
            const poi2 = pois[j];
            const key = getMatrixKey(poi1, poi2);
            // Skip if already calculated (value >= 0)
            if (isMatrixEntryCalculated(matrix.distances, key)) {
                skipped++;
                if (onProgress)
                    onProgress({ calculated, skipped, failed, total: totalPairs });
                continue;
            }
            // Calculate distance
            const result = await calculateDistance(poi1, poi2);
            if (result) {
                matrix.distances[key] = result.distance;
                matrix.durations[key] = result.duration;
                calculated++;
                // Save progress periodically
                if (calculated % config.matrix.saveInterval === 0) {
                    matrix.lastUpdated = new Date().toISOString();
                    await saveMatrix(matrix);
                    console.log(`Progress: ${calculated + skipped}/${totalPairs} pairs (${calculated} new, ${skipped} cached, ${failed} failed)`);
                }
            }
            else {
                // Keep -1 to retry later
                failed++;
            }
            if (onProgress)
                onProgress({ calculated, skipped, failed, total: totalPairs });
            // Small delay to avoid overwhelming Valhalla
            await new Promise((resolve) => setTimeout(resolve, config.matrix.requestDelay));
        }
    }
    matrix.lastUpdated = new Date().toISOString();
    await saveMatrix(matrix);
    console.log(`Matrix complete: ${calculated} new, ${skipped} cached, ${failed} failed out of ${totalPairs} total`);
    return { calculated, skipped, failed, total: totalPairs };
}

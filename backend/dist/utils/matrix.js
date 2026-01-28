import { config } from '../config/index.js';
/**
 * Generate a stable matrix key from two POIs using their coordinates.
 * Keys are sorted to ensure consistency regardless of POI order.
 */
export function getMatrixKey(poi1, poi2) {
    const lat1 = Number(poi1.lat).toFixed(config.matrix.coordinatePrecision);
    const lng1 = Number(poi1.lng).toFixed(config.matrix.coordinatePrecision);
    const lat2 = Number(poi2.lat).toFixed(config.matrix.coordinatePrecision);
    const lng2 = Number(poi2.lng).toFixed(config.matrix.coordinatePrecision);
    const key1 = `${lat1},${lng1}`;
    const key2 = `${lat2},${lng2}`;
    // Always use smaller key first for consistency
    return key1 < key2 ? `${key1}:${key2}` : `${key2}:${key1}`;
}
/**
 * Check if a matrix entry exists and is calculated (value >= 0)
 */
export function isMatrixEntryCalculated(distances, key) {
    return distances[key] !== undefined && distances[key] >= 0;
}
/**
 * Count how many POI pairs have been calculated in the matrix
 */
export function countCalculatedPairs(pois, distances) {
    return pois.reduce((count, poi1, i) => count +
        pois.slice(i + 1).reduce((innerCount, poi2) => {
            const key = getMatrixKey(poi1, poi2);
            return innerCount + (isMatrixEntryCalculated(distances, key) ? 1 : 0);
        }, 0), 0);
}

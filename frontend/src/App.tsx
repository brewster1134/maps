import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_URL = '/api';

// ---------- TYPES ----------
interface POI {
  id?: string;
  name: string;
  lat: number | string;
  lng: number | string;
  notes?: string;
  sequence?: number;
  optimizedUpTo?: number;
  fullyOptimized?: boolean;
}

interface Location {
  lat: number;
  lng: number;
  name?: string;
}

interface GeoResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface RouteLeg {
  shape?: string;
}

interface RouteTrip {
  legs: RouteLeg[];
  summary: { length: number; time: number };
}

interface RouteData {
  route: {
    trip?: RouteTrip;
  };
  optimizedOrder?: POI[];
  message?: string;
  optimizedCount?: number;
  totalCount?: number;
}

interface MatrixStatus {
  calculatedPairs: number;
  totalPairs: number;
  percentComplete: number;
  missingPairs: number;
  lastUpdated?: string;
}

interface MatrixProgress {
  totalPairs: number;
  calculated: number;
  skipped: number;
  failed: number;
  percentComplete: string;
  inProgress: boolean;
}

// ---------- HOOKS ----------
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ---------- AUTOCOMPLETE COMPONENT ----------
interface AutocompleteDropdownProps {
  results: GeoResult[];
  onSelect: (result: GeoResult) => void;
  show: boolean;
}

const AutocompleteDropdown: React.FC<AutocompleteDropdownProps> = ({
  results,
  onSelect,
  show,
}) => {
  if (!show || results.length === 0) return null;

  return (
    <div
      data-autocomplete='true'
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        background: 'white',
        border: '1px solid #ddd',
        borderRadius: '4px',
        maxHeight: '300px',
        overflowY: 'auto',
        zIndex: 1000,
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}
    >
      {results.map((result, idx) => (
        <div
          key={idx}
          style={{
            padding: '12px',
            cursor: 'pointer',
            borderBottom: idx < results.length - 1 ? '1px solid #eee' : 'none',
            fontSize: '14px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(result);
          }}
        >
          <div style={{ fontWeight: '500', marginBottom: '2px' }}>
            {result.display_name.split(',')[0]}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {result.display_name.split(',').slice(1).join(',').trim()}
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------- MAIN COMPONENT ----------
const App: React.FC = () => {
  const [pois, setPois] = useState<POI[]>([]);
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [roundTrip, setRoundTrip] = useState(true);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [newPoi, setNewPoi] = useState<POI>({
    name: '',
    lat: '',
    lng: '',
    notes: '',
  });

  const [originSearch, setOriginSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [poiSearch, setPoiSearch] = useState('');
  const [originResults, setOriginResults] = useState<GeoResult[]>([]);
  const [destinationResults, setDestinationResults] = useState<GeoResult[]>([]);
  const [poiResults, setPoiResults] = useState<GeoResult[]>([]);
  const [showOriginAutocomplete, setShowOriginAutocomplete] = useState(false);
  const [showDestinationAutocomplete, setShowDestinationAutocomplete] =
    useState(false);
  const [showPoiAutocomplete, setShowPoiAutocomplete] = useState(false);

  const [matrixStatus, setMatrixStatus] = useState<MatrixStatus | null>(null);
  const [buildingMatrix, setBuildingMatrix] = useState(false);
  const [matrixProgress, setMatrixProgress] = useState<MatrixProgress | null>(
    null,
  );

  const debouncedOriginSearch = useDebounce(originSearch, 300);
  const debouncedDestinationSearch = useDebounce(destinationSearch, 300);
  const debouncedPoiSearch = useDebounce(poiSearch, 300);

  const loadMatrixStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/matrix-status`);
      if (!res.ok) return;
      const data: MatrixStatus = await res.json();
      setMatrixStatus(data);
    } catch (err) {
      console.error('Failed to load matrix status', err);
    }
  };

  const buildMatrix = async () => {
    setBuildingMatrix(true);
    const res = await fetch(`${API_URL}/build-matrix`, { method: 'POST' });
    const data = await res.json();

    // Poll for progress updates
    const interval = setInterval(async () => {
      const progressRes = await fetch(`${API_URL}/matrix-progress`);
      const progressData: MatrixProgress = await progressRes.json();
      setMatrixProgress(progressData);

      // Also update matrix status
      await loadMatrixStatus();

      // Stop polling when complete
      if (!progressData.inProgress) {
        clearInterval(interval);
        setBuildingMatrix(false);
        setMatrixProgress(null);
        alert('Distance matrix build complete!');
      }
    }, 2000);

    // Stop polling after 2 hours max
    setTimeout(() => {
      clearInterval(interval);
      setBuildingMatrix(false);
    }, 7200000);
  };

  // ---------- EFFECTS ----------
  useEffect(() => {
    loadPois();
    loadMatrixStatus();
  }, []);

  useEffect(() => {
    if (debouncedOriginSearch.length >= 3)
      searchLocation(debouncedOriginSearch, 'origin');
    else setOriginResults([]);
  }, [debouncedOriginSearch]);

  useEffect(() => {
    if (debouncedDestinationSearch.length >= 3)
      searchLocation(debouncedDestinationSearch, 'destination');
    else setDestinationResults([]);
  }, [debouncedDestinationSearch]);

  useEffect(() => {
    if (debouncedPoiSearch.length >= 3)
      searchLocation(debouncedPoiSearch, 'poi');
    else setPoiResults([]);
  }, [debouncedPoiSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        !(event.target as HTMLElement).closest('input') &&
        !(event.target as HTMLElement).closest('[data-autocomplete]')
      ) {
        setShowOriginAutocomplete(false);
        setShowDestinationAutocomplete(false);
        setShowPoiAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---------- FUNCTIONS ----------
  const loadPois = async () => {
    const res = await fetch(`${API_URL}/pois`);
    const data = await res.json();
    setPois(data);
  };

  const addPoi = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API_URL}/pois`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newPoi,
        lat: parseFloat(newPoi.lat as string),
        lng: parseFloat(newPoi.lng as string),
      }),
    });
    setNewPoi({ name: '', lat: '', lng: '', notes: '' });
    setPoiSearch('');
    loadPois();
  };

  const deletePoi = async (id?: string) => {
    if (!id) return;
    await fetch(`${API_URL}/pois/${id}`, { method: 'DELETE' });
    loadPois();
  };

  const searchLocation = async (
    query: string,
    type: 'origin' | 'destination' | 'poi',
  ) => {
    if (!query) return;
    const res = await fetch(
      `${API_URL}/geocode?query=${encodeURIComponent(query)}`,
    );
    const data = await res.json();

    if (type === 'origin') {
      setOriginResults(data);
      setShowOriginAutocomplete(true);
    } else if (type === 'destination') {
      setDestinationResults(data);
      setShowDestinationAutocomplete(true);
    } else {
      setPoiResults(data);
      setShowPoiAutocomplete(true);
    }
  };

  const selectOrigin = (result: GeoResult) => {
    setOrigin({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon), // Changed from result.lng
      name: result.display_name,
    });
    setOriginSearch('');
    setOriginResults([]);
    setShowOriginAutocomplete(false);
  };

  const selectDestination = (result: GeoResult) => {
    setDestination({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon), // Changed from result.lng
      name: result.display_name,
    });
    setDestinationSearch('');
    setDestinationResults([]);
    setShowDestinationAutocomplete(false);
  };

  const selectPoiLocation = (result: GeoResult) => {
    setNewPoi({
      ...newPoi,
      lat: result.lat,
      lng: result.lon, // Changed from result.lng
      name: result.display_name.split(',')[0],
    });
    setPoiSearch('');
    setPoiResults([]);
    setShowPoiAutocomplete(false);
  };

  const optimizeTrip = async () => {
    if (!origin) {
      alert('Please set an origin');
      return;
    }
    if (pois.length === 0) {
      alert('Please add at least one POI');
      return;
    }
    if (!roundTrip && !destination) {
      alert('Please set a destination for one-way trips');
      return;
    }

    setLoading(true);
    setRoute(null);

    try {
      const res = await fetch(`${API_URL}/optimize-trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination: roundTrip ? null : destination,
          pois,
          roundTrip,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Optimization failed: ${errorData.error || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      const data: RouteData = await res.json();
      await loadPois();

      if (data.route?.trip) {
        setRoute(data);
      } else {
        alert(
          data.message ||
            `Optimization saved! ${data.optimizedCount}/${data.totalCount} POIs optimized.`,
        );
      }
    } catch (error: any) {
      alert('Trip optimization failed: ' + error.message);
    }
    setLoading(false);
  };

  const routeCoordinates: [number, number][] =
    route?.route?.trip?.legs?.flatMap((leg) =>
      leg.shape ? decodePolyline(leg.shape) : [],
    ) || [];

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* LEFT SIDEBAR */}
      <div
        style={{
          width: '400px',
          overflowY: 'auto',
          padding: '20px',
          borderRight: '1px solid #ddd',
        }}
      >
        <h1 style={{ marginBottom: '20px' }}>Trip Planner</h1>

        {/* TRIP SETTINGS */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Trip Settings</h3>

          {/* Origin */}
          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '4px',
                fontWeight: '500',
              }}
            >
              Origin
            </label>
            <div style={{ position: 'relative' }}>
              <input
                value={originSearch}
                onChange={(e) => setOriginSearch(e.target.value)}
                onFocus={() =>
                  originResults.length > 0 && setShowOriginAutocomplete(true)
                }
                onBlur={() =>
                  setTimeout(() => setShowOriginAutocomplete(false), 200)
                }
                placeholder='Start typing origin address...'
                style={{ width: '100%', padding: '8px' }}
              />
              <AutocompleteDropdown
                results={originResults}
                onSelect={selectOrigin}
                show={showOriginAutocomplete}
              />
            </div>
            {origin && (
              <div
                style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}
              >
                Set to:{' '}
                {origin.name ||
                  `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`}
                <button
                  onClick={() => {
                    setOrigin(null);
                    setOriginSearch('');
                  }}
                  style={{ marginLeft: '8px', fontSize: '11px' }}
                >
                  Clear
                </button>
              </div>
            )}
            {originSearch.length > 0 && originSearch.length < 3 && (
              <div
                style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}
              >
                Type at least 3 characters...
              </div>
            )}
          </div>

          {/* Round Trip Checkbox */}
          <label style={{ display: 'block', marginBottom: '12px' }}>
            <input
              type='checkbox'
              checked={roundTrip}
              onChange={(e) => setRoundTrip(e.target.checked)}
            />{' '}
            Round trip (return to origin)
          </label>

          {/* Destination */}
          {!roundTrip && (
            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontWeight: '500',
                }}
              >
                Destination
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  value={destinationSearch}
                  onChange={(e) => setDestinationSearch(e.target.value)}
                  onFocus={() =>
                    destinationResults.length > 0 &&
                    setShowDestinationAutocomplete(true)
                  }
                  onBlur={() =>
                    setTimeout(() => setShowDestinationAutocomplete(false), 200)
                  }
                  placeholder='Start typing destination address...'
                  style={{ width: '100%', padding: '8px' }}
                />
                <AutocompleteDropdown
                  results={destinationResults}
                  onSelect={selectDestination}
                  show={showDestinationAutocomplete}
                />
              </div>
              {destination && (
                <div
                  style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}
                >
                  Set to:{' '}
                  {destination.name ||
                    `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`}
                  <button
                    onClick={() => {
                      setDestination(null);
                      setDestinationSearch('');
                    }}
                    style={{ marginLeft: '8px', fontSize: '11px' }}
                  >
                    Clear
                  </button>
                </div>
              )}
              {destinationSearch.length > 0 && destinationSearch.length < 3 && (
                <div
                  style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}
                >
                  Type at least 3 characters...
                </div>
              )}
            </div>
          )}
        </div>

        {/* MATRIX STATUS */}
        <div
          style={{
            marginBottom: '20px',
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: '4px',
          }}
        >
          <h3>Distance Matrix</h3>
          {matrixStatus && (
            <>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                <strong>Status:</strong> {matrixStatus.calculatedPairs}/
                {matrixStatus.totalPairs} pairs ({matrixStatus.percentComplete}
                %)
              </div>

              {/* Live Progress Bar */}
              {buildingMatrix && matrixProgress && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                    Building:{' '}
                    {matrixProgress.calculated + matrixProgress.skipped}/
                    {matrixProgress.totalPairs} (
                    {matrixProgress.percentComplete}%)
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '20px',
                      background: '#e9ecef',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${matrixProgress.percentComplete}%`,
                        height: '100%',
                        background: '#28a745',
                        transition: 'width 0.3s ease',
                      }}
                    ></div>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#666',
                      marginTop: '4px',
                    }}
                  >
                    New: {matrixProgress.calculated} | Cached:{' '}
                    {matrixProgress.skipped} | Failed: {matrixProgress.failed}
                  </div>
                </div>
              )}

              {matrixStatus.missingPairs > 0 && !buildingMatrix && (
                <>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#856404',
                      marginBottom: '8px',
                    }}
                  >
                    ⚠️ {matrixStatus.missingPairs} distances need to be
                    calculated
                  </div>
                  <button
                    onClick={buildMatrix}
                    disabled={buildingMatrix}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: '#ffc107',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Build Distance Matrix
                  </button>
                </>
              )}

              {buildingMatrix && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#0066cc',
                    textAlign: 'center',
                    padding: '8px',
                  }}
                >
                  <strong>⏳ Building matrix...</strong> This may take a while
                  for many POIs.
                </div>
              )}

              {matrixStatus.missingPairs === 0 && !buildingMatrix && (
                <div style={{ fontSize: '12px', color: '#155724' }}>
                  ✓ Matrix complete! Ready to optimize.
                </div>
              )}

              {matrixStatus.lastUpdated && (
                <div
                  style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}
                >
                  Last updated:{' '}
                  {new Date(matrixStatus.lastUpdated).toLocaleString()}
                </div>
              )}
            </>
          )}
        </div>

        {/* ADD POI */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Add POI</h3>
          <form onSubmit={addPoi}>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                value={poiSearch}
                onChange={(e) => setPoiSearch(e.target.value)}
                onFocus={() =>
                  poiResults.length > 0 && setShowPoiAutocomplete(true)
                }
                onBlur={() =>
                  setTimeout(() => setShowPoiAutocomplete(false), 200)
                }
                placeholder='Search for POI location...'
                style={{ width: '100%', padding: '8px' }}
              />
              <AutocompleteDropdown
                results={poiResults}
                onSelect={selectPoiLocation}
                show={showPoiAutocomplete}
              />
            </div>
            <input
              value={newPoi.name}
              onChange={(e) => setNewPoi({ ...newPoi, name: e.target.value })}
              placeholder='POI Name'
              required
              style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            />
            <input
              value={newPoi.lat}
              onChange={(e) => setNewPoi({ ...newPoi, lat: e.target.value })}
              placeholder='Latitude'
              required
              style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            />
            <input
              value={newPoi.lng}
              onChange={(e) => setNewPoi({ ...newPoi, lng: e.target.value })}
              placeholder='Longitude'
              required
              style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            />
            <textarea
              value={newPoi.notes}
              onChange={(e) => setNewPoi({ ...newPoi, notes: e.target.value })}
              placeholder='Notes'
              style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            />
            <button type='submit' style={{ width: '100%', padding: '8px' }}>
              Add POI
            </button>
          </form>
        </div>

        {/* POI LIST */}
        <div style={{ marginBottom: '20px' }}>
          <h3>POIs ({pois.length})</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {pois.map((poi) => (
              <div
                key={poi.id}
                style={{
                  padding: '8px',
                  background: '#f8f9fa',
                  margin: '4px 0',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                <div>
                  {poi.sequence && (
                    <span style={{ fontWeight: 'bold', marginRight: '8px' }}>
                      #{poi.sequence}
                    </span>
                  )}
                  <strong>{poi.name}</strong>
                </div>
                <div style={{ fontSize: '12px' }}>
                  {Number(poi.lat).toFixed(4)}, {Number(poi.lng).toFixed(4)}
                </div>
                {poi.notes && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {poi.notes}
                  </div>
                )}
                {poi.optimizedUpTo && (
                  <div style={{ fontSize: '11px', color: '#28a745' }}>
                    ✓ Optimized (up to {poi.optimizedUpTo})
                  </div>
                )}
                {poi.fullyOptimized && (
                  <div style={{ fontSize: '11px', color: '#28a745' }}>
                    ✓ Fully Optimized
                  </div>
                )}
                <button
                  onClick={() => deletePoi(poi.id)}
                  style={{
                    marginTop: '4px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* OPTIMIZE BUTTON */}
        <button
          onClick={optimizeTrip}
          disabled={loading || !origin || pois.length === 0}
          style={{
            width: '100%',
            padding: '12px',
            background:
              loading || !origin || pois.length === 0 ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            cursor:
              loading || !origin || pois.length === 0
                ? 'not-allowed'
                : 'pointer',
            borderRadius: '4px',
            fontWeight: '500',
          }}
        >
          {loading ? 'Optimizing...' : `Optimize Trip (${pois.length} POIs)`}
        </button>

        {/* ROUTE RESULT */}
        {route && route.route?.trip && (
          <div
            style={{
              marginTop: '20px',
              padding: '12px',
              background: '#d4edda',
              borderRadius: '4px',
            }}
          >
            <h4>Trip Optimized!</h4>
            <p>
              Distance:{' '}
              {(route.route.trip.summary.length * 0.000621371).toFixed(1)} miles
            </p>
            <p>
              Time: {Math.round(route.route.trip.summary.time / 60)} minutes
            </p>
            <p>Stops: {route.optimizedOrder?.length || pois.length}</p>
            <p
              style={{
                fontSize: '12px',
                color: '#155724',
                marginTop: '8px',
              }}
            >
              ✓ Order automatically saved
            </p>
          </div>
        )}
      </div>

      {/* MAP */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={[36.7783, -119.4179]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution='&copy; OpenStreetMap contributors'
          />
          {origin && (
            <Marker position={[origin.lat, origin.lng]}>
              <Popup>Origin</Popup>
            </Marker>
          )}
          {destination && !roundTrip && (
            <Marker position={[destination.lat, destination.lng]}>
              <Popup>Destination</Popup>
            </Marker>
          )}
          {pois.map((poi) => (
            <Marker key={poi.id} position={[Number(poi.lat), Number(poi.lng)]}>
              <Popup>
                {poi.sequence ? `#${poi.sequence} - ` : ''}
                {poi.name}
              </Popup>
            </Marker>
          ))}
          {routeCoordinates.length > 0 && (
            <Polyline positions={routeCoordinates} color='blue' weight={4} />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

// ---------- POLYLINE DECODER ----------
function decodePolyline(encoded: string): [number, number][] {
  const poly: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push([lat / 1e6, lng / 1e6]);
  }

  return poly;
}

export default App;

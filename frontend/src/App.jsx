import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_URL = '/api';

// Debounce hook for autocomplete
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function App() {
  const [pois, setPois] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [roundTrip, setRoundTrip] = useState(true);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newPoi, setNewPoi] = useState({
    name: '',
    lat: '',
    lng: '',
    notes: '',
  });

  // Separate search states for origin, destination, and POI
  const [originSearch, setOriginSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');
  const [poiSearch, setPoiSearch] = useState('');
  const [originResults, setOriginResults] = useState([]);
  const [destinationResults, setDestinationResults] = useState([]);
  const [poiResults, setPoiResults] = useState([]);
  const [showOriginAutocomplete, setShowOriginAutocomplete] = useState(false);
  const [showDestinationAutocomplete, setShowDestinationAutocomplete] =
    useState(false);
  const [showPoiAutocomplete, setShowPoiAutocomplete] = useState(false);

  const debouncedOriginSearch = useDebounce(originSearch, 300);
  const debouncedDestinationSearch = useDebounce(destinationSearch, 300);
  const debouncedPoiSearch = useDebounce(poiSearch, 300);
  const [matrixStatus, setMatrixStatus] = useState(null);
  const [buildingMatrix, setBuildingMatrix] = useState(false);

  // Add this function after loadPois
  const loadMatrixStatus = async () => {
    const res = await fetch(`${API_URL}/matrix-status`);
    const data = await res.json();
    setMatrixStatus(data);
  };

  // Add this function
  const buildMatrix = async () => {
    setBuildingMatrix(true);
    const res = await fetch(`${API_URL}/build-matrix`, { method: 'POST' });
    const data = await res.json();
    alert(data.message);

    // Poll for status updates
    const interval = setInterval(async () => {
      await loadMatrixStatus();
    }, 5000);

    // Stop polling after 30 minutes
    setTimeout(() => {
      clearInterval(interval);
      setBuildingMatrix(false);
    }, 1800000);
  };

  // Update useEffect to load matrix status
  useEffect(() => {
    loadPois();
    loadMatrixStatus();
  }, []);

  useEffect(() => {
    loadPois();
  }, []);

  // Auto-search for origin
  useEffect(() => {
    if (debouncedOriginSearch.length >= 3) {
      searchLocation(debouncedOriginSearch, 'origin');
    } else {
      setOriginResults([]);
    }
  }, [debouncedOriginSearch]);

  // Auto-search for destination
  useEffect(() => {
    if (debouncedDestinationSearch.length >= 3) {
      searchLocation(debouncedDestinationSearch, 'destination');
    } else {
      setDestinationResults([]);
    }
  }, [debouncedDestinationSearch]);

  // Auto-search for POI
  useEffect(() => {
    if (debouncedPoiSearch.length >= 3) {
      searchLocation(debouncedPoiSearch, 'poi');
    } else {
      setPoiResults([]);
    }
  }, [debouncedPoiSearch]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest('input') &&
        !event.target.closest('[data-autocomplete]')
      ) {
        setShowOriginAutocomplete(false);
        setShowDestinationAutocomplete(false);
        setShowPoiAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPois = async () => {
    const res = await fetch(`${API_URL}/pois`);
    const data = await res.json();
    setPois(data);
  };

  const addPoi = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/pois`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newPoi,
        lat: parseFloat(newPoi.lat),
        lng: parseFloat(newPoi.lng),
      }),
    });
    setNewPoi({ name: '', lat: '', lng: '', notes: '' });
    setPoiSearch('');
    loadPois();
  };

  const deletePoi = async (id) => {
    await fetch(`${API_URL}/pois/${id}`, { method: 'DELETE' });
    loadPois();
  };

  const searchLocation = async (query, type) => {
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
    } else if (type === 'poi') {
      setPoiResults(data);
      setShowPoiAutocomplete(true);
    }
  };

  const selectOrigin = (result) => {
    const loc = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name: result.display_name,
    };
    setOrigin(loc);
    setOriginSearch('');
    setOriginResults([]);
    setShowOriginAutocomplete(false);
  };

  const selectDestination = (result) => {
    const loc = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name: result.display_name,
    };
    setDestination(loc);
    setDestinationSearch('');
    setDestinationResults([]);
    setShowDestinationAutocomplete(false);
  };

  const selectPoiLocation = (result) => {
    setNewPoi({
      ...newPoi,
      lat: result.lat,
      lng: result.lon,
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
    setRoute(null); // Clear old route

    try {
      const res = await fetch(`${API_URL}/optimize-trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination: roundTrip ? null : destination,
          pois: pois,
          roundTrip,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Optimization error:', errorData);
        alert(`Optimization failed: ${errorData.error || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.log('Optimization result:', data);

      // Reload POIs to show new order
      await loadPois();

      if (data.route?.trip) {
        setRoute(data);
      } else {
        alert(
          data.message ||
            `Optimization saved! ${data.optimizedCount}/${data.totalCount} POIs optimized.`,
        );
      }
    } catch (error) {
      console.error('Optimization error:', error);
      alert('Trip optimization failed: ' + error.message);
    }
    setLoading(false);
  };

  const routeCoordinates =
    route?.route?.trip?.legs?.flatMap((leg) =>
      leg.shape ? decodePolyline(leg.shape) : [],
    ) || [];

  // Autocomplete dropdown component
  const AutocompleteDropdown = ({ results, onSelect, show }) => {
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
              borderBottom:
                idx < results.length - 1 ? '1px solid #eee' : 'none',
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

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div
        style={{
          width: '400px',
          overflowY: 'auto',
          padding: '20px',
          borderRight: '1px solid #ddd',
        }}
      >
        <h1 style={{ marginBottom: '20px' }}>Trip Planner</h1>

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

          {/* Destination (only shown if not round trip) */}
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

        {/* Matrix Status */}
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
              {matrixStatus.missingPairs > 0 && (
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
                      background: buildingMatrix ? '#6c757d' : '#ffc107',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: buildingMatrix ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {buildingMatrix
                      ? 'Building Matrix...'
                      : 'Build Distance Matrix'}
                  </button>
                </>
              )}
              {matrixStatus.missingPairs === 0 && (
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

        <div style={{ marginBottom: '20px' }}>
          <h3>POIs ({pois.length})</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {pois.map((poi, index) => (
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
                  {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
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

        {route && (
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
            <p style={{ fontSize: '12px', color: '#155724', marginTop: '8px' }}>
              ✓ Order automatically saved
            </p>
          </div>
        )}
      </div>

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
            <Marker key={poi.id} position={[poi.lat, poi.lng]}>
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
}

function decodePolyline(encoded) {
  const poly = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
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

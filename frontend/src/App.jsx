import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_URL = '/api';

function App() {
  const [pois, setPois] = useState([]);
  const [selectedPois, setSelectedPois] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [roundTrip, setRoundTrip] = useState(true);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newPoi, setNewPoi] = useState({ name: '', lat: '', lng: '', notes: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    loadPois();
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
      body: JSON.stringify({ ...newPoi, lat: parseFloat(newPoi.lat), lng: parseFloat(newPoi.lng) })
    });
    setNewPoi({ name: '', lat: '', lng: '', notes: '' });
    loadPois();
  };

  const deletePoi = async (id) => {
    await fetch(`${API_URL}/pois/${id}`, { method: 'DELETE' });
    loadPois();
  };

  const searchLocation = async () => {
    if (!searchQuery) return;
    const res = await fetch(`${API_URL}/geocode?query=${encodeURIComponent(searchQuery)}`);
    const data = await res.json();
    setSearchResults(data);
  };

  const optimizeTrip = async () => {
    if (!origin || selectedPois.length === 0) {
      alert('Please set an origin and select at least one POI');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/optimize-trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination: roundTrip ? null : destination,
          pois: selectedPois,
          roundTrip
        })
      });
      const data = await res.json();
      setRoute(data);
    } catch (error) {
      alert('Trip optimization failed');
    }
    setLoading(false);
  };

  const togglePoiSelection = (poi) => {
    setSelectedPois(prev =>
      prev.find(p => p.id === poi.id)
        ? prev.filter(p => p.id !== poi.id)
        : [...prev, poi]
    );
  };

  const routeCoordinates = route?.route?.trip?.legs?.flatMap(leg =>
    leg.shape ? decodePolyline(leg.shape) : []
  ) || [];

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: '400px', overflowY: 'auto', padding: '20px', borderRight: '1px solid #ddd' }}>
        <h1 style={{ marginBottom: '20px' }}>Trip Planner</h1>

        <div style={{ marginBottom: '20px' }}>
          <h3>Search Location</h3>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a place..."
            style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
          />
          <button onClick={searchLocation} style={{ width: '100%', padding: '8px' }}>Search</button>
          {searchResults.map((result, idx) => (
            <div key={idx} style={{ padding: '8px', background: '#f0f0f0', margin: '4px 0', cursor: 'pointer' }}
                 onClick={() => {
                   const loc = { lat: parseFloat(result.lat), lng: parseFloat(result.lon), name: result.display_name };
                   if (!origin) setOrigin(loc);
                   else setNewPoi({ ...newPoi, lat: result.lat, lng: result.lon, name: result.display_name.split(',')[0] });
                   setSearchResults([]);
                 }}>
              {result.display_name}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Trip Settings</h3>
          <div style={{ marginBottom: '8px' }}>
            <strong>Origin:</strong> {origin ? origin.name || `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}` : 'Not set'}
            {origin && <button onClick={() => setOrigin(null)} style={{ marginLeft: '8px' }}>Clear</button>}
          </div>
          <label style={{ display: 'block', marginBottom: '8px' }}>
            <input type="checkbox" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />
            {' '}Round trip (return to origin)
          </label>
          {!roundTrip && (
            <div>
              <strong>Destination:</strong> {destination ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}` : 'Not set'}
              {destination && <button onClick={() => setDestination(null)}>Clear</button>}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Add POI</h3>
          <form onSubmit={addPoi}>
            <input
              value={newPoi.name}
              onChange={(e) => setNewPoi({ ...newPoi, name: e.target.value })}
              placeholder="Name"
              required
              style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            />
            <input
              value={newPoi.lat}
              onChange={(e) => setNewPoi({ ...newPoi, lat: e.target.value })}
              placeholder="Latitude"
              required
              style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            />
            <input
              value={newPoi.lng}
              onChange={(e) => setNewPoi({ ...newPoi, lng: e.target.value })}
              placeholder="Longitude"
              required
              style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            />
            <textarea
              value={newPoi.notes}
              onChange={(e) => setNewPoi({ ...newPoi, notes: e.target.value })}
              placeholder="Notes"
              style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            />
            <button type="submit" style={{ width: '100%', padding: '8px' }}>Add POI</button>
          </form>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>POIs ({pois.length})</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {pois.map(poi => (
              <div key={poi.id} style={{
                padding: '8px',
                background: selectedPois.find(p => p.id === poi.id) ? '#d4edda' : '#f8f9fa',
                margin: '4px 0',
                cursor: 'pointer',
                border: '1px solid #ddd'
              }} onClick={() => togglePoiSelection(poi)}>
                <div><strong>{poi.name}</strong></div>
                <div style={{ fontSize: '12px' }}>{poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}</div>
                {poi.notes && <div style={{ fontSize: '12px', color: '#666' }}>{poi.notes}</div>}
                <button onClick={(e) => { e.stopPropagation(); deletePoi(poi.id); }} style={{ marginTop: '4px' }}>Delete</button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={optimizeTrip}
          disabled={loading || !origin || selectedPois.length === 0}
          style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'Optimizing...' : 'Optimize Trip'}
        </button>

        {route && (
          <div style={{ marginTop: '20px', padding: '12px', background: '#d4edda', borderRadius: '4px' }}>
            <h4>Trip Optimized!</h4>
            <p>Distance: {(route.route.trip.summary.length * 0.000621371).toFixed(1)} miles</p>
            <p>Time: {Math.round(route.route.trip.summary.time / 60)} minutes</p>
            <p>Stops: {route.optimizedOrder.length}</p>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <MapContainer center={[36.7783, -119.4179]} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {origin && <Marker position={[origin.lat, origin.lng]}><Popup>Origin</Popup></Marker>}
          {destination && !roundTrip && <Marker position={[destination.lat, destination.lng]}><Popup>Destination</Popup></Marker>}
          {pois.map(poi => (
            <Marker key={poi.id} position={[poi.lat, poi.lng]}>
              <Popup>{poi.name}</Popup>
            </Marker>
          ))}
          {routeCoordinates.length > 0 && <Polyline positions={routeCoordinates} color="blue" weight={4} />}
        </MapContainer>
      </div>
    </div>
  );
}

function decodePolyline(encoded) {
  const poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push([lat / 1e6, lng / 1e6]);
  }
  return poly;
}

export default App;

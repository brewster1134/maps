import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.scss';
import './styles/reset.css';
import './styles/App.scss';

// Fix default icon paths for bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/marker-icon-2x.png',
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
});

// Components
import { TripSettings } from './components/TripSettings';
import { MatrixStatus } from './components/MatrixStatus';
import { POIForm } from './components/POIForm';
import { POIList } from './components/POIList';
import { RouteResult } from './components/RouteResult';
import { MapComponent } from './components/Map';

// Services & Utils
import {
  fetchPOIs,
  createPOI,
  deletePOI,
  fetchMatrixStatus,
  buildMatrix,
  fetchOptimizedTrip,
  optimizeTrip as optimizeTripAPI,
  reverseOptimizedRoute,
  searchLocation,
} from './services/api';
import { useDebounce } from './utils/hooks';
import { decodePolyline } from './utils/polyline';

// Types
import {
  POI,
  Location,
  GeoResult,
  RouteData,
  MatrixStatus as MatrixStatusType,
  OptimizedTrip,
} from './types';

const App: React.FC = () => {
  // State
  const [pendingPoi, setPendingPoi] = useState<POI | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [roundTrip, setRoundTrip] = useState(true);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizedTrip, setOptimizedTrip] = useState<OptimizedTrip | null>(
    null,
  );

  // POI Form State
  const [newPoi, setNewPoi] = useState<POI>({
    name: '',
    lat: '',
    lng: '',
    notes: '',
  });

  // Search State
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

  // Matrix State
  const [matrixStatus, setMatrixStatus] = useState<MatrixStatusType | null>(
    null,
  );
  const [buildingMatrix, setBuildingMatrix] = useState(false);

  // Debounced search values
  const debouncedOriginSearch = useDebounce(originSearch, 300);
  const debouncedDestinationSearch = useDebounce(destinationSearch, 300);
  const debouncedPoiSearch = useDebounce(poiSearch, 300);

  // ---------- LOAD DATA ----------
  const loadPois = async () => {
    const data = await fetchPOIs();
    setPois(data);
  };

  const loadMatrixStatus = async () => {
    try {
      const data = await fetchMatrixStatus();
      setMatrixStatus(data);
    } catch (err) {
      console.error('Failed to load matrix status', err);
    }
  };

  const loadOptimizedTrip = async () => {
    try {
      const data = await fetchOptimizedTrip();
      if (data) {
        setOptimizedTrip(data);
        setOrigin(data.origin);
        setDestination(data.destination);
        setRoundTrip(data.roundTrip);
      }
    } catch (err) {
      console.error('Failed to load optimized trip', err);
    }
  };

  // ---------- MATRIX OPERATIONS ----------
  const handleBuildMatrix = async () => {
    setBuildingMatrix(true);
    try {
      await buildMatrix();

      // Poll for updates
      const interval = setInterval(async () => {
        await loadMatrixStatus();
      }, 2000);

      // Stop polling after 2 hours max
      setTimeout(() => {
        clearInterval(interval);
        setBuildingMatrix(false);
      }, 7200000);

      // Check for completion
      const checkComplete = setInterval(async () => {
        const status = await fetchMatrixStatus();
        setMatrixStatus(status);
        if (status.missingPairs === 0) {
          clearInterval(interval);
          clearInterval(checkComplete);
          setBuildingMatrix(false);
          alert('Distance matrix build complete!');
        }
      }, 5000);
    } catch (error) {
      console.error('Failed to start matrix build', error);
      setBuildingMatrix(false);
    }
  };

  // ---------- POI OPERATIONS ----------
  const handleAddPoi = async (e: React.FormEvent) => {
    e.preventDefault();

    await createPOI({
      name: newPoi.name,
      lat: parseFloat(newPoi.lat as string),
      lng: parseFloat(newPoi.lng as string),
      notes: newPoi.notes,
    });

    setNewPoi({ name: '', lat: '', lng: '', notes: '' });
    setPendingPoi(null);
    setPoiSearch('');

    loadPois();
    loadMatrixStatus();
  };

  const handleDeletePoi = async (id?: string) => {
    if (!id) return;
    await deletePOI(id);
    setOptimizedTrip(null);
    loadPois();
  };

  const handleToggleRoundTrip = async () => {
    setRoundTrip((prev) => {
      const next = !prev;

      if (optimizedTrip?.roundTrip !== next) {
        setOptimizedTrip(null);
        setRoute(null);
      }

      return next;
    });
  };

  const handleReverseRoute = async () => {
    setLoading(true);
    try {
      const reversedTrip = await reverseOptimizedRoute();

      setOptimizedTrip(reversedTrip);

      // Reload POIs so sequences update
      await loadPois();

      // Clear any existing rendered route
      setRoute(null);
    } catch (err) {
      console.error('Failed to reverse route', err);
      alert('Failed to reverse route');
    } finally {
      setLoading(false);
    }
  };

  // ---------- GEOCODING ----------
  const handleSearchLocation = async (
    query: string,
    type: 'origin' | 'destination' | 'poi',
  ) => {
    if (!query) return;
    const data = await searchLocation(query);

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
      lng: parseFloat(result.lon),
      name: result.display_name,
    });
    setOriginSearch('');
    setOriginResults([]);
    setShowOriginAutocomplete(false);
  };

  const selectDestination = (result: GeoResult) => {
    setDestination({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name: result.display_name,
    });
    setDestinationSearch('');
    setDestinationResults([]);
    setShowDestinationAutocomplete(false);
  };

  const selectPoiLocation = (result: GeoResult) => {
    const poi = {
      name: result.display_name.split(',')[0],
      lat: result.lat,
      lng: result.lon,
      notes: '',
    };

    setNewPoi(poi);
    setPendingPoi(poi);

    setPoiSearch('');
    setPoiResults([]);
    setShowPoiAutocomplete(false);
  };

  // ---------- TRIP OPTIMIZATION ----------
  const isOptimizationStale = (): boolean => {
    if (!optimizedTrip) return false;

    // Check if any POIs are missing from optimization
    const optimizedCoords = new Set(
      optimizedTrip.optimizedOrder.map(
        (op) => `${op.lat.toFixed(6)},${op.lng.toFixed(6)}`,
      ),
    );

    const hasMissingPOIs = pois.some((poi) => {
      const key = `${Number(poi.lat).toFixed(6)},${Number(poi.lng).toFixed(6)}`;
      return !optimizedCoords.has(key);
    });

    return hasMissingPOIs;
  };

  const handleOptimizeTrip = async () => {
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
      const data = await optimizeTripAPI({
        origin,
        destination: roundTrip ? undefined : destination || undefined,
        pois,
        roundTrip,
      });

      await loadPois();
      await loadOptimizedTrip();

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

  // ---------- EFFECTS ----------
  useEffect(() => {
    loadPois();
    loadMatrixStatus();
    loadOptimizedTrip();
  }, []);

  useEffect(() => {
    if (debouncedOriginSearch.length >= 3)
      handleSearchLocation(debouncedOriginSearch, 'origin');
    else setOriginResults([]);
  }, [debouncedOriginSearch]);

  useEffect(() => {
    if (debouncedDestinationSearch.length >= 3)
      handleSearchLocation(debouncedDestinationSearch, 'destination');
    else setDestinationResults([]);
  }, [debouncedDestinationSearch]);

  useEffect(() => {
    if (debouncedPoiSearch.length >= 3)
      handleSearchLocation(debouncedPoiSearch, 'poi');
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

  // ---------- ROUTE COORDINATES ----------
  const routeCoordinates: [number, number][] =
    route?.route?.trip?.legs?.flatMap((leg) =>
      leg.shape ? decodePolyline(leg.shape) : [],
    ) || [];

  // ---------- RENDER ----------
  return (
    <div className='app-container'>
      {/* SIDEBAR */}
      <div className='sidebar'>
        {/* Trip Settings */}
        <div className='section'>
          <TripSettings
            isOptimizationStale={isOptimizationStale()}
            pois={pois}
            loading={loading}
            origin={origin}
            destination={destination}
            roundTrip={roundTrip}
            originSearch={originSearch}
            destinationSearch={destinationSearch}
            originResults={originResults}
            destinationResults={destinationResults}
            showOriginAutocomplete={showOriginAutocomplete}
            showDestinationAutocomplete={showDestinationAutocomplete}
            onReverseRoute={handleReverseRoute}
            onOriginSearchChange={setOriginSearch}
            onDestinationSearchChange={setDestinationSearch}
            onOriginFocus={() =>
              originResults.length > 0 && setShowOriginAutocomplete(true)
            }
            onDestinationFocus={() =>
              destinationResults.length > 0 &&
              setShowDestinationAutocomplete(true)
            }
            onOriginBlur={() =>
              setTimeout(() => setShowOriginAutocomplete(false), 200)
            }
            onDestinationBlur={() =>
              setTimeout(() => setShowDestinationAutocomplete(false), 200)
            }
            onOriginSelect={selectOrigin}
            onDestinationSelect={selectDestination}
            onOriginClear={() => {
              setOrigin(null);
              setOriginSearch('');
            }}
            onDestinationClear={() => {
              setDestination(null);
              setDestinationSearch('');
            }}
            onRoundTripChange={handleToggleRoundTrip}
          />
        </div>

        {/* Matrix Status */}
        <div className='section'>
          <MatrixStatus
            status={matrixStatus}
            building={buildingMatrix}
            onBuildClick={handleBuildMatrix}
          />
        </div>

        {/* Add POI */}
        <div className='section'>
          <POIForm
            poi={newPoi}
            poiSearch={poiSearch}
            poiResults={poiResults}
            showAutocomplete={showPoiAutocomplete}
            onSearchChange={setPoiSearch}
            onSearchFocus={() =>
              poiResults.length > 0 && setShowPoiAutocomplete(true)
            }
            onSearchBlur={() =>
              setTimeout(() => setShowPoiAutocomplete(false), 200)
            }
            onLocationSelect={selectPoiLocation}
            onFieldChange={(field, value) =>
              setNewPoi({ ...newPoi, [field]: value })
            }
            onSubmit={handleAddPoi}
          />
        </div>

        {/* POI List */}
        <div className='section'>
          <POIList
            route={route}
            pois={pois}
            optimizedTrip={optimizedTrip}
            onDelete={handleDeletePoi}
          />
        </div>

        {isOptimizationStale() &&
          matrixStatus &&
          matrixStatus.missingPairs === 0 && (
            <div className='stale-optimization-warning'>
              ⚠️ New POIs detected since last optimization. Click optimize to
              update route.
            </div>
          )}

        {/* Optimize Button */}
        <button
          className='branded'
          onClick={handleOptimizeTrip}
          disabled={
            loading ||
            !origin ||
            pois.length === 0 ||
            !matrixStatus ||
            matrixStatus.missingPairs > 0
          }
        >
          {loading ? 'Optimizing...' : `Optimize Trip (${pois.length} POIs)`}
        </button>
      </div>

      {/* MAP */}
      <MapComponent
        destination={destination}
        origin={origin}
        pendingPoi={pendingPoi}
        pois={pois}
        roundTrip={roundTrip}
        routeCoordinates={routeCoordinates}
      />
    </div>
  );
};

export default App;

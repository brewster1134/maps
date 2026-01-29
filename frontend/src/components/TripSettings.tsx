import React from 'react';
import { Location, GeoResult, type POI } from '../types';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import '../styles/TripSettings.scss';

interface TripSettingsProps {
  destination: Location | null;
  destinationResults: GeoResult[];
  destinationSearch: string;
  isOptimizationStale: boolean;
  loading: boolean;
  origin: Location | null;
  originResults: GeoResult[];
  originSearch: string;
  pois: POI[];
  roundTrip: boolean;
  showDestinationAutocomplete: boolean;
  showOriginAutocomplete: boolean;
  onDestinationBlur: () => void;
  onDestinationClear: () => void;
  onDestinationFocus: () => void;
  onDestinationSearchChange: (value: string) => void;
  onDestinationSelect: (result: GeoResult) => void;
  onOriginBlur: () => void;
  onOriginClear: () => void;
  onOriginFocus: () => void;
  onOriginSearchChange: (value: string) => void;
  onOriginSelect: (result: GeoResult) => void;
  onReverseRoute: () => void;
  onRoundTripChange: (checked: boolean) => void;
}

export const TripSettings: React.FC<TripSettingsProps> = ({
  destination,
  destinationResults,
  destinationSearch,
  isOptimizationStale,
  loading,
  origin,
  originResults,
  originSearch,
  pois,
  roundTrip,
  showDestinationAutocomplete,
  showOriginAutocomplete,
  onDestinationBlur,
  onDestinationClear,
  onDestinationFocus,
  onDestinationSearchChange,
  onDestinationSelect,
  onOriginBlur,
  onOriginClear,
  onOriginFocus,
  onOriginSearchChange,
  onOriginSelect,
  onReverseRoute,
  onRoundTripChange,
}) => {
  return (
    <div className='trip-settings'>
      {/* Origin */}
      <div className='form-group'>
        <div className='autocomplete-container'>
          <input
            value={originSearch}
            onChange={(e) => onOriginSearchChange(e.target.value)}
            onFocus={onOriginFocus}
            onBlur={onOriginBlur}
            placeholder='Origin...'
            className='form-input'
          />
          <AutocompleteDropdown
            results={originResults}
            onSelect={onOriginSelect}
            show={showOriginAutocomplete}
          />
        </div>
        {origin && (
          <div className='location-display'>
            {origin.name ||
              `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`}
            <button onClick={onOriginClear} className='clear-button'>
              Clear
            </button>
          </div>
        )}
        {originSearch.length > 0 && originSearch.length < 3 && (
          <div className='hint-text'>Type at least 3 characters...</div>
        )}
      </div>

      <div className='trip-settings-ctas'>
        {/* Round Trip Checkbox */}
        <label className='checkbox-label'>
          <input
            type='checkbox'
            checked={roundTrip}
            onChange={(e) => onRoundTripChange(e.target.checked)}
          />
          Round trip
        </label>

        {/* Reverse Round Trip Button */}
        {roundTrip && pois.length > 0 && (
          <button
            onClick={onReverseRoute}
            disabled={loading || isOptimizationStale}
            className='reverse-route-btn'
          >
            Reverse Route
          </button>
        )}
      </div>

      {/* Destination */}
      {!roundTrip && (
        <div className='form-group'>
          <div className='autocomplete-container'>
            <input
              value={destinationSearch}
              onChange={(e) => onDestinationSearchChange(e.target.value)}
              onFocus={onDestinationFocus}
              onBlur={onDestinationBlur}
              placeholder='Destination...'
              className='form-input'
            />
            <AutocompleteDropdown
              results={destinationResults}
              onSelect={onDestinationSelect}
              show={showDestinationAutocomplete}
            />
          </div>
          {destination && (
            <div className='location-display'>
              {destination.name ||
                `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`}
              <button onClick={onDestinationClear} className='clear-button'>
                Clear
              </button>
            </div>
          )}
          {destinationSearch.length > 0 && destinationSearch.length < 3 && (
            <div className='hint-text'>Type at least 3 characters...</div>
          )}
        </div>
      )}
    </div>
  );
};

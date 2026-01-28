import React from 'react';
import { Location, GeoResult } from '../types';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import '../styles/TripSettings.css';

interface TripSettingsProps {
  origin: Location | null;
  destination: Location | null;
  roundTrip: boolean;
  originSearch: string;
  destinationSearch: string;
  originResults: GeoResult[];
  destinationResults: GeoResult[];
  showOriginAutocomplete: boolean;
  showDestinationAutocomplete: boolean;
  onOriginSearchChange: (value: string) => void;
  onDestinationSearchChange: (value: string) => void;
  onOriginFocus: () => void;
  onDestinationFocus: () => void;
  onOriginBlur: () => void;
  onDestinationBlur: () => void;
  onOriginSelect: (result: GeoResult) => void;
  onDestinationSelect: (result: GeoResult) => void;
  onOriginClear: () => void;
  onDestinationClear: () => void;
  onRoundTripChange: (checked: boolean) => void;
}

export const TripSettings: React.FC<TripSettingsProps> = ({
  origin,
  destination,
  roundTrip,
  originSearch,
  destinationSearch,
  originResults,
  destinationResults,
  showOriginAutocomplete,
  showDestinationAutocomplete,
  onOriginSearchChange,
  onDestinationSearchChange,
  onOriginFocus,
  onDestinationFocus,
  onOriginBlur,
  onDestinationBlur,
  onOriginSelect,
  onDestinationSelect,
  onOriginClear,
  onDestinationClear,
  onRoundTripChange,
}) => {
  return (
    <div className='trip-settings'>
      <h3>Trip Settings</h3>

      {/* Origin */}
      <div className='form-group'>
        <label className='form-label'>Origin</label>
        <div className='autocomplete-container'>
          <input
            value={originSearch}
            onChange={(e) => onOriginSearchChange(e.target.value)}
            onFocus={onOriginFocus}
            onBlur={onOriginBlur}
            placeholder='Start typing origin address...'
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
            Set to:{' '}
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

      {/* Round Trip Checkbox */}
      <label className='checkbox-label'>
        <input
          type='checkbox'
          checked={roundTrip}
          onChange={(e) => onRoundTripChange(e.target.checked)}
        />{' '}
        Round trip (return to origin)
      </label>

      {/* Destination */}
      {!roundTrip && (
        <div className='form-group'>
          <label className='form-label'>Destination</label>
          <div className='autocomplete-container'>
            <input
              value={destinationSearch}
              onChange={(e) => onDestinationSearchChange(e.target.value)}
              onFocus={onDestinationFocus}
              onBlur={onDestinationBlur}
              placeholder='Start typing destination address...'
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
              Set to:{' '}
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

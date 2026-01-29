import React from 'react';
import { POI, GeoResult } from '../types';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import '../styles/POIForm.scss';

interface POIFormProps {
  poi: POI;
  poiSearch: string;
  poiResults: GeoResult[];
  showAutocomplete: boolean;
  onSearchChange: (value: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onLocationSelect: (result: GeoResult) => void;
  onFieldChange: (field: keyof POI, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const POIForm: React.FC<POIFormProps> = ({
  poi,
  poiSearch,
  poiResults,
  showAutocomplete,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  onLocationSelect,
  onFieldChange,
  onSubmit,
}) => {
  return (
    <div className='poi-form'>
      <h3>Add POI</h3>
      <form onSubmit={onSubmit}>
        <div className='autocomplete-container'>
          <input
            value={poiSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            placeholder='Search for POI location...'
            className='form-input'
          />
          <AutocompleteDropdown
            results={poiResults}
            onSelect={onLocationSelect}
            show={showAutocomplete}
          />
        </div>
        <input
          value={poi.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          placeholder='POI Name'
          required
          className='form-input hidden'
        />
        <input
          value={poi.lat}
          onChange={(e) => onFieldChange('lat', e.target.value)}
          placeholder='Latitude'
          required
          className='form-input hidden'
        />
        <input
          value={poi.lng}
          onChange={(e) => onFieldChange('lng', e.target.value)}
          placeholder='Longitude'
          required
          className='form-input hidden'
        />
        <textarea
          value={poi.notes}
          onChange={(e) => onFieldChange('notes', e.target.value)}
          placeholder='Notes'
          className='form-textarea'
        />
        <button type='submit' className='submit-button'>
          Add POI
        </button>
      </form>
    </div>
  );
};

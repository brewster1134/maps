import React from 'react';
import { GeoResult } from '../types';
import '../styles/AutocompleteDropdown.css';

interface AutocompleteDropdownProps {
  results: GeoResult[];
  onSelect: (result: GeoResult) => void;
  show: boolean;
}

export const AutocompleteDropdown: React.FC<AutocompleteDropdownProps> = ({
  results,
  onSelect,
  show,
}) => {
  if (!show || results.length === 0) return null;

  return (
    <div data-autocomplete='true' className='autocomplete-dropdown'>
      {results.map((result, idx) => (
        <div
          key={idx}
          className='autocomplete-item'
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(result);
          }}
        >
          <div className='autocomplete-item-title'>
            {result.display_name.split(',')[0]}
          </div>
          <div className='autocomplete-item-subtitle'>
            {result.display_name.split(',').slice(1).join(',').trim()}
          </div>
        </div>
      ))}
    </div>
  );
};

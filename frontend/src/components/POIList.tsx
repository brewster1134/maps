import React from 'react';
import { POI, OptimizedTrip } from '../types';
import '../styles/POIList.scss';

interface POIListProps {
  pois: POI[];
  optimizedTrip: OptimizedTrip | null;
  onDelete: (id?: string) => void;
}

export const POIList: React.FC<POIListProps> = ({
  pois,
  optimizedTrip,
  onDelete,
}) => {
  return (
    <div className='poi-list'>
      <h3>POIs ({pois.length})</h3>
      {optimizedTrip && (
        <div className='optimization-timestamp'>
          ✓ Trip optimized on{' '}
          {new Date(optimizedTrip.lastOptimized).toLocaleString()}
        </div>
      )}
      <div className='poi-list-scroll'>
        {pois.map((poi) => (
          <div
            key={poi.id}
            className={`poi-item ${poi.sequence ? 'poi-item-optimized' : ''}`}
          >
            <div className='poi-header'>
              {poi.sequence && (
                <span className='poi-sequence'>#{poi.sequence}</span>
              )}
              <strong>{poi.name}</strong>
            </div>
            <div className='poi-coordinates'>
              {Number(poi.lat).toFixed(4)}, {Number(poi.lng).toFixed(4)}
            </div>
            {poi.notes && <div className='poi-notes'>{poi.notes}</div>}
            <button onClick={() => onDelete(poi.id)} className='delete-button'>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

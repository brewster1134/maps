import React from 'react';
import { POI, OptimizedTrip, type RouteData } from '../types';
import '../styles/POIList.scss';
import { RouteResult } from './RouteResult';

interface POIListProps {
  route: RouteData | null;
  pois: POI[];
  optimizedTrip: OptimizedTrip | null;
  onDelete: (id?: string) => void;
}

export const POIList: React.FC<POIListProps> = ({
  pois,
  route,
  optimizedTrip,
  onDelete,
}) => {
  return (
    <div className='poi-list'>
      <h3>POIs ({pois.length})</h3>
      {optimizedTrip && (
        <RouteResult
          route={route}
          poisCount={pois.length}
          lastOptimized={optimizedTrip?.lastOptimized}
        />
      )}
      <div className='poi-list-scroll'>
        {pois.map((poi) => (
          <div
            key={poi.id}
            className={`poi-item ${poi.sequence ? 'poi-item-optimized' : ''}`}
          >
            <div className='poi-line-1'>
              <div className='poi-header'>
                {poi.sequence && (
                  <span className='poi-sequence'>#{poi.sequence}</span>
                )}
                <strong>{poi.name}</strong>
              </div>
              <button
                onClick={() => onDelete(poi.id)}
                className='delete-button'
              >
                Delete
              </button>
            </div>
            <div className='poi-line-1'>
              {poi.notes && <div className='poi-notes'>{poi.notes}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

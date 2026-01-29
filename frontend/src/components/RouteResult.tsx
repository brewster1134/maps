import React from 'react';
import { RouteData } from '../types';
import '../styles/RouteResult.scss';

interface RouteResultProps {
  route: RouteData | null;
  poisCount: number;
  lastOptimized?: string;
}

export const RouteResult: React.FC<RouteResultProps> = ({
  route,
  poisCount,
  lastOptimized,
}) => {
  if (!lastOptimized || !route?.route.trip) return null;

  return (
    <div className='route-result'>
      <h4>Trip Optimized!</h4>

      {lastOptimized && (
        <p className='optimized-at'>
          ✓ Optimized on {new Date(lastOptimized).toLocaleString()}
        </p>
      )}

      <p>Distance: {route.route.trip.summary.length.toFixed(1)} miles</p>
      <p>Time: {Math.round(route.route.trip.summary.time / 60)} minutes</p>
      <p>Stops: {route.optimizedOrder?.length ?? poisCount}</p>
    </div>
  );
};

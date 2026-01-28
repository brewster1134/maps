import React from 'react';
import { RouteData } from '../types';
import '../styles/RouteResult.css';

interface RouteResultProps {
  route: RouteData | null;
  poisCount: number;
}

export const RouteResult: React.FC<RouteResultProps> = ({
  route,
  poisCount,
}) => {
  if (!route || !route.route?.trip) return null;

  return (
    <div className='route-result'>
      <h4>Trip Optimized!</h4>
      <p>
        Distance:{' '}
        {(route.route.trip.summary.length * 0.000621371).toFixed(1)} miles
      </p>
      <p>Time: {Math.round(route.route.trip.summary.time / 60)} minutes</p>
      <p>Stops: {route.optimizedOrder?.length || poisCount}</p>
      <p className='route-saved'>✓ Order saved to optimized_pois.json</p>
    </div>
  );
};

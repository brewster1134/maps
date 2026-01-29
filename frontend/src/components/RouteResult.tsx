import React from 'react';
import { RouteData } from '../types';
import '../styles/RouteResult.scss';

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
        Distance: Distance: {route.route.trip.summary.length.toFixed(1)} miles
      </p>
      <p>Time: {Math.round(route.route.trip.summary.time / 60)} minutes</p>
      <p>Stops: {route.optimizedOrder?.length || poisCount}</p>
      <p className='route-saved'>✓ Optimized Route Saved~</p>
    </div>
  );
};

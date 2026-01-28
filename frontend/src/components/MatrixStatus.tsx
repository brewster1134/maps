import React from 'react';
import { MatrixStatus as MatrixStatusType } from '../types';
import '../styles/MatrixStatus.scss';

interface MatrixStatusProps {
  status: MatrixStatusType | null;
  building: boolean;
  onBuildClick: () => void;
}

export const MatrixStatus: React.FC<MatrixStatusProps> = ({
  status,
  building,
  onBuildClick,
}) => {
  if (!status) return null;

  return (
    <div className='matrix-status'>
      <h3>Distance Calculations</h3>
      <div className='matrix-info'>
        <strong>Status:</strong>
        {`${status.calculatedPairs}/${status.totalPairs} pairs (${status.percentComplete}%)`}
      </div>

      {status.missingPairs > 0 && !building && (
        <>
          <div className='matrix-warning'>
            ⚠️ {status.missingPairs} distances need to be calculated
          </div>
          <button onClick={onBuildClick} className='build-button'>
            Build Distance Matrix
          </button>
        </>
      )}

      {building && (
        <div className='matrix-building'>
          <strong>⏳ Building matrix...</strong> This may take a while for many
          POIs.
        </div>
      )}

      {status.missingPairs === 0 && !building && (
        <div className='matrix-complete'>✓ Matrix complete!</div>
      )}

      {status.lastUpdated && (
        <div className='matrix-timestamp'>
          Last updated: {new Date(status.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
};

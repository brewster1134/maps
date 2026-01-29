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

  const isComplete = status.missingPairs === 0;

  return (
    <div
      className={`matrix-status ${
        isComplete ? 'matrix-status--ready' : 'matrix-status--pending'
      }`}
    >
      <div className='matrix-status-info'>
        {isComplete ? (
          <span>✓ Route is ready to optimize</span>
        ) : (
          <span>Distance calculated: {status.percentComplete}%</span>
        )}
      </div>

      {!isComplete && !building && (
        <>
          <div className='matrix-status-warning'>
            {status.missingPairs} routes remain
          </div>
          <button onClick={onBuildClick} className='branded'>
            Calculate remaining routes
          </button>
        </>
      )}

      {building && (
        <div className='matrix-status-building'>
          Preparing route... please wait
        </div>
      )}

      {status.lastUpdated && (
        <div className='matrix-status-timestamp'>
          Last optimized: {new Date(status.lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
};

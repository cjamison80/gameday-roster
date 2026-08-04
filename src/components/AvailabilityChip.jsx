import React from 'react';
import { getAvailabilityColor } from '@/lib/utils';

const labels = {
  available: 'Available',
  maybe: 'Maybe',
  unavailable: 'Unavailable',
  not_set: 'Not Set'
};

const bgs = {
  available: '#DCFCE7',
  maybe: '#FEF9C3',
  unavailable: '#FEE2E2',
  not_set: '#F1F5F9'
};

export default function AvailabilityChip({ status = 'not_set', small = false }) {
  const color = getAvailabilityColor(status);
  const bg = bgs[status] || bgs.not_set;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-semibold"
      style={{
        backgroundColor: bg,
        color,
        fontSize: small ? 11 : 12,
        padding: small ? '2px 8px' : '3px 10px'
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
      {labels[status]}
    </span>
  );
}
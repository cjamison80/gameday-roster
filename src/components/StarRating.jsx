import React from 'react';
import { Star } from 'lucide-react';

// interactive=false: display-only (e.g. average rating). interactive=true: tappable input.
export default function StarRating({ value = 0, onChange, size = 16, interactive = false }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-0.5">
      {stars.map(n => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(n)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
          style={{ lineHeight: 0 }}
        >
          <Star
            size={size}
            fill={n <= Math.round(value) ? '#F59E0B' : 'none'}
            color={n <= Math.round(value) ? '#F59E0B' : '#CBD5E1'}
          />
        </button>
      ))}
    </div>
  );
}

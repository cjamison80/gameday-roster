import React from 'react';
import { getMatchScoreColor } from '@/lib/utils';

export default function MatchScoreBadge({ score, size = 'md', showLabel = true }) {
  const color = getMatchScoreColor(score);
  const sizes = {
    sm: { ring: 40, text: 10, label: 9 },
    md: { ring: 52, text: 13, label: 10 },
    lg: { ring: 72, text: 18, label: 11 }
  };
  const s = sizes[size] || sizes.md;
  const radius = (s.ring - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div style={{ width: s.ring, height: s.ring, position: 'relative' }}>
        <svg width={s.ring} height={s.ring} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={s.ring/2} cy={s.ring/2} r={radius} stroke="#E2E8F0" strokeWidth="4" fill="none" />
          <circle
            cx={s.ring/2} cy={s.ring/2} r={radius}
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: s.text, fontWeight: 800, color, fontFamily: 'Inter', lineHeight: 1 }}>{score}</span>
        </div>
      </div>
      {showLabel && <span style={{ fontSize: s.label, color: '#64748B', fontWeight: 600, letterSpacing: '0.05em' }}>MATCH</span>}
    </div>
  );
}
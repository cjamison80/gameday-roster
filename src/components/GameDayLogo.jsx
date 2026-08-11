import React from 'react';

const INK = '#1C1B19';
const IVORY = '#F5F1EA';
const BRASS = '#A17C48';
const REDWOOD = '#8A3324';

export default function GameDayLogo({ size = 32, showText = true, light = false }) {
  const primary = light ? IVORY : INK;
  const muted = light ? 'rgba(245,241,234,0.78)' : '#7C7368';
  const accent = light ? '#D8C09A' : BRASS;

  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 60 72"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        style={{ display: 'block' }}
      >
        <defs>
          <clipPath id="shieldClipEditorial">
            <path d="M10 20 Q10 16 14 16 H46 Q50 16 50 20 V36 C50 50 42 58 30 62 C18 58 10 50 10 36 Z" />
          </clipPath>
        </defs>

        <path
          d="M10 20 Q10 16 14 16 H46 Q50 16 50 20 V36 C50 50 42 58 30 62 C18 58 10 50 10 36 Z"
          fill={light ? 'rgba(245,241,234,0.06)' : '#FBF8F1'}
          stroke={primary}
          strokeWidth="1.6"
        />
        <path d="M16 24 Q16 21 19 21 H41 Q44 21 44 24 V36 C44 47 38.5 53 30 56 C21.5 53 16 47 16 36 Z" fill={light ? 'rgba(255,255,255,0.04)' : '#F5F1EA'} />
        <path d="M18 41 L43 35" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <text
          x="30"
          y="43"
          textAnchor="middle"
          fill={primary}
          fontSize="19"
          fontWeight="700"
          fontFamily="Georgia, Times New Roman, serif"
        >
          G
        </text>
        <circle cx="30" cy="8" r="3.8" fill={accent} />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span
            style={{
              color: primary,
              fontFamily: 'Georgia, Times New Roman, serif',
              fontWeight: 500,
              fontSize: size * 0.48,
              letterSpacing: '-0.04em',
              lineHeight: 0.95,
              whiteSpace: 'nowrap',
            }}
          >
            GameDay
          </span>
          <div className="flex items-center gap-2 mt-1" style={{ width: '100%' }}>
            <span style={{ height: 1, flex: 1, backgroundColor: light ? 'rgba(216,192,154,0.72)' : '#D8D0C4' }} />
            <span
              style={{
                color: muted,
                fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
                fontWeight: 700,
                fontSize: size * 0.20,
                letterSpacing: '0.34em',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                textTransform: 'uppercase'
              }}
            >
              Roster
            </span>
            <span style={{ height: 1, flex: 1, backgroundColor: light ? 'rgba(216,192,154,0.72)' : '#D8D0C4' }} />
          </div>
        </div>
      )}
    </div>
  );
}
import React from 'react';

const NAVY = '#131F32';
const RED = '#E31D2B';
const GOLD = '#F9B233';

export default function GameDayLogo({ size = 32, showText = true, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* Shield icon with star */}
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
          <linearGradient id="goldStar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF1B8" />
            <stop offset="100%" stopColor={GOLD} />
          </linearGradient>
          <clipPath id="shieldClip">
            <path d="M10 20 Q10 16 14 16 H46 Q50 16 50 20 V36 C50 50 42 58 30 62 C18 58 10 50 10 36 Z" />
          </clipPath>
        </defs>

        {/* Shield border: left navy, right red */}
        <path d="M10 20 Q10 16 14 16 H46 Q50 16 50 20 V36 C50 50 42 58 30 62 C18 58 10 50 10 36 Z" fill={NAVY} />
        <rect x="30" y="14" width="22" height="50" fill={RED} clipPath="url(#shieldClip)" />

        {/* Inner white shield */}
        <path d="M15 23 Q15 19.5 18.5 19.5 H41.5 Q45 19.5 45 23 V36 C45 48 39 54.5 30 57.5 C21 54.5 15 48 15 36 Z" fill="#FFFFFF" />

        {/* Swoosh */}
        <path d="M13 41 L46 33 L47.5 36.5 L14.5 44.5 Z" fill={RED} />

        {/* G */}
        <text x="29" y="44" textAnchor="middle" fill={NAVY} fontSize="20" fontWeight="900" fontFamily="Inter, sans-serif">G</text>

        {/* Star */}
        <path
          d="M30 1 L31.76 5.57 L36.66 5.84 L32.85 8.93 L34.11 13.66 L30 11 L25.89 13.66 L27.15 8.93 L23.34 5.84 L28.24 5.57 Z"
          fill="url(#goldStar)"
          stroke={NAVY}
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              fontStyle: 'italic',
              fontSize: size * 0.52,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: light ? '#FFFFFF' : NAVY }}>GAME</span>
            <span style={{ color: RED }}>DAY</span>
          </span>
          <div className="flex items-center gap-1.5 mt-0.5" style={{ width: '100%' }}>
            <span style={{ height: 2, flex: 1, backgroundColor: RED, borderRadius: 1 }} />
            <span
              style={{
                color: light ? '#FFFFFF' : NAVY,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                fontSize: size * 0.24,
                letterSpacing: '0.22em',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              ROSTER
            </span>
            <span style={{ height: 2, flex: 1, backgroundColor: RED, borderRadius: 1 }} />
          </div>
        </div>
      )}
    </div>
  );
}
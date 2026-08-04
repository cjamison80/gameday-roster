import React from 'react';

export default function GameDayLogo({ size = 32, showText = true, light = false }) {
  return (
    <div className="flex items-center gap-2">
      {/* Shield logo mark */}
      <div
        style={{ width: size, height: size }}
        className="relative flex-shrink-0"
      >
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
          <path d="M20 2L4 8v12c0 9 7 16 16 18 9-2 16-9 16-18V8L20 2z" fill="#0B1528"/>
          <path d="M20 4L6 9.5v10.5c0 8 6.5 14.5 14 16.5 7.5-2 14-8.5 14-16.5V9.5L20 4z" fill="#2563EB"/>
          <path d="M15 20l4 4 8-8" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <text x="20" y="26" textAnchor="middle" fill="white" fontSize="9" fontFamily="Inter" fontWeight="800">GR</text>
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span style={{ color: light ? '#FFFFFF' : '#0B1528', fontFamily: 'Inter', fontWeight: 800, fontSize: size * 0.45, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            GAMEDAY
          </span>
          <span style={{ color: '#2563EB', fontFamily: 'Inter', fontWeight: 700, fontSize: size * 0.38, letterSpacing: '0.05em', lineHeight: 1.1 }}>
            ROSTER
          </span>
        </div>
      )}
    </div>
  );
}
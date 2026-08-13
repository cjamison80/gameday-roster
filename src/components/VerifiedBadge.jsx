import React from 'react';
import { Shield, CheckCircle } from 'lucide-react';

export default function VerifiedBadge({ type = 'player', size = 14 }) {
  const configs = {
    player: { label: 'Verified Player', color: '#2563EB', bg: '#EFF6FF' },
    coach: { label: 'Verified Coach', color: '#2563EB', bg: '#EFF6FF' },
    team: { label: 'Verified Team', color: '#16A34A', bg: '#DCFCE7' },
    organization: { label: 'Elite Organization', color: '#8B5CF6', bg: '#F5F3FF' },
    top_rated: { label: 'Top Rated', color: '#A4A017', bg: '#FEFCE8' }
  };
  const cfg = configs[type] || configs.player;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{ backgroundColor: cfg.bg, color: cfg.color, fontSize: size - 2, fontWeight: 600 }}
    >
      <Shield size={size - 2} />
      {cfg.label}
    </span>
  );
}
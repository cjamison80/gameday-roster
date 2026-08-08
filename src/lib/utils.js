import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Match score calculation (rules-based MVP v2)
export function calculateMatchScore({ player, opportunity, availability }) {
  if (!player || !opportunity) return 0;

  // A player who has explicitly marked themselves unavailable should not be treated as a good match.
  if (availability?.status === 'unavailable') return 0;

  let score = 0;
  let factors = 0;

  // Position match (30%) — exact position match earns full credit.
  if (opportunity.positions_needed?.length > 0 && player.positions?.length > 0) {
    const match = player.positions.some(p => opportunity.positions_needed.includes(p));
    score += match ? 30 : 0;
    factors += 30;
  }

  // Age division (20%).
  if (opportunity.age_division && player.age_division) {
    score += opportunity.age_division === player.age_division ? 20 : 0;
    factors += 20;
  }

  // Classification (15%) — exact match full credit, one-level difference partial credit.
  if (opportunity.classification && player.classification) {
    const levels = ['A', 'AA', 'AAA', 'Major'];
    const o = levels.indexOf(opportunity.classification);
    const p = levels.indexOf(player.classification);
    if (o >= 0 && p >= 0) {
      score += o === p ? 15 : Math.abs(o - p) === 1 ? 8 : 0;
    } else {
      score += opportunity.classification === player.classification ? 15 : 0;
    }
    factors += 15;
  }

  // Weekly availability (15%).
  if (availability?.status) {
    score += availability.status === 'available' ? 15 : availability.status === 'maybe' ? 8 : 0;
    factors += 15;
  }

  // Travel readiness (10%) — temporary MVP proxy until true distance calculation is added.
  if (player.travel_radius_miles) {
    score += player.travel_radius_miles >= 100 ? 10 : player.travel_radius_miles >= 50 ? 6 : 3;
    factors += 10;
  }

  // Verification confidence (5%).
  score += player.is_verified ? 5 : 0;
  factors += 5;

  // Profile completeness (5%).
  const completenessFields = [
    player.photo_url,
    player.positions?.length > 0,
    player.age_division,
    player.classification,
    player.city,
    player.state,
    player.bats,
    player.throws,
    player.current_team_name,
    player.highlight_video_url || player.gamechanger_url || player.sidelinehd_url
  ];
  const completeness = completenessFields.filter(Boolean).length / completenessFields.length;
  score += Math.round(completeness * 5);
  factors += 5;

  if (factors === 0) return 75;
  return Math.max(0, Math.min(100, Math.round((score / factors) * 100)));
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateRange(start, end) {
  if (!start) return '';
  const s = new Date(start);
  const opts = { month: 'short', day: 'numeric' };
  if (!end || start === end) return s.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  const e = new Date(end);
  return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function getMatchScoreColor(score) {
  if (score >= 85) return '#16A34A';
  if (score >= 70) return '#D4A017';
  if (score >= 50) return '#F59E0B';
  return '#94A3B8';
}

export function getAvailabilityColor(status) {
  const map = {
    available: '#16A34A',
    maybe: '#F59E0B',
    unavailable: '#DC2626',
    not_set: '#94A3B8'
  };
  return map[status] || '#94A3B8';
}

export function getRoleColor(role) {
  const map = {
    parent: '#16A34A',
    coach: '#2563EB',
    organization: '#8B5CF6',
    admin: '#F59E0B'
  };
  return map[role] || '#94A3B8';
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}
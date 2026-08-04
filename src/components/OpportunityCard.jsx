import React from 'react';
import { MapPin, Calendar, DollarSign, Heart, Users } from 'lucide-react';
import { formatDateRange } from '@/lib/utils';
import MatchScoreBadge from './MatchScoreBadge';
import { Image } from '@/components/ui/image';

export default function OpportunityCard({ opportunity, matchScore, onSave, isSaved, onClick }) {
  const teamName = opportunity.team_name || 'Team';
  const teamLogo = opportunity.team_logo_url;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
      onClick={onClick}
    >
      {/* Header strip */}
      <div className="bg-navy px-4 py-2 flex items-center justify-between" style={{ backgroundColor: '#0B1528' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#2563EB' }}>
          {opportunity.type === 'pickup' ? '⚡ Pickup Opportunity' : opportunity.type === 'tryout' ? '🎯 Tryout' : '🌟 Recruiting'}
        </span>
        {isSaved !== undefined && (
          <button
            onClick={e => { e.stopPropagation(); onSave?.(); }}
            className="p-1 rounded-full transition-colors"
          >
            <Heart size={16} fill={isSaved ? '#DC2626' : 'none'} color={isSaved ? '#DC2626' : '#94A3B8'} />
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Team logo */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: '#EFF6FF' }}>
              {teamLogo ? (
                <Image src={teamLogo} alt={teamName} className="w-12 h-12" fittingType="fill" />
              ) : (
                <span className="text-lg font-black" style={{ color: '#2563EB' }}>
                  {teamName.split(' ').map(w => w[0]).join('').slice(0, 3)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base leading-tight truncate" style={{ color: '#0B1528' }}>
                {opportunity.title}
              </h3>
              <p className="text-sm font-medium mt-0.5 truncate" style={{ color: '#64748B' }}>{teamName}</p>

              {/* Position chips */}
              {opportunity.positions_needed?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {opportunity.positions_needed.slice(0, 3).map(pos => (
                    <span key={pos} className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                      {pos}
                    </span>
                  ))}
                  {opportunity.positions_needed.length > 3 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
                      +{opportunity.positions_needed.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Match score */}
          {matchScore !== undefined && <MatchScoreBadge score={matchScore} size="md" />}
        </div>

        {/* Details row */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} color="#94A3B8" />
            <span className="text-xs font-medium" style={{ color: '#64748B' }}>
              {formatDateRange(opportunity.event_date_start, opportunity.event_date_end)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={13} color="#94A3B8" />
            <span className="text-xs font-medium" style={{ color: '#64748B' }}>
              {opportunity.city}, {opportunity.state}
            </span>
          </div>
          {opportunity.player_cost !== undefined && (
            <div className="flex items-center gap-1.5">
              <DollarSign size={13} color="#94A3B8" />
              <span className="text-xs font-medium" style={{ color: '#64748B' }}>
                ${opportunity.player_cost}
              </span>
            </div>
          )}
          {opportunity.games_count && (
            <div className="flex items-center gap-1.5">
              <Users size={13} color="#94A3B8" />
              <span className="text-xs font-medium" style={{ color: '#64748B' }}>
                {opportunity.games_count} Games
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-2">
            {opportunity.age_division && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#0B1528' }}>
                {opportunity.age_division}
              </span>
            )}
            {opportunity.classification && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEFCE8', color: '#A4A017' }}>
                {opportunity.classification}
              </span>
            )}
          </div>
          {opportunity.application_deadline && (
            <span className="text-xs" style={{ color: '#94A3B8' }}>
              Apply by {new Date(opportunity.application_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
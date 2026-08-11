import React from 'react';
import { MapPin, Calendar, DollarSign, Heart, Users, ArrowUpRight } from 'lucide-react';
import { formatDateRange } from '@/lib/utils';
import MatchScoreBadge from './MatchScoreBadge';
import { Image } from '@/components/ui/image';

export default function OpportunityCard({ opportunity, matchScore, onSave, isSaved, onClick }) {
  const teamName = opportunity.team_name || 'Team';
  const teamLogo = opportunity.team_logo_url;
  const typeLabel = opportunity.type === 'pickup' ? 'Pickup Opportunity' : opportunity.type === 'tryout' ? 'Tryout' : 'Recruiting';

  return (
    <div
      className="gdr-card gdr-card-hover overflow-hidden cursor-pointer active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(220,214,204,0.82)' }}>
        <div className="flex items-center justify-between gap-3">
          <span className="gdr-editorial-kicker">
            {typeLabel}
          </span>
          <div className="flex items-center gap-2">
            <ArrowUpRight size={16} color="#A39A8E" />
            {isSaved !== undefined && (
              <button
                onClick={e => { e.stopPropagation(); onSave?.(); }}
                className="flex h-8 w-8 items-center justify-center transition-colors"
                style={{ backgroundColor: '#F7F3EC', border: '1px solid rgba(220,214,204,0.9)' }}
              >
                <Heart size={16} fill={isSaved ? '#B9232A' : 'none'} color={isSaved ? '#B9232A' : '#A39A8E'} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center overflow-hidden"
              style={{ background: '#F0ECE3', border: '1px solid rgba(220,214,204,0.96)' }}>
              {teamLogo ? (
                <Image src={teamLogo} alt={teamName} className="w-14 h-14" fittingType="fill" />
              ) : (
                <span className="text-lg font-black" style={{ color: '#151411', letterSpacing: '-0.04em' }}>
                  {teamName.split(' ').map(w => w[0]).join('').slice(0, 3)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[20px] leading-[1.05] truncate" style={{ color: '#151411', fontFamily: 'ui-serif, Georgia, Cambria, Times New Roman, Times, serif', fontWeight: 500 }}>
                {opportunity.title}
              </h3>
              <p className="text-sm font-semibold mt-1.5 truncate" style={{ color: '#6F685E' }}>{teamName}</p>

              {opportunity.positions_needed?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {opportunity.positions_needed.slice(0, 3).map(pos => (
                    <span key={pos} className="text-[10px] font-black px-2.5 py-1 uppercase tracking-[0.16em]"
                      style={{ backgroundColor: '#F7F3EC', color: '#151411', border: '1px solid rgba(220,214,204,0.88)' }}>
                      {pos}
                    </span>
                  ))}
                  {opportunity.positions_needed.length > 3 && (
                    <span className="text-[10px] font-black px-2.5 py-1 uppercase tracking-[0.16em]" style={{ backgroundColor: '#F0ECE3', color: '#6F685E' }}>
                      +{opportunity.positions_needed.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {matchScore !== undefined && <MatchScoreBadge score={matchScore} size="md" />}
        </div>

        <div className="mt-4 p-3" style={{ backgroundColor: '#F7F3EC', border: '1px solid rgba(220,214,204,0.78)' }}>
          <div className="grid grid-cols-2 gap-2">
            <Detail icon={Calendar} label={formatDateRange(opportunity.event_date_start, opportunity.event_date_end)} />
            <Detail icon={MapPin} label={`${opportunity.city}, ${opportunity.state}`} />
            {opportunity.player_cost !== undefined && <Detail icon={DollarSign} label={`$${opportunity.player_cost}`} />}
            {opportunity.games_count && <Detail icon={Users} label={`${opportunity.games_count} Games`} />}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {opportunity.age_division && (
              <span className="text-[10px] font-black px-2.5 py-1 uppercase tracking-[0.16em]" style={{ backgroundColor: '#151411', color: '#FBF8F1' }}>
                {opportunity.age_division}
              </span>
            )}
            {opportunity.classification && (
              <span className="text-[10px] font-black px-2.5 py-1 uppercase tracking-[0.16em]" style={{ backgroundColor: '#EFE6D6', color: '#765B34' }}>
                {opportunity.classification}
              </span>
            )}
            {opportunity.sanctioning_body && (
              <span className="text-[10px] font-black px-2.5 py-1 uppercase tracking-[0.16em]" style={{ backgroundColor: '#F0ECE3', color: '#6F685E' }}>
                {opportunity.sanctioning_body}
              </span>
            )}
          </div>
          {opportunity.application_deadline && (
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#A39A8E' }}>
              Apply by {new Date(opportunity.application_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon size={13} color="#A39A8E" />
      <span className="text-xs font-semibold truncate" style={{ color: '#6F685E' }}>{label}</span>
    </div>
  );
}
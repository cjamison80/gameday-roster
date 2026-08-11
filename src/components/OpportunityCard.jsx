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
      <div className="relative px-4 py-3" style={{ background: 'linear-gradient(135deg, #0B1528 0%, #17233A 100%)' }}>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em]"
            style={{ backgroundColor: 'rgba(37,99,235,0.16)', color: '#93C5FD', border: '1px solid rgba(147,197,253,0.18)' }}>
            {typeLabel}
          </span>
          <div className="flex items-center gap-2">
            <ArrowUpRight size={16} color="rgba(255,255,255,0.58)" />
            {isSaved !== undefined && (
              <button
                onClick={e => { e.stopPropagation(); onSave?.(); }}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
              >
                <Heart size={16} fill={isSaved ? '#DC2626' : 'none'} color={isSaved ? '#DC2626' : '#CBD5E1'} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="relative w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-slate-200"
              style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)' }}>
              {teamLogo ? (
                <Image src={teamLogo} alt={teamName} className="w-14 h-14" fittingType="fill" />
              ) : (
                <span className="text-lg font-black" style={{ color: '#2563EB' }}>
                  {teamName.split(' ').map(w => w[0]).join('').slice(0, 3)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-[17px] leading-tight truncate tracking-[-0.03em]" style={{ color: '#0B1528' }}>
                {opportunity.title}
              </h3>
              <p className="text-sm font-semibold mt-1 truncate" style={{ color: '#64748B' }}>{teamName}</p>

              {opportunity.positions_needed?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {opportunity.positions_needed.slice(0, 3).map(pos => (
                    <span key={pos} className="text-xs font-black px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                      {pos}
                    </span>
                  ))}
                  {opportunity.positions_needed.length > 3 && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
                      +{opportunity.positions_needed.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {matchScore !== undefined && <MatchScoreBadge score={matchScore} size="md" />}
        </div>

        <div className="mt-4 rounded-2xl p-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid rgba(226,232,240,0.72)' }}>
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
              <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#0B1528' }}>
                {opportunity.age_division}
              </span>
            )}
            {opportunity.classification && (
              <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#A16207' }}>
                {opportunity.classification}
              </span>
            )}
            {opportunity.sanctioning_body && (
              <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}>
                {opportunity.sanctioning_body}
              </span>
            )}
          </div>
          {opportunity.application_deadline && (
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#94A3B8' }}>
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
      <Icon size={13} color="#94A3B8" />
      <span className="text-xs font-semibold truncate" style={{ color: '#64748B' }}>{label}</span>
    </div>
  );
}
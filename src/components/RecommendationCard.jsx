import React from 'react';
import { MapPin, Calendar, ArrowUpRight, UserPlus } from 'lucide-react';
import { formatDateRange } from '@/lib/utils';
import { Image } from '@/components/ui/image';

// Guest-player recommendation card — a coach vouching that a specific player
// is available (e.g. their own team isn't playing that weekend), distinct
// from an Opportunity (a team's open roster spot). Same visual language as
// OpportunityCard so the two read as one marketplace.
export default function RecommendationCard({ recommendation, player, onClick }) {
  if (!player) return null;
  const name = `${player.first_name} ${player.last_name}`;

  return (
    <div
      className="gdr-card gdr-card-hover overflow-hidden cursor-pointer active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(203,213,225,0.88)' }}>
        <div className="flex items-center justify-between gap-3">
          <span className="gdr-editorial-kicker">Guest Player Available</span>
          <ArrowUpRight size={16} color="#8B95A7" />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{ background: '#EEF2F7', border: '1px solid rgba(203,213,225,0.96)' }}>
            {player.photo_url ? (
              <Image src={player.photo_url} alt={name} className="w-14 h-14" fittingType="fill" />
            ) : (
              <span className="text-lg font-black" style={{ color: '#0B1528', letterSpacing: '-0.04em' }}>
                {player.first_name?.[0]}{player.last_name?.[0]}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[20px] leading-[1.05] truncate" style={{ color: '#0B1528', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontWeight: 850 }}>
              {name}
            </h3>
            <p className="text-sm font-semibold mt-1.5 truncate" style={{ color: '#5B6475' }}>
              {player.positions?.join(', ') || 'Position TBD'}
            </p>
            {recommendation.note && (
              <p className="text-sm mt-2 leading-snug" style={{ color: '#5B6475' }}>
                &ldquo;{recommendation.note}&rdquo;
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 p-3" style={{ backgroundColor: '#F5F7FB', border: '1px solid rgba(203,213,225,0.78)' }}>
          <div className="grid grid-cols-2 gap-2">
            <Detail icon={Calendar} label={formatDateRange(recommendation.available_start, recommendation.available_end)} />
            <Detail icon={MapPin} label={player.city && player.state ? `${player.city}, ${player.state}` : '\u2014'} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {player.age_division && (
              <span className="text-[10px] font-black px-2.5 py-1 uppercase tracking-[0.16em]" style={{ backgroundColor: '#0B1528', color: '#F8FAFC' }}>
                {player.age_division}
              </span>
            )}
            {player.classification && (
              <span className="text-[10px] font-black px-2.5 py-1 uppercase tracking-[0.16em]" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                {player.classification}
              </span>
            )}
          </div>
          <span className="text-xs font-semibold whitespace-nowrap flex items-center gap-1" style={{ color: '#8B95A7' }}>
            <UserPlus size={12} />
            Recommended by {recommendation.recommended_by_name || 'a coach'}
          </span>
        </div>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon size={13} color="#8B95A7" />
      <span className="text-xs font-semibold truncate" style={{ color: '#5B6475' }}>{label}</span>
    </div>
  );
}

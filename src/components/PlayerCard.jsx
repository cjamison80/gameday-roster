import React from 'react';
import { MapPin, Heart } from 'lucide-react';
import MatchScoreBadge from './MatchScoreBadge';
import AvailabilityChip from './AvailabilityChip';
import { Image } from '@/components/ui/image';
import { getInitials } from '@/lib/utils';

export default function PlayerCard({ player, matchScore, availabilityStatus, onSave, isSaved, onClick }) {
  const fullName = `${player.first_name} ${player.last_name}`;

  return (
    <div
      className="gdr-card gdr-card-hover p-4 cursor-pointer active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-[68px] h-[68px] overflow-hidden" style={{ background: '#F0ECE3', border: '1px solid rgba(220,214,204,0.96)' }}>
            {player.photo_url ? (
              <Image src={player.photo_url} alt={fullName} className="w-[68px] h-[68px]" fittingType="fill" />
            ) : (
              <div className="w-[68px] h-[68px] flex items-center justify-center">
                <span className="text-2xl font-black" style={{ color: '#151411', letterSpacing: '-0.05em' }}>{getInitials(fullName)}</span>
              </div>
            )}
          </div>
          {player.is_verified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 flex items-center justify-center ring-2 ring-[#FFFDF8]" style={{ backgroundColor: '#A9824A' }}>
              <span style={{ color: 'white', fontSize: 11, fontWeight: 900 }}>✓</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="gdr-editorial-kicker mb-1">Player Profile</p>
              <h3 className="text-[20px] leading-[1.05] truncate" style={{ color: '#151411', fontFamily: 'ui-serif, Georgia, Cambria, Times New Roman, Times, serif', fontWeight: 500 }}>{fullName}</h3>
              <p className="text-xs font-semibold mt-1.5" style={{ color: '#6F685E' }}>
                {player.bats && player.throws ? `B/T: ${player.bats[0]}/${player.throws[0]}` : ''}
                {player.age_division ? ` · ${player.age_division}` : ''}
                {player.classification ? ` · ${player.classification}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {matchScore !== undefined && <MatchScoreBadge score={matchScore} size="sm" />}
              {onSave && (
                <button onClick={e => { e.stopPropagation(); onSave(); }}
                  className="flex h-8 w-8 items-center justify-center"
                  style={{ backgroundColor: '#F7F3EC', border: '1px solid rgba(220,214,204,0.9)' }}>
                  <Heart size={16} fill={isSaved ? '#B9232A' : 'none'} color={isSaved ? '#B9232A' : '#A39A8E'} />
                </button>
              )}
            </div>
          </div>

          {player.positions?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {player.positions.slice(0, 3).map(pos => (
                <span key={pos} className="text-[10px] font-black px-2.5 py-1 uppercase tracking-[0.16em]"
                  style={{ backgroundColor: '#F7F3EC', color: '#151411', border: '1px solid rgba(220,214,204,0.88)' }}>
                  {pos}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-3">
            {player.city && player.state && (
              <div className="flex items-center gap-1 px-2.5 py-1" style={{ backgroundColor: '#F7F3EC' }}>
                <MapPin size={11} color="#A39A8E" />
                <span className="text-xs font-semibold" style={{ color: '#6F685E' }}>{player.city}, {player.state}</span>
              </div>
            )}
            {availabilityStatus && <AvailabilityChip status={availabilityStatus} small />}
          </div>
        </div>
      </div>
    </div>
  );
}
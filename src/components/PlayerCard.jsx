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
          <div className="w-[68px] h-[68px] rounded-2xl overflow-hidden ring-1 ring-slate-200" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%)' }}>
            {player.photo_url ? (
              <Image src={player.photo_url} alt={fullName} className="w-[68px] h-[68px]" fittingType="fill" />
            ) : (
              <div className="w-[68px] h-[68px] flex items-center justify-center">
                <span className="text-2xl font-black" style={{ color: '#2563EB' }}>{getInitials(fullName)}</span>
              </div>
            )}
          </div>
          {player.is_verified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-white" style={{ backgroundColor: '#2563EB' }}>
              <span style={{ color: 'white', fontSize: 11, fontWeight: 900 }}>✓</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-black text-[17px] truncate tracking-[-0.03em]" style={{ color: '#0B1528' }}>{fullName}</h3>
              <p className="text-xs font-semibold mt-1" style={{ color: '#64748B' }}>
                {player.bats && player.throws ? `B/T: ${player.bats[0]}/${player.throws[0]}` : ''}
                {player.age_division ? ` · ${player.age_division}` : ''}
                {player.classification ? ` · ${player.classification}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {matchScore !== undefined && <MatchScoreBadge score={matchScore} size="sm" />}
              {onSave && (
                <button onClick={e => { e.stopPropagation(); onSave(); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#F8FAFC' }}>
                  <Heart size={16} fill={isSaved ? '#DC2626' : 'none'} color={isSaved ? '#DC2626' : '#94A3B8'} />
                </button>
              )}
            </div>
          </div>

          {player.positions?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {player.positions.slice(0, 3).map(pos => (
                <span key={pos} className="text-xs font-black px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                  {pos}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-3">
            {player.city && player.state && (
              <div className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: '#F8FAFC' }}>
                <MapPin size={11} color="#94A3B8" />
                <span className="text-xs font-semibold" style={{ color: '#64748B' }}>{player.city}, {player.state}</span>
              </div>
            )}
            {availabilityStatus && <AvailabilityChip status={availabilityStatus} small />}
          </div>
        </div>
      </div>
    </div>
  );
}
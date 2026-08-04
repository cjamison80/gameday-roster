import React from 'react';
import { MapPin, Heart } from 'lucide-react';
import MatchScoreBadge from './MatchScoreBadge';
import VerifiedBadge from './VerifiedBadge';
import AvailabilityChip from './AvailabilityChip';
import { Image } from '@/components/ui/image';
import { getInitials } from '@/lib/utils';

export default function PlayerCard({ player, matchScore, availabilityStatus, onSave, isSaved, onClick }) {
  const fullName = `${player.first_name} ${player.last_name}`;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-xl overflow-hidden" style={{ backgroundColor: '#EFF6FF' }}>
            {player.photo_url ? (
              <Image src={player.photo_url} alt={fullName} className="w-16 h-16" fittingType="fill" />
            ) : (
              <div className="w-16 h-16 flex items-center justify-center">
                <span className="text-2xl font-black" style={{ color: '#2563EB' }}>{getInitials(fullName)}</span>
              </div>
            )}
          </div>
          {player.is_verified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2563EB' }}>
              <span style={{ color: 'white', fontSize: 10 }}>✓</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-base" style={{ color: '#0B1528' }}>{fullName}</h3>
              <p className="text-xs font-medium mt-0.5" style={{ color: '#64748B' }}>
                {player.bats && player.throws ? `B/T: ${player.bats[0]}/${player.throws[0]}` : ''}
                {player.age_division ? ` · ${player.age_division}` : ''}
                {player.classification ? ` · ${player.classification}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {matchScore !== undefined && <MatchScoreBadge score={matchScore} size="sm" />}
              {onSave && (
                <button onClick={e => { e.stopPropagation(); onSave(); }}
                  className="p-1 rounded-full">
                  <Heart size={16} fill={isSaved ? '#DC2626' : 'none'} color={isSaved ? '#DC2626' : '#94A3B8'} />
                </button>
              )}
            </div>
          </div>

          {/* Positions */}
          {player.positions?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {player.positions.slice(0, 3).map(pos => (
                <span key={pos} className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                  {pos}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            {player.city && player.state && (
              <div className="flex items-center gap-1">
                <MapPin size={11} color="#94A3B8" />
                <span className="text-xs" style={{ color: '#94A3B8' }}>{player.city}, {player.state}</span>
              </div>
            )}
            {availabilityStatus && <AvailabilityChip status={availabilityStatus} small />}
          </div>
        </div>
      </div>
    </div>
  );
}
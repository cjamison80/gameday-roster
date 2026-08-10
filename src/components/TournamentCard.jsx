import React from 'react';
import { Calendar, DollarSign, ExternalLink, MapPin, Trophy, Users } from 'lucide-react';
import { formatDateRange } from '@/lib/utils';

function formatCost(cost) {
  if (cost === undefined || cost === null || cost === '') return 'Cost TBD';
  if (Number(cost) === 0) return 'Free';
  return `$${Number(cost).toLocaleString()}`;
}

export default function TournamentCard({ tournament, onClick }) {
  const statusMap = {
    open: { label: 'Open', bg: '#DCFCE7', color: '#16A34A' },
    waitlist: { label: 'Waitlist', bg: '#FEF9C3', color: '#A16207' },
    sold_out: { label: 'Sold Out', bg: '#FEE2E2', color: '#DC2626' },
    closed: { label: 'Closed', bg: '#F1F5F9', color: '#64748B' },
    unknown: { label: 'Status TBD', bg: '#F1F5F9', color: '#64748B' }
  };
  const status = statusMap[tournament.status] || statusMap.unknown;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
          <Trophy size={22} color="#2563EB" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-black text-base leading-tight" style={{ color: '#0B1528' }}>{tournament.name}</h3>
              <p className="text-sm font-semibold mt-0.5" style={{ color: '#2563EB' }}>{tournament.association}</p>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: status.bg, color: status.color }}>
              {status.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <Detail icon={Calendar} text={formatDateRange(tournament.start_date, tournament.end_date)} />
            <Detail icon={MapPin} text={`${tournament.city}, ${tournament.state}`} />
            <Detail icon={DollarSign} text={formatCost(tournament.cost)} />
            <Detail icon={Users} text={`${tournament.teams_entered_count || tournament.teams_entered?.length || 0} teams entered`} />
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {(tournament.age_divisions || []).slice(0, 4).map(age => (
              <span key={age} className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#0B1528' }}>{age}</span>
            ))}
            {(tournament.classifications || []).slice(0, 3).map(cls => (
              <span key={cls} className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEFCE8', color: '#D4A017' }}>{cls}</span>
            ))}
            {tournament.registration_url && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                <ExternalLink size={11} /> Register
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon size={13} color="#94A3B8" className="flex-shrink-0" />
      <span className="text-xs font-medium truncate" style={{ color: '#64748B' }}>{text}</span>
    </div>
  );
}

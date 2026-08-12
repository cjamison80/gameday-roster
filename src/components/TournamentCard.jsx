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
    open: { label: 'Open', bg: '#E7EDE2', color: '#4F7A59' },
    waitlist: { label: 'Waitlist', bg: '#FEE2E2', color: '#991B1B' },
    sold_out: { label: 'Sold Out', bg: '#F1DADA', color: '#B9232A' },
    closed: { label: 'Closed', bg: '#EEF2F7', color: '#5B6475' },
    unknown: { label: 'Status TBD', bg: '#EEF2F7', color: '#5B6475' }
  };
  const status = statusMap[tournament.status] || statusMap.unknown;

  return (
    <div
      onClick={onClick}
      className="gdr-card gdr-card-hover p-4 cursor-pointer active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#EEF2F7', border: '1px solid rgba(203,213,225,0.95)' }}>
          <Trophy size={22} color="#C1121F" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="gdr-editorial-kicker mb-1">{tournament.association}</p>
              <h3 className="text-[21px] leading-[1.04] truncate" style={{ color: '#0B1528', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontWeight: 850 }}>{tournament.name}</h3>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 uppercase tracking-[0.16em] flex-shrink-0" style={{ backgroundColor: status.bg, color: status.color, border: '1px solid rgba(203,213,225,0.88)' }}>
              {status.label}
            </span>
          </div>

          <div className="mt-4 p-3" style={{ backgroundColor: '#F5F7FB', border: '1px solid rgba(203,213,225,0.78)' }}>
            <div className="grid grid-cols-2 gap-2">
              <Detail icon={Calendar} text={formatDateRange(tournament.start_date, tournament.end_date)} />
              <Detail icon={MapPin} text={`${tournament.city}, ${tournament.state}`} />
              <Detail icon={DollarSign} text={formatCost(tournament.cost)} />
              {tournament.teams_url ? (
                <a
                  href={tournament.teams_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 min-w-0"
                >
                  <Users size={13} color="#C1121F" className="flex-shrink-0" />
                  <span className="text-xs font-semibold truncate underline" style={{ color: '#C1121F' }}>
                    {tournament.teams_entered_count || tournament.teams_entered?.length || 0} teams entered
                  </span>
                </a>
              ) : (
                <Detail icon={Users} text={`${tournament.teams_entered_count || tournament.teams_entered?.length || 0} teams entered`} />
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {(tournament.age_divisions || []).slice(0, 4).map(age => (
              <span key={age} className="text-[10px] font-black px-2.5 py-1 uppercase tracking-[0.16em]" style={{ backgroundColor: '#0B1528', color: '#F8FAFC' }}>{age}</span>
            ))}
            {(tournament.classifications || []).slice(0, 3).map(cls => (
              <span key={cls} className="text-[10px] font-black px-2.5 py-1 uppercase tracking-[0.16em]" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>{cls}</span>
            ))}
            {tournament.registration_url && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 uppercase tracking-[0.16em]" style={{ backgroundColor: '#EEF2F7', color: '#0B1528' }}>
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
      <Icon size={13} color="#8B95A7" className="flex-shrink-0" />
      <span className="text-xs font-semibold truncate" style={{ color: '#5B6475' }}>{text}</span>
    </div>
  );
}
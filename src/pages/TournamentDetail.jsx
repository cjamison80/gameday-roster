import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, DollarSign, ExternalLink, MapPin, Trophy, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatDateRange } from '@/lib/utils';

function formatCost(cost) {
  if (cost === undefined || cost === null || cost === '') return 'Cost TBD';
  if (Number(cost) === 0) return 'Free';
  return `$${Number(cost).toLocaleString()}`;
}

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const t = await base44.entities.Tournament.get(id);
      setTournament(t);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#E2E8F0', borderTopColor: '#2563EB' }} />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-5xl mb-4">🏆</div>
        <h1 className="text-xl font-black" style={{ color: '#0B1528' }}>Tournament not found</h1>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm font-bold" style={{ color: '#2563EB' }}>Go back</button>
      </div>
    );
  }

  const teams = tournament.teams_entered || [];
  const statusLabel = (tournament.status || 'unknown').replace('_', ' ');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <span className="text-xs font-bold px-3 py-1 rounded-full capitalize" style={{ backgroundColor: '#1E293B', color: '#94A3B8' }}>
            {statusLabel}
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-18 h-18 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1E293B', width: 72, height: 72 }}>
            <Trophy size={34} color="#D4A017" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: '#2563EB' }}>{tournament.association}</p>
            <h1 className="text-2xl font-black leading-tight text-white mt-1">{tournament.name}</h1>
            <div className="flex items-center gap-1 mt-2">
              <MapPin size={13} color="#64748B" />
              <span className="text-sm" style={{ color: '#94A3B8' }}>{tournament.venue ? `${tournament.venue} · ` : ''}{tournament.city}, {tournament.state}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5 pb-24">
        <div className="grid grid-cols-2 gap-3">
          <InfoCard icon={Calendar} label="Dates" value={formatDateRange(tournament.start_date, tournament.end_date)} />
          <InfoCard icon={DollarSign} label="Cost" value={formatCost(tournament.cost)} />
          <InfoCard icon={Users} label="Teams Entered" value={tournament.teams_entered_count || teams.length || 0} />
          <InfoCard icon={Trophy} label="Association" value={tournament.association} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-black mb-3" style={{ color: '#0B1528' }}>Divisions</h2>
          <div className="space-y-3">
            <ChipGroup label="Age" values={tournament.age_divisions || []} />
            <ChipGroup label="Class" values={tournament.classifications || []} gold />
          </div>
        </div>

        {tournament.description && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-black mb-2" style={{ color: '#0B1528' }}>About This Tournament</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{tournament.description}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black" style={{ color: '#0B1528' }}>Teams Entered</h2>
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
              {teams.length || tournament.teams_entered_count || 0}
            </span>
          </div>
          {teams.length > 0 ? (
            <div className="space-y-2">
              {teams.map((team, idx) => (
                <div key={`${team.team_name}-${idx}`} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#F8FAFC' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                    <span className="font-black text-sm" style={{ color: '#2563EB' }}>{team.team_name?.split(' ').map(w => w[0]).join('').slice(0, 3) || 'T'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate" style={{ color: '#0B1528' }}>{team.team_name}</p>
                    <p className="text-xs" style={{ color: '#64748B' }}>
                      {[team.age_division, team.classification, team.city && team.state ? `${team.city}, ${team.state}` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: '#F8FAFC' }}>
              <p className="font-bold" style={{ color: '#0B1528' }}>No entered teams imported yet</p>
              <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Once the source sync imports entered-team data, it will appear here.</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {tournament.registration_url && (
            <a
              href={tournament.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: '#2563EB' }}
            >
              <ExternalLink size={18} />
              Enter Tournament
            </a>
          )}
          {tournament.source_url && (
            <a
              href={tournament.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border-2"
              style={{ borderColor: '#E2E8F0', color: '#0B1528', backgroundColor: '#FFFFFF' }}
            >
              <ExternalLink size={18} />
              View Source Listing
            </a>
          )}
        </div>

        {tournament.last_synced_at && (
          <p className="text-xs text-center" style={{ color: '#94A3B8' }}>
            Last synced {new Date(tournament.last_synced_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <Icon size={18} color="#2563EB" />
      <p className="text-xs font-bold mt-2" style={{ color: '#94A3B8' }}>{label}</p>
      <p className="text-sm font-black mt-0.5" style={{ color: '#0B1528' }}>{value || '—'}</p>
    </div>
  );
}

function ChipGroup({ label, values, gold }) {
  return (
    <div>
      <p className="text-xs font-bold mb-1.5" style={{ color: '#94A3B8' }}>{label}</p>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map(v => (
            <span key={v} className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: gold ? '#FEFCE8' : '#F1F5F9', color: gold ? '#D4A017' : '#0B1528' }}>{v}</span>
          ))}
        </div>
      ) : <p className="text-sm" style={{ color: '#94A3B8' }}>All / not specified</p>}
    </div>
  );
}

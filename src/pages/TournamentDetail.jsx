import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, DollarSign, ExternalLink, MapPin, Trophy, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatDateRange } from '@/lib/utils';

const AGE_ORDER = ['8U','9U','10U','11U','12U','13U','14U','15U','16U','17U','18U'];
const CLASS_ORDER = ['Major','AAA','AA','A','Open'];

function divisionRank(team) {
  const ageIdx = AGE_ORDER.indexOf(team.age_division);
  const classIdx = CLASS_ORDER.indexOf(team.classification);
  return [ageIdx === -1 ? AGE_ORDER.length : ageIdx, classIdx === -1 ? CLASS_ORDER.length : classIdx];
}

function divisionLabel(team) {
  return [team.age_division, team.classification].filter(Boolean).join(' ') || 'Unspecified Division';
}

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
  const [selectedDivision, setSelectedDivision] = useState('');

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
      <div className="gdr-page flex items-center justify-center" >
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#CBD5E1', borderTopColor: '#C1121F' }} />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="gdr-page flex flex-col items-center justify-center px-6 text-center" >
        <div className="text-5xl mb-4">🏆</div>
        <h1 className="text-xl font-black" style={{ color: '#0B1528' }}>Tournament not found</h1>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm font-bold" style={{ color: '#C1121F' }}>Go back</button>
      </div>
    );
  }

  const teams = tournament.teams_entered || [];
  const statusLabel = (tournament.status || 'unknown').replace('_', ' ');

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      const [aAge, aClass] = divisionRank(a);
      const [bAge, bClass] = divisionRank(b);
      if (aAge !== bAge) return aAge - bAge;
      if (aClass !== bClass) return aClass - bClass;
      return (a.team_name || '').localeCompare(b.team_name || '');
    });
  }, [teams]);

  const divisionOptions = useMemo(() => [...new Set(sortedTeams.map(divisionLabel))], [sortedTeams]);

  const displayedTeams = selectedDivision
    ? sortedTeams.filter(t => divisionLabel(t) === selectedDivision)
    : sortedTeams;

  return (
    <div className="gdr-page" >
      <div className="gdr-hero px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <span className="text-xs font-bold px-3 py-1 rounded-full capitalize" style={{ backgroundColor: '#17233A', color: '#8B95A7' }}>
            {statusLabel}
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-18 h-18  flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#17233A', width: 72, height: 72 }}>
            <Trophy size={34} color="#C1121F" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: '#C1121F' }}>{tournament.association}</p>
            <h1 className="text-2xl font-black leading-tight text-white mt-1">{tournament.name}</h1>
            <div className="flex items-center gap-1 mt-2">
              <MapPin size={13} color="#5B6475" />
              <span className="text-sm" style={{ color: '#8B95A7' }}>{tournament.venue ? `${tournament.venue} · ` : ''}{tournament.city}, {tournament.state}</span>
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

        <div className="gdr-card p-5">
          <h2 className="font-semibold mb-3" style={{ color: '#0B1528' }}>Divisions</h2>
          <div className="space-y-3">
            <ChipGroup label="Age" values={tournament.age_divisions || []} />
            <ChipGroup label="Class" values={tournament.classifications || []} gold />
          </div>
        </div>

        {tournament.description && (
          <div className="gdr-card p-5">
            <h2 className="font-semibold mb-2" style={{ color: '#0B1528' }}>About This Tournament</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#5B6475' }}>{tournament.description}</p>
          </div>
        )}

        <div className="gdr-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{ color: '#0B1528' }}>Teams Entered</h2>
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: '#EEF2F7', color: '#5B6475' }}>
              {teams.length || tournament.teams_entered_count || 0}
            </span>
          </div>
          {teams.length > 0 ? (
            <div className="space-y-3">
              {divisionOptions.length > 1 && (
                <select
                  value={selectedDivision}
                  onChange={e => setSelectedDivision(e.target.value)}
                  className="gdr-select w-full px-3 py-2.5 text-sm outline-none"
                  style={{ color: '#0B1528' }}
                >
                  <option value="">All Divisions ({teams.length})</option>
                  {divisionOptions.map(label => (
                    <option key={label} value={label}>
                      {label} ({sortedTeams.filter(t => divisionLabel(t) === label).length})
                    </option>
                  ))}
                </select>
              )}
              <div className="space-y-2">
                {displayedTeams.map((team, idx) => {
                  const label = divisionLabel(team);
                  const showHeader = !selectedDivision && (idx === 0 || divisionLabel(displayedTeams[idx - 1]) !== label);
                  return (
                    <React.Fragment key={`${team.team_name}-${idx}`}>
                      {showHeader && (
                        <p className="text-xs font-bold uppercase tracking-wide pt-2 first:pt-0" style={{ color: '#8B95A7' }}>
                          {label} · {sortedTeams.filter(t => divisionLabel(t) === label).length} teams
                        </p>
                      )}
                      <div className=" p-3 flex items-center gap-3" >
                        <div className="w-10 h-10  flex items-center justify-center" style={{ backgroundColor: '#F5F7FB' }}>
                          <span className="font-semibold text-sm" style={{ color: '#C1121F' }}>{team.team_name?.split(' ').map(w => w[0]).join('').slice(0, 3) || 'T'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate" style={{ color: '#0B1528' }}>{team.team_name}</p>
                          <p className="text-xs" style={{ color: '#5B6475' }}>
                            {[team.age_division, team.classification, team.city && team.state ? `${team.city}, ${team.state}` : null].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ) : tournament.teams_url ? (
            <a
              href={tournament.teams_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 text-sm font-bold"
              style={{ backgroundColor: '#F5F7FB', color: '#C1121F' }}
            >
              <ExternalLink size={16} />
              View {tournament.teams_entered_count || 'entered'} teams on {tournament.association}
            </a>
          ) : (
            <div className=" p-6 text-center" >
              <p className="font-semibold" style={{ color: '#0B1528' }}>No entered teams imported yet</p>
              <p className="text-sm mt-1" style={{ color: '#8B95A7' }}>Once the source sync imports entered-team data, it will appear here.</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {tournament.registration_url && (
            <a
              href={tournament.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4  font-bold text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: '#C1121F' }}
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
              className="w-full py-4  font-bold flex items-center justify-center gap-2 border-2"
              style={{ borderColor: '#CBD5E1', color: '#0B1528', backgroundColor: '#FFFFFF' }}
            >
              <ExternalLink size={18} />
              View Source Listing
            </a>
          )}
        </div>

        {tournament.last_synced_at && (
          <p className="text-xs text-center" style={{ color: '#8B95A7' }}>
            Last synced {new Date(tournament.last_synced_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="gdr-card p-4">
      <Icon size={18} color="#C1121F" />
      <p className="text-xs font-bold mt-2" style={{ color: '#8B95A7' }}>{label}</p>
      <p className="text-sm font-black mt-0.5" style={{ color: '#0B1528' }}>{value || '—'}</p>
    </div>
  );
}

function ChipGroup({ label, values, gold }) {
  return (
    <div>
      <p className="text-xs font-bold mb-1.5" style={{ color: '#8B95A7' }}>{label}</p>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map(v => (
            <span key={v} className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: gold ? '#EFE6D6' : '#EEF2F7', color: gold ? '#C1121F' : '#0B1528' }}>{v}</span>
          ))}
        </div>
      ) : <p className="text-sm" style={{ color: '#8B95A7' }}>All / not specified</p>}
    </div>
  );
}

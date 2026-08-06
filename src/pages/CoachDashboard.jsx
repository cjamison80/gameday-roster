import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Check, X, MessageCircle, Users, ClipboardList } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { calculateMatchScore, getMatchScoreColor } from '@/lib/utils';
import MatchScoreBadge from '@/components/MatchScoreBadge';
import VerifiedBadge from '@/components/VerifiedBadge';
import { Image } from '@/components/ui/image';
import { SkeletonCard } from '@/components/SkeletonCard';

export default function CoachDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [coach, setCoach] = useState(null);
  const [teams, setTeams] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const [profiles, coachProfiles, teamsData, opps, apps, allPlayers] = await Promise.all([
        base44.entities.UserProfile.filter({ user_id: u.id }),
        base44.entities.CoachProfile.filter({ user_id: u.id }),
        base44.entities.Team.filter({ head_coach_id: u.id }, '-created_date', 50),
        base44.entities.Opportunity.filter({ coach_id: u.id }, '-created_date', 50),
        base44.entities.Application.filter({ coach_id: u.id }, '-created_date', 100),
        base44.entities.PlayerProfile.list('-created_date', 100)
      ]);
      setUserProfile(profiles[0] || null);
      setCoach(coachProfiles[0] || null);
      setTeams(teamsData);
      setOpportunities(opps);
      setApplications(apps);
      setPlayers(allPlayers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isCoach = userProfile?.role === 'coach' || coach;

  const handleDecision = async (appId, decision) => {
    setBusyId(appId);
    try {
      const app = applications.find(a => a.id === appId);
      const updated = await base44.entities.Application.update(appId, { status: decision });
      setApplications(prev => prev.map(a => a.id === appId ? updated : a));

      if (decision === 'accepted') {
        const opp = opportunities.find(o => o.id === app.opportunity_id);
        const newFilled = (opp?.spots_filled || 0) + 1;
        if (opp && (!opp.spots_available || newFilled < opp.spots_available)) {
          const updatedOpp = await base44.entities.Opportunity.update(opp.id, { spots_filled: newFilled });
          setOpportunities(prev => prev.map(o => o.id === opp.id ? updatedOpp : o));
        }
        await base44.entities.Notification.create({
          user_id: app.parent_id,
          type: 'application_accepted',
          title: 'Application Accepted',
          body: `Your application was accepted by ${user.full_name}.`,
          related_id: app.opportunity_id,
          related_type: 'opportunity',
          action_url: `/opportunity/${app.opportunity_id}`
        });
      } else {
        await base44.entities.Notification.create({
          user_id: app.parent_id,
          type: 'application_declined',
          title: 'Application Declined',
          body: `Your application was declined.`,
          related_id: app.opportunity_id,
          related_type: 'opportunity'
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const getPlayer = (playerId) => players.find(p => p.id === playerId);
  const getOpp = (oppId) => opportunities.find(o => o.id === oppId);
  const pendingApps = applications.filter(a => a.status === 'pending');

  if (loading) {
    return (
      <div className="min-h-screen pb-24" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="px-5 py-5 space-y-3">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-8">
        <h1 className="text-2xl font-black text-white mb-1">Coach Dashboard</h1>
        <p className="text-sm" style={{ color: '#64748B' }}>
          {coach ? `${coach.first_name} ${coach.last_name}` : user?.full_name}
        </p>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <HeaderStat icon={Users} value={teams.length} label="Teams" />
          <HeaderStat icon={ClipboardList} value={opportunities.length} label="Posts" />
          <HeaderStat icon={MessageCircle} value={pendingApps.length} label="Pending" />
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Primary action */}
        <button
          onClick={() => navigate('/create-opportunity')}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white"
          style={{ backgroundColor: '#2563EB' }}
        >
          <Plus size={18} />
          Post New Opportunity
        </button>

        {opportunities.length === 0 && teams.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="font-bold" style={{ color: '#0B1528' }}>Your roster starts here</p>
            <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Create a team and post your first pickup opportunity.</p>
          </div>
        )}

        {/* My Teams */}
        {teams.length > 0 && (
          <div>
            <h2 className="text-lg font-black mb-3" style={{ color: '#0B1528' }}>My Teams</h2>
            <div className="space-y-3">
              {teams.map(team => (
                <div
                  key={team.id}
                  onClick={() => navigate(`/team/${team.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                    <span className="font-black" style={{ color: '#2563EB' }}>
                      {team.name?.split(' ').map(w => w[0]).join('').slice(0, 3)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate" style={{ color: '#0B1528' }}>{team.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm" style={{ color: '#64748B' }}>
                        {team.age_division || '—'}{team.classification ? ` · ${team.classification}` : ''}
                      </span>
                      {team.sanctioning_body && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEFCE8', color: '#A4A017' }}>
                          {team.sanctioning_body}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} color="#94A3B8" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applicants */}
        {isCoach ? (
          <div>
            <h2 className="text-lg font-black mb-3" style={{ color: '#0B1528' }}>Applicants</h2>
            {applications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <p className="font-bold" style={{ color: '#0B1528' }}>No applications yet</p>
                <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Applicants will appear here once parents apply to your opportunities.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {opportunities.map(opp => {
                  const oppApps = applications.filter(a => a.opportunity_id === opp.id);
                  if (oppApps.length === 0) return null;
                  return (
                    <div key={opp.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-sm" style={{ color: '#0B1528' }}>{opp.title}</h3>
                        <button onClick={() => navigate(`/opportunity/${opp.id}`)} className="text-xs font-semibold" style={{ color: '#2563EB' }}>View</button>
                      </div>
                      <div className="space-y-3">
                        {oppApps.map(app => {
                          const player = getPlayer(app.player_id);
                          const score = player ? calculateMatchScore({ player, opportunity: opp }) : 0;
                          return (
                            <div key={app.id} className="flex items-center gap-3 py-2 border-t border-gray-50 first:border-0">
                              <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#EFF6FF' }}>
                                {player?.photo_url ? (
                                  <Image src={player.photo_url} alt={player.first_name} className="w-11 h-11" fittingType="fill" />
                                ) : (
                                  <span className="font-bold" style={{ color: '#2563EB' }}>
                                    {player ? `${player.first_name[0]}${player.last_name[0]}` : '?'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => navigate(`/player/${app.player_id}`)} className="font-bold text-sm truncate" style={{ color: '#0B1528' }}>
                                    {player ? `${player.first_name} ${player.last_name}` : 'Unknown player'}
                                  </button>
                                  {player?.is_verified && <VerifiedBadge type="player" size={11} />}
                                </div>
                                <p className="text-xs" style={{ color: '#64748B' }}>
                                  {player?.positions?.join(', ') || 'No positions'}{player?.age_division ? ` · ${player.age_division}` : ''}
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: getMatchScoreColor(score) }}>
                                  {app.message ? `"${app.message.slice(0, 40)}${app.message.length > 40 ? '…' : ''}"` : ''}
                                </p>
                              </div>
                              <div className="flex flex-col items-center gap-2">
                                <MatchScoreBadge score={score} size="sm" showLabel={false} />
                                <StatusPill status={app.status} />
                              </div>
                              {app.status === 'pending' && (
                                <div className="flex flex-col gap-1.5">
                                  <button
                                    onClick={() => handleDecision(app.id, 'accepted')}
                                    disabled={busyId === app.id}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: '#DCFCE7' }}
                                  >
                                    <Check size={16} color="#16A34A" />
                                  </button>
                                  <button
                                    onClick={() => handleDecision(app.id, 'declined')}
                                    disabled={busyId === app.id}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: '#FEE2E2' }}
                                  >
                                    <X size={16} color="#DC2626" />
                                  </button>
                                </div>
                              )}
                              {app.status === 'accepted' && (
                                <button
                                  onClick={() => navigate('/messages')}
                                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                                  style={{ backgroundColor: '#0B1528' }}
                                >
                                  <MessageCircle size={16} color="white" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="font-bold" style={{ color: '#0B1528' }}>Coach tools</p>
            <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>This dashboard is for coach accounts. Switch your role in onboarding to access these tools.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HeaderStat({ icon: Icon, value, label }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: '#1E293B' }}>
      <Icon size={16} color="#94A3B8" className="mx-auto mb-1" />
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-xs" style={{ color: '#94A3B8' }}>{label}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: { bg: '#FEF9C3', color: '#A16207', label: 'Pending' },
    accepted: { bg: '#DCFCE7', color: '#16A34A', label: 'Accepted' },
    declined: { bg: '#FEE2E2', color: '#DC2626', label: 'Declined' },
    withdrawn: { bg: '#F1F5F9', color: '#64748B', label: 'Withdrawn' }
  };
  const c = map[status] || map.pending;
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}
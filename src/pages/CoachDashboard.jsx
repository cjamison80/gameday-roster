import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Check, X, MessageCircle, Users, ClipboardList, Trophy } from 'lucide-react';
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
        if (opp) {
          const shouldClose = !!opp.spots_available && newFilled >= opp.spots_available;
          const updatedOpp = await base44.entities.Opportunity.update(opp.id, {
            spots_filled: newFilled,
            ...(shouldClose ? { status: 'closed' } : {})
          });
          setOpportunities(prev => prev.map(o => o.id === opp.id ? updatedOpp : o));
        }

        const existingConvs = await base44.entities.Conversation.filter({ opportunity_id: app.opportunity_id });
        let conv = existingConvs.find(c =>
          (c.participant_a_id === user.id || c.participant_b_id === user.id) &&
          (c.participant_a_id === app.parent_id || c.participant_b_id === app.parent_id)
        );
        if (!conv) {
          conv = await base44.entities.Conversation.create({
            participant_a_id: user.id,
            participant_b_id: app.parent_id,
            participant_ids: [user.id, app.parent_id],
            opportunity_id: app.opportunity_id,
            last_message: 'Application accepted. Conversation opened.',
            last_message_at: new Date().toISOString()
          });
        }

        await base44.entities.Notification.create({
          user_id: app.parent_id,
          type: 'application_accepted',
          title: 'Application Accepted',
          body: `Your application was accepted by ${user.full_name}. You can now message the coach.`,
          related_id: app.opportunity_id,
          related_type: 'opportunity',
          action_url: `/messages?conversation=${conv.id}`
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
      <div className="gdr-page pb-24" >
        <div className="px-5 py-5 space-y-3">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  return (
    <div className="gdr-page pb-24" >
      {/* Header */}
      <div className="gdr-hero px-5 pt-14 pb-8">
        <h1 className="text-2xl font-black text-white mb-1">Coach Dashboard</h1>
        <p className="text-sm" style={{ color: '#6F685E' }}>
          {coach ? `${coach.first_name} ${coach.last_name}` : user?.full_name}
        </p>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <HeaderStat icon={Users} value={teams.length} label="Teams" />
          <HeaderStat icon={ClipboardList} value={opportunities.length} label="Posts" />
          <HeaderStat icon={MessageCircle} value={pendingApps.length} label="Pending" />
        </div>

        <button
          onClick={() => navigate(`/tournaments?state=${userProfile?.state || ''}${teams[0]?.age_division ? `&age=${teams[0].age_division}` : ''}${teams[0]?.classification ? `&classification=${teams[0].classification}` : ''}`)}
          className="w-full flex items-center justify-center gap-2 mt-5 py-3.5 font-black uppercase tracking-[0.16em] text-xs"
          style={{ backgroundColor: '#EFE6D6', color: '#151411' }}
        >
          <Trophy size={18} color="#A9824A" />
          Find Tournaments
        </button>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Primary actions */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => navigate('/create-opportunity')}
            className="w-full flex items-center justify-center gap-2 py-4 font-black uppercase tracking-[0.16em] text-xs text-white"
            style={{ backgroundColor: '#A9824A' }}
          >
            <Plus size={18} />
            Post New Opportunity
          </button>
        </div>

        {opportunities.length === 0 && teams.length === 0 && (
          <div className="gdr-card p-8 text-center">
            <p className="font-semibold" style={{ color: '#151411' }}>Your roster starts here</p>
            <p className="text-sm mt-1" style={{ color: '#A39A8E' }}>Create a team and post your first pickup opportunity.</p>
          </div>
        )}

        {/* My Teams */}
        {teams.length > 0 && (
          <div>
            <h2 className="text-2xl mb-3" style={{ color: '#151411' }}>My Teams</h2>
            <div className="space-y-3">
              {teams.map(team => (
                <div
                  key={team.id}
                  onClick={() => navigate(`/team/${team.id}`)}
                  className="gdr-card p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12  flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#F7F3EC' }}>
                    <span className="font-semibold" style={{ color: '#A9824A' }}>
                      {team.name?.split(' ').map(w => w[0]).join('').slice(0, 3)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate" style={{ color: '#151411' }}>{team.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm" style={{ color: '#6F685E' }}>
                        {team.age_division || '—'}{team.classification ? ` · ${team.classification}` : ''}
                      </span>
                      {team.sanctioning_body && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFE6D6', color: '#A9824A' }}>
                          {team.sanctioning_body}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} color="#A39A8E" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Applicants */}
        {isCoach ? (
          <div>
            <h2 className="text-2xl mb-3" style={{ color: '#151411' }}>Applicants</h2>
            {applications.length === 0 ? (
              <div className="gdr-card p-8 text-center">
                <p className="font-semibold" style={{ color: '#151411' }}>No applications yet</p>
                <p className="text-sm mt-1" style={{ color: '#A39A8E' }}>Applicants will appear here once parents apply to your opportunities.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {opportunities.map(opp => {
                  const oppApps = applications.filter(a => a.opportunity_id === opp.id);
                  if (oppApps.length === 0) return null;
                  return (
                    <div key={opp.id} className="gdr-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm" style={{ color: '#151411' }}>{opp.title}</h3>
                        <button onClick={() => navigate(`/opportunity/${opp.id}`)} className="text-xs font-semibold" style={{ color: '#A9824A' }}>View</button>
                      </div>
                      <div className="space-y-3">
                        {oppApps.map(app => {
                          const player = getPlayer(app.player_id);
                          const score = player ? calculateMatchScore({ player, opportunity: opp }) : 0;
                          return (
                            <div key={app.id} className="flex items-center gap-3 py-2 border-t border-gray-50 first:border-0">
                              <div className="w-11 h-11  flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#F7F3EC' }}>
                                {player?.photo_url ? (
                                  <Image src={player.photo_url} alt={player.first_name} className="w-11 h-11" fittingType="fill" />
                                ) : (
                                  <span className="font-semibold" style={{ color: '#A9824A' }}>
                                    {player ? `${player.first_name[0]}${player.last_name[0]}` : '?'}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => navigate(`/player/${app.player_id}`)} className="font-semibold text-sm truncate" style={{ color: '#151411' }}>
                                    {player ? `${player.first_name} ${player.last_name}` : 'Unknown player'}
                                  </button>
                                  {player?.is_verified && <VerifiedBadge type="player" size={11} />}
                                </div>
                                <p className="text-xs" style={{ color: '#6F685E' }}>
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
                                    className="w-9 h-9  flex items-center justify-center"
                                    style={{ backgroundColor: '#E7EDE2' }}
                                  >
                                    <Check size={16} color="#4F7A59" />
                                  </button>
                                  <button
                                    onClick={() => handleDecision(app.id, 'declined')}
                                    disabled={busyId === app.id}
                                    className="w-9 h-9  flex items-center justify-center"
                                    style={{ backgroundColor: '#F1DADA' }}
                                  >
                                    <X size={16} color="#B9232A" />
                                  </button>
                                </div>
                              )}
                              {app.status === 'accepted' && (
                                <button
                                  onClick={() => navigate('/messages')}
                                  className="w-9 h-9  flex items-center justify-center"
                                  style={{ backgroundColor: '#151411' }}
                                  title="Open messages"
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
          <div className="gdr-card p-8 text-center">
            <p className="font-semibold" style={{ color: '#151411' }}>Coach tools</p>
            <p className="text-sm mt-1" style={{ color: '#A39A8E' }}>This dashboard is for coach accounts. Switch your role in onboarding to access these tools.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HeaderStat({ icon: Icon, value, label }) {
  return (
    <div className=" p-3 text-center" style={{ backgroundColor: '#2E2B26' }}>
      <Icon size={16} color="#A39A8E" className="mx-auto mb-1" />
      <p className="text-2xl text-white">{value}</p>
      <p className="text-xs" style={{ color: '#A39A8E' }}>{label}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending: { bg: '#EFE6D6', color: '#765B34', label: 'Pending' },
    accepted: { bg: '#E7EDE2', color: '#4F7A59', label: 'Accepted' },
    declined: { bg: '#F1DADA', color: '#B9232A', label: 'Declined' },
    withdrawn: { bg: '#F0ECE3', color: '#6F685E', label: 'Withdrawn' }
  };
  const c = map[status] || map.pending;
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}
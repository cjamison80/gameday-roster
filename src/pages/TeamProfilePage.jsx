import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, ExternalLink, MessageCircle, Trophy, Users, Heart, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import OpportunityCard from '@/components/OpportunityCard';
import VerifiedBadge from '@/components/VerifiedBadge';
import { Image } from '@/components/ui/image';
import { SkeletonCard } from '@/components/SkeletonCard';
import { useFavorite } from '@/hooks/useFavorite';

export default function TeamProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [coach, setCoach] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const { isFav, toggle: toggleFav } = useFavorite(id, 'team');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const t = await base44.entities.Team.get(id);
      setTeam(t);
      const user = await base44.auth.me().catch(() => null);
      setCurrentUserId(user?.id || null);
      const [coachResults, opps] = await Promise.all([
        t.head_coach_id ? base44.entities.CoachProfile.filter({ user_id: t.head_coach_id }) : Promise.resolve([]),
        base44.entities.Opportunity.filter({ team_id: id, status: 'active' }, '-event_date_start', 20)
      ]);
      setCoach(coachResults[0] || null);
      setOpportunities(opps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="gdr-page" >
        <div className="px-5 py-5 space-y-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="gdr-page flex flex-col items-center justify-center" >
        <p className="font-semibold" style={{ color: '#0B1528' }}>Team not found</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm font-semibold" style={{ color: '#C1121F' }}>Go back</button>
      </div>
    );
  }

  const initials = team.name?.split(' ').map(w => w[0]).join('').slice(0, 3);

  return (
    <div className="gdr-page" >
      {/* Header */}
      <div className="gdr-hero px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <button
            onClick={toggleFav}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold"
            style={{ backgroundColor: isFav ? '#B9232A' : '#C1121F', color: '#FFFFFF' }}
          >
            <Heart size={14} fill={isFav ? '#FFFFFF' : 'none'} />
            {isFav ? 'Favorited' : 'Favorite'}
          </button>
          {currentUserId && team.head_coach_id === currentUserId && (
            <button
              onClick={() => navigate(`/team/${id}/edit`)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold ml-2"
              style={{ backgroundColor: '#17233A', color: '#FFFFFF' }}
            >
              <Pencil size={13} />
              Edit
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20  overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#17233A' }}>
            {team.logo_url ? (
              <Image src={team.logo_url} alt={team.name} className="w-20 h-20" fittingType="fill" />
            ) : (
              <span className="text-3xl text-white">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl text-white">{team.name}</h1>
              {team.is_verified && <VerifiedBadge type="team" size={13} />}
            </div>
            {team.city && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={12} color="#5B6475" />
                <span className="text-sm" style={{ color: '#5B6475' }}>{team.city}, {team.state}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {team.sport && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#17233A', color: '#8B95A7' }}>
                  {team.sport}
                </span>
              )}
              {team.age_division && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#17233A', color: '#FFFFFF' }}>
                  {team.age_division}
                </span>
              )}
              {team.classification && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#3F3F12', color: '#FDE68A' }}>
                  {team.classification}
                </span>
              )}
              {team.sanctioning_body && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#17233A', color: '#FDE68A' }}>
                  {team.sanctioning_body}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Trophy} label="Record" value={(team.wins != null || team.losses != null) ? `${team.wins || 0}-${team.losses || 0}${team.ties ? `-${team.ties}` : ''}` : '—'} />
          <StatCard icon={Users} label="Roster Size" value={team.roster_size || '—'} />
          <StatCard icon={Trophy} label="Recruiting" value={team.is_recruiting ? 'Yes' : 'No'} />
        </div>
        {team.season_label && (
          <p className="text-xs text-center -mt-3" style={{ color: '#8B95A7' }}>{team.season_label}</p>
        )}

        {/* Tournament Finder */}
        <button
          onClick={() => navigate(`/tournaments?state=${team.state || ''}${team.age_division ? `&age=${team.age_division}` : ''}${team.classification ? `&classification=${team.classification}` : ''}`)}
          className="w-full flex items-center justify-between gap-3 gdr-card p-4 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12  flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
              <Trophy size={22} color="#C1121F" />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: '#0B1528' }}>Find Tournaments</h3>
              <p className="text-sm" style={{ color: '#5B6475' }}>Search by mileage, state, association, cost and entered teams.</p>
            </div>
          </div>
          <ExternalLink size={18} color="#8B95A7" />
        </button>

        {/* Bio */}
        {team.bio && (
          <div className="gdr-card p-5">
            <h3 className="font-semibold mb-2" style={{ color: '#0B1528' }}>About {team.name}</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#5B6475' }}>{team.bio}</p>
          </div>
        )}

        {/* Philosophy */}
        {team.philosophy && (
          <div className="gdr-card p-5">
            <h3 className="font-semibold mb-2" style={{ color: '#0B1528' }}>Team Philosophy</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#5B6475' }}>{team.philosophy}</p>
          </div>
        )}

        {/* Coaching Staff */}
        {team.assistant_coaches?.length > 0 && (
          <div className="gdr-card p-5">
            <h3 className="font-semibold mb-3" style={{ color: '#0B1528' }}>Coaching Staff</h3>
            <div className="space-y-2">
              {team.assistant_coaches.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: '#0B1528' }}>{a.name}</span>
                  {a.role && <span className="text-xs" style={{ color: '#8B95A7' }}>{a.role}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coach */}
        {coach && (
          <div className="gdr-card p-4 flex items-center gap-3">
            <div className="w-14 h-14  flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#F5F7FB' }}>
              {coach.photo_url ? (
                <Image src={coach.photo_url} alt={coach.first_name} className="w-14 h-14" fittingType="fill" />
              ) : (
                <span className="text-xl font-black" style={{ color: '#C1121F' }}>{coach.first_name?.[0]}{coach.last_name?.[0]}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold" style={{ color: '#0B1528' }}>{coach.first_name} {coach.last_name}</h3>
                {coach.is_verified && <VerifiedBadge type="coach" size={12} />}
              </div>
              <p className="text-sm mt-0.5" style={{ color: '#5B6475' }}>Head Coach{coach.years_coaching ? ` · ${coach.years_coaching} yrs` : ''}</p>
            </div>
            <button
              onClick={() => navigate('/messages')}
              className="flex items-center gap-1.5 px-3 py-2  text-sm font-bold"
              style={{ backgroundColor: '#0B1528', color: '#FFFFFF' }}
            >
              <MessageCircle size={14} />
              Message
            </button>
          </div>
        )}

        {/* GameChanger + Sideline HD */}
        {(team.gamechanger_url || team.sidelinehd_url) && (
          <div className="space-y-2">
            {team.gamechanger_url && (
              <a
                href={team.gamechanger_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5  text-sm font-bold"
                style={{ backgroundColor: '#F5F7FB', color: '#C1121F' }}
              >
                <ExternalLink size={16} />
                View {team.name} on GameChanger
              </a>
            )}
            {team.sidelinehd_url && (
              <a
                href={team.sidelinehd_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5  text-sm font-bold"
                style={{ backgroundColor: '#ECFEFF', color: '#0E7490' }}
              >
                <ExternalLink size={16} />
                View {team.name} on Sideline HD
              </a>
            )}
          </div>
        )}

        {/* Active Opportunities */}
        <div>
          <h2 className="text-2xl mb-3" style={{ color: '#0B1528' }}>Active Opportunities</h2>
          {opportunities.length > 0 ? (
            <div className="space-y-3">
              {opportunities.map(opp => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  team={team}
                  onClick={() => navigate(`/opportunity/${opp.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="gdr-card p-8 text-center">
              <p className="font-semibold" style={{ color: '#0B1528' }}>No active opportunities</p>
              <p className="text-sm mt-1" style={{ color: '#8B95A7' }}>This team isn't recruiting right now.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="gdr-card p-4 text-center">
      <Icon size={18} color="#C1121F" className="mx-auto mb-1" />
      <p className="text-xl font-black" style={{ color: '#0B1528' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: '#5B6475' }}>{label}</p>
    </div>
  );
}
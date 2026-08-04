import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, ExternalLink, MessageCircle, Trophy, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import OpportunityCard from '@/components/OpportunityCard';
import VerifiedBadge from '@/components/VerifiedBadge';
import { Image } from '@/components/ui/image';
import { SkeletonCard } from '@/components/SkeletonCard';

export default function TeamProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [coach, setCoach] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const t = await base44.entities.Team.get(id);
      setTeam(t);
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
      <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="px-5 py-5 space-y-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <p className="font-bold" style={{ color: '#0B1528' }}>Team not found</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm font-semibold" style={{ color: '#2563EB' }}>Go back</button>
      </div>
    );
  }

  const initials = team.name?.split(' ').map(w => w[0]).join('').slice(0, 3);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <button
            onClick={() => setFollowing(f => !f)}
            className="px-4 py-1.5 rounded-full text-sm font-bold"
            style={{ backgroundColor: following ? '#1E293B' : '#2563EB', color: '#FFFFFF' }}
          >
            {following ? 'Following' : 'Follow'}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#1E293B' }}>
            {team.logo_url ? (
              <Image src={team.logo_url} alt={team.name} className="w-20 h-20" fittingType="fill" />
            ) : (
              <span className="text-2xl font-black text-white">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white">{team.name}</h1>
              {team.is_verified && <VerifiedBadge type="organization" size={13} />}
            </div>
            {team.city && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={12} color="#64748B" />
                <span className="text-sm" style={{ color: '#64748B' }}>{team.city}, {team.state}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {team.sport && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1E293B', color: '#94A3B8' }}>
                  {team.sport}
                </span>
              )}
              {team.age_division && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1E293B', color: '#FFFFFF' }}>
                  {team.age_division}
                </span>
              )}
              {team.classification && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#3F3F12', color: '#FDE68A' }}>
                  {team.classification}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Trophy} label="Active Posts" value={opportunities.length} />
          <StatCard icon={Users} label="Roster Size" value={team.roster_size || '—'} />
          <StatCard icon={Trophy} label="Recruiting" value={team.is_recruiting ? 'Yes' : 'No'} />
        </div>

        {/* Bio */}
        {team.bio && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold mb-2" style={{ color: '#0B1528' }}>About {team.name}</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{team.bio}</p>
          </div>
        )}

        {/* Coach */}
        {coach && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#EFF6FF' }}>
              {coach.photo_url ? (
                <Image src={coach.photo_url} alt={coach.first_name} className="w-14 h-14" fittingType="fill" />
              ) : (
                <span className="text-xl font-black" style={{ color: '#2563EB' }}>{coach.first_name?.[0]}{coach.last_name?.[0]}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold" style={{ color: '#0B1528' }}>{coach.first_name} {coach.last_name}</h3>
                {coach.is_verified && <VerifiedBadge type="coach" size={12} />}
              </div>
              <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>Head Coach{coach.years_coaching ? ` · ${coach.years_coaching} yrs` : ''}</p>
            </div>
            <button
              onClick={() => navigate('/messages')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold"
              style={{ backgroundColor: '#0B1528', color: '#FFFFFF' }}
            >
              <MessageCircle size={14} />
              Message
            </button>
          </div>
        )}

        {/* GameChanger */}
        {team.gamechanger_url && (
          <a
            href={team.gamechanger_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-bold"
            style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}
          >
            <ExternalLink size={16} />
            View {team.name} on GameChanger
          </a>
        )}

        {/* Active Opportunities */}
        <div>
          <h2 className="text-lg font-black mb-3" style={{ color: '#0B1528' }}>Active Opportunities</h2>
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
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="font-bold" style={{ color: '#0B1528' }}>No active opportunities</p>
              <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>This team isn't recruiting right now.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
      <Icon size={18} color="#2563EB" className="mx-auto mb-1" />
      <p className="text-xl font-black" style={{ color: '#0B1528' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{label}</p>
    </div>
  );
}
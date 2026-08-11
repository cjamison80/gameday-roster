import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, MapPin, Globe, Trophy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import VerifiedBadge from '@/components/VerifiedBadge';
import { Image } from '@/components/ui/image';
import { SkeletonCard } from '@/components/SkeletonCard';

export default function OrganizationProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const o = await base44.entities.Organization.get(id);
      setOrg(o);
      const teamList = await base44.entities.Team.filter({ organization_id: id }, '-created_date', 50);
      setTeams(teamList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="gdr-page" >
        <div className="px-5 py-5 space-y-3">{[1, 2].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="gdr-page flex flex-col items-center justify-center" >
        <p className="font-semibold" style={{ color: '#151411' }}>Organization not found</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm font-semibold" style={{ color: '#A9824A' }}>Go back</button>
      </div>
    );
  }

  const initials = org.name?.split(' ').map(w => w[0]).join('').slice(0, 2);

  return (
    <div className="gdr-page" >
      <div className="gdr-hero px-5 pt-14 pb-8">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mb-6">
          <ArrowLeft size={24} color="white" />
        </button>

        <div className="flex items-center gap-4">
          <div className="w-24 h-24  overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#2E2B26' }}>
            {org.logo_url ? (
              <Image src={org.logo_url} alt={org.name} className="w-24 h-24" fittingType="fill" />
            ) : (
              <span className="text-3xl font-black" style={{ color: '#A9824A' }}>{initials}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl text-white">{org.name}</h1>
              {org.is_verified && <VerifiedBadge type="organization" size={14} />}
            </div>
            {org.city && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={12} color="#6F685E" />
                <span className="text-sm" style={{ color: '#6F685E' }}>{org.city}, {org.state}</span>
              </div>
            )}
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-1">
                <Globe size={12} color="#A9824A" />
                <span className="text-sm font-semibold" style={{ color: '#A9824A' }}>Website</span>
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className=" p-3 text-center" style={{ backgroundColor: '#2E2B26' }}>
            <p className="text-2xl text-white">{teams.length}</p>
            <p className="text-xs mt-1" style={{ color: '#A39A8E' }}>Teams</p>
          </div>
          <div className=" p-3 text-center" style={{ backgroundColor: '#2E2B26' }}>
            <p className="text-2xl text-white">{teams.filter(t => t.is_recruiting).length}</p>
            <p className="text-xs mt-1" style={{ color: '#A39A8E' }}>Recruiting</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Tournament Finder */}
        <button
          onClick={() => navigate(`/tournaments?state=${org.state || ''}${teams[0]?.age_division ? `&age=${teams[0].age_division}` : ''}${teams[0]?.classification ? `&classification=${teams[0].classification}` : ''}`)}
          className="w-full flex items-center justify-between gap-3 gdr-card p-4 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12  flex items-center justify-center" style={{ backgroundColor: '#EFE6D6' }}>
              <Trophy size={22} color="#A9824A" />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: '#151411' }}>Find Tournaments</h3>
              <p className="text-sm" style={{ color: '#6F685E' }}>Browse events across all organization teams by association, state, mileage, age and cost.</p>
            </div>
          </div>
          <ExternalLink size={18} color="#A39A8E" />
        </button>

        {/* Description */}
        {org.description && (
          <div className="gdr-card p-5">
            <h3 className="font-semibold mb-2" style={{ color: '#151411' }}>About {org.name}</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#6F685E' }}>{org.description}</p>
          </div>
        )}

        {/* Sports */}
        {org.sports?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {org.sports.map(s => (
              <span key={s} className="px-3 py-1.5  text-sm font-bold capitalize" style={{ backgroundColor: '#F7F3EC', color: '#A9824A' }}>{s}</span>
            ))}
          </div>
        )}

        {/* Teams */}
        <div>
          <h2 className="text-2xl mb-3" style={{ color: '#151411' }}>Teams</h2>
          {teams.length > 0 ? (
            <div className="space-y-3">
              {teams.map(team => (
                <div key={team.id}
                  onClick={() => navigate(`/team/${team.id}`)}
                  className="gdr-card p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-12 h-12  flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#F7F3EC' }}>
                    <span className="font-semibold" style={{ color: '#A9824A' }}>
                      {team.name?.split(' ').map(w => w[0]).join('').slice(0, 3)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate" style={{ color: '#151411' }}>{team.name}</h3>
                    <p className="text-sm" style={{ color: '#6F685E' }}>
                      {team.age_division || '—'}{team.classification ? ` · ${team.classification}` : ''}
                    </p>
                  </div>
                  {team.is_recruiting && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F7F3EC', color: '#A9824A' }}>Recruiting</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="gdr-card p-8 text-center">
              <p className="font-semibold" style={{ color: '#151411' }}>No teams yet</p>
              <p className="text-sm mt-1" style={{ color: '#A39A8E' }}>This organization hasn't added any teams.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
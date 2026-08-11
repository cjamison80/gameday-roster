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
      <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="px-5 py-5 space-y-3">{[1, 2].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <p className="font-bold" style={{ color: '#0B1528' }}>Organization not found</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm font-semibold" style={{ color: '#2563EB' }}>Go back</button>
      </div>
    );
  }

  const initials = org.name?.split(' ').map(w => w[0]).join('').slice(0, 2);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-8">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mb-6">
          <ArrowLeft size={24} color="white" />
        </button>

        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#1E293B' }}>
            {org.logo_url ? (
              <Image src={org.logo_url} alt={org.name} className="w-24 h-24" fittingType="fill" />
            ) : (
              <span className="text-3xl font-black" style={{ color: '#8B5CF6' }}>{initials}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white">{org.name}</h1>
              {org.is_verified && <VerifiedBadge type="organization" size={14} />}
            </div>
            {org.city && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={12} color="#64748B" />
                <span className="text-sm" style={{ color: '#64748B' }}>{org.city}, {org.state}</span>
              </div>
            )}
            {org.website && (
              <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-1">
                <Globe size={12} color="#2563EB" />
                <span className="text-sm font-semibold" style={{ color: '#2563EB' }}>Website</span>
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: '#1E293B' }}>
            <p className="text-xl font-black text-white">{teams.length}</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Teams</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: '#1E293B' }}>
            <p className="text-xl font-black text-white">{teams.filter(t => t.is_recruiting).length}</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Recruiting</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Tournament Finder */}
        <button
          onClick={() => navigate(`/tournaments?state=${org.state || ''}${teams[0]?.age_division ? `&age=${teams[0].age_division}` : ''}${teams[0]?.classification ? `&classification=${teams[0].classification}` : ''}`)}
          className="w-full flex items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FEFCE8' }}>
              <Trophy size={22} color="#D4A017" />
            </div>
            <div>
              <h3 className="font-black" style={{ color: '#0B1528' }}>Find Tournaments</h3>
              <p className="text-sm" style={{ color: '#64748B' }}>Browse events across all organization teams by association, state, mileage, age and cost.</p>
            </div>
          </div>
          <ExternalLink size={18} color="#94A3B8" />
        </button>

        {/* Description */}
        {org.description && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold mb-2" style={{ color: '#0B1528' }}>About {org.name}</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{org.description}</p>
          </div>
        )}

        {/* Sports */}
        {org.sports?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {org.sports.map(s => (
              <span key={s} className="px-3 py-1.5 rounded-xl text-sm font-bold capitalize" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>{s}</span>
            ))}
          </div>
        )}

        {/* Teams */}
        <div>
          <h2 className="text-lg font-black mb-3" style={{ color: '#0B1528' }}>Teams</h2>
          {teams.length > 0 ? (
            <div className="space-y-3">
              {teams.map(team => (
                <div key={team.id}
                  onClick={() => navigate(`/team/${team.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                    <span className="font-black" style={{ color: '#2563EB' }}>
                      {team.name?.split(' ').map(w => w[0]).join('').slice(0, 3)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate" style={{ color: '#0B1528' }}>{team.name}</h3>
                    <p className="text-sm" style={{ color: '#64748B' }}>
                      {team.age_division || '—'}{team.classification ? ` · ${team.classification}` : ''}
                    </p>
                  </div>
                  {team.is_recruiting && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>Recruiting</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="font-bold" style={{ color: '#0B1528' }}>No teams yet</p>
              <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>This organization hasn't added any teams.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
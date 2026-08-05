import React, { useState, useEffect } from 'react';
import { Search, X, ExternalLink, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PlayerCard from '@/components/PlayerCard';
import { SkeletonPlayerCard } from '@/components/SkeletonCard';

const tabs = ['Players', 'Teams', 'Organizations', 'Coaches'];

export default function Network() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Players');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [user, setUser] = useState(null);
  const [favPlayers, setFavPlayers] = useState(new Set());
  const [favTeams, setFavTeams] = useState(new Set());
  const [sanctionFilter, setSanctionFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const [p, t, o, c, favs] = await Promise.all([
        base44.entities.PlayerProfile.filter({ is_public: true }, '-created_date', 50),
        base44.entities.Team.list('-created_date', 50),
        base44.entities.Organization.list('-created_date', 30),
        base44.entities.CoachProfile.list('-created_date', 30),
        base44.entities.Favorite.filter({ user_id: u.id })
      ]);
      setPlayers(p);
      setTeams(t);
      setOrganizations(o);
      setCoaches(c);
      setFavPlayers(new Set(favs.filter(f => f.target_type === 'player').map(f => f.target_id)));
      setFavTeams(new Set(favs.filter(f => f.target_type === 'team').map(f => f.target_id)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (targetId, type) => {
    if (!user) return;
    const set = type === 'team' ? favTeams : favPlayers;
    const setState = type === 'team' ? setFavTeams : setFavPlayers;
    if (set.has(targetId)) {
      const recs = await base44.entities.Favorite.filter({ user_id: user.id, target_id: targetId, target_type: type });
      if (recs[0]) await base44.entities.Favorite.delete(recs[0].id);
      setState(prev => { const n = new Set(prev); n.delete(targetId); return n; });
    } else {
      await base44.entities.Favorite.create({ user_id: user.id, target_id: targetId, target_type: type });
      setState(prev => new Set(prev).add(targetId));
    }
  };

  const filterBySearch = (items, fields) => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => fields.some(f => item[f]?.toLowerCase().includes(q)));
  };

  const filteredPlayers = filterBySearch(players, ['first_name', 'last_name', 'city', 'state']);
  const filteredTeams = filterBySearch(teams, ['name', 'city', 'state', 'age_division']).filter(t => !sanctionFilter || t.sanctioning_body === sanctionFilter);
  const filteredOrgs = filterBySearch(organizations, ['name', 'city', 'state']);
  const filteredCoaches = filterBySearch(coaches, ['first_name', 'last_name', 'city', 'state']);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-5">
        <h1 className="text-2xl font-black text-white mb-4">Network</h1>
        <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: '#1E293B' }}>
          <Search size={18} color="#64748B" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search the travel sports community..."
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-500"
            style={{ color: '#F8FAFC' }}
          />
          {searchQuery && <button onClick={() => setSearchQuery('')}><X size={16} color="#64748B" /></button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex overflow-x-auto no-scrollbar px-5">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="py-4 mr-6 text-sm font-semibold flex-shrink-0 border-b-2 transition-colors"
              style={{
                color: activeTab === tab ? '#2563EB' : '#94A3B8',
                borderColor: activeTab === tab ? '#2563EB' : 'transparent'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 space-y-3">
        {/* Tournament sanction filter (teams) */}
        {activeTab === 'Teams' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[{ id: '', label: 'All' }, { id: 'USSSA', label: 'USSSA' }, { id: '2D', label: '2D' }, { id: 'PG', label: 'PG' }, { id: 'NSA', label: 'NSA' }, { id: 'AAU', label: 'AAU' }].map(c => (
              <button
                key={c.id}
                onClick={() => setSanctionFilter(c.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  backgroundColor: sanctionFilter === c.id ? '#0B1528' : '#FFFFFF',
                  color: sanctionFilter === c.id ? '#FFFFFF' : '#64748B',
                  border: `1.5px solid ${sanctionFilter === c.id ? '#0B1528' : '#E2E8F0'}`
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <SkeletonPlayerCard key={i} />)}</div>
        ) : activeTab === 'Players' ? (
          filteredPlayers.length > 0 ? filteredPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onClick={() => navigate(`/player/${player.id}`)}
              isSaved={favPlayers.has(player.id)}
              onSave={() => toggleFavorite(player.id, 'player')}
            />
          )) : <EmptyState icon="⚾" title="No players found" />
        ) : activeTab === 'Teams' ? (
          filteredTeams.length > 0 ? filteredTeams.map(team => (
            <TeamListItem
              key={team.id}
              team={team}
              onClick={() => navigate(`/team/${team.id}`)}
              isFav={favTeams.has(team.id)}
              onFav={() => toggleFavorite(team.id, 'team')}
            />
          )) : <EmptyState icon="🏆" title="No teams found" />
        ) : activeTab === 'Organizations' ? (
          filteredOrgs.length > 0 ? filteredOrgs.map(org => (
            <OrgListItem key={org.id} org={org} onClick={() => navigate(`/organization/${org.id}`)} />
          )) : <EmptyState icon="🏢" title="No organizations found" />
        ) : (
          filteredCoaches.length > 0 ? filteredCoaches.map(coach => (
            <CoachListItem key={coach.id} coach={coach} onClick={() => navigate(`/coach/${coach.id}`)} />
          )) : <EmptyState icon="👨‍🏫" title="No coaches found" />
        )}
      </div>
    </div>
  );
}

function TeamListItem({ team, onClick, isFav, onFav }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}>
      <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
        <span className="text-xl font-black" style={{ color: '#2563EB' }}>
          {team.name?.split(' ').map(w => w[0]).join('').slice(0, 3)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold truncate" style={{ color: '#0B1528' }}>{team.name}</h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {team.gamechanger_url && (
              <a
                href={team.gamechanger_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}
              >
                <ExternalLink size={12} />
                GameChanger
              </a>
            )}
            {onFav && (
              <button
                onClick={e => { e.stopPropagation(); onFav(); }}
                className="p-1 rounded-full"
              >
                <Heart size={16} fill={isFav ? '#DC2626' : 'none'} color={isFav ? '#DC2626' : '#94A3B8'} />
              </button>
            )}
          </div>
        </div>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>{team.city}, {team.state}</p>
        <div className="flex gap-2 mt-1">
          {team.age_division && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#0B1528' }}>
              {team.age_division}
            </span>
          )}
          {team.classification && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEFCE8', color: '#A4A017' }}>
              {team.classification}
            </span>
          )}
          {team.sanctioning_body && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}>
              {team.sanctioning_body}
            </span>
          )}
          {team.is_recruiting && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
              Recruiting
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function OrgListItem({ org, onClick }) {
  return (
    <div onClick={onClick} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
      <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#F5F3FF' }}>
        {org.logo_url ? (
          <img src={org.logo_url} alt={org.name} className="w-14 h-14 rounded-xl object-cover" />
        ) : (
          <span className="text-xl font-black" style={{ color: '#8B5CF6' }}>
            {org.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold" style={{ color: '#0B1528' }}>{org.name}</h3>
          {org.is_verified && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}>✓ Verified</span>
          )}
        </div>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>{org.city}, {org.state}</p>
      </div>
    </div>
  );
}

function CoachListItem({ coach, onClick }) {
  return (
    <div onClick={onClick} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
      <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
        {coach.photo_url ? (
          <img src={coach.photo_url} alt={`${coach.first_name}`} className="w-14 h-14 rounded-xl object-cover" />
        ) : (
          <span className="text-xl font-black" style={{ color: '#2563EB' }}>
            {coach.first_name?.[0]}{coach.last_name?.[0]}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold" style={{ color: '#0B1528' }}>{coach.first_name} {coach.last_name}</h3>
          {coach.is_verified && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>✓ Coach</span>
          )}
        </div>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>{coach.city}, {coach.state}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon, title }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-bold" style={{ color: '#0B1528' }}>{title}</h3>
      <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Check back soon as the community grows.</p>
    </div>
  );
}
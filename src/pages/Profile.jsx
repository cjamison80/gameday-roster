import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Edit, Settings, Bell, HelpCircle, LogOut, Shield, Camera, ClipboardList, Heart, Trophy, CreditCard } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getInitials } from '@/lib/utils';
import VerifiedBadge from '@/components/VerifiedBadge';
import AvailabilityChip from '@/components/AvailabilityChip';
import { Image } from '@/components/ui/image';
import PlayerCreateForm from '@/components/player/PlayerCreateForm';
import { getEntitledPlan, getIncludedPlayerPlusProfiles, getPlanFromList, hasBundledPlayerPlus, isLimitReached, loadPublicPlans, loadUserSubscription } from '@/lib/subscription';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePlayer, setShowCreatePlayer] = useState(false);
  const [favorites, setFavorites] = useState({ teams: [], players: [] });
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    loadData();
    // Safety net: never let the page spin forever even if a network call stalls.
    const watchdog = setTimeout(() => setLoading(false), 6000);
    return () => clearTimeout(watchdog);
  }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const [profiles, myPlayers, favs, planRows] = await Promise.all([
        base44.entities.UserProfile.filter({ user_id: u.id }),
        base44.entities.PlayerProfile.filter({ parent_id: u.id }),
        base44.entities.Favorite.filter({ user_id: u.id }),
        loadPublicPlans()
      ]);
      const profile = profiles[0] || null;
      if (profile) setUserProfile(profile);
      setPlayers(myPlayers);
      setPlans(planRows);
      const sub = await loadUserSubscription(u, profile?.role || 'parent', planRows);
      setSubscription(sub);
      const teamIds = favs.filter(f => f.target_type === 'team').map(f => f.target_id);
      const playerIds = favs.filter(f => f.target_type === 'player').map(f => f.target_id);
      const [favTeams, favPlayers] = await Promise.all([
        Promise.all(teamIds.map(tid => base44.entities.Team.get(tid).catch(() => null))),
        Promise.all(playerIds.map(pid => base44.entities.PlayerProfile.get(pid).catch(() => null)))
      ]);
      setFavorites({
        teams: favTeams.filter(Boolean),
        players: favPlayers.filter(Boolean)
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout('/login');
  };

  const roleLabel = {
    parent: 'Parent Account',
    coach: 'Coach Account',
    player: 'Player Account',
    organization: 'Organization Account',
    admin: 'Administrator'
  };

  const currentPlan = getEntitledPlan(plans, subscription, userProfile?.role || 'parent');
  const bundledPlayerPlusProfiles = getIncludedPlayerPlusProfiles(currentPlan);
  const canManagePlayers = !userProfile?.role || ['parent', 'player'].includes(userProfile?.role) || bundledPlayerPlusProfiles > 0;
  const playerLimitReached = isLimitReached(currentPlan, 'player_profiles', players.length);
  const handleAddPlayer = () => {
    if (playerLimitReached) {
      navigate(userProfile?.role === 'coach' ? '/billing?reason=coach_player_plus' : '/billing?reason=player_profiles');
      return;
    }
    setShowCreatePlayer(true);
  };

  if (loading) {
    return (
      <div className="gdr-page flex items-center justify-center" >
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#CBD5E1', borderTopColor: '#C1121F' }} />
      </div>
    );
  }

  return (
    <div className="gdr-page" >
      {/* Header */}
      <div className="gdr-hero px-5 pt-14 pb-8 relative">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl text-white">Profile</h1>
          <button
            type="button"
            aria-label="Account Settings"
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#17233A' }}
          >
            <Settings size={20} color="#8B95A7" />
          </button>
        </div>

        {/* User card */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20  overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#17233A' }}>
              <span className="text-3xl font-black text-white">
                {getInitials(user?.full_name || '?')}
              </span>
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#C1121F' }}>
              <Camera size={13} color="white" />
            </button>
          </div>
          <div>
            <h2 className="text-2xl text-white">{user?.full_name}</h2>
            <p className="text-sm mt-0.5" style={{ color: '#5B6475' }}>
              {roleLabel[userProfile?.role] || 'Parent Account'}
            </p>
            {userProfile?.city && (
              <p className="text-sm mt-0.5" style={{ color: '#5B6475' }}>
                📍 {userProfile.city}, {userProfile.state}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5 pb-24">
        {/* Subscription status */}
        <button
          onClick={() => navigate('/billing')}
          className="gdr-card w-full p-4 flex items-center gap-3 text-left"
        >
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
            <CreditCard size={20} color="#C1121F" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: '#94A3B8' }}>Current Plan</p>
            <h3 className="font-black" style={{ color: '#0B1528' }}>{currentPlan?.name || 'Free Plan'}</h3>
            <p className="text-xs mt-0.5" style={{ color: '#5B6475' }}>
              {hasBundledPlayerPlus(currentPlan) ? 'Includes Player Plus for 1 player profile' : 'View limits, upgrades and billing'}
            </p>
          </div>
          <ChevronRight size={18} color="#8B95A7" />
        </button>

        {/* Coach tools entry points (for coaches) */}
        {userProfile?.role === 'coach' && (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/coach-dashboard')}
              className="w-full flex items-center gap-3 p-4  text-left"
              style={{ backgroundColor: '#0B1528' }}
            >
              <div className="w-11 h-11  flex items-center justify-center" style={{ backgroundColor: '#C1121F' }}>
                <ClipboardList size={20} color="white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">Coach Dashboard</h3>
                <p className="text-xs mt-0.5" style={{ color: '#8B95A7' }}>Manage teams, posts & applicants</p>
              </div>
              <ChevronRight size={18} color="#8B95A7" />
            </button>

            <button
              onClick={() => navigate(`/tournaments?state=${userProfile?.state || ''}`)}
              className="w-full flex items-center gap-3 p-4  text-left border border-gray-100"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              <div className="w-11 h-11  flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <Trophy size={20} color="#C1121F" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold" style={{ color: '#0B1528' }}>Find Tournaments</h3>
                <p className="text-xs mt-0.5" style={{ color: '#5B6475' }}>Search USSSA, 2D, Perfect Game and more</p>
              </div>
              <ChevronRight size={18} color="#8B95A7" />
            </button>
          </div>
        )}

        {/* Players section */}
        {canManagePlayers && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-2xl" style={{ color: '#0B1528' }}>My Players</h2>
                {hasBundledPlayerPlus(currentPlan) && (
                  <p className="text-xs font-semibold mt-0.5" style={{ color: '#5B6475' }}>
                    Coach Pro includes Player Plus benefits for 1 player profile.
                  </p>
                )}
              </div>
              <button
                onClick={handleAddPlayer}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: '#C1121F' }}
              >
                <Plus size={14} />
                Add Player
              </button>
            </div>

            {players.length === 0 ? (
              <div
                onClick={handleAddPlayer}
                className="gdr-card border-2 border-dashed p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
                style={{ borderColor: '#CBD5E1' }}
              >
                <div className="w-14 h-14  flex items-center justify-center mb-3"
                  style={{ backgroundColor: '#F5F7FB' }}>
                  <Plus size={24} color="#C1121F" />
                </div>
                <p className="font-semibold" style={{ color: '#0B1528' }}>Add Your First Player</p>
                <p className="text-sm mt-1 text-center" style={{ color: '#8B95A7' }}>
                  {hasBundledPlayerPlus(currentPlan)
                    ? 'Create the included Player Plus profile for your own child'
                    : 'Create a player profile to start applying to opportunities'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {players.map(player => (
                  <div key={player.id}
                    className="gdr-card p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/player/${player.id}`)}>
                    <div className="w-14 h-14  flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: '#F5F7FB' }}>
                      {player.photo_url ? (
                        <Image src={player.photo_url} alt={player.first_name} className="w-14 h-14" fittingType="fill" />
                      ) : (
                        <span className="text-xl font-black" style={{ color: '#C1121F' }}>
                          {player.first_name?.[0]}{player.last_name?.[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold" style={{ color: '#0B1528' }}>
                          {player.first_name} {player.last_name}
                        </h3>
                        {player.is_verified && <VerifiedBadge type="player" size={12} />}
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: '#5B6475' }}>
                        {player.positions?.slice(0, 2).join(', ') || 'No positions set'}
                        {player.age_division ? ` · ${player.age_division}` : ''}
                        {player.classification ? ` · ${player.classification}` : ''}
                      </p>
                    </div>
                    <ChevronRight size={16} color="#8B95A7" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Favorites */}
        {(favorites.teams.length > 0 || favorites.players.length > 0) && (
          <div>
            <h2 className="text-2xl mb-3" style={{ color: '#0B1528' }}>Favorites</h2>
            <div className="space-y-3">
              {favorites.players.map(p => (
                <FavoritesRow
                  key={`p-${p.id}`}
                  title={`${p.first_name} ${p.last_name}`}
                  sub={[p.positions?.[0], p.age_division].filter(Boolean).join(' · ') || 'Player'}
                  onClick={() => navigate(`/player/${p.id}`)}
                />
              ))}
              {favorites.teams.map(t => (
                <FavoritesRow
                  key={`t-${t.id}`}
                  title={t.name}
                  sub={[t.age_division, t.classification, t.city].filter(Boolean).join(' · ') || 'Team'}
                  onClick={() => navigate(`/team/${t.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Settings menu */}
        <div className="gdr-card overflow-hidden">
          {[
            { icon: Settings, label: 'Account Settings', path: '/settings' },
            { icon: Bell, label: 'Notifications', path: '/settings' },
            { icon: Shield, label: 'Privacy & Safety', path: '/settings' },
            { icon: HelpCircle, label: 'Help Center', path: null }
          ].map(({ icon: Icon, label, path }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => path ? navigate(path) : null}
              className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-50 text-left hover:bg-gray-50 transition-colors last:border-b-0"
            >
              <div className="w-9 h-9  flex items-center justify-center" >
                <Icon size={18} color="#5B6475" />
              </div>
              <span className="flex-1 font-medium" style={{ color: '#0B1528' }}>{label}</span>
              <ChevronRight size={16} color="#8B95A7" />
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-red-50 transition-colors"
          >
            <div className="w-9 h-9  flex items-center justify-center" style={{ backgroundColor: '#F1DADA' }}>
              <LogOut size={18} color="#B9232A" />
            </div>
            <span className="flex-1 font-medium" style={{ color: '#B9232A' }}>Log Out</span>
          </button>
        </div>
      </div>

      {/* Create Player Modal */}
      {showCreatePlayer && (
        <div className="fixed inset-0 z-[60] flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full bg-white rounded-t-3xl p-6 pb-10 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />
            <h2 className="text-xl font-black" style={{ color: '#0B1528' }}>Add Player</h2>
            <PlayerCreateForm
              user={user}
              onCreated={(p) => { if (p?.id) setPlayers(prev => [...prev, p]); setShowCreatePlayer(false); }}
              onCancel={() => setShowCreatePlayer(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FavoritesRow({ title, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      className="gdr-card p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="w-10 h-10  flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F1DADA' }}>
        <Heart size={18} color="#B9232A" fill="#B9232A" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate" style={{ color: '#0B1528' }}>{title}</h3>
        <p className="text-sm truncate" style={{ color: '#5B6475' }}>{sub}</p>
      </div>
      <ChevronRight size={16} color="#8B95A7" />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Edit, Settings, Bell, HelpCircle, LogOut, Shield, Camera, ClipboardList, Heart } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getInitials } from '@/lib/utils';
import VerifiedBadge from '@/components/VerifiedBadge';
import AvailabilityChip from '@/components/AvailabilityChip';
import { Image } from '@/components/ui/image';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePlayer, setShowCreatePlayer] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    first_name: '', last_name: '', age_division: '', positions: [],
    guardian_name: '', guardian_relationship: '', guardian_email: '', guardian_phone: ''
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [favorites, setFavorites] = useState({ teams: [], players: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const [profiles, myPlayers, favs] = await Promise.all([
        base44.entities.UserProfile.filter({ user_id: u.id }),
        base44.entities.PlayerProfile.filter({ parent_id: u.id }),
        base44.entities.Favorite.filter({ user_id: u.id })
      ]);
      if (profiles.length > 0) setUserProfile(profiles[0]);
      setPlayers(myPlayers);
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

  const handleCreatePlayer = async () => {
    setFormError('');
    if (!user) { setFormError('Please wait for your account to load.'); return; }
    if (!newPlayer.first_name || !newPlayer.last_name) { setFormError('First and last name are required.'); return; }
    if (!newPlayer.guardian_name || !newPlayer.guardian_relationship) { setFormError('Parent / guardian name and relationship are required.'); return; }
    if (!termsAccepted) { setFormError('Please accept the parent / guardian terms to continue.'); return; }
    setCreating(true);
    try {
      const p = await base44.entities.PlayerProfile.create({
        ...newPlayer,
        parent_id: user.id,
        guardian_name: newPlayer.guardian_name,
        guardian_email: newPlayer.guardian_email || user.email,
        has_accepted_parental_terms: true,
        parental_terms_accepted_at: new Date().toISOString()
      });
      setPlayers(prev => [...prev, p]);
      setShowCreatePlayer(false);
      setTermsAccepted(false);
      setNewPlayer({ first_name: '', last_name: '', age_division: '', positions: [], guardian_name: '', guardian_relationship: '', guardian_email: '', guardian_phone: '' });
    } catch (e) {
      console.error(e);
      setFormError(e?.message || 'Could not create player. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout('/login');
  };

  const roleLabel = {
    parent: 'Parent Account',
    coach: 'Coach Account',
    organization: 'Organization Account',
    admin: 'Administrator'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#E2E8F0', borderTopColor: '#2563EB' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-8 relative">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-white">Profile</h1>
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#1E293B' }}
          >
            <Settings size={20} color="#94A3B8" />
          </button>
        </div>

        {/* User card */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#1E293B' }}>
              <span className="text-3xl font-black text-white">
                {getInitials(user?.full_name || '?')}
              </span>
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#2563EB' }}>
              <Camera size={13} color="white" />
            </button>
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{user?.full_name}</h2>
            <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
              {roleLabel[userProfile?.role] || 'Parent Account'}
            </p>
            {userProfile?.city && (
              <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
                📍 {userProfile.city}, {userProfile.state}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Coach dashboard entry (for coaches) */}
        {userProfile?.role === 'coach' && (
          <button
            onClick={() => navigate('/coach-dashboard')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
            style={{ backgroundColor: '#0B1528' }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#2563EB' }}>
              <ClipboardList size={20} color="white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">Coach Dashboard</h3>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Manage teams, posts & applicants</p>
            </div>
            <ChevronRight size={18} color="#94A3B8" />
          </button>
        )}

        {/* Players section (for parents) */}
        {(!userProfile?.role || userProfile?.role === 'parent') && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black" style={{ color: '#0B1528' }}>My Players</h2>
              <button
                onClick={() => setShowCreatePlayer(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: '#2563EB' }}
              >
                <Plus size={14} />
                Add Player
              </button>
            </div>

            {players.length === 0 ? (
              <div
                onClick={() => setShowCreatePlayer(true)}
                className="bg-white rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
                style={{ borderColor: '#E2E8F0' }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: '#EFF6FF' }}>
                  <Plus size={24} color="#2563EB" />
                </div>
                <p className="font-bold" style={{ color: '#0B1528' }}>Add Your First Player</p>
                <p className="text-sm mt-1 text-center" style={{ color: '#94A3B8' }}>
                  Create a player profile to start applying to opportunities
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {players.map(player => (
                  <div key={player.id}
                    className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/player/${player.id}`)}>
                    <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: '#EFF6FF' }}>
                      {player.photo_url ? (
                        <Image src={player.photo_url} alt={player.first_name} className="w-14 h-14" fittingType="fill" />
                      ) : (
                        <span className="text-xl font-black" style={{ color: '#2563EB' }}>
                          {player.first_name[0]}{player.last_name[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold" style={{ color: '#0B1528' }}>
                          {player.first_name} {player.last_name}
                        </h3>
                        {player.is_verified && <VerifiedBadge type="player" size={12} />}
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
                        {player.positions?.slice(0, 2).join(', ') || 'No positions set'}
                        {player.age_division ? ` · ${player.age_division}` : ''}
                        {player.classification ? ` · ${player.classification}` : ''}
                      </p>
                    </div>
                    <ChevronRight size={16} color="#94A3B8" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Favorites */}
        {(favorites.teams.length > 0 || favorites.players.length > 0) && (
          <div>
            <h2 className="text-lg font-black mb-3" style={{ color: '#0B1528' }}>Favorites</h2>
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
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {[
            { icon: Settings, label: 'Account Settings', path: '/settings' },
            { icon: Bell, label: 'Notifications', path: '/settings' },
            { icon: Shield, label: 'Privacy & Safety', path: '/settings' },
            { icon: HelpCircle, label: 'Help Center', path: null }
          ].map(({ icon: Icon, label, path }) => (
            <button
              key={label}
              onClick={() => path && navigate(path)}
              className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-50 text-left hover:bg-gray-50 transition-colors last:border-b-0"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
                <Icon size={18} color="#64748B" />
              </div>
              <span className="flex-1 font-medium" style={{ color: '#0B1528' }}>{label}</span>
              <ChevronRight size={16} color="#94A3B8" />
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-red-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
              <LogOut size={18} color="#DC2626" />
            </div>
            <span className="flex-1 font-medium" style={{ color: '#DC2626' }}>Log Out</span>
          </button>
        </div>
      </div>

      {/* Create Player Modal */}
      {showCreatePlayer && (
        <div className="fixed inset-0 z-[60] flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full bg-white rounded-t-3xl p-6 pb-10 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />
            <h2 className="text-xl font-black" style={{ color: '#0B1528' }}>Add Player</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreatePlayer(); }} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="np-first-name" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>First Name *</label>
                <input
                  id="np-first-name"
                  name="first_name"
                  value={newPlayer.first_name}
                  onChange={e => setNewPlayer(p => ({ ...p, first_name: e.target.value }))}
                  placeholder="Knox"
                  className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                />
              </div>
              <div>
                <label htmlFor="np-last-name" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Last Name *</label>
                <input
                  id="np-last-name"
                  name="last_name"
                  value={newPlayer.last_name}
                  onChange={e => setNewPlayer(p => ({ ...p, last_name: e.target.value }))}
                  placeholder="Jamison"
                  className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                />
              </div>
            </div>

            <div>
              <span id="np-age" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Age Division</span>
              <div role="group" aria-labelledby="np-age" className="grid grid-cols-4 gap-2">
                {['8U','9U','10U','11U','12U','13U','14U','15U','16U','17U','18U'].map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setNewPlayer(p => ({ ...p, age_division: p.age_division === a ? '' : a })); setFormError(''); }}
                    className="py-2.5 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98]"
                    style={{
                      borderColor: newPlayer.age_division === a ? '#2563EB' : '#E2E8F0',
                      backgroundColor: newPlayer.age_division === a ? '#EFF6FF' : '#FFFFFF',
                      color: newPlayer.age_division === a ? '#2563EB' : '#64748B'
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span id="np-position" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Positions</span>
              <div role="group" aria-labelledby="np-position" className="grid grid-cols-3 gap-2">
                {['Pitcher', 'Catcher', 'Shortstop', 'Second Base', 'Third Base', 'First Base', 'Outfield', 'Utility'].map(pos => {
                  const selected = (newPlayer.positions || []).includes(pos);
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => {
                        setNewPlayer(p => ({
                          ...p,
                          positions: selected
                            ? (p.positions || []).filter(x => x !== pos)
                            : [...(p.positions || []), pos]
                        }));
                        setFormError('');
                      }}
                      className="py-2.5 px-2 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98]"
                      style={{
                        borderColor: selected ? '#2563EB' : '#E2E8F0',
                        backgroundColor: selected ? '#EFF6FF' : '#FFFFFF',
                        color: selected ? '#2563EB' : '#64748B'
                      }}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs mt-1.5" style={{ color: '#94A3B8' }}>Tap to select one or more (primary, secondary, etc.)</p>
            </div>

            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE' }}>
              <p className="text-xs font-semibold" style={{ color: '#1E3A8A' }}>
                Parent / Guardian Information (required — player pages are parent/guardian-run)
              </p>
              <div>
                <label htmlFor="np-guardian-name" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Parent / Guardian Name *</label>
                <input
                  id="np-guardian-name"
                  name="guardian_name"
                  value={newPlayer.guardian_name}
                  onChange={e => setNewPlayer(p => ({ ...p, guardian_name: e.target.value }))}
                  placeholder="Parent / Guardian name"
                  className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                />
              </div>
              <div>
                <span id="np-guardian-relationship" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Relationship *</span>
                <div role="group" aria-labelledby="np-guardian-relationship" className="grid grid-cols-3 gap-2">
                  {['Mother', 'Father', 'Legal Guardian', 'Grandparent', 'Other'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setNewPlayer(p => ({ ...p, guardian_relationship: p.guardian_relationship === r ? '' : r })); setFormError(''); }}
                      className="py-3 px-2 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98]"
                      style={{
                        borderColor: newPlayer.guardian_relationship === r ? '#2563EB' : '#E2E8F0',
                        backgroundColor: newPlayer.guardian_relationship === r ? '#EFF6FF' : '#FFFFFF',
                        color: newPlayer.guardian_relationship === r ? '#2563EB' : '#64748B'
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="np-guardian-email" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Email</label>
                  <input
                    id="np-guardian-email"
                    name="guardian_email"
                    value={newPlayer.guardian_email}
                    onChange={e => setNewPlayer(p => ({ ...p, guardian_email: e.target.value }))}
                    placeholder="Email"
                    className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                    style={{ color: '#0B1528' }}
                  />
                </div>
                <div>
                  <label htmlFor="np-guardian-phone" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Phone</label>
                  <input
                    id="np-guardian-phone"
                    name="guardian_phone"
                    value={newPlayer.guardian_phone}
                    onChange={e => setNewPlayer(p => ({ ...p, guardian_phone: e.target.value }))}
                    placeholder="Phone"
                    className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                    style={{ color: '#0B1528' }}
                  />
                </div>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                className="mt-0.5 w-5 h-5 flex-shrink-0"
                style={{ accentColor: '#2563EB' }}
              />
              <span className="text-xs leading-relaxed" style={{ color: '#475569' }}>
                I am this player's parent or legal guardian and acknowledge that player pages on GameDay Roster are created and managed by a parent or legal guardian.
              </span>
            </label>

            {formError && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                {formError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowCreatePlayer(false); setFormError(''); }}
                className="flex-1 py-4 rounded-2xl font-bold border-2 border-gray-200"
                style={{ color: '#64748B' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-4 rounded-2xl font-bold text-white transition-opacity"
                style={{ backgroundColor: '#2563EB', opacity: creating ? 0.6 : 1 }}
              >
                {creating ? 'Creating...' : 'Create Player'}
              </button>
            </div>
            </form>
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
      className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEE2E2' }}>
        <Heart size={18} color="#DC2626" fill="#DC2626" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold truncate" style={{ color: '#0B1528' }}>{title}</h3>
        <p className="text-sm truncate" style={{ color: '#64748B' }}>{sub}</p>
      </div>
      <ChevronRight size={16} color="#94A3B8" />
    </div>
  );
}
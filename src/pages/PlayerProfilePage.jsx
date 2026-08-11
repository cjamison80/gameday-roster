import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Share, MapPin, Trophy, MessageCircle, ExternalLink, Heart, ShieldCheck, Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import VerifiedBadge from '@/components/VerifiedBadge';
import AvailabilityChip from '@/components/AvailabilityChip';
import AvailabilityCheckin from '@/components/AvailabilityCheckin';
import { Image } from '@/components/ui/image';
import { getInitials } from '@/lib/utils';
import { useFavorite } from '@/hooks/useFavorite';
import { useToast } from '@/components/ui/use-toast';
import PlayerVideos from '@/components/player/PlayerVideos';

export default function PlayerProfilePage({ publicView = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const { isFav, toggle: toggleFav } = useFavorite(id, 'player');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const p = await base44.entities.PlayerProfile.get(id);
      setPlayer(p);
      setEditData(p);

      try {
        const u = await base44.auth.me();
        setUser(u);
        setIsOwner(!publicView && p.parent_id === u.id);
      } catch (authErr) {
        setUser(null);
        setIsOwner(false);
      }

      try {
        const avail = await base44.entities.Availability.filter({ player_id: id }, '-week_start', 1);
        if (avail.length > 0) setAvailability(avail[0]);
      } catch (availabilityErr) {
        setAvailability(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id: _id, created_date: _cd, updated_date: _ud, created_by_id: _cb, ...payload } = editData;
      await base44.entities.PlayerProfile.update(id, payload);
      toast({ title: 'Changes saved', description: 'Player profile updated.' });
      navigate('/profile');
    } catch (e) {
      console.error(e);
      toast({ title: 'Could not save', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEditData(d => ({ ...d, photo_url: file_url }));
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const normalizePerfectGameUrl = (value = '') => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const extractPerfectGamePlayerId = (value = '') => {
    const normalized = normalizePerfectGameUrl(value);
    const match = normalized.match(/[?&](?:player|playerID|PlayerID|id)=([^&]+)/) || normalized.match(/\/(?:players?|Player)\/?([0-9]+)/i);
    return match?.[1] || '';
  };

  const handleConnectPerfectGame = async () => {
    if (!editData.perfect_game_url) {
      toast({ title: 'Perfect Game URL needed', description: 'Paste the player Perfect Game profile URL first.' });
      return;
    }
    const url = normalizePerfectGameUrl(editData.perfect_game_url);
    if (!/perfectgame\.org/i.test(url)) {
      toast({ title: 'Check the link', description: 'Please use a PerfectGame.org player profile URL.', variant: 'destructive' });
      return;
    }
    setEditData(d => ({
      ...d,
      perfect_game_url: url,
      perfect_game_player_id: extractPerfectGamePlayerId(url),
      perfect_game_connection_status: 'connected',
      perfect_game_connected_at: new Date().toISOString()
    }));
    toast({ title: 'Perfect Game profile connected', description: 'Save changes to keep this link on the player profile.' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#E2E8F0', borderTopColor: '#2563EB' }} />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <p className="font-bold" style={{ color: '#0B1528' }}>Player not found</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm font-semibold" style={{ color: '#2563EB' }}>Go back</button>
      </div>
    );
  }

  const fullName = `${player.first_name} ${player.last_name}`;
  const formatDecimalStat = (value, digits = 3) => {
    if (value === null || value === undefined || value === '') return '—';
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    return num < 1 ? num.toFixed(digits).replace(/^0/, '') : num.toFixed(digits);
  };
  const formatNumberStat = (value, suffix = '') => {
    if (value === null || value === undefined || value === '') return '—';
    const num = Number(value);
    if (Number.isNaN(num)) return '—';
    return `${num}${suffix}`;
  };
  const battingStats = [
    { key: 'pg_batting_average', label: 'AVG', value: formatDecimalStat(player.pg_batting_average), placeholder: '.412' },
    { key: 'pg_on_base_percentage', label: 'OBP', value: formatDecimalStat(player.pg_on_base_percentage), placeholder: '.515' },
    { key: 'pg_ops', label: 'OPS', value: formatDecimalStat(player.pg_ops), placeholder: '1.103' },
    { key: 'pg_hits', label: 'H', value: formatNumberStat(player.pg_hits), placeholder: '21' },
    { key: 'pg_rbis', label: 'RBI', value: formatNumberStat(player.pg_rbis), placeholder: '17' },
    { key: 'pg_runs', label: 'R', value: formatNumberStat(player.pg_runs), placeholder: '24' }
  ];
  const pitchingStats = [
    { key: 'pg_era', label: 'ERA', value: formatDecimalStat(player.pg_era, 2), placeholder: '2.10' },
    { key: 'pg_innings_pitched', label: 'IP', value: formatNumberStat(player.pg_innings_pitched), placeholder: '20.1' },
    { key: 'pg_strikeouts', label: 'K', value: formatNumberStat(player.pg_strikeouts), placeholder: '32' }
  ];
  const metricStats = [
    { key: 'pg_fastball_velocity', label: 'FB Velo', value: formatNumberStat(player.pg_fastball_velocity, ' mph'), placeholder: '68' },
    { key: 'pg_exit_velocity', label: 'Exit Velo', value: formatNumberStat(player.pg_exit_velocity, ' mph'), placeholder: '74' },
    { key: 'pg_sixty_yard_dash', label: '60 Yard', value: formatNumberStat(player.pg_sixty_yard_dash, ' sec'), placeholder: '7.80' }
  ];
  const visibleStats = [...battingStats, ...pitchingStats, ...metricStats];
  const hasStats = visibleStats.some(stat => stat.value !== '—');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <div className="flex gap-2">
            {!isOwner && user && !publicView && (
              <button
                onClick={toggleFav}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#1E293B' }}
              >
                <Heart size={18} fill={isFav ? '#DC2626' : 'none'} color={isFav ? '#DC2626' : '#FFFFFF'} />
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setEditing(!editing)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
                style={{ backgroundColor: '#1E293B', color: '#FFFFFF' }}
              >
                <Edit size={14} />
                {editing ? 'Cancel' : 'Edit'}
              </button>
            )}
          </div>
        </div>

        {/* Player hero */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0" style={{ backgroundColor: '#1E293B' }}>
              {(editing ? editData.photo_url : player.photo_url) ? (
                <Image src={editing ? editData.photo_url : player.photo_url} alt={fullName} className="w-24 h-24" fittingType="fill" />
              ) : (
                <div className="w-24 h-24 flex items-center justify-center">
                  <span className="text-4xl font-black text-white">{getInitials(fullName)}</span>
                </div>
              )}
            </div>
            {editing && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 flex items-center justify-center rounded-2xl transition-opacity"
                style={{ backgroundColor: uploadingPhoto ? 'rgba(11,21,40,0.7)' : 'rgba(11,21,40,0.5)' }}
              >
                {uploadingPhoto ? (
                  <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#FFFFFF' }} />
                ) : (
                  <Camera size={22} color="white" />
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelectPhoto}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white">{fullName}</h1>
              {player.is_verified && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2563EB' }}>
                  <span className="text-white text-xs font-black">✓</span>
                </div>
              )}
            </div>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>
              {player.bats && player.throws ? `B: ${player.bats} / T: ${player.throws}` : ''}
              {player.height_inches ? ` · ${Math.floor(player.height_inches/12)}'${player.height_inches%12}"` : ''}
              {player.weight_lbs ? ` · ${player.weight_lbs} lbs` : ''}
            </p>
            {player.city && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={12} color="#64748B" />
                <span className="text-sm" style={{ color: '#64748B' }}>{player.city}, {player.state}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {editing && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <label htmlFor="pp-photo-url" className="text-sm font-semibold mb-1.5 block" style={{ color: '#0B1528' }}>Profile Photo</label>
            <p className="text-xs mb-2" style={{ color: '#64748B' }}>Upload via the camera icon on the avatar, or paste an image URL below.</p>
            <input
              id="pp-photo-url"
              type="url"
              value={editData.photo_url || ''}
              onChange={e => setEditData(d => ({ ...d, photo_url: e.target.value }))}
              placeholder="https://.../photo.jpg"
              className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
              style={{ color: '#0B1528' }}
            />
          </div>
        )}
        {/* Parent/guardian-run disclaimer */}
        <div className="flex items-start gap-2 rounded-2xl p-4" style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE' }}>
          <ShieldCheck size={18} color="#2563EB" className="flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed font-semibold" style={{ color: '#1E3A8A' }}>
            This player page is created and managed by {player.guardian_name ? player.guardian_name : 'a parent or legal guardian'}{player.guardian_relationship ? ` (${player.guardian_relationship})` : ''}. Player profiles on GameDay Roster are parent/guardian-run.
          </p>
        </div>

        {/* Availability + classification */}
        <div className="flex gap-3">
          <AvailabilityChip status={availability?.status || 'not_set'} />
          {player.age_division && (
            <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: '#F1F5F9', color: '#0B1528' }}>
              {player.age_division}
            </span>
          )}
          {player.classification && (
            <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ backgroundColor: '#FEFCE8', color: '#A4A017' }}>
              {player.classification}
            </span>
          )}
        </div>

        {/* Weekly availability check-in (owner only) */}
        {isOwner && (
          <AvailabilityCheckin user={user} playerId={id} onSaved={loadData} />
        )}

        {/* Positions */}
        {player.positions?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold mb-3" style={{ color: '#0B1528' }}>Positions</h3>
            <div className="flex flex-wrap gap-2">
              {player.positions.map(pos => (
                <span key={pos} className="px-3 py-1.5 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                  {pos}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {(player.bio || editing) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold mb-2" style={{ color: '#0B1528' }}>About {player.first_name}</h3>
            {editing ? (
              <textarea
                value={editData.bio || ''}
                onChange={e => setEditData(d => ({ ...d, bio: e.target.value }))}
                rows={4}
                placeholder="Tell coaches about this player..."
                className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none resize-none"
                style={{ color: '#0B1528' }}
              />
            ) : (
              <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{player.bio}</p>
            )}
          </div>
        )}

        {/* Highlight Videos */}
        <PlayerVideos playerId={player.id} isOwner={isOwner} />

        {/* Visible Perfect Game / player stats */}
        {(hasStats || editing) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold" style={{ color: '#0B1528' }}>Player Stats</h3>
                <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                  {player.perfect_game_connection_status === 'connected' ? 'Connected to Perfect Game profile' : 'Manual stats now, Perfect Game sync-ready'}
                </p>
              </div>
              {player.perfect_game_url && !editing && (
                <a href={player.perfect_game_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ backgroundColor: '#FEFCE8', color: '#A16207' }}>
                  PG
                </a>
              )}
            </div>

            {editing ? (
              <div className="space-y-5">
                <StatEditGroup title="Batting" stats={battingStats} editData={editData} setEditData={setEditData} />
                <StatEditGroup title="Pitching" stats={pitchingStats} editData={editData} setEditData={setEditData} />
                <StatEditGroup title="Measurables" stats={metricStats} editData={editData} setEditData={setEditData} />
              </div>
            ) : (
              <div className="space-y-5">
                <StatDisplayGroup title="Batting" stats={battingStats} />
                <StatDisplayGroup title="Pitching" stats={pitchingStats} />
                <StatDisplayGroup title="Measurables" stats={metricStats} />
              </div>
            )}

            {player.pg_stats_last_synced_at && !editing && (
              <p className="text-xs mt-4" style={{ color: '#94A3B8' }}>
                Last updated {new Date(player.pg_stats_last_synced_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Player Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold mb-3" style={{ color: '#0B1528' }}>Player Info</h3>
          <div className="space-y-2">
            {editing ? (
              <div className="py-2 border-b border-gray-50">
                <span className="text-sm font-semibold block mb-2" style={{ color: '#0B1528' }}>Bats</span>
                <div className="grid grid-cols-3 gap-2">
                  {['Right', 'Left', 'Switch'].map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setEditData(d => ({ ...d, bats: d.bats === b ? '' : b }))}
                      className="py-2 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98]"
                      style={{
                        borderColor: editData.bats === b ? '#2563EB' : '#E2E8F0',
                        backgroundColor: editData.bats === b ? '#EFF6FF' : '#FFFFFF',
                        color: editData.bats === b ? '#2563EB' : '#64748B'
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <span className="text-sm font-semibold block mt-3 mb-2" style={{ color: '#0B1528' }}>Throws</span>
                <div className="grid grid-cols-2 gap-2">
                  {['Right', 'Left'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditData(d => ({ ...d, throws: d.throws === t ? '' : t }))}
                      className="py-2 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98]"
                      style={{
                        borderColor: editData.throws === t ? '#2563EB' : '#E2E8F0',
                        backgroundColor: editData.throws === t ? '#EFF6FF' : '#FFFFFF',
                        color: editData.throws === t ? '#2563EB' : '#64748B'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm" style={{ color: '#64748B' }}>Bats / Throws</span>
                <span className="text-sm font-semibold" style={{ color: '#0B1528' }}>{player.bats && player.throws ? `${player.bats} / ${player.throws}` : 'Not set'}</span>
              </div>
            )}
            {[
              { label: 'Height', value: player.height_inches ? `${Math.floor(player.height_inches/12)}'${player.height_inches%12}"` : 'Not set' },
              { label: 'Weight', value: player.weight_lbs ? `${player.weight_lbs} lbs` : 'Not set' },
              { label: 'Travel Radius', value: player.travel_radius_miles ? `${player.travel_radius_miles} miles` : 'Not set' },
              { label: 'Current Team', value: player.current_team_name || 'Not set' }
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm" style={{ color: '#64748B' }}>{label}</span>
                <span className="text-sm font-semibold" style={{ color: '#0B1528' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Parent / Guardian info */}
        {(player.guardian_name || player.guardian_relationship || isOwner) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold mb-3" style={{ color: '#0B1528' }}>Parent / Guardian</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm" style={{ color: '#64748B' }}>Name</span>
                {editing ? (
                  <input
                    value={editData.guardian_name || ''}
                    onChange={e => setEditData(d => ({ ...d, guardian_name: e.target.value }))}
                    placeholder="Parent / Guardian name"
                    className="rounded-lg px-3 py-1.5 text-sm border border-gray-200 outline-none text-right"
                    style={{ color: '#0B1528' }}
                  />
                ) : (
                  <span className="text-sm font-semibold" style={{ color: '#0B1528' }}>{player.guardian_name || 'Not provided'}</span>
                )}
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm" style={{ color: '#64748B' }}>Relationship</span>
                {editing ? (
                  <select
                    value={editData.guardian_relationship || ''}
                    onChange={e => setEditData(d => ({ ...d, guardian_relationship: e.target.value }))}
                    className="rounded-lg px-3 py-1.5 text-sm border border-gray-200 outline-none"
                    style={{ color: '#0B1528' }}
                  >
                    <option value="">Select</option>
                    {['Mother', 'Father', 'Legal Guardian', 'Grandparent', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <span className="text-sm font-semibold" style={{ color: '#0B1528' }}>{player.guardian_relationship || 'Not provided'}</span>
                )}
              </div>
              {isOwner && (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm" style={{ color: '#64748B' }}>Email</span>
                    {editing ? (
                      <input
                        value={editData.guardian_email || ''}
                        onChange={e => setEditData(d => ({ ...d, guardian_email: e.target.value }))}
                        placeholder="email@example.com"
                        className="rounded-lg px-3 py-1.5 text-sm border border-gray-200 outline-none text-right"
                        style={{ color: '#0B1528' }}
                      />
                    ) : (
                      <span className="text-sm font-semibold" style={{ color: '#0B1528' }}>{player.guardian_email || 'Not provided'}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm" style={{ color: '#64748B' }}>Phone</span>
                    {editing ? (
                      <input
                        value={editData.guardian_phone || ''}
                        onChange={e => setEditData(d => ({ ...d, guardian_phone: e.target.value }))}
                        placeholder="(555) 123-4567"
                        className="rounded-lg px-3 py-1.5 text-sm border border-gray-200 outline-none text-right"
                        style={{ color: '#0B1528' }}
                      />
                    ) : (
                      <span className="text-sm font-semibold" style={{ color: '#0B1528' }}>{player.guardian_phone || 'Not provided'}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Linked profiles: Perfect Game + GameChanger + Sideline HD */}
        {(player.perfect_game_url || player.gamechanger_url || player.sidelinehd_url || (isOwner && editing)) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold mb-3" style={{ color: '#0B1528' }}>Linked Profiles</h3>
            <div className="space-y-3">
              <div>
                {editing ? (
                  <div className="rounded-2xl p-4" style={{ backgroundColor: '#FEFCE8', border: '1px solid #FEF08A' }}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <label className="text-xs font-semibold block" style={{ color: '#713F12' }}>Perfect Game Profile URL</label>
                        <p className="text-xs mt-0.5" style={{ color: '#A16207' }}>Paste the player's public PerfectGame.org profile link.</p>
                      </div>
                      {editData.perfect_game_connection_status === 'connected' && (
                        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>Connected</span>
                      )}
                    </div>
                    <input
                      value={editData.perfect_game_url || ''}
                      onChange={e => setEditData(d => ({ ...d, perfect_game_url: e.target.value, perfect_game_connection_status: e.target.value ? 'needs_review' : 'not_connected' }))}
                      placeholder="https://www.perfectgame.org/Players/Playerprofile.aspx?ID=..."
                      className="w-full rounded-xl px-4 py-3 text-sm border border-yellow-200 outline-none bg-white"
                      style={{ color: '#0B1528' }}
                    />
                    <button
                      type="button"
                      onClick={handleConnectPerfectGame}
                      className="w-full mt-3 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      style={{ backgroundColor: '#0B1528', color: '#FFFFFF' }}
                    >
                      <ExternalLink size={15} />
                      Connect Perfect Game Profile
                    </button>
                    {editData.perfect_game_player_id && (
                      <p className="text-xs mt-2" style={{ color: '#A16207' }}>Detected PG ID: {editData.perfect_game_player_id}</p>
                    )}
                  </div>
                ) : player.perfect_game_url && (
                  <a
                    href={player.perfect_game_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: '#FEFCE8', color: '#A16207' }}
                  >
                    <ExternalLink size={16} />
                    View {player.first_name} on Perfect Game
                  </a>
                )}
              </div>
              <div>
                {editing ? (
                  <>
                    <label className="text-xs font-semibold block mb-1" style={{ color: '#64748B' }}>GameChanger URL</label>
                    <input
                      value={editData.gamechanger_url || ''}
                      onChange={e => setEditData(d => ({ ...d, gamechanger_url: e.target.value }))}
                      placeholder="https://www.gc.com/..."
                      className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                      style={{ color: '#0B1528' }}
                    />
                  </>
                ) : player.gamechanger_url && (
                  <a
                    href={player.gamechanger_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}
                  >
                    <ExternalLink size={16} />
                    View {player.first_name} on GameChanger
                  </a>
                )}
              </div>
              <div>
                {editing ? (
                  <>
                    <label className="text-xs font-semibold block mb-1" style={{ color: '#64748B' }}>Sideline HD URL</label>
                    <input
                      value={editData.sidelinehd_url || ''}
                      onChange={e => setEditData(d => ({ ...d, sidelinehd_url: e.target.value }))}
                      placeholder="https://sidelinehd.com/..."
                      className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                      style={{ color: '#0B1528' }}
                    />
                  </>
                ) : player.sidelinehd_url && (
                  <a
                    href={player.sidelinehd_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: '#ECFEFF', color: '#0E7490' }}
                  >
                    <ExternalLink size={16} />
                    View {player.first_name} on Sideline HD
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save button */}
        {editing && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-white"
            style={{ backgroundColor: '#2563EB' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}

        {/* Message button (non-owner) */}
        {!isOwner && user && !publicView && (
          <button
            onClick={() => navigate('/messages')}
            className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
            style={{ backgroundColor: '#0B1528', color: '#FFFFFF' }}
          >
            <MessageCircle size={18} />
            Send Message
          </button>
        )}
      </div>
    </div>
  );
}

function StatDisplayGroup({ title, stats }) {
  const shown = stats.filter(stat => stat.value !== '—');
  if (shown.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-black uppercase tracking-wide mb-2" style={{ color: '#64748B' }}>{title}</h4>
      <div className="grid grid-cols-3 gap-2">
        {shown.map(stat => (
          <div key={stat.key} className="rounded-2xl p-3 text-center" style={{ backgroundColor: '#F8FAFC' }}>
            <p className="text-lg font-black" style={{ color: '#0B1528' }}>{stat.value}</p>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: '#64748B' }}>{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatEditGroup({ title, stats, editData, setEditData }) {
  return (
    <div>
      <h4 className="text-xs font-black uppercase tracking-wide mb-2" style={{ color: '#64748B' }}>{title}</h4>
      <div className="grid grid-cols-3 gap-2">
        {stats.map(stat => (
          <label key={stat.key} className="block">
            <span className="text-[10px] font-bold mb-1 block" style={{ color: '#64748B' }}>{stat.label}</span>
            <input
              type="number"
              step="any"
              value={editData[stat.key] ?? ''}
              onChange={e => setEditData(d => ({ ...d, [stat.key]: e.target.value === '' ? '' : Number(e.target.value), pg_stats_last_synced_at: new Date().toISOString() }))}
              placeholder={stat.placeholder}
              className="w-full rounded-xl px-3 py-2.5 text-sm border border-gray-200 outline-none"
              style={{ color: '#0B1528' }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
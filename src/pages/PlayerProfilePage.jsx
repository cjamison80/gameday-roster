import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Share, MapPin, Trophy, MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import VerifiedBadge from '@/components/VerifiedBadge';
import AvailabilityChip from '@/components/AvailabilityChip';
import { Image } from '@/components/ui/image';
import { getInitials } from '@/lib/utils';

export default function PlayerProfilePage() {
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

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [p, u] = await Promise.all([
        base44.entities.PlayerProfile.get(id),
        base44.auth.me()
      ]);
      setPlayer(p);
      setUser(u);
      setEditData(p);
      setIsOwner(p.parent_id === u.id);
      const avail = await base44.entities.Availability.filter({ player_id: id });
      if (avail.length > 0) setAvailability(avail[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.PlayerProfile.update(id, editData);
      setPlayer(editData);
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <div className="flex gap-2">
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
              {player.photo_url ? (
                <Image src={player.photo_url} alt={fullName} className="w-24 h-24" fittingType="fill" />
              ) : (
                <div className="w-24 h-24 flex items-center justify-center">
                  <span className="text-4xl font-black text-white">{getInitials(fullName)}</span>
                </div>
              )}
            </div>
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

        {/* Player Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-bold mb-3" style={{ color: '#0B1528' }}>Player Info</h3>
          <div className="space-y-2">
            {[
              { label: 'Bats / Throws', value: player.bats && player.throws ? `${player.bats} / ${player.throws}` : 'Not set' },
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
        {!isOwner && (
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
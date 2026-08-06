import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2, CalendarDays } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DAYS = [
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' }
];

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', color: '#16A34A', bg: '#DCFCE7' },
  { value: 'maybe', label: 'Maybe', color: '#F59E0B', bg: '#FEF9C3' },
  { value: 'unavailable', label: 'Not Available', color: '#DC2626', bg: '#FEE2E2' }
];

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return d.toISOString().split('T')[0];
}

function weekendRange(weekStart) {
  const start = new Date(weekStart + 'T00:00:00');
  const friday = new Date(start); friday.setDate(start.getDate() + 4);
  const sunday = new Date(start); sunday.setDate(start.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(friday)} – ${fmt(sunday)}`;
}

export default function AvailabilityCheckin({ user }) {
  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [status, setStatus] = useState('available');
  const [days, setDays] = useState({ friday: true, saturday: true, sunday: true });
  const [overnight, setOvernight] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const weekStart = getWeekStart();

  useEffect(() => {
    (async () => {
      if (!user) { setLoadingPlayers(false); return; }
      try {
        const myPlayers = await base44.entities.PlayerProfile.filter({ parent_id: user.id });
        setPlayers(myPlayers);
        if (myPlayers.length > 0) setSelectedPlayerId(myPlayers[0].id);
        const existing = await base44.entities.Availability.filter({ parent_id: user.id, player_id: myPlayers[0]?.id || '', week_start: weekStart });
        if (existing.length > 0) {
          const a = existing[0];
          setStatus(a.status && a.status !== 'not_set' ? a.status : 'available');
          setDays({ friday: !!a.friday, saturday: !!a.saturday, sunday: !!a.sunday });
          setOvernight(!!a.overnight);
          setNotes(a.notes || '');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPlayers(false);
      }
    })();
  }, [user]);

  const handlePlayerChange = async (pid) => {
    setSelectedPlayerId(pid);
    setSaved(false);
    setError('');
    try {
      const existing = await base44.entities.Availability.filter({ parent_id: user.id, player_id: pid, week_start: weekStart });
      if (existing.length > 0) {
        const a = existing[0];
        setStatus(a.status && a.status !== 'not_set' ? a.status : 'available');
        setDays({ friday: !!a.friday, saturday: !!a.saturday, sunday: !!a.sunday });
        setOvernight(!!a.overnight);
        setNotes(a.notes || '');
      } else {
        setStatus('available');
        setDays({ friday: true, saturday: true, sunday: true });
        setOvernight(false);
        setNotes('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setError('');
    if (!user) { setError('Please wait for your account to load.'); return; }
    if (!selectedPlayerId) { setError('Select a player first.'); return; }
    setSaving(true);
    setSaved(false);
    try {
      const payload = {
        parent_id: user.id,
        player_id: selectedPlayerId,
        week_start: weekStart,
        status,
        friday: !!days.friday,
        saturday: !!days.saturday,
        sunday: !!days.sunday,
        overnight,
        notes
      };
      const existing = await base44.entities.Availability.filter({ parent_id: user.id, player_id: selectedPlayerId, week_start: weekStart });
      if (existing.length > 0) {
        await base44.entities.Availability.update(existing[0].id, payload);
      } else {
        await base44.entities.Availability.create(payload);
      }
      setSaved(true);
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Could not save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingPlayers) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center justify-center py-10">
        <Loader2 className="animate-spin" size={22} color="#2563EB" />
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
        <div className="text-4xl mb-3">⚾</div>
        <h3 className="text-lg font-bold" style={{ color: '#0B1528' }}>No players yet</h3>
        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
          Add a player from your Profile to set their weekly availability.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black" style={{ color: '#0B1528' }}>Weekly Check-In</h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
              <CalendarDays size={14} />
              {weekendRange(weekStart)}
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Tell coaches which days your player is available this weekend.
          </p>
        </div>

        {/* Player selector */}
        <div>
          <label htmlFor="avail-player" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Player</label>
          <select
            id="avail-player"
            value={selectedPlayerId}
            onChange={(e) => handlePlayerChange(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
            style={{ color: '#0B1528' }}
          >
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
            ))}
          </select>
        </div>

        {/* Overall status */}
        <div>
          <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Overall Status</label>
          <div className="grid grid-cols-3 gap-2">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setStatus(opt.value); setSaved(false); }}
                className="py-3 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98]"
                style={{
                  borderColor: status === opt.value ? opt.color : '#E2E8F0',
                  backgroundColor: status === opt.value ? opt.bg : '#FFFFFF',
                  color: status === opt.value ? opt.color : '#64748B'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Per-day toggles */}
        <div>
          <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Available Days</label>
          <div className="grid grid-cols-3 gap-2">
            {DAYS.map(day => {
              const on = days[day.key];
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => { setDays(d => ({ ...d, [day.key]: !d[day.key] })); setSaved(false); }}
                  className="py-4 rounded-xl border-2 flex flex-col items-center gap-1 transition-all active:scale-[0.98]"
                  style={{
                    borderColor: on ? '#2563EB' : '#E2E8F0',
                    backgroundColor: on ? '#EFF6FF' : '#FFFFFF'
                  }}
                >
                  <span className="text-sm font-bold" style={{ color: on ? '#2563EB' : '#94A3B8' }}>{day.short}</span>
                  <span className="text-xs font-semibold" style={{ color: on ? '#2563EB' : '#94A3B8' }}>
                    {on ? 'Available' : 'No'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Overnight */}
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-semibold" style={{ color: '#0B1528' }}>Available for overnight travel</span>
          <input
            type="checkbox"
            checked={overnight}
            onChange={(e) => { setOvernight(e.target.checked); setSaved(false); }}
            className="w-5 h-5"
            style={{ accentColor: '#2563EB' }}
          />
        </label>

        {/* Notes */}
        <div>
          <label htmlFor="avail-notes" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Notes for coaches</label>
          <textarea
            id="avail-notes"
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
            placeholder="e.g. Only available Saturday, arriving late Friday night…"
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none resize-none"
            style={{ color: '#0B1528' }}
          />
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            {error}
          </div>
        )}

        {saved && (
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl" style={{ backgroundColor: '#DCFCE7' }}>
            <CheckCircle size={18} color="#16A34A" />
            <span className="font-semibold text-sm" style={{ color: '#16A34A' }}>Availability saved for this weekend!</span>
          </div>
        )}

        <div className="sticky bottom-20 z-10">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-opacity"
            style={{ backgroundColor: '#2563EB', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SPORTS = [
  { id: 'baseball', label: 'Baseball', emoji: '\u26be', live: true },
  { id: 'softball', label: 'Softball', emoji: '\ud83e\udd4e', live: true },
  { id: 'volleyball', label: 'Volleyball', emoji: '\ud83c\udfd0', live: false },
  { id: 'flag_football', label: 'Flag Football', emoji: '\ud83c\udfc8', live: false },
  { id: 'basketball', label: 'Basketball', emoji: '\ud83c\udfc0', live: false },
  { id: 'soccer', label: 'Soccer', emoji: '\u26bd', live: false },
  { id: 'lacrosse', label: 'Lacrosse', emoji: '\ud83e\udd4d', live: false }
];

export default function SportsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [interested, setInterested] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const rows = await base44.entities.SportInterest.filter({ user_id: u.id });
      setInterested(new Set(rows.map(r => r.sport)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const notifyMe = async (sportId) => {
    if (!user || interested.has(sportId) || submitting) return;
    setSubmitting(sportId);
    try {
      await base44.entities.SportInterest.create({ sport: sportId, user_id: user.id });
      setInterested(prev => new Set(prev).add(sportId));
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="gdr-page">
      <div className="gdr-hero px-5 pt-14 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <h1 className="text-2xl text-white">Sports</h1>
        </div>
        <p className="text-sm px-1" style={{ color: '#8B95A7' }}>
          GameDay Roster is live for baseball and softball today. Tell us what to build next.
        </p>
      </div>

      <div className="px-5 py-5 space-y-3 pb-24">
        {SPORTS.map(sport => (
          <div key={sport.id} className="gdr-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-2xl" style={{ backgroundColor: '#F5F7FB' }}>
              {sport.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold" style={{ color: '#0B1528' }}>{sport.label}</p>
              <p className="text-xs mt-0.5 font-bold uppercase tracking-wide" style={{ color: sport.live ? '#4F7A59' : '#8B95A7' }}>
                {sport.live ? 'Live now' : 'Coming soon'}
              </p>
            </div>
            {sport.live ? (
              <button
                onClick={() => navigate(`/discover`)}
                className="px-4 py-2 text-sm font-bold text-white flex-shrink-0"
                style={{ backgroundColor: '#C1121F' }}
              >
                Explore
              </button>
            ) : interested.has(sport.id) ? (
              <span className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold flex-shrink-0" style={{ color: '#4F7A59' }}>
                <Check size={16} />
                Notified
              </span>
            ) : (
              <button
                onClick={() => notifyMe(sport.id)}
                disabled={submitting === sport.id || loading}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold flex-shrink-0 border-2"
                style={{ color: '#0B1528', borderColor: '#CBD5E1' }}
              >
                <Bell size={14} />
                Notify Me
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

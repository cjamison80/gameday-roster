import React, { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, Bell, MapPin, X, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import OpportunityCard from '@/components/OpportunityCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import GameDayLogo from '@/components/GameDayLogo';
import { calculateMatchScore } from '@/lib/utils';

const filterChips = [
  { id: 'all', label: 'For You' },
  { id: 'this_weekend', label: 'This Weekend' },
  { id: 'nearby', label: 'Near You' },
  { id: 'tryouts', label: 'Tryouts' },
];

const positionOptions = ['Pitcher', 'Catcher', 'Shortstop', 'Second Base', 'Third Base', 'First Base', 'Outfield', 'Utility'];
const ageDivisions = ['8U', '9U', '10U', '11U', '12U', '13U', '14U', '15U', '16U', '17U', '18U'];
const classifications = ['AAA', 'AA', 'A', 'Open'];

export default function Discover() {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());
  const [user, setUser] = useState(null);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [filters, setFilters] = useState({ position: '', age_division: '', classification: '', sport: '', sanctioning: '' });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const [opps, saved, players] = await Promise.all([
        base44.entities.Opportunity.filter({ status: 'active' }, '-created_date', 50),
        base44.entities.SavedOpportunity.filter({ user_id: u.id }),
        base44.entities.PlayerProfile.filter({ parent_id: u.id })
      ]);
      setOpportunities(opps);
      setSavedIds(new Set(saved.map(s => s.opportunity_id)));
      if (players.length > 0) setPlayerProfile(players[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = async (oppId) => {
    if (!user) return;
    if (savedIds.has(oppId)) {
      const saved = await base44.entities.SavedOpportunity.filter({ user_id: user.id, opportunity_id: oppId });
      if (saved.length > 0) await base44.entities.SavedOpportunity.delete(saved[0].id);
      setSavedIds(prev => { const n = new Set(prev); n.delete(oppId); return n; });
    } else {
      await base44.entities.SavedOpportunity.create({ user_id: user.id, opportunity_id: oppId });
      setSavedIds(prev => new Set(prev).add(oppId));
    }
  };

  const getFilteredOpps = () => {
    let filtered = [...opportunities];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.title?.toLowerCase().includes(q) ||
        o.city?.toLowerCase().includes(q) ||
        o.state?.toLowerCase().includes(q) ||
        o.positions_needed?.some(p => p.toLowerCase().includes(q))
      );
    }

    // Tab filter
    const now = new Date();
    const friday = new Date(now);
    friday.setDate(now.getDate() + (5 - now.getDay() + 7) % 7);
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);

    if (activeFilter === 'this_weekend') {
      filtered = filtered.filter(o => {
        const d = new Date(o.event_date_start);
        return d >= friday && d <= sunday;
      });
    } else if (activeFilter === 'tryouts') {
      filtered = filtered.filter(o => o.type === 'tryout');
    }

    // Filter panel
    if (filters.sport) filtered = filtered.filter(o => o.sport === filters.sport);
    if (filters.position) filtered = filtered.filter(o => o.positions_needed?.includes(filters.position));
    if (filters.age_division) filtered = filtered.filter(o => o.age_division === filters.age_division);
    if (filters.classification) filtered = filtered.filter(o => o.classification === filters.classification);
    if (filters.sanctioning) filtered = filtered.filter(o => o.sanctioning_body === filters.sanctioning);

    // Near You: prioritize opportunities in the user's state (proximity sort),
    // preserving all other selected filters instead of clearing them.
    if (activeFilter === 'nearby') {
      const myState = playerProfile?.state;
      if (myState) {
        filtered = filtered.sort((a, b) => {
          const aNear = a.state === myState ? 0 : 1;
          const bNear = b.state === myState ? 0 : 1;
          return aNear - bNear;
        });
      }
    }

    return filtered;
  };

  const filteredOpps = getFilteredOpps();

  const getMatchScore = (opp) => {
    if (!playerProfile) return Math.floor(70 + Math.random() * 25);
    return calculateMatchScore({ player: playerProfile, opportunity: opp });
  };

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="gdr-page">
      {/* Header */}
      <div className="gdr-hero px-5 pt-14 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#94A3B8' }}>Good morning, {firstName} 👋</p>
            <GameDayLogo size={28} showText={true} light={true} />
          </div>
          <button
            onClick={() => navigate('/activity')}
            className="gdr-glass w-11 h-11 rounded-2xl flex items-center justify-center relative"
          >
            <Bell size={20} color="#94A3B8" />
          </button>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="gdr-input-dark flex-1 flex items-center gap-2 rounded-2xl px-4 py-3.5">
            <Search size={18} color="#64748B" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search teams, tournaments, or locations..."
              className="flex-1 bg-transparent text-sm outline-none placeholder-gray-500"
              style={{ color: '#F8FAFC' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}><X size={16} color="#64748B" /></button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all"
            style={{ background: showFilters ? '#A9824A' : 'rgba(255,253,248,0.08)', border: '1px solid rgba(255,253,248,0.18)' }}
          >
            <SlidersHorizontal size={20} color={showFilters ? '#FFFFFF' : '#94A3B8'} />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mx-5 -mt-3 gdr-card px-4 py-4 space-y-4 relative z-10">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#64748B' }}>Position</label>
              <select
                value={filters.position}
                onChange={e => setFilters(f => ({ ...f, position: e.target.value }))}
                className="gdr-select w-full px-3 py-2.5 text-sm outline-none"
                style={{ color: '#0B1528' }}
              >
                <option value="">All Positions</option>
                {positionOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#64748B' }}>Age Division</label>
              <select
                value={filters.age_division}
                onChange={e => setFilters(f => ({ ...f, age_division: e.target.value }))}
                className="gdr-select w-full px-3 py-2.5 text-sm outline-none"
                style={{ color: '#0B1528' }}
              >
                <option value="">All Ages</option>
                {ageDivisions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#64748B' }}>Classification</label>
              <select
                value={filters.classification}
                onChange={e => setFilters(f => ({ ...f, classification: e.target.value }))}
                className="gdr-select w-full px-3 py-2.5 text-sm outline-none"
                style={{ color: '#0B1528' }}
              >
                <option value="">All Classifications</option>
                {classifications.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#64748B' }}>Sport</label>
              <select
                value={filters.sport}
                onChange={e => setFilters(f => ({ ...f, sport: e.target.value }))}
                className="gdr-select w-full px-3 py-2.5 text-sm outline-none"
                style={{ color: '#0B1528' }}
              >
                <option value="">All Sports</option>
                <option value="baseball">Baseball</option>
                <option value="softball">Softball</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide mb-1 block" style={{ color: '#64748B' }}>Tournament Type</label>
              <select
                value={filters.sanctioning}
                onChange={e => setFilters(f => ({ ...f, sanctioning: e.target.value }))}
                className="gdr-select w-full px-3 py-2.5 text-sm outline-none"
                style={{ color: '#0B1528' }}
              >
                <option value="">All Sanctions</option>
                {['USSSA', '2D', 'PG', 'NSA', 'AAU', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={() => setFilters({ position: '', age_division: '', classification: '', sport: '', sanctioning: '' })}
            className="text-sm font-semibold"
            style={{ color: '#A9824A' }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 px-5 py-5 overflow-x-auto no-scrollbar">
        {filterChips.map(chip => (
          <button
            key={chip.id}
            onClick={() => setActiveFilter(chip.id)}
            className={`flex-shrink-0 px-4 py-2 font-black text-[11px] transition-all ${activeFilter === chip.id ? 'gdr-chip-active' : 'gdr-chip'}`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-5 pb-6 space-y-4">
        {/* Stats banner */}
        {!loading && opportunities.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: opportunities.filter(o => o.type === 'pickup').length, label: 'Opportunities' },
              { value: opportunities.filter(o => o.type === 'tryout').length, label: 'Tryouts' },
              { value: new Set(opportunities.map(o => o.city + o.state)).size, label: 'Locations' }
            ].map(stat => (
              <div key={stat.label} className="gdr-soft-card p-3 text-center">
                <div className="text-2xl font-black tracking-[-0.04em]" style={{ color: '#0B1528' }}>{stat.value}</div>
                <div className="text-xs font-bold mt-0.5" style={{ color: '#94A3B8' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl" style={{ color: '#151411', fontFamily: 'ui-serif, Georgia, Cambria, Times New Roman, Times, serif', fontWeight: 500 }}>
            {activeFilter === 'all' ? 'Recommended for You' :
             activeFilter === 'this_weekend' ? 'This Weekend' :
             activeFilter === 'nearby' ? 'Near You' : 'Tryouts'}
          </h2>
          <span className="text-sm font-medium" style={{ color: '#94A3B8' }}>
            {filteredOpps.length} results
          </span>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filteredOpps.length > 0 ? (
          <div className="space-y-4">
            {filteredOpps.map(opp => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                matchScore={getMatchScore(opp)}
                isSaved={savedIds.has(opp.id)}
                onSave={() => toggleSave(opp.id)}
                onClick={() => navigate(`/opportunity/${opp.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">⚾</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#0B1528' }}>No opportunities found</h3>
            <p className="text-sm" style={{ color: '#94A3B8' }}>
              Try adjusting your filters or check back soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
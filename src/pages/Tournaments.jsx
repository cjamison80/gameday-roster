import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import TournamentCard from '@/components/TournamentCard';
import { SkeletonCard } from '@/components/SkeletonCard';

const ASSOCIATIONS = ['Perfect Game', '2D Sports', 'USSSA', 'NSA', 'AAU', 'Ripken', 'Triple Crown', 'Other'];
const STATES = ['AR', 'MO', 'OK', 'TX', 'TN', 'MS', 'LA', 'KS', 'AL', 'GA', 'FL'];
const AGE_DIVISIONS = ['8U','9U','10U','11U','12U','13U','14U','15U','16U','17U','18U'];
const CLASSIFICATIONS = ['Major','AAA','AA','A','Open'];
const RADIUS_OPTIONS = [25, 50, 100, 150, 250, 500];

export default function Tournaments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [userLocation, setUserLocation] = useState({ city: '', state: '' });
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    state: searchParams.get('state') || '',
    association: '',
    age: searchParams.get('age') || '',
    classification: searchParams.get('classification') || '',
    radius: '',
    maxCost: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const [profileResults, tournamentResults] = await Promise.all([
        base44.entities.UserProfile.filter({ user_id: user.id }),
        base44.entities.Tournament.list('start_date', 200)
      ]);
      const profile = profileResults[0];
      setUserLocation({ city: profile?.city || '', state: profile?.state || '' });
      setTournaments(tournamentResults.filter(t => ['open', 'waitlist', 'unknown'].includes(t.status || 'unknown')));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tournaments.filter(t => {
      if (q) {
        const haystack = [t.name, t.association, t.city, t.state, t.venue, t.description].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.state && t.state !== filters.state) return false;
      if (filters.association && t.association !== filters.association) return false;
      if (filters.age && !(t.age_divisions || []).includes(filters.age)) return false;
      if (filters.classification && !(t.classifications || []).includes(filters.classification)) return false;
      if (filters.maxCost && Number(t.cost || 0) > Number(filters.maxCost)) return false;

      // MVP radius proxy: until geocoding is connected, radius prioritizes matching state.
      // When latitude/longitude are populated from a permitted data provider, this can become true distance math.
      if (filters.radius && userLocation.state && Number(filters.radius) <= 250 && t.state !== userLocation.state) return false;
      return true;
    });
  }, [tournaments, query, filters, userLocation.state]);

  const updateFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const clearFilters = () => setFilters({ state: '', association: '', age: '', classification: '', radius: '', maxCost: '' });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">Tournament Finder</h1>
            <p className="text-sm" style={{ color: '#94A3B8' }}>
              Find events by location, association, age, cost and entered teams.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: '#1E293B' }}>
          <Search size={18} color="#64748B" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tournaments, venues, cities..."
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-500"
            style={{ color: '#F8FAFC' }}
          />
          {query && <button onClick={() => setQuery('')}><X size={16} color="#64748B" /></button>}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4 pb-24">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm"
            style={{ backgroundColor: '#FFFFFF', color: '#0B1528', border: '1px solid #E2E8F0' }}
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-black text-white" style={{ backgroundColor: '#2563EB' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          {userLocation.state && (
            <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#64748B' }}>
              <MapPin size={13} /> Based near {userLocation.city ? `${userLocation.city}, ` : ''}{userLocation.state}
            </div>
          )}
        </div>

        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Select label="State" value={filters.state} onChange={v => updateFilter('state', v)} options={STATES} />
              <Select label="Association" value={filters.association} onChange={v => updateFilter('association', v)} options={ASSOCIATIONS} />
              <Select label="Age" value={filters.age} onChange={v => updateFilter('age', v)} options={AGE_DIVISIONS} />
              <Select label="Class" value={filters.classification} onChange={v => updateFilter('classification', v)} options={CLASSIFICATIONS} />
              <Select label="Radius" value={filters.radius} onChange={v => updateFilter('radius', v)} options={RADIUS_OPTIONS.map(String)} suffix="miles" />
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: '#64748B' }}>Max Cost</label>
                <input
                  type="number"
                  value={filters.maxCost}
                  onChange={e => updateFilter('maxCost', e.target.value)}
                  placeholder="No limit"
                  className="w-full rounded-xl px-3 py-2.5 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={clearFilters}
                className="py-3 rounded-xl text-sm font-bold border-2"
                style={{ color: '#64748B', borderColor: '#E2E8F0' }}
              >
                Clear Filters
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="py-3 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: '#2563EB' }}
              >
                Apply Filters · {filtered.length}
              </button>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
              Radius filtering is currently a state-level MVP proxy until latitude/longitude data is synced from approved tournament sources.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black" style={{ color: '#0B1528' }}>{filtered.length} tournaments</h2>
          <span className="text-xs font-semibold" style={{ color: '#94A3B8' }}>Imported / synced listings</span>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(t => (
              <TournamentCard key={t.id} tournament={t} onClick={() => navigate(`/tournament/${t.id}`)} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="text-5xl mb-3">🏆</div>
            <p className="font-bold" style={{ color: '#0B1528' }}>No tournaments found</p>
            <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Try clearing filters or expanding your search radius.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, suffix }) {
  return (
    <div>
      <label className="text-xs font-bold mb-1.5 block" style={{ color: '#64748B' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2.5 text-sm border border-gray-200 outline-none"
        style={{ color: '#0B1528' }}
      >
        <option value="">All</option>
        {options.map(o => <option key={o} value={o}>{o}{suffix ? ` ${suffix}` : ''}</option>)}
      </select>
    </div>
  );
}

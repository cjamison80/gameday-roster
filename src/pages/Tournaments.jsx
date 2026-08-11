import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import TournamentCard from '@/components/TournamentCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { haversineMiles } from '@/lib/utils';

const ASSOCIATIONS = ['Perfect Game', '2D Sports', 'USSSA', 'NSA', 'AAU', 'Ripken', 'Triple Crown', 'Other'];
const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY'
];
const AGE_DIVISIONS = ['8U','9U','10U','11U','12U','13U','14U','15U','16U','17U','18U'];
const CLASSIFICATIONS = ['Major','AAA','AA','A','Open'];
const RADIUS_OPTIONS = [25, 50, 100, 150, 250, 500];

async function geocodeZip(zip) {
  const res = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`);
  if (!res.ok) throw new Error('ZIP code not found');
  const data = await res.json();
  const place = data.places?.[0];
  if (!place) throw new Error('ZIP code not found');
  return { lat: Number(place.latitude), lon: Number(place.longitude) };
}

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
    zip: '',
    radius: '',
    maxCost: ''
  });
  const [zipCoords, setZipCoords] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [zipError, setZipError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  // Debounced zip geocoding — waits for the user to stop typing before calling out.
  useEffect(() => {
    const zip = filters.zip.trim();
    if (!/^\d{5}$/.test(zip)) {
      setZipCoords(null);
      setZipError('');
      return;
    }
    setGeocoding(true);
    setZipError('');
    const timeout = setTimeout(async () => {
      try {
        const coords = await geocodeZip(zip);
        setZipCoords(coords);
      } catch (e) {
        setZipCoords(null);
        setZipError('ZIP code not found');
      } finally {
        setGeocoding(false);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [filters.zip]);

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

  const radiusActive = Boolean(filters.radius && zipCoords);

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

      if (radiusActive) {
        if (t.latitude == null || t.longitude == null) return false; // no location data yet — can't confirm it's in range
        const distance = haversineMiles(zipCoords.lat, zipCoords.lon, t.latitude, t.longitude);
        if (distance == null || distance > Number(filters.radius)) return false;
      }
      return true;
    });
  }, [tournaments, query, filters, radiusActive, zipCoords]);

  const updateFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const clearFilters = () => {
    setFilters({ state: '', association: '', age: '', classification: '', zip: '', radius: '', maxCost: '' });
    setZipCoords(null);
    setZipError('');
  };
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => k !== 'radius' ? Boolean(v) : Boolean(v && filters.zip)).length;

  return (
    <div className="gdr-page" >
      <div className="gdr-hero px-5 pt-14 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <div>
            <h1 className="text-3xl text-white">Tournament Finder</h1>
            <p className="text-sm" style={{ color: '#8B95A7' }}>
              Find events by location, association, age, cost and entered teams.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2  px-4 py-3" style={{ backgroundColor: '#17233A' }}>
          <Search size={18} color="#5B6475" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tournaments, venues, cities..."
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-500"
            style={{ color: '#F5F7FB' }}
          />
          {query && <button onClick={() => setQuery('')}><X size={16} color="#5B6475" /></button>}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4 pb-24">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 font-black uppercase tracking-[0.16em] text-xs gdr-chip"
            style={{ backgroundColor: '#FFFFFF', color: '#0B1528', border: '1px solid #CBD5E1' }}
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-black text-white" style={{ backgroundColor: '#C1121F' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          {userLocation.state && (
            <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#5B6475' }}>
              <MapPin size={13} /> Based near {userLocation.city ? `${userLocation.city}, ` : ''}{userLocation.state}
            </div>
          )}
        </div>

        {showFilters && (
          <div className="gdr-card p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Select label="State" value={filters.state} onChange={v => updateFilter('state', v)} options={STATES} />
              <Select label="Association" value={filters.association} onChange={v => updateFilter('association', v)} options={ASSOCIATIONS} />
              <Select label="Age" value={filters.age} onChange={v => updateFilter('age', v)} options={AGE_DIVISIONS} />
              <Select label="Class" value={filters.classification} onChange={v => updateFilter('classification', v)} options={CLASSIFICATIONS} />
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: '#5B6475' }}>ZIP Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  value={filters.zip}
                  onChange={e => updateFilter('zip', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 72118"
                  className="gdr-select w-full px-3 py-2.5 text-sm outline-none"
                  style={{ color: '#0B1528' }}
                />
                {geocoding && <p className="text-xs mt-1" style={{ color: '#8B95A7' }}>Looking up ZIP...</p>}
                {zipError && <p className="text-xs mt-1" style={{ color: '#C1121F' }}>{zipError}</p>}
              </div>
              <Select label="Radius" value={filters.radius} onChange={v => updateFilter('radius', v)} options={RADIUS_OPTIONS.map(String)} suffix="miles" />
              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: '#5B6475' }}>Max Cost</label>
                <input
                  type="number"
                  value={filters.maxCost}
                  onChange={e => updateFilter('maxCost', e.target.value)}
                  placeholder="No limit"
                  className="gdr-select w-full px-3 py-2.5 text-sm outline-none"
                  style={{ color: '#0B1528' }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={clearFilters}
                className="py-3  text-sm font-bold border-2"
                style={{ color: '#5B6475', borderColor: '#CBD5E1' }}
              >
                Clear Filters
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="py-3  text-sm font-bold text-white"
                style={{ backgroundColor: '#C1121F' }}
              >
                Apply Filters · {filtered.length}
              </button>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#8B95A7' }}>
              {filters.radius && !filters.zip
                ? 'Enter a ZIP code above to search within that radius.'
                : 'Radius search uses real distance from your ZIP code. Tournaments whose location hasn\u2019t been geocoded yet won\u2019t appear in radius results \u2014 that fills in gradually as new sources sync.'}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-2xl" style={{ color: '#0B1528' }}>{filtered.length} tournaments</h2>
          <span className="text-xs font-semibold" style={{ color: '#8B95A7' }}>Imported / synced listings</span>
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
          <div className="gdr-card p-8 text-center">
            <div className="text-5xl mb-3">🏆</div>
            <p className="font-semibold" style={{ color: '#0B1528' }}>No tournaments found</p>
            <p className="text-sm mt-1" style={{ color: '#8B95A7' }}>Try clearing filters or expanding your search radius.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, suffix }) {
  return (
    <div>
      <label className="text-xs font-bold mb-1.5 block" style={{ color: '#5B6475' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="gdr-select w-full px-3 py-2.5 text-sm outline-none"
        style={{ color: '#0B1528' }}
      >
        <option value="">All</option>
        {options.map(o => <option key={o} value={o}>{o}{suffix ? ` ${suffix}` : ''}</option>)}
      </select>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Youtube, Instagram } from 'lucide-react';

function detectPlatform(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('instagram.com')) return 'instagram';
  return '';
}

function parseYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

function parseInstagramShortcode(url) {
  const m = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function embedUrl(url) {
  if (detectPlatform(url) === 'youtube') {
    const id = parseYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (detectPlatform(url) === 'instagram') {
    const sc = parseInstagramShortcode(url);
    return sc ? `https://www.instagram.com/p/${sc}/embed` : null;
  }
  return null;
}

export default function PlayerVideos({ playerId, isOwner }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const v = await base44.entities.PlayerVideo.filter({ player_id: playerId });
        if (!cancelled) setVideos(v);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [playerId]);

  const handleAdd = async () => {
    setError('');
    const platform = detectPlatform(url);
    if (!platform) {
      setError('Please paste a YouTube or Instagram video link.');
      return;
    }
    if (!embedUrl(url)) {
      setError('Could not read that link. Please check the URL.');
      return;
    }
    setSaving(true);
    try {
      const rec = await base44.entities.PlayerVideo.create({
        player_id: playerId,
        url: url.trim(),
        platform,
        title: title.trim()
      });
      setVideos(prev => [rec, ...prev]);
      setUrl('');
      setTitle('');
      setAdding(false);
    } catch (e) {
      setError(e?.message || 'Could not add video.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (vid) => {
    try {
      await base44.entities.PlayerVideo.delete(vid);
      setVideos(prev => prev.filter(v => v.id !== vid));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold" style={{ color: '#0B1528' }}>Highlight Videos</h3>
        {isOwner && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: '#2563EB' }}
          >
            <Plus size={14} />
            Add
          </button>
        )}
      </div>

      {adding && (
        <div className="rounded-2xl p-4 mb-3 space-y-3" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Paste YouTube or Instagram link"
            className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
            style={{ color: '#0B1528' }}
          />
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Caption (optional)"
            className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
            style={{ color: '#0B1528' }}
          />
          {error && (
            <p className="text-sm font-semibold" style={{ color: '#DC2626' }}>{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setAdding(false); setError(''); }}
              className="flex-1 py-3 rounded-xl font-bold border-2 border-gray-200"
              style={{ color: '#64748B' }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 py-3 rounded-xl font-bold text-white transition-opacity"
              style={{ backgroundColor: '#2563EB', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Adding...' : 'Add Video'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map(i => (
            <div key={i} className="aspect-video rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : videos.length === 0 && !adding ? (
        <p className="text-sm" style={{ color: '#94A3B8' }}>No highlight videos yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {videos.map(v => {
            const eUrl = embedUrl(v.url);
            const platform = detectPlatform(v.url);
            return (
              <div key={v.id} className="rounded-xl overflow-hidden border border-gray-100">
                {eUrl ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      src={eUrl}
                      title={v.title || 'Highlight'}
                      className="w-full h-full"
                      allow="accelerated-sensors; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      frameBorder="0"
                    />
                  </div>
                ) : (
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-video flex items-center justify-center"
                    style={{ backgroundColor: '#F1F5F9' }}
                  >
                    <span className="text-sm font-semibold" style={{ color: '#2563EB' }}>Open video</span>
                  </a>
                )}
                <div className="px-2 py-2 flex items-center gap-1.5">
                  {platform === 'youtube' ? <Youtube size={14} color="#DC2626" /> : <Instagram size={14} color="#C026D3" />}
                  <span className="text-xs font-semibold truncate flex-1" style={{ color: '#0B1528' }}>
                    {v.title || (platform === 'youtube' ? 'YouTube' : 'Instagram')}
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="p-1 rounded-lg hover:bg-red-50"
                      aria-label="Delete video"
                    >
                      <Trash2 size={14} color="#DC2626" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
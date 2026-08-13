import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, MapPin, MessageCircle, Trophy, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import VerifiedBadge from '@/components/VerifiedBadge';
import StarRating from '@/components/StarRating';
import { Image } from '@/components/ui/image';
import { SkeletonCard } from '@/components/SkeletonCard';

export default function CoachProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coach, setCoach] = useState(null);
  const [teams, setTeams] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const c = await base44.entities.CoachProfile.get(id);
      setCoach(c);
      const user = await base44.auth.me().catch(() => null);
      setCurrentUserId(user?.id || null);
      const [teamList, reviewList] = await Promise.all([
        base44.entities.Team.filter({ head_coach_id: c.user_id }, '-created_date', 30),
        base44.entities.CoachReview.filter({ coach_id: c.id }, '-created_date', 100)
      ]);
      setTeams(teamList);
      setReviews(reviewList);
      if (user) {
        const existing = reviewList.find(r => r.reviewer_user_id === user.id);
        if (existing) {
          setMyReview(existing);
          setDraftRating(existing.rating);
          setDraftComment(existing.comment || '');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!draftRating || submittingReview) return;
    setSubmittingReview(true);
    try {
      const user = await base44.auth.me();
      if (myReview) {
        const updated = await base44.entities.CoachReview.update(myReview.id, { rating: draftRating, comment: draftComment });
        setReviews(prev => prev.map(r => r.id === myReview.id ? updated : r));
        setMyReview(updated);
      } else {
        const created = await base44.entities.CoachReview.create({
          coach_id: coach.id,
          reviewer_user_id: user.id,
          reviewer_name: user.full_name || 'A parent',
          rating: draftRating,
          comment: draftComment
        });
        setReviews(prev => [created, ...prev]);
        setMyReview(created);
      }
      setShowReviewForm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingReview(false);
    }
  };

  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  const isOwnProfile = currentUserId && coach?.user_id === currentUserId;

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="px-5 py-5 space-y-3">{[1, 2].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <p className="font-bold" style={{ color: '#0B1528' }}>Coach not found</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm font-semibold" style={{ color: '#2563EB' }}>Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#1E293B' }}>
            {coach.photo_url ? (
              <Image src={coach.photo_url} alt={`${coach.first_name}`} className="w-24 h-24" fittingType="fill" />
            ) : (
              <span className="text-4xl font-black text-white">{coach.first_name?.[0]}{coach.last_name?.[0]}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white">{coach.first_name} {coach.last_name}</h1>
              {coach.is_verified && <VerifiedBadge type="coach" size={14} />}
            </div>
            <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Head Coach</p>
            {coach.city && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin size={12} color="#64748B" />
                <span className="text-sm" style={{ color: '#64748B' }}>{coach.city}, {coach.state}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: '#1E293B' }}>
            <Trophy size={16} color="#A4A017" className="mx-auto mb-1" />
            <p className="text-xl font-black text-white">{coach.years_coaching || '—'}</p>
            <p className="text-xs" style={{ color: '#94A3B8' }}>Years Coaching</p>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: '#1E293B' }}>
            <p className="text-xl font-black text-white">{teams.length}</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Teams</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Bio */}
        {coach.bio && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold mb-2" style={{ color: '#0B1528' }}>About {coach.first_name}</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{coach.bio}</p>
          </div>
        )}

        {/* Tournament Finder */}
        <button
          onClick={() => navigate(`/tournaments?state=${coach.state || ''}${teams[0]?.age_division ? `&age=${teams[0].age_division}` : ''}${teams[0]?.classification ? `&classification=${teams[0].classification}` : ''}`)}
          className="w-full flex items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FEFCE8' }}>
              <Trophy size={22} color="#D4A017" />
            </div>
            <div>
              <h3 className="font-black" style={{ color: '#0B1528' }}>Find Tournaments</h3>
              <p className="text-sm" style={{ color: '#64748B' }}>Browse events by association, state, mileage, age and cost.</p>
            </div>
          </div>
          <ExternalLink size={18} color="#94A3B8" />
        </button>

        {/* Sports */}
        {coach.sports?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {coach.sports.map(s => (
              <span key={s} className="px-3 py-1.5 rounded-xl text-sm font-bold capitalize" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>{s}</span>
            ))}
          </div>
        )}

        {/* Message */}
        <button
          onClick={() => navigate('/messages')}
          className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-white"
          style={{ backgroundColor: '#0B1528' }}
        >
          <MessageCircle size={18} />
          Message Coach
        </button>

        {/* Teams */}
        <div>
          <h2 className="text-lg font-black mb-3" style={{ color: '#0B1528' }}>Teams</h2>
          {teams.length > 0 ? (
            <div className="space-y-3">
              {teams.map(team => (
                <div key={team.id}
                  onClick={() => navigate(`/team/${team.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                    <span className="font-black" style={{ color: '#2563EB' }}>
                      {team.name?.split(' ').map(w => w[0]).join('').slice(0, 3)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate" style={{ color: '#0B1528' }}>{team.name}</h3>
                    <p className="text-sm" style={{ color: '#64748B' }}>
                      {team.age_division || '—'}{team.classification ? ` · ${team.classification}` : ''}
                    </p>
                  </div>
                  {team.is_recruiting && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>Recruiting</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="font-bold" style={{ color: '#0B1528' }}>No teams yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
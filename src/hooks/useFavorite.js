import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useFavorite — favorites a team or player for the current user.
 * @param {string} targetId - The entity record id being favorited.
 * @param {'team'|'player'} targetType
 */
export function useFavorite(targetId, targetType) {
  const [isFav, setIsFav] = useState(false);
  const [favId, setFavId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!targetId) return;
      try {
        const u = await base44.auth.me();
        const existing = await base44.entities.Favorite.filter({
          user_id: u.id,
          target_id: targetId,
          target_type: targetType
        });
        if (!cancelled && existing.length > 0) {
          setIsFav(true);
          setFavId(existing[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [targetId, targetType]);

  const toggle = useCallback(async () => {
    try {
      if (isFav && favId) {
        await base44.entities.Favorite.delete(favId);
        setIsFav(false);
        setFavId(null);
        return false;
      }
      const u = await base44.auth.me();
      const rec = await base44.entities.Favorite.create({
        user_id: u.id,
        target_id: targetId,
        target_type: targetType
      });
      setIsFav(true);
      setFavId(rec.id);
      return true;
    } catch (e) {
      console.error(e);
      return isFav;
    }
  }, [isFav, favId, targetId, targetType]);

  return { isFav, toggle, loading };
}
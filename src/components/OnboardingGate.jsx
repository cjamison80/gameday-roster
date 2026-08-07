import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

// Any authenticated user who has no UserProfile yet is a brand-new signup:
// send them to onboarding (role selection) once, regardless of entry route.
export default function OnboardingGate() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const u = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: u.id });
        if (active && (!profiles || profiles.length === 0)) {
          navigate('/welcome', { replace: true });
        }
      } catch (e) {
        // If we can't determine profile status, allow through to avoid a lockout.
      }
    })();
    return () => { active = false; };
  }, [navigate]);

  return <Outlet />;
}
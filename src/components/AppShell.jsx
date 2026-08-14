import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import { base44 } from '@/api/base44Client';

export default function AppShell() {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let mounted = true;
    let currentUserId = '';

    const bootstrap = async () => {
      try {
        const user = await base44.auth.me();
        currentUserId = user.id;
        if (mounted) await loadUnreadCounts(user);
      } catch {
        // not critical
      }
    };

    bootstrap();
    const interval = setInterval(() => loadUnreadCounts(), 60000);
    const onFocus = () => loadUnreadCounts();
    window.addEventListener('focus', onFocus);

    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && !event.data.is_read && event.data.user_id === currentUserId) {
        setUnreadNotifications(prev => prev + 1);
      }
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const loadUnreadCounts = async (knownUser = null) => {
    try {
      const user = knownUser || await base44.auth.me();
      const [notifs, convsA, convsB] = await Promise.all([
        base44.entities.Notification.filter({ user_id: user.id, is_read: false }),
        base44.entities.Conversation.filter({ participant_a_id: user.id }),
        base44.entities.Conversation.filter({ participant_b_id: user.id })
      ]);
      setUnreadNotifications(notifs.length);
      const unread = [
        ...convsA.map(c => c.unread_count_a || 0),
        ...convsB.map(c => c.unread_count_b || 0)
      ].reduce((sum, n) => sum + n, 0);
      setUnreadMessages(unread);
    } catch (e) {
      // not critical
    }
  };

  return (
    <div className="gdr-app-background min-h-screen">
      <div className="content-with-nav max-w-xl mx-auto w-full">
        <Outlet />
      </div>
      <BottomNav unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />
    </div>
  );
}
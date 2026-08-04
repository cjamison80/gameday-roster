import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import { base44 } from '@/api/base44Client';

export default function AppShell() {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadUnreadCounts();
    // Subscribe to notifications
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && !event.data.is_read) {
        setUnreadNotifications(prev => prev + 1);
      }
    });
    return unsub;
  }, []);

  const loadUnreadCounts = async () => {
    try {
      const user = await base44.auth.me();
      const [notifs] = await Promise.all([
        base44.entities.Notification.filter({ user_id: user.id, is_read: false })
      ]);
      setUnreadNotifications(notifs.length);
    } catch (e) {
      // not critical
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="content-with-nav">
        <Outlet />
      </div>
      <BottomNav unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />
    </div>
  );
}
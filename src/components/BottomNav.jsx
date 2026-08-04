import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Globe, MessageCircle, Bell, User } from 'lucide-react';

const navItems = [
  { path: '/discover', icon: Home, label: 'Discover' },
  { path: '/network', icon: Globe, label: 'Network' },
  { path: '/messages', icon: MessageCircle, label: 'Messages' },
  { path: '/activity', icon: Bell, label: 'Activity' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav({ unreadMessages = 0, unreadNotifications = 0 }) {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        height: 68,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || (path === '/discover' && location.pathname === '/');
          const badge = label === 'Messages' ? unreadMessages : label === 'Activity' ? unreadNotifications : 0;

          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-xl transition-all relative"
              style={{ minHeight: 48 }}
            >
              <div className="relative">
                <Icon
                  size={22}
                  color={isActive ? '#2563EB' : '#94A3B8'}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white font-bold"
                    style={{ backgroundColor: '#DC2626', fontSize: 9, minWidth: 16, height: 16, padding: '0 3px' }}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span
                className="text-center font-semibold"
                style={{ fontSize: 10, color: isActive ? '#2563EB' : '#94A3B8', letterSpacing: '-0.01em' }}
              >
                {label}
              </span>
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                  style={{ width: 24, height: 3, backgroundColor: '#2563EB' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
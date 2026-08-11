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
      className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pointer-events-none"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div className="gdr-bottom-nav pointer-events-auto mx-auto max-w-md rounded-[28px] px-2 py-2">
        <div className="flex items-center justify-around gap-1 h-full">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path || (path === '/discover' && location.pathname === '/');
            const badge = label === 'Messages' ? unreadMessages : label === 'Activity' ? unreadNotifications : 0;

            return (
              <Link
                key={path}
                to={path}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition-all duration-200"
                style={{
                  minHeight: 54,
                  background: isActive ? 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(212,160,23,0.10))' : 'transparent'
                }}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-2xl transition-all duration-200"
                    style={{
                      backgroundColor: isActive ? '#0B1528' : 'transparent',
                      boxShadow: isActive ? '0 10px 22px rgba(11,21,40,0.22)' : 'none'
                    }}
                  >
                    <Icon
                      size={19}
                      color={isActive ? '#FFFFFF' : '#94A3B8'}
                      strokeWidth={isActive ? 2.6 : 1.9}
                    />
                  </div>
                  {badge > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white font-black ring-2 ring-white"
                      style={{ backgroundColor: '#DC2626', fontSize: 9, minWidth: 17, height: 17, padding: '0 4px' }}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span
                  className="text-center font-bold leading-none"
                  style={{ fontSize: 10, color: isActive ? '#0B1528' : '#94A3B8', letterSpacing: '-0.015em' }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
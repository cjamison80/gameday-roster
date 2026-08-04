import React, { useState, useEffect } from 'react';
import { CheckCircle, Mail, Bell, Clock, Shield, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { timeAgo } from '@/lib/utils';

const tabs = ['All', 'Applications', 'Invitations', 'Availability'];

const notificationIcons = {
  application_received: { icon: CheckCircle, color: '#16A34A', bg: '#DCFCE7' },
  application_accepted: { icon: CheckCircle, color: '#2563EB', bg: '#EFF6FF' },
  application_declined: { icon: CheckCircle, color: '#DC2626', bg: '#FEE2E2' },
  invitation_received: { icon: Mail, color: '#8B5CF6', bg: '#F5F3FF' },
  message_received: { icon: Mail, color: '#2563EB', bg: '#EFF6FF' },
  availability_reminder: { icon: Clock, color: '#F59E0B', bg: '#FEF9C3' },
  opportunity_match: { icon: Bell, color: '#A4A017', bg: '#FEFCE8' },
  verification_update: { icon: Shield, color: '#2563EB', bg: '#EFF6FF' },
  system: { icon: Bell, color: '#64748B', bg: '#F1F5F9' }
};

export default function Activity() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const [notifs, apps] = await Promise.all([
        base44.entities.Notification.filter({ user_id: u.id }, '-created_date', 50),
        base44.entities.Application.filter({ parent_id: u.id }, '-created_date', 20)
      ]);
      setNotifications(notifs);
      setApplications(apps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-white">Activity</h1>
            {unreadCount > 0 && (
              <p className="text-sm mt-0.5" style={{ color: '#2563EB' }}>{unreadCount} new notifications</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-sm font-semibold" style={{ color: '#2563EB' }}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex overflow-x-auto no-scrollbar px-5">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="py-4 mr-6 text-sm font-semibold flex-shrink-0 border-b-2 transition-colors"
              style={{
                color: activeTab === tab ? '#2563EB' : '#94A3B8',
                borderColor: activeTab === tab ? '#2563EB' : 'transparent'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-200 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 animate-pulse rounded-lg w-3/4" />
                  <div className="h-3 bg-gray-200 animate-pulse rounded-lg w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'Applications' ? (
          <ApplicationsList applications={applications} navigate={navigate} />
        ) : activeTab === 'Availability' ? (
          <AvailabilityCheckin user={user} />
        ) : (
          notifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔔</div>
              <h3 className="text-lg font-bold" style={{ color: '#0B1528' }}>No activity yet</h3>
              <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
                Apply to opportunities to start seeing activity here.
              </p>
            </div>
          ) : (
            notifications
              .filter(n => activeTab === 'All' || (activeTab === 'Invitations' && n.type === 'invitation_received'))
              .map(notif => <NotificationItem key={notif.id} notif={notif} navigate={navigate} />)
          )
        )}
      </div>
    </div>
  );
}

function NotificationItem({ notif, navigate }) {
  const cfg = notificationIcons[notif.type] || notificationIcons.system;
  const Icon = cfg.icon;

  return (
    <div
      className="bg-white rounded-2xl p-4 flex items-start gap-3 border border-gray-100"
      style={{ borderLeftWidth: notif.is_read ? 1 : 3, borderLeftColor: notif.is_read ? '#E2E8F0' : '#2563EB' }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: cfg.bg }}>
        <Icon size={20} color={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: '#0B1528' }}>{notif.title}</p>
        {notif.body && <p className="text-sm mt-0.5 leading-relaxed" style={{ color: '#64748B' }}>{notif.body}</p>}
        <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{timeAgo(notif.created_date)}</p>
      </div>
    </div>
  );
}

function ApplicationsList({ applications, navigate }) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📋</div>
        <h3 className="text-lg font-bold" style={{ color: '#0B1528' }}>No applications yet</h3>
        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Apply to opportunities to see them here.</p>
        <button
          onClick={() => navigate('/discover')}
          className="mt-4 px-6 py-3 rounded-full font-bold text-white text-sm"
          style={{ backgroundColor: '#2563EB' }}
        >
          Browse Opportunities
        </button>
      </div>
    );
  }

  const statusConfig = {
    pending: { label: 'Pending', color: '#F59E0B', bg: '#FEF9C3' },
    accepted: { label: 'Accepted', color: '#16A34A', bg: '#DCFCE7' },
    declined: { label: 'Declined', color: '#DC2626', bg: '#FEE2E2' },
    withdrawn: { label: 'Withdrawn', color: '#94A3B8', bg: '#F1F5F9' }
  };

  return (
    <div className="space-y-3">
      {applications.map(app => {
        const sc = statusConfig[app.status] || statusConfig.pending;
        return (
          <div
            key={app.id}
            className="bg-white rounded-2xl p-4 border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/opportunity/${app.opportunity_id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm" style={{ color: '#0B1528' }}>
                    Application #{app.id?.slice(-6)}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: sc.bg, color: sc.color }}>
                    {sc.label}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                  Applied {timeAgo(app.created_date)}
                </p>
              </div>
              <ChevronRight size={16} color="#94A3B8" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AvailabilityCheckin({ user }) {
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSelect = async (s) => {
    if (!user) return;
    setStatus(s);
    setSaving(true);
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const existing = await base44.entities.Availability.filter({ parent_id: user.id });
      if (existing.length > 0) {
        await base44.entities.Availability.update(existing[0].id, { status: s, week_start: weekStartStr });
      } else {
        await base44.entities.Availability.create({
          parent_id: user.id,
          player_id: '',
          week_start: weekStartStr,
          status: s
        });
      }
      setSaved(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const options = [
    { value: 'available', label: 'Available', emoji: '✅', description: 'Ready for this weekend', color: '#16A34A', bg: '#DCFCE7' },
    { value: 'maybe', label: 'Maybe', emoji: '🤔', description: 'Possibly available', color: '#F59E0B', bg: '#FEF9C3' },
    { value: 'unavailable', label: 'Not Available', emoji: '❌', description: "Can't make it this weekend", color: '#DC2626', bg: '#FEE2E2' }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h2 className="text-lg font-black mb-1" style={{ color: '#0B1528' }}>Weekly Check-In</h2>
        <p className="text-sm mb-5" style={{ color: '#64748B' }}>
          Are you available for pickup opportunities this weekend?
        </p>
        <div className="space-y-3">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              disabled={saving}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98]"
              style={{
                borderColor: status === opt.value ? opt.color : '#E2E8F0',
                backgroundColor: status === opt.value ? opt.bg : '#FFFFFF'
              }}
            >
              <span className="text-3xl">{opt.emoji}</span>
              <div>
                <div className="font-bold" style={{ color: opt.color }}>{opt.label}</div>
                <div className="text-sm" style={{ color: '#64748B' }}>{opt.description}</div>
              </div>
            </button>
          ))}
        </div>
        {saved && (
          <div className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl" style={{ backgroundColor: '#DCFCE7' }}>
            <CheckCircle size={18} color="#16A34A" />
            <span className="font-semibold text-sm" style={{ color: '#16A34A' }}>Availability updated!</span>
          </div>
        )}
      </div>
    </div>
  );
}
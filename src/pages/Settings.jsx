import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Shield, LogOut, RefreshCw, Settings as SettingsIcon, CreditCard, FileText, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getInitials } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const profiles = await base44.entities.UserProfile.filter({ user_id: u.id });
      setProfile(profiles[0] || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const togglePref = async (key, val) => {
    if (!profile) return;
    try {
      const updated = await base44.entities.UserProfile.update(profile.id, { [key]: val });
      setProfile(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout('/login');
  };

  const roleLabel = {
    parent: 'Parent Account',
    coach: 'Coach Account',
    player: 'Player Account',
    organization: 'Organization Account',
    admin: 'Administrator'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#E2E8F0', borderTopColor: '#2563EB' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <h1 className="text-2xl font-black text-white">Settings</h1>
        </div>

        {/* Account info */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1E293B' }}>
            <span className="text-2xl font-black text-white">{getInitials(user?.full_name || '?')}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-white truncate">{user?.full_name}</h2>
            <p className="text-sm truncate" style={{ color: '#94A3B8' }}>{user?.email}</p>
            <span className="inline-block mt-1.5 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1E293B', color: '#94A3B8' }}>
              {roleLabel[profile?.role] || 'Parent Account'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Subscription & Billing */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={18} color="#C1121F" />
            <h3 className="font-bold" style={{ color: '#0B1528' }}>Subscription & Billing</h3>
          </div>
          <p className="text-sm mb-3" style={{ color: '#64748B' }}>
            View plan options, upgrade limits, and future payment settings for your account.
          </p>
          <button
            onClick={() => navigate('/billing')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
            style={{ backgroundColor: '#FEE2E2' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#C1121F' }}>
              <CreditCard size={18} color="white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm" style={{ color: '#0B1528' }}>Manage Subscription</h4>
              <p className="text-xs mt-0.5" style={{ color: '#C1121F' }}>Plans, billing and limits</p>
            </div>
          </button>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} color="#2563EB" />
            <h3 className="font-bold" style={{ color: '#0B1528' }}>Notifications</h3>
          </div>
          <div className="space-y-4">
            <ToggleRow
              label="Push Notifications"
              desc="Allow mobile/web push delivery when native push is connected"
              checked={profile?.push_notifications !== false}
              onChange={v => togglePref('push_notifications', v)}
            />
            <ToggleRow
              label="Email Notifications"
              desc="Allow email delivery for important updates when email service is connected"
              checked={profile?.email_notifications !== false}
              onChange={v => togglePref('email_notifications', v)}
            />
            <ToggleRow
              label="Messages"
              desc="Notify me when a coach or parent sends a message"
              checked={profile?.message_notifications !== false}
              onChange={v => togglePref('message_notifications', v)}
            />
            <ToggleRow
              label="Applications"
              desc="Application received, accepted, declined, and invitations"
              checked={profile?.application_notifications !== false}
              onChange={v => togglePref('application_notifications', v)}
            />
            <ToggleRow
              label="Opportunity Matches"
              desc="New roster opportunities that match a player profile"
              checked={profile?.opportunity_notifications !== false}
              onChange={v => togglePref('opportunity_notifications', v)}
            />
            <ToggleRow
              label="Availability Reminders"
              desc="Remind me to set weekly availability"
              checked={profile?.availability_reminders !== false}
              onChange={v => togglePref('availability_reminders', v)}
            />
            <ToggleRow
              label="Billing Updates"
              desc="Plan, subscription, and payment status alerts"
              checked={profile?.billing_notifications !== false}
              onChange={v => togglePref('billing_notifications', v)}
            />
          </div>
        </div>

        {/* Role & Account */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <SettingsIcon size={18} color="#2563EB" />
            <h3 className="font-bold" style={{ color: '#0B1528' }}>Role & Account</h3>
          </div>
          <p className="text-sm mb-3" style={{ color: '#64748B' }}>
            Your account is set up as a <span className="font-bold" style={{ color: '#0B1528' }}>{roleLabel[profile?.role] || 'Parent'}</span>.
            Switch your role to access coach tools and publish opportunities.
          </p>
          <button
            onClick={() => navigate('/welcome')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
            style={{ backgroundColor: '#EFF6FF' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#2563EB' }}>
              <RefreshCw size={18} color="white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm" style={{ color: '#0B1528' }}>Switch Role / Re-run Onboarding</h4>
              <p className="text-xs mt-0.5" style={{ color: '#2563EB' }}>Choose Parent, Coach, or Player</p>
            </div>
          </button>
        </div>

        {/* Privacy & Safety */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} color="#2563EB" />
            <h3 className="font-bold" style={{ color: '#0B1528' }}>Privacy & Safety</h3>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
            Player profiles are parent/guardian-run. Verified identities help keep the community trusted.
            Use the legal center for safety, privacy, media, subscription, and community rules.
          </p>
        </div>

        {/* Legal */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} color="#C1121F" />
            <h3 className="font-bold" style={{ color: '#0B1528' }}>Legal Center</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Terms of Service', path: '/legal/terms' },
              { label: 'Privacy Policy', path: '/legal/privacy' },
              { label: 'Minor Safety & Guardian Consent', path: '/legal/minor-safety' },
              { label: 'Photo & Video Policy', path: '/legal/photo-video' },
              { label: 'Refund & Cancellation Policy', path: '/legal/refunds' },
              { label: 'Community Guidelines', path: '/legal/community-guidelines' }
            ].map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left"
                style={{ backgroundColor: '#F8FAFC' }}
              >
                <span className="flex-1 text-sm font-bold" style={{ color: '#0B1528' }}>{item.label}</span>
                <ChevronRight size={16} color="#94A3B8" />
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-left"
          style={{ backgroundColor: '#FEE2E2' }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFFFFF' }}>
            <LogOut size={18} color="#DC2626" />
          </div>
          <span className="flex-1 font-bold" style={{ color: '#DC2626' }}>Log Out</span>
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: '#0B1528' }}>{label}</p>
        <p className="text-xs" style={{ color: '#64748B' }}>{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
import { base44 } from '@/api/base44Client';

export const NOTIFICATION_TYPES = {
  APPLICATION_RECEIVED: 'application_received',
  APPLICATION_ACCEPTED: 'application_accepted',
  APPLICATION_DECLINED: 'application_declined',
  INVITATION_RECEIVED: 'invitation_received',
  MESSAGE_RECEIVED: 'message_received',
  AVAILABILITY_REMINDER: 'availability_reminder',
  OPPORTUNITY_MATCH: 'opportunity_match',
  VERIFICATION_UPDATE: 'verification_update',
  BILLING: 'billing',
  SYSTEM: 'system'
};

export const NOTIFICATION_PREF_BY_TYPE = {
  application_received: 'application_notifications',
  application_accepted: 'application_notifications',
  application_declined: 'application_notifications',
  invitation_received: 'application_notifications',
  message_received: 'message_notifications',
  availability_reminder: 'availability_reminders',
  opportunity_match: 'opportunity_notifications',
  verification_update: 'system_notifications',
  billing: 'billing_notifications',
  system: 'system_notifications'
};

export function notificationActionUrl(type, relatedId, fallback = '') {
  if (fallback) return fallback;
  if (type === NOTIFICATION_TYPES.APPLICATION_RECEIVED) return '/coach-dashboard';
  if (type === NOTIFICATION_TYPES.AVAILABILITY_REMINDER) return '/activity';
  if (type === NOTIFICATION_TYPES.BILLING) return '/billing';
  if (relatedId && ['application_accepted', 'application_declined', 'opportunity_match'].includes(type)) return `/opportunity/${relatedId}`;
  return '/activity';
}

async function loadRecipientProfile(userId) {
  if (!userId) return null;
  try {
    const rows = await base44.entities.UserProfile.filter({ user_id: userId }, '-created_date', 1);
    return rows?.[0] || null;
  } catch {
    return null;
  }
}

export function isNotificationEnabled(profile, type) {
  if (!profile) return true;
  const prefKey = NOTIFICATION_PREF_BY_TYPE[type] || 'system_notifications';
  if (profile[prefKey] === false) return false;
  return true;
}

export async function createNotification({
  user_id,
  type = NOTIFICATION_TYPES.SYSTEM,
  title,
  body = '',
  related_id = '',
  related_type = '',
  action_url = '',
  priority = 'normal',
  source_user_id = '',
  metadata = {}
}) {
  if (!user_id || !title) return null;

  const profile = await loadRecipientProfile(user_id);
  if (!isNotificationEnabled(profile, type)) return null;

  const channelSnapshot = {
    in_app: true,
    push_enabled: profile?.push_notifications !== false,
    email_enabled: profile?.email_notifications === true,
    pref_key: NOTIFICATION_PREF_BY_TYPE[type] || 'system_notifications'
  };

  try {
    return await base44.entities.Notification.create({
      user_id,
      type,
      title,
      body,
      related_id,
      related_type,
      action_url: notificationActionUrl(type, related_id, action_url),
      is_read: false,
      read_at: '',
      priority,
      source_user_id,
      channel: 'in_app',
      delivery_status: 'delivered',
      delivered_at: new Date().toISOString(),
      channel_snapshot: channelSnapshot,
      metadata
    });
  } catch (e) {
    console.error('createNotification failed', e);
    return null;
  }
}

export async function markNotificationRead(notification) {
  if (!notification?.id || notification.is_read) return notification;
  try {
    return await base44.entities.Notification.update(notification.id, {
      is_read: true,
      read_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('markNotificationRead failed', e);
    return notification;
  }
}

export async function markAllNotificationsRead(notifications = []) {
  const unread = notifications.filter(n => n && !n.is_read);
  await Promise.all(unread.map(markNotificationRead));
}

export async function notifyApplicationReceived({ coachId, parentId, player, opportunity, application }) {
  if (!coachId || !opportunity) return null;
  const playerName = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : 'A player';
  return createNotification({
    user_id: coachId,
    source_user_id: parentId,
    type: NOTIFICATION_TYPES.APPLICATION_RECEIVED,
    title: 'New application received',
    body: `${playerName} applied for ${opportunity.title || 'your roster need'}.`,
    related_id: opportunity.id || application?.opportunity_id || '',
    related_type: 'opportunity',
    action_url: '/coach-dashboard',
    priority: 'high',
    metadata: { application_id: application?.id || '', player_id: player?.id || '' }
  });
}

export async function notifyApplicationDecision({ parentId, coachId, coachName = 'the coach', opportunity, application, decision, conversationId = '' }) {
  if (!parentId || !opportunity) return null;
  const accepted = decision === 'accepted';
  return createNotification({
    user_id: parentId,
    source_user_id: coachId,
    type: accepted ? NOTIFICATION_TYPES.APPLICATION_ACCEPTED : NOTIFICATION_TYPES.APPLICATION_DECLINED,
    title: accepted ? 'Application accepted' : 'Application declined',
    body: accepted
      ? `Your application for ${opportunity.title || 'this roster need'} was accepted by ${coachName}. You can now message the coach.`
      : `Your application for ${opportunity.title || 'this roster need'} was declined.`,
    related_id: opportunity.id || application?.opportunity_id || '',
    related_type: 'opportunity',
    action_url: accepted && conversationId ? `/messages?conversation=${conversationId}` : `/opportunity/${opportunity.id || application?.opportunity_id || ''}`,
    priority: accepted ? 'high' : 'normal',
    metadata: { application_id: application?.id || '', conversation_id: conversationId }
  });
}

export async function notifyMessageReceived({ recipientId, senderId, senderName = 'Someone', conversationId, opportunityId = '', preview = '' }) {
  if (!recipientId || !senderId || !conversationId) return null;
  return createNotification({
    user_id: recipientId,
    source_user_id: senderId,
    type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
    title: `New message from ${senderName}`,
    body: preview ? preview.slice(0, 120) : 'You have a new message.',
    related_id: conversationId,
    related_type: 'conversation',
    action_url: `/messages?conversation=${conversationId}`,
    priority: 'normal',
    metadata: { opportunity_id: opportunityId }
  });
}

export async function notifyAvailabilitySaved({ parentId, player, weekStart }) {
  if (!parentId) return null;
  const playerName = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : 'Player';
  return createNotification({
    user_id: parentId,
    type: NOTIFICATION_TYPES.SYSTEM,
    title: 'Availability saved',
    body: `${playerName}'s weekend availability is updated.`,
    related_id: player?.id || '',
    related_type: 'player',
    action_url: '/activity',
    priority: 'low',
    metadata: { week_start: weekStart }
  });
}

export async function notifyBillingEvent({ userId, planName, status, actionUrl = '/billing' }) {
  if (!userId) return null;
  return createNotification({
    user_id: userId,
    type: NOTIFICATION_TYPES.BILLING,
    title: 'Subscription update',
    body: `${planName || 'Your plan'} is now ${status || 'updated'}.`,
    related_type: 'billing',
    action_url: actionUrl,
    priority: 'normal'
  });
}

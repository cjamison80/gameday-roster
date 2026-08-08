import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Search, Plus, Image, Paperclip } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { timeAgo, getInitials } from '@/lib/utils';
import { Image as AppImage } from '@/components/ui/image';

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    loadMessages(activeConv.id);
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data.conversation_id === activeConv.id) {
        setMessages(prev => {
          if (event.type === 'create') return [...prev, event.data];
          return prev;
        });
      }
    });
    return unsub;
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const init = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const [asA, asB] = await Promise.all([
        base44.entities.Conversation.filter({ participant_a_id: u.id }, '-last_message_at', 100),
        base44.entities.Conversation.filter({ participant_b_id: u.id }, '-last_message_at', 100)
      ]);
      const convs = [...asA, ...asB]
        .filter((conv, index, arr) => arr.findIndex(c => c.id === conv.id) === index)
        .sort((a, b) => new Date(b.last_message_at || b.created_date || 0) - new Date(a.last_message_at || a.created_date || 0));

      // Load user info for participants
      const userIds = new Set();
      convs.forEach(c => { userIds.add(c.participant_a_id); userIds.add(c.participant_b_id); });
      const map = {};
      try {
        const users = await base44.entities.User.list();
        users.forEach(usr => { map[usr.id] = usr; });
      } catch { /* non-admin users can't list users — resolve names per-conversation instead */ }
      setUserMap(map);
      setConversations(convs);
      // Auto-open a conversation referenced by ?conversation=<id> (e.g. from an opportunity)
      const targetId = searchParams.get('conversation');
      if (targetId) {
        let target = convs.find(c => c.id === targetId);
        if (!target) {
          try {
            target = await base44.entities.Conversation.get(targetId);
            if (target && (target.participant_a_id === u.id || target.participant_b_id === u.id)) {
              setConversations(prev => prev.find(c => c.id === target.id) ? prev : [target, ...prev]);
              const otherId = target.participant_a_id === u.id ? target.participant_b_id : target.participant_a_id;
              if (!map[otherId]) {
                try {
                  map[otherId] = await base44.entities.User.get(otherId);
                  setUserMap({ ...map });
                } catch { /* ignore */ }
              }
            } else {
              target = null;
            }
          } catch (e) {
            console.error(e);
          }
        }
        if (target) setActiveConv(target);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId) => {
    if (!activeConv || !user || (activeConv.participant_a_id !== user.id && activeConv.participant_b_id !== user.id)) return;
    const msgs = await base44.entities.Message.filter({ conversation_id: convId }, 'created_date', 100);
    setMessages(msgs);
    // Mark as read
    if (user) {
      msgs.filter(m => m.recipient_id === user.id && !m.is_read).forEach(m => {
        base44.entities.Message.update(m.id, { is_read: true, read_at: new Date().toISOString() });
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConv || !user || sending) return;
    setSending(true);
    const otherId = activeConv.participant_a_id === user.id
      ? activeConv.participant_b_id : activeConv.participant_a_id;
    try {
      const msg = await base44.entities.Message.create({
        conversation_id: activeConv.id,
        sender_id: user.id,
        recipient_id: otherId,
        content: newMessage.trim()
      });
      await base44.entities.Conversation.update(activeConv.id, {
        last_message: newMessage.trim(),
        last_message_at: new Date().toISOString()
      });
      setNewMessage('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = (conv) => {
    if (!user) return null;
    const otherId = conv.participant_a_id === user.id ? conv.participant_b_id : conv.participant_a_id;
    return userMap[otherId];
  };

  // Conversation list view
  if (!activeConv) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
        <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black text-white">Messages</h1>
            <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1E293B' }}>
              <Plus size={20} color="#94A3B8" />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ backgroundColor: '#1E293B' }}>
            <Search size={18} color="#64748B" />
            <input placeholder="Search messages..." className="flex-1 bg-transparent text-sm outline-none placeholder-gray-500" style={{ color: '#F8FAFC' }} />
          </div>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gray-200 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 animate-pulse rounded-lg w-2/3" />
                    <div className="h-3 bg-gray-200 animate-pulse rounded-lg w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-lg font-bold" style={{ color: '#0B1528' }}>No messages yet</h3>
              <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Apply to an opportunity to start connecting with coaches.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map(conv => {
                const other = getOtherUser(conv);
                const isUnread = conv.unread_count_a > 0 || conv.unread_count_b > 0;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 text-left border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
                      style={{ backgroundColor: '#EFF6FF' }}>
                      {other?.full_name ? (
                        <span className="text-xl font-black" style={{ color: '#2563EB' }}>
                          {getInitials(other.full_name)}
                        </span>
                      ) : <span className="text-xl">👤</span>}
                      {isUnread && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full" style={{ backgroundColor: '#2563EB' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold" style={{ color: '#0B1528' }}>
                          {other?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-xs" style={{ color: '#94A3B8' }}>
                          {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
                        </span>
                      </div>
                      <p className="text-sm truncate mt-0.5" style={{ color: isUnread ? '#0B1528' : '#94A3B8', fontWeight: isUnread ? 600 : 400 }}>
                        {conv.last_message || 'Start a conversation'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat view
  const other = getOtherUser(activeConv);
  return (
    <div className="flex flex-col" style={{ height: '100vh', backgroundColor: '#F8FAFC' }}>
      {/* Chat header */}
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-4 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => setActiveConv(null)} className="p-2 -ml-2">
          <ArrowLeft size={24} color="white" />
        </button>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#1E293B' }}>
          <span className="font-bold text-white">{getInitials(other?.full_name || '?')}</span>
        </div>
        <div>
          <p className="font-bold text-white">{other?.full_name || 'Unknown'}</p>
          <p className="text-xs" style={{ color: '#64748B' }}>Coach</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map(msg => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-xs px-4 py-3 rounded-2xl"
                style={{
                  backgroundColor: isMe ? '#2563EB' : '#FFFFFF',
                  color: isMe ? '#FFFFFF' : '#0B1528',
                  borderBottomRightRadius: isMe ? 4 : 16,
                  borderBottomLeftRadius: isMe ? 16 : 4,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                }}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className="text-xs mt-1 opacity-60 text-right">{timeAgo(msg.created_date)}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-2"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
        <button className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-full" style={{ backgroundColor: '#F1F5F9' }}>
          <Paperclip size={18} color="#94A3B8" />
        </button>
        <div className="flex-1 flex items-end rounded-2xl px-4 py-2 min-h-[44px]" style={{ backgroundColor: '#F1F5F9' }}>
          <textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-transparent text-sm outline-none resize-none"
            style={{ color: '#0B1528', maxHeight: 100 }}
          />
        </div>
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity"
          style={{ backgroundColor: '#2563EB', opacity: !newMessage.trim() ? 0.5 : 1 }}
        >
          <Send size={18} color="white" />
        </button>
      </div>
    </div>
  );
}
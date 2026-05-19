'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Check,
  CheckCheck,
  Paperclip,
  Mic,
  Phone,
  Video,
  MoreVertical,
  Users,
  Tag,
  Bell,
  Filter,
  RefreshCw,
  Info,
  Smile,
  Image as ImageIcon,
  X,
  ChevronDown,
} from 'lucide-react';
import { inboxAxiosInstance } from '@/lib/inboxAxiosInstance';
import api from '@/lib/api';
import "./inbox.css"

// ─── API Types ────────────────────────────────────────────────────────────────

interface PhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
}

interface ApiContact {
  id: string | number;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  leadNumber?: string;
  last_message?: string;
  lastMessage?: string;
  last_time?: string;
  lastTime?: string;
  unread_count?: number;
  unreadCount?: number;
  tags?: string[];
  tag?: string;
  status?: 'online' | 'offline';
}

interface ApiMessage {
  id: string | number;
  message?: string;
  text?: string;
  body?: string;
  direction?: 'incoming' | 'outgoing';
  type?: 'inbound' | 'outbound';
  timestamp?: string;
  time?: string;
  created_at?: string;
  status?: 'sent' | 'delivered' | 'read';
}

// ─── UI Types ─────────────────────────────────────────────────────────────────

interface Conversation {
  id: string | number;
  name: string;
  phone: string;
  initials: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  tag?: string;
  status?: 'online' | 'offline';
}

interface Message {
  id: string | number;
  conversationId: string | number;
  text: string;
  direction: 'incoming' | 'outgoing';
  time: string;
  status?: 'sent' | 'delivered' | 'read';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatTime(ts?: string): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function mapContact(c: ApiContact): Conversation {
  const phone = c.phone || c.phoneNumber || c.leadNumber || '';
  const name = c.name || phone || 'Unknown';
  return {
    id: c.id,
    name,
    phone,
    initials: getInitials(name),
    lastMessage: c.last_message || c.lastMessage || '',
    lastTime: formatTime(c.last_time || c.lastTime || ''),
    unread: c.unread_count ?? c.unreadCount ?? 0,
    tag: c.tags?.[0] || c.tag,
    status: c.status,
  };
}

function mapMessage(m: ApiMessage, convId: string | number): Message {
  const direction: 'incoming' | 'outgoing' =
    m.direction === 'incoming' || m.type === 'inbound' ? 'incoming' : 'outgoing';
  const text = m.message || m.text || m.body || '';
  const time = formatTime(m.timestamp || m.time || m.created_at || '');
  return {
    id: m.id,
    conversationId: convId,
    text,
    direction,
    time,
    status: m.status,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="inbox-skeleton-row">
      <div className="inbox-skeleton" style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="inbox-skeleton" style={{ height: 13, width: '55%' }} />
        <div className="inbox-skeleton" style={{ height: 11, width: '80%' }} />
      </div>
    </div>
  );
}

function MessageStatusIcon({ status, direction }: { status?: string; direction: string }) {
  if (direction !== 'outgoing') return null;
  if (status === 'read') return <CheckCheck size={13} color="var(--inbox-teal-500)" />;
  if (status === 'delivered') return <CheckCheck size={13} color="#9ca3af" />;
  return <Check size={13} color="#9ca3af" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InboxPage() {
  // ── State ────────────────────────────────────────────────────────────────
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>('');
  const [phoneLoading, setPhoneLoading] = useState(true);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [filterValid, setFilterValid] = useState<'all' | 'valid' | 'invalid'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeIcon, setActiveIcon] = useState('contacts');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // const FILTERS = ['All', 'Unread', 'Lead', 'Customer', 'Support'];

  // ── 1. Fetch phone numbers ───────────────────────────────────────────────
  const fetchPhoneNumbers = useCallback(async () => {
    setPhoneLoading(true);
    try {
      const res = await api.get('/admin/waba/phone-numbers');
      const data: PhoneNumber[] = res.data?.data || res.data || [];
      setPhoneNumbers(data);
      if (data.length > 0 && !selectedPhoneId) {
        setSelectedPhoneId(data[0].id);
      }
    } catch (err) {
      console.error('[Inbox] Failed to fetch phone numbers', err);
    } finally {
      setPhoneLoading(false);
    }
  }, [selectedPhoneId]);

  useEffect(() => {
    fetchPhoneNumbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Fetch contacts when phone number changes ──────────────────────────
  const fetchContacts = useCallback(async () => {
    setContactsLoading(true);
    setConversations([]);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterValid !== 'all') params.append('is_valid', filterValid === 'valid' ? 'true' : 'false');
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      const res = await api.get('/admin/contacts', {
        params: { page: 1, limit: 50 },
      });
      const raw: ApiContact[] = res.data?.data || res.data?.contacts || res.data || [];
      setConversations(raw.map(mapContact));
    } catch (err) {
      console.error('[Inbox] Failed to fetch contacts', err);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);


  // ── 3. Fetch messages when a conversation is selected ───────────────────
  const fetchMessages = useCallback(
    async (conv: Conversation) => {
      if (!selectedPhoneId || !conv.phone) return;
      setMessagesLoading(true);
      setMessages([]);
      try {
        const params = new URLSearchParams();
        const leadNumber = conv.phone.replace(/\D/g, ''); // strip non-digits
        params.append('phone_number_id', selectedPhoneId);
        params.append('leadNumber', leadNumber);

        const res = await api.get(`/admin/messages/lead/conversations?${params.toString()}`);
        const raw: ApiMessage[] = res.data?.data || res.data?.messages || res.data || [];
        setMessages(raw.map((m) => mapMessage(m, conv.id)));
      } catch (err) {
        console.error('[Inbox] Failed to fetch messages', err);
      } finally {
        setMessagesLoading(false);
      }
    },
    [selectedPhoneId],
  );

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Auto-grow textarea ───────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [messageText]);

  // ── Filter conversations ─────────────────────────────────────────────────
  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.lastMessage.toLowerCase().includes(q);
    const matchFilter =
      activeFilter === 'All' ||
      (activeFilter === 'Unread' && c.unread > 0) ||
      c.tag === activeFilter;
    return matchSearch && matchFilter;
  });

  // ── Select conversation ──────────────────────────────────────────────────
  const handleSelectConversation = (c: Conversation) => {
    setSelectedConversation(c);
    setConversations((prev) =>
      prev.map((conv) => (conv.id === c.id ? { ...conv, unread: 0 } : conv)),
    );
    fetchMessages(c);
  };

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!messageText.trim() || !selectedConversation) return;
    setSendingMessage(true);
    const text = messageText.trim();
    setMessageText('');

    const optimistic: Message = {
      id: Date.now(),
      conversationId: selectedConversation.id,
      text,
      direction: 'outgoing',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };
    setMessages((prev) => [...prev, optimistic]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversation.id ? { ...c, lastMessage: text, lastTime: optimistic.time } : c,
      ),
    );

    // { "messaging_product": "whatsapp", "phone_number_id": "762352490286897", "to": "919372597458", "recipient_type": "individual", "type": "text", "text": { "body": "hii" } }

    try {
      await api.post('/admin/messages/send', {
        messaging_product: "whatsapp",
        phone_number_id: "1096146070249853",
        // to: selectedConversation.phone.replace(/\D/g, ''),
        to: "919372597458",
        recipient_type: "individual",
        type: "text",
        text: {
          body: text
        }
      });
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { ...m, status: 'delivered' } : m)));
    } catch {
      // keep optimistic, skip status upgrade
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Icon bar ─────────────────────────────────────────────────────────────
  const iconBarItems = [
    { id: 'contacts', icon: <Users size={19} />, tip: 'Contacts' },
    { id: 'tags', icon: <Tag size={19} />, tip: 'Tags' },
    { id: 'reminders', icon: <Bell size={19} />, tip: 'Reminders' },
    { id: 'filter', icon: <Filter size={19} />, tip: 'Filters' },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="inbox-root">

      {/* ── Icon sidebar ── */}
      <div className="inbox-icon-bar">
        {iconBarItems.map(({ id, icon, tip }) => (
          <button
            key={id}
            className={`inbox-icon-btn${activeIcon === id ? ' active' : ''}`}
            data-tip={tip}
            aria-label={tip}
            onClick={() => setActiveIcon(id)}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* ── Contact / conversation list ── */}
      <div className="inbox-contacts-panel">
        {/* header */}
        <div className="inbox-contacts-header">
          <h2>Inbox</h2>
          <div className="inbox-header-actions">
            <button
              className="inbox-header-btn"
              aria-label="Refresh"
              onClick={() => { fetchContacts(); fetchPhoneNumbers(); }}
            >
              <RefreshCw size={16} />
            </button>
            <button className="inbox-header-btn" aria-label="More options">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* phone number selector */}
        <div style={{ padding: '0 12px 8px' }}>
          <div style={{ position: 'relative' }}>
            <select
              id="inbox-phone-selector"
              value={selectedPhoneId}
              onChange={(e) => {
                setSelectedPhoneId(e.target.value);
                setSelectedConversation(null);
                setMessages([]);
              }}
              disabled={phoneLoading || phoneNumbers.length === 0}
              style={{
                width: '100%',
                padding: '7px 30px 7px 10px',
                borderRadius: 8,
                border: '1px solid var(--inbox-border)',
                background: 'var(--inbox-bg)',
                color: 'var(--inbox-text)',
                fontSize: 13,
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            >
              {phoneLoading && <option>Loading numbers…</option>}
              {!phoneLoading && phoneNumbers.length === 0 && <option>No numbers found</option>}
              {phoneNumbers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.verified_name ? `${p.verified_name} · ` : ''}{p.display_phone_number}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }}
            />
          </div>
        </div>

        {/* search */}
        <div className="inbox-search">
          <div className="inbox-search-inner">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search conversations…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="inbox-search-input"
            />
            {searchQuery && (
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af' }}
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* filter chips */}
        {/* <div className="inbox-filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`inbox-chip${activeFilter === f ? ' active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div> */}

        {/* list */}
        <div className="inbox-contact-list">
          {contactsLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : filteredConversations.length === 0 ? (
            <div className="inbox-contacts-empty">
              <MessageSquare />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`inbox-contact-row${selectedConversation?.id === conv.id ? ' selected' : ''}`}
                onClick={() => handleSelectConversation(conv)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectConversation(conv)}
                id={`inbox-conv-${conv.id}`}
              >
                <div className="inbox-avatar">{conv.initials}</div>
                <div className="inbox-contact-info">
                  <div className="inbox-contact-name">{conv.name}</div>
                  <div className="inbox-contact-preview">{conv.lastMessage || conv.phone}</div>
                </div>
                <div className="inbox-contact-meta">
                  <span className="inbox-contact-time">{conv.lastTime}</span>
                  {conv.unread > 0 && (
                    <span className="inbox-unread-badge">{conv.unread}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className="inbox-chat-area">
        {!selectedConversation ? (
          <div className="inbox-no-chat">
            <div className="inbox-no-chat-icon">
              <MessageSquare />
            </div>
            <h3>Select a conversation</h3>
            <p>Choose a contact from the list to start chatting</p>
          </div>
        ) : (
          <>
            {/* chat header */}
            <div className="inbox-chat-header">
              <div className="inbox-chat-header-left">
                <div className="inbox-avatar" style={{ width: 40, height: 40, fontSize: 14 }}>
                  {selectedConversation.initials}
                </div>
                <div className="inbox-chat-header-info">
                  <h3>{selectedConversation.name}</h3>
                  <span>{selectedConversation.phone}</span>
                </div>
              </div>
              <div className="inbox-chat-header-right">
                <button className="inbox-chat-action-btn" aria-label="Voice call"><Phone size={17} /></button>
                <button className="inbox-chat-action-btn" aria-label="Video call"><Video size={17} /></button>
                <button className="inbox-chat-action-btn" aria-label="Info"><Info size={17} /></button>
                <button className="inbox-chat-action-btn" aria-label="More"><MoreVertical size={17} /></button>
              </div>
            </div>

            {/* messages */}
            <div className="inbox-messages">
              {messagesLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: 'var(--inbox-text-muted)', fontSize: 13 }}>
                  Loading messages…
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: 'var(--inbox-text-muted)', fontSize: 13 }}>
                  No messages yet
                </div>
              ) : (
                <>
                  <div className="inbox-date-sep"><span>Conversation</span></div>
                  {messages.map((msg) => (
                    <div key={msg.id} className={`inbox-msg-row ${msg.direction}`} id={`msg-${msg.id}`}>
                      <div className="inbox-bubble">
                        <span>{msg.text}</span>
                        <div className="inbox-bubble-meta">
                          <span>{msg.time}</span>
                          <MessageStatusIcon status={msg.status} direction={msg.direction} />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* input bar */}
            <div className="inbox-input-bar">
              <div className="inbox-input-actions">
                <button className="inbox-input-action-btn" aria-label="Emoji"><Smile size={19} /></button>
                <button className="inbox-input-action-btn" aria-label="Attach file"><Paperclip size={19} /></button>
                <button className="inbox-input-action-btn" aria-label="Image"><ImageIcon size={19} /></button>
              </div>

              <textarea
                ref={textareaRef}
                className="inbox-input-field"
                placeholder="Type a message…"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                id="inbox-message-input"
              />

              <div className="inbox-input-actions">
                {!messageText.trim() && (
                  <button className="inbox-input-action-btn" aria-label="Voice message"><Mic size={19} /></button>
                )}
                <button
                  className="inbox-send-btn"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendingMessage}
                  aria-label="Send message"
                  id="inbox-send-btn"
                >
                  <Send size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Right detail panel ── */}
      {selectedConversation && (
        <div className="inbox-detail-panel">
          <div className="inbox-detail-header">
            <div className="inbox-detail-avatar">{selectedConversation.initials}</div>
            <p className="inbox-detail-name">{selectedConversation.name}</p>
            <p className="inbox-detail-phone">{selectedConversation.phone}</p>
          </div>

          <div className="inbox-detail-section">
            <div className="inbox-detail-section-title">Tags</div>
            {selectedConversation.tag ? (
              <span className="inbox-detail-tag">{selectedConversation.tag}</span>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--inbox-text-muted)' }}>No tags</p>
            )}
          </div>

          <div className="inbox-detail-section">
            <div className="inbox-detail-section-title">Contact Info</div>
            <div className="inbox-detail-row">
              <span>Phone</span>
              <span>{selectedConversation.phone}</span>
            </div>
            <div className="inbox-detail-row">
              <span>Status</span>
              <span style={{ color: selectedConversation.status === 'online' ? 'var(--inbox-teal-500)' : 'var(--inbox-text-muted)' }}>
                {selectedConversation.status === 'online' ? '● Online' : '○ Offline'}
              </span>
            </div>
            <div className="inbox-detail-row">
              <span>WABA Number</span>
              <span style={{ fontSize: 11 }}>
                {phoneNumbers.find((p) => p.id === selectedPhoneId)?.display_phone_number || '—'}
              </span>
            </div>
          </div>

          <div className="inbox-detail-section">
            <div className="inbox-detail-section-title">Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '📞 Schedule Call', id: 'action-call' },
                { label: '🔔 Set Reminder', id: 'action-reminder' },
                { label: '🏷️ Add Tag', id: 'action-tag' },
              ].map(({ label, id }) => (
                <button
                  key={id}
                  id={id}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--inbox-border)',
                    background: '#f9fafb',
                    cursor: 'pointer',
                    fontSize: 13,
                    textAlign: 'left',
                    transition: 'background 0.15s',
                    color: 'var(--inbox-text)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--inbox-teal-50)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#f9fafb')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

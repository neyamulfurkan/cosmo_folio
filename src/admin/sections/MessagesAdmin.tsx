// src/admin/sections/MessagesAdmin.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { Message } from '../../types';
import styles from './ProjectsAdmin.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastState = { type: 'success' | 'error'; message: string } | null;

type FilterState = 'all' | 'unread' | 'read';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDateTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const formatDateRelative = (iso: string): string => {
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = now - then;
    const minutes = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDateTime(iso);
  } catch {
    return iso;
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

type ToastProps = { toast: ToastState; onDismiss: () => void };
const Toast = ({ toast, onDismiss }: ToastProps): JSX.Element | null => {
  if (!toast) return null;
  return (
    <div
      className={`${styles.toast} ${
        toast.type === 'error' ? styles.toastError : styles.toastSuccess
      }`}
    >
      <span>{toast.message}</span>
      <button className={styles.toastClose} onClick={onDismiss} type="button">
        ✕
      </button>
    </div>
  );
};

type ConfirmDialogProps = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};
const ConfirmDialog = ({
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element => (
  <div className={styles.confirmOverlay}>
    <div className={styles.confirmBox}>
      <p className={styles.confirmMessage}>{message}</p>
      <div className={styles.confirmActions}>
        <button
          className={styles.confirmCancel}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className={styles.confirmDelete}
          onClick={onConfirm}
          type="button"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ─── Message card ─────────────────────────────────────────────────────────────

type MessageCardProps = {
  message: Message;
  expanded: boolean;
  onToggle: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
};

const MessageCard = ({
  message,
  expanded,
  onToggle,
  onMarkRead,
  onDelete,
}: MessageCardProps): JSX.Element => {
  const isUnread = !message.read;

  return (
    <div
      className={styles.projectRow}
      style={
        isUnread
          ? { borderLeft: '3px solid #6366f1', background: '#fafafa' }
          : { borderLeft: '3px solid transparent' }
      }
    >
      <div className={styles.projectRowLeft} style={{ flex: 1, minWidth: 0 }}>
        {/* Header row — always visible */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            cursor: 'pointer',
            width: '100%',
          }}
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onToggle();
          }}
          aria-expanded={expanded}
        >
          {/* Unread dot */}
          <span
            style={{
              flexShrink: 0,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isUnread ? '#6366f1' : 'transparent',
              border: isUnread ? 'none' : '2px solid #d1d5db',
              marginTop: 6,
            }}
            aria-label={isUnread ? 'Unread' : 'Read'}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Sender name + email */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <span
                className={styles.projectRowTitle}
                style={{ fontWeight: isUnread ? 700 : 500 }}
              >
                {message.name}
              </span>
              <a
                href= {`mailto:${message.email}`}
              className={styles.sortOrderBadge}
              style={{ textDecoration: 'none', color: '#6366f1' }}
              onClick={(e) => e.stopPropagation()}
            >
              {message.email}
            </a>
              {isUnread && (
                <span
                  className={styles.statusBadge}
                  style={{
                    background: '#ede9fe',
                    color: '#5b21b6',
                    border: 'none',
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontWeight: 600,
                  }}
                >
                  New
                </span>
              )}
            </div>

            {/* Message preview / full message */}
            {expanded ? (
              <p
                style={{
                  margin: '10px 0 0',
                  fontSize: 14,
                  color: '#374151',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '12px 14px',
                }}
              >
                {message.message}
              </p>
            ) : (
              <p
                className={styles.projectRowTagline}
                style={{
                  marginTop: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {message.message}
              </p>
            )}

            {/* Timestamp */}
            <div className={styles.projectRowMeta} style={{ marginTop: 6 }}>
              <span
                className={styles.sortOrderBadge}
                title={formatDateTime(message.createdAt)}
              >
                🕐 {formatDateRelative(message.createdAt)}
              </span>
            </div>
          </div>

          {/* Expand chevron */}
          <span
            style={{
              flexShrink: 0,
              fontSize: 12,
              color: '#9ca3af',
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 200ms',
              marginTop: 4,
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Actions */}
      <div
        className={styles.projectRowActions}
        style={{ flexShrink: 0, alignSelf: 'flex-start' }}
      >
        {isUnread && (  
          <button
            className={styles.actionBtn}
            onClick={onMarkRead}
            type="button"
            title="Mark as read"
          >
            ✓ Mark read
          </button>
        )}<a
        
          href={`mailto:${message.email}?subject=Re: Your message`}
          className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
          style={{ textDecoration: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          ✉️ Reply
        </a>
        <button
          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
          onClick={onDelete}
          type="button"
          title="Delete message"
        >
          🗑
        </button>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const MessagesAdmin = (): JSX.Element => {
  const { getToken } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auto-dismiss toast ────────────────────────────────────────────────────
  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  // ── Fetch messages ────────────────────────────────────────────────────────
  const fetchMessages = useCallback(
    async (silent = false): Promise<void> => {
      try {
        const token = await getToken();
        const res = await fetch('/api/admin/misc?resource=messages', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Message[];
        // Sort newest first
        setMessages(
          data.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      } catch (err) {
        console.error('[MessagesAdmin] fetch error:', err);
        if (!silent) {
          showToast({ type: 'error', message: 'Failed to load messages.' });
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [getToken, showToast]
  );

  // ── Initial load + 60s polling ────────────────────────────────────────────
  useEffect(() => {
    void fetchMessages();

    pollTimer.current = setInterval(() => {
      void fetchMessages(true);
    }, 60_000);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [fetchMessages]);

  // ── Toggle expand (also marks unread as read on open) ─────────────────────
  const handleToggleExpand = async (message: Message): Promise<void> => {
    const isOpening = expandedId !== message.id;
    setExpandedId(isOpening ? message.id : null);

    if (isOpening && !message.read) {
      await markRead(message.id);
    }
  };

  // ── Mark as read ──────────────────────────────────────────────────────────
  const markRead = async (id: string): Promise<void> => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/misc?resource=messages?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, read: true }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, read: true } : m))
      );
    } catch (err) {
      console.error('[MessagesAdmin] mark-read error:', err);
      // Silent — don't interrupt UX for a background mark-read
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deletingId) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/misc?resource=messages?id=${deletingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: deletingId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMessages((prev) => prev.filter((m) => m.id !== deletingId));
      if (expandedId === deletingId) setExpandedId(null);
      showToast({ type: 'success', message: 'Message deleted.' });
    } catch (err) {
      console.error('[MessagesAdmin] delete error:', err);
      showToast({ type: 'error', message: 'Failed to delete message.' });
    } finally {
      setDeletingId(null);
    }
  };

  // ── Mark all unread as read ───────────────────────────────────────────────
  const handleMarkAllRead = async (): Promise<void> => {
    const unread = messages.filter((m) => !m.read);
    if (unread.length === 0) return;

    try {
      const token = await getToken();
      await Promise.all(
        unread.map((m) =>
          fetch(`/api/admin/misc?resource=messages?id=${m.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ id: m.id, read: true }),
          })
        )
      );
      setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
      showToast({
        type: 'success',
        message: `${unread.length} message${unread.length !== 1 ? 's' : ''} marked as read.`,
      });
    } catch (err) {
      console.error('[MessagesAdmin] mark-all-read error:', err);
      showToast({ type: 'error', message: 'Failed to mark all as read.' });
    }
  };

  // ── Derived counts ────────────────────────────────────────────────────────
  const unreadCount = messages.filter((m) => !m.read).length;

  const filtered = messages.filter((m) => {
    if (filter === 'unread') return !m.read;
    if (filter === 'read') return m.read;
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {deletingId && (
        <ConfirmDialog
          message="Delete this message? This cannot be undone."
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {/* Header */}
      <div className={styles.listHeader}>
        <p className={styles.listCount}>
          {messages.length} message{messages.length !== 1 ? 's' : ''}
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: 8,
                background: '#6366f1',
                color: '#fff',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                padding: '2px 8px',
              }}
            >
              {unreadCount} new
            </span>
          )}
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button
              className={styles.actionBtn}
              onClick={() => void handleMarkAllRead()}
              type="button"
            >
              ✓ Mark all read
            </button>
          )}
          <button
            className={styles.newBtn}
            onClick={() => void fetchMessages()}
            type="button"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div className={styles.filterRow}>
        {(
          [
            { value: 'all', label: 'All' },
            { value: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
            { value: 'read', label: 'Read' },
          ] as { value: FilterState; label: string }[]
        ).map(({ value, label }) => (
          <button
            key={value}
            className={`${styles.filterTag} ${
              filter === value ? styles.filterTagActive : ''
            }`}
            onClick={() => setFilter(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <span>Loading messages…</span>
        </div>
      )}

      {/* Empty states */}
      {!loading && messages.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📭</span>
          <p>No messages yet. They'll appear here when visitors submit the contact form.</p>
        </div>
      )}

      {!loading && messages.length > 0 && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            {filter === 'unread' ? '✅' : '📭'}
          </span>
          <p>
            {filter === 'unread'
              ? 'All caught up — no unread messages.'
              : 'No read messages yet.'}
          </p>
        </div>
      )}

      {/* Message list */}
      {!loading &&
        filtered.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            expanded={expandedId === message.id}
            onToggle={() => void handleToggleExpand(message)}
            onMarkRead={() => void markRead(message.id)}
            onDelete={() => setDeletingId(message.id)}
          />
        ))}

      {/* Footer note */}
      {!loading && messages.length > 0 && (
        <p
          style={{
            marginTop: 16,
            fontSize: 12,
            color: '#9ca3af',
            textAlign: 'center',
          }}
        >
          Refreshes automatically every 60 seconds · Reply opens your default mail client
        </p>
      )}
    </div>
  );
};

export default MessagesAdmin;
// src/admin/components/AdminSidebar.tsx

import { useEffect, useState, useCallback } from 'react';
import { useAuth, SignOutButton } from '@clerk/clerk-react';
import styles from './AdminSidebar.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

type AdminSidebarProps = {
  activeSection: string;
  onNavigate: (section: string) => void;
};

type NavItem = {
  key: string;
  label: string;
  icon: string;
};

// ─── Nav item definitions ─────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { key: 'identity',     label: 'Identity',           icon: '👤' },
  { key: 'projects',     label: 'Projects',           icon: '🚀' },
  { key: 'skills',       label: 'Skills',             icon: '⚡' },
  { key: 'experience',   label: 'Experience',         icon: '💼' },
  { key: 'education',    label: 'Education',          icon: '🎓' },
  { key: 'blog',         label: 'Blog',               icon: '✍️'  },
  { key: 'lab',          label: 'Lab',                icon: '🧪' },
  { key: 'achievements', label: 'Achievements',       icon: '🏆' },
  { key: 'messages',     label: 'Messages',           icon: '📬' },
  { key: 'stats',        label: 'Stats & Integrations', icon: '📊' },
  { key: 'theme',        label: 'Theme',              icon: '🎨' },
  { key: 'settings',     label: 'Site Settings',      icon: '⚙️'  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const AdminSidebar = ({ activeSection, onNavigate }: AdminSidebarProps): JSX.Element => {
  const { getToken } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // ── Fetch unread message count ─────────────────────────────────────────────
  const fetchUnreadCount = useCallback(async (): Promise<void> => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch('/api/admin/misc?resource=messages', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;

      const data = (await res.json()) as { id: string; read: boolean }[];
      const count = Array.isArray(data)
        ? data.filter((msg) => !msg.read).length
        : 0;
      setUnreadCount(count);
    } catch {
      // Non-critical — silently fail; badge just won't show
    }
  }, [getToken]);

  // Poll every 60 seconds for new unread messages
  useEffect(() => {
    fetchUnreadCount();

    const interval = window.setInterval(fetchUnreadCount, 60_000);
    return () => window.clearInterval(interval);
  }, [fetchUnreadCount]);

  // Re-fetch when the user navigates away from the messages section
  // (they may have just read some messages)
  useEffect(() => {
    if (activeSection !== 'messages') return;
    // After viewing messages, refresh count shortly after they've had time to
    // mark them read inside the section component
    const timeout = window.setTimeout(fetchUnreadCount, 1_500);
    return () => window.clearTimeout(timeout);
  }, [activeSection, fetchUnreadCount]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <nav className={styles.sidebar} aria-label="Admin navigation">
      {/* Logo / wordmark */}
      <div className={styles.logo}>
        <span className={styles.logoMark} aria-hidden="true">◆</span>
        <span className={styles.logoText}>Cosmofolio</span>
      </div>

      <div className={styles.divider} />

      {/* Navigation items */}
      <ul className={styles.navList} role="list">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.key;
          const isMessages = item.key === 'messages';

          return (
            <li key={item.key} role="listitem">
              <button
                type="button"
                className={[
                  styles.navItem,
                  isActive ? styles.navItemActive : '',
                ].join(' ').trim()}
                onClick={() => onNavigate(item.key)}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  {item.icon}
                </span>
                <span className={styles.navLabel}>{item.label}</span>

                {/* Unread badge — only on Messages when there are unread items */}
                {isMessages && unreadCount > 0 && (
                  <span
                    className={styles.badge}
                    aria-label={`${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Spacer pushes sign-out to bottom */}
      <div className={styles.spacer} />

      <div className={styles.divider} />

      {/* Sign-out */}
      <div className={styles.signOutWrapper}>
        <SignOutButton>
          <button type="button" className={styles.signOutBtn}>
            <span className={styles.navIcon} aria-hidden="true">🚪</span>
            <span className={styles.navLabel}>Sign Out</span>
          </button>
        </SignOutButton>
      </div>
    </nav>
  );
};

export default AdminSidebar;
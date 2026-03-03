// src/admin/sections/StatsAdmin.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/react';
import styles from './ProjectsAdmin.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type SiteSettings = {
  github_username: string;
  spotify_enabled: boolean;
  calendar_url: string;
  plausible_domain: string;
};

type ToastState = { type: 'success' | 'error'; message: string } | null;

type SavingKey = keyof SiteSettings | null;

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: SiteSettings = {
  github_username: '',
  spotify_enabled: false,
  calendar_url: '',
  plausible_domain: '',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

type FieldProps = { label: string; hint?: string; children: React.ReactNode };
const Field = ({ label, hint, children }: FieldProps): JSX.Element => (
  <div className={styles.field}>
    <label className={styles.fieldLabel}>{label}</label>
    {hint && <span className={styles.fieldHint}>{hint}</span>}
    {children}
  </div>
);

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

// ─── Setting row — label + input + individual save button ─────────────────────

type SettingRowProps = {
  label: string;
  hint?: string;
  saving: boolean;
  onSave: () => void;
  children: React.ReactNode;
};

const SettingRow = ({
  label,
  hint,
  saving,
  onSave,
  children,
}: SettingRowProps): JSX.Element => (
  <div
    style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '20px 20px 16px',
      marginBottom: 12,
    }}
  >
    <Field label={label} hint={hint}>
      {children}
    </Field>
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
      <button
        className={styles.saveBtn}
        onClick={onSave}
        type="button"
        disabled={saving}
        style={{ padding: '7px 20px', fontSize: 13 }}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  </div>
);

// ─── Spotify setup guide ──────────────────────────────────────────────────────

const SpotifyGuide = (): JSX.Element => (
  <div
    style={{
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '20px 24px',
      marginTop: 8,
      fontSize: 13,
      lineHeight: 1.7,
      color: '#374151',
    }}
  >
    <p style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
      🎵 One-time Spotify Setup
    </p>
    <p style={{ marginBottom: 8 }}>
      The <strong>spotify_enabled</strong> toggle controls the Spotify card
      visibility. To power the now-playing feature you need a long-lived refresh
      token stored in Vercel. Do this once:
    </p>
    <ol
      style={{
        paddingLeft: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <li>
        Open{' '}
        <a
          href="https://developer.spotify.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#6366f1' }}
        >
          Spotify Developer Dashboard ↗
        </a>{' '}
        and create an app. Set the redirect URI to{' '}
        <code
          style={{
            background: '#e5e7eb',
            padding: '1px 5px',
            borderRadius: 4,
            fontFamily: 'monospace',
          }}
        >
          http://localhost:8888/callback
        </code>
        .
      </li>
      <li>
        Note your <strong>Client ID</strong> and <strong>Client Secret</strong>.
        Add both as Vercel environment variables:{' '}
        <code
          style={{
            background: '#e5e7eb',
            padding: '1px 5px',
            borderRadius: 4,
            fontFamily: 'monospace',
          }}
        >
          SPOTIFY_CLIENT_ID
        </code>{' '}
        and{' '}
        <code
          style={{
            background: '#e5e7eb',
            padding: '1px 5px',
            borderRadius: 4,
            fontFamily: 'monospace',
          }}
        >
          SPOTIFY_CLIENT_SECRET
        </code>
        .
      </li>
      <li>
        Run the OAuth flow once locally. In your terminal:
        <pre
          style={{
            background: '#1f2937',
            color: '#f9fafb',
            padding: '10px 14px',
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 12,
            margin: '6px 0',
            overflowX: 'auto',
            whiteSpace: 'pre',
          }}
        >
          {[
            '# 1. Open this URL in your browser (replace CLIENT_ID):',
            'https://accounts.spotify.com/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http://localhost:8888/callback&scope=user-read-currently-playing',
            '',
            '# 2. After authorising, copy the "code" param from the redirect URL.',
            '',
            '# 3. Exchange the code for tokens (replace CLIENT_ID, CLIENT_SECRET, CODE):',
            'curl -X POST https://accounts.spotify.com/api/token \\',
            "  -H 'Content-Type: application/x-www-form-urlencoded' \\",
            "  -u 'CLIENT_ID:CLIENT_SECRET' \\",
            "  --data 'grant_type=authorization_code&code=CODE&redirect_uri=http://localhost:8888/callback'",
          ].join('\n')}
        </pre>
      </li>
      <li>
        Copy the <strong>refresh_token</strong> from the response. Add it to
        Vercel as{' '}
        <code
          style={{
            background: '#e5e7eb',
            padding: '1px 5px',
            borderRadius: 4,
            fontFamily: 'monospace',
          }}
        >
          SPOTIFY_REFRESH_TOKEN
        </code>
        . This token does not expire unless revoked.
      </li>
      <li>
        Redeploy your Vercel project. The{' '}
        <code
          style={{
            background: '#e5e7eb',
            padding: '1px 5px',
            borderRadius: 4,
            fontFamily: 'monospace',
          }}
        >
          /api/spotify
        </code>{' '}
        edge function will exchange the refresh token on every request.
      </li>
    </ol>
  </div>
);

// ─── GitHub setup guide ───────────────────────────────────────────────────────

const GitHubGuide = (): JSX.Element => (
  <div
    style={{
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '16px 24px',
      marginTop: 8,
      fontSize: 13,
      lineHeight: 1.7,
      color: '#374151',
    }}
  >
    <p style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>
      🐙 GitHub Token Setup
    </p>
    <p style={{ marginBottom: 6 }}>
      The Stats section fetches your contribution heatmap via GitHub's GraphQL
      API. Create a read-only personal access token and add it as a Vercel
      environment variable:
    </p>
    <ol
      style={{
        paddingLeft: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <li>
        Go to{' '}
        <a
          href="https://github.com/settings/tokens"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#6366f1' }}
        >
          GitHub → Settings → Developer settings → Personal access tokens ↗
        </a>
      </li>
      <li>
        Create a <strong>Classic token</strong> with only the{' '}
        <code
          style={{
            background: '#e5e7eb',
            padding: '1px 5px',
            borderRadius: 4,
            fontFamily: 'monospace',
          }}
        >
          public_repo
        </code>{' '}
        scope checked.
      </li>
      <li>
        Add it as{' '}
        <code
          style={{
            background: '#e5e7eb',
            padding: '1px 5px',
            borderRadius: 4,
            fontFamily: 'monospace',
          }}
        >
          GITHUB_TOKEN
        </code>{' '}
        in your Vercel project settings, alongside{' '}
        <code
          style={{
            background: '#e5e7eb',
            padding: '1px 5px',
            borderRadius: 4,
            fontFamily: 'monospace',
          }}
        >
          GITHUB_USERNAME
        </code>{' '}
        (set via the form above).
      </li>
    </ol>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const StatsAdmin = (): JSX.Element => {
  const { getToken } = useAuth();

  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<SavingKey>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [showSpotifyGuide, setShowSpotifyGuide] = useState(false);
  const [showGitHubGuide, setShowGitHubGuide] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ── Fetch site settings ───────────────────────────────────────────────────
  const fetchSettings = useCallback(async (): Promise<void> => {
    try {
      // Public GET — no auth required for reading settings
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = (await res.json()) as Record<string, unknown>;

      setSettings({
        github_username:
          typeof raw.github_username === 'string' ? raw.github_username : '',
        spotify_enabled: raw.spotify_enabled === true || raw.spotify_enabled === 'true',
        calendar_url:
          typeof raw.calendar_url === 'string' ? raw.calendar_url : '',
        plausible_domain:
          typeof raw.plausible_domain === 'string' ? raw.plausible_domain : '',
      });
    } catch (err) {
      console.error('[StatsAdmin] fetch error:', err);
      showToast({ type: 'error', message: 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  // ── Save a single key ─────────────────────────────────────────────────────
  const saveSetting = async (
    key: keyof SiteSettings,
    value: string | boolean
  ): Promise<void> => {
    setSavingKey(key);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/stats', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      showToast({ type: 'success', message: `${key.replace(/_/g, ' ')} saved.` });
    } catch (err) {
      console.error(`[StatsAdmin] save ${key} error:`, err);
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Save failed.',
      });
    } finally {
      setSavingKey(null);
    }
  };

  // ── Local field updater ───────────────────────────────────────────────────
  const set = <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K]
  ): void => setSettings((prev) => ({ ...prev, [key]: value }));

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <span>Loading settings…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* ── GitHub ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          🐙 GitHub Integration
        </h3>
        <p className={styles.sectionHint}>
          Powers the contribution heatmap and repository stats on the Stats
          section. The username is public; the token lives in Vercel env vars.
        </p>

        <SettingRow
          label="GitHub Username"
          hint="Your GitHub handle — used to fetch public contribution and repo data"
          saving={savingKey === 'github_username'}
          onSave={() => void saveSetting('github_username', settings.github_username)}
        >
          <input
            className={styles.input}
            type="text"
            value={settings.github_username}
            onChange={(e) => set('github_username', e.target.value)}
            placeholder="e.g. torvalds"
            autoComplete="off"
            spellCheck={false}
          />
        </SettingRow>

        <button
          type="button"
          onClick={() => setShowGitHubGuide((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            color: '#6366f1',
            fontSize: 13,
            cursor: 'pointer',
            padding: '4px 0',
            marginBottom: 4,
          }}
        >
          {showGitHubGuide ? '▲ Hide setup guide' : '▼ Show GitHub token setup guide'}
        </button>
        {showGitHubGuide && <GitHubGuide />}
      </section>

      {/* ── Spotify ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          🎵 Spotify Integration
        </h3>
        <p className={styles.sectionHint}>
          Shows your currently playing track on the Stats section. Requires a
          one-time OAuth token exchange — see the guide below.
        </p>

        {/* Toggle row */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '20px 20px 16px',
            marginBottom: 12,
          }}
        >
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Spotify Card</label>
            <span className={styles.fieldHint}>
              When disabled, the Spotify card is hidden from visitors entirely
            </span>
            <div className={styles.checkRow} style={{ marginTop: 10 }}>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={settings.spotify_enabled}
                  onChange={(e) => set('spotify_enabled', e.target.checked)}
                />
                Show Spotify now-playing card
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              className={styles.saveBtn}
              onClick={() => void saveSetting('spotify_enabled', settings.spotify_enabled)}
              type="button"
              disabled={savingKey === 'spotify_enabled'}
              style={{ padding: '7px 20px', fontSize: 13 }}
            >
              {savingKey === 'spotify_enabled' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSpotifyGuide((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            color: '#6366f1',
            fontSize: 13,
            cursor: 'pointer',
            padding: '4px 0',
            marginBottom: 4,
          }}
        >
          {showSpotifyGuide
            ? '▲ Hide setup guide'
            : '▼ Show Spotify token setup guide'}
        </button>
        {showSpotifyGuide && <SpotifyGuide />}
      </section>

      {/* ── Calendar ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          📅 Calendar Embed
        </h3>
        <p className={styles.sectionHint}>
          Optional — if set, embeds a booking calendar (e.g. Calendly, Cal.com)
          below the contact form on the Contact section. Leave blank to hide it.
        </p>

        <SettingRow
          label="Calendar Embed URL"
          hint="Full URL to your booking page — must allow iframe embedding"
          saving={savingKey === 'calendar_url'}
          onSave={() => void saveSetting('calendar_url', settings.calendar_url)}
        >
          <input
            className={styles.input}
            type="url"
            value={settings.calendar_url}
            onChange={(e) => set('calendar_url', e.target.value)}
            placeholder="https://cal.com/yourname or https://calendly.com/yourname"
          />
        </SettingRow>

        {settings.calendar_url && (
          <p
            style={{
              fontSize: 12,
              color: '#6b7280',
              marginTop: -6,
              marginBottom: 8,
            }}
          >
            ℹ️ Verify your calendar provider allows iframe embedding — some
            (e.g. Google Calendar) require a special embed URL from their
            settings page.
          </p>
        )}
      </section>

      {/* ── Analytics ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          📊 Analytics
        </h3>
        <p className={styles.sectionHint}>
          Optional Plausible Analytics domain. If set, the portfolio will load
          the Plausible script for privacy-friendly page view tracking. Leave
          blank to disable.
        </p>

        <SettingRow
          label="Plausible Domain"
          hint="The domain you registered in Plausible — no https://, just the domain"
          saving={savingKey === 'plausible_domain'}
          onSave={() =>
            void saveSetting('plausible_domain', settings.plausible_domain)
          }
        >
          <input
            className={styles.input}
            type="text"
            value={settings.plausible_domain}
            onChange={(e) => set('plausible_domain', e.target.value)}
            placeholder="yourdomain.com"
            autoComplete="off"
            spellCheck={false}
          />
        </SettingRow>

        {settings.plausible_domain && (
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: -6 }}>
            ℹ️ Make sure{' '}
            <code
              style={{
                background: '#e5e7eb',
                padding: '1px 5px',
                borderRadius: 4,
                fontFamily: 'monospace',
              }}
            >
              {settings.plausible_domain}
            </code>{' '}
            is configured in your{' '}
            <a
              href="https://plausible.io"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#6366f1' }}
            >
              Plausible dashboard ↗
            </a>
            .
          </p>
        )}
      </section>

      {/* ── Current values summary ── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Current Values</h3>
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {(
            [
              { key: 'github_username',  label: 'GitHub Username',    value: settings.github_username || '—' },
              { key: 'spotify_enabled',  label: 'Spotify Enabled',    value: settings.spotify_enabled ? 'Yes' : 'No' },
              { key: 'calendar_url',     label: 'Calendar URL',       value: settings.calendar_url || '—' },
              { key: 'plausible_domain', label: 'Plausible Domain',   value: settings.plausible_domain || '—' },
            ] as { key: keyof SiteSettings; label: string; value: string }[]
          ).map(({ key, label, value }, idx, arr) => (
            <div
              key={key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '11px 16px',
                fontSize: 13,
                borderBottom: idx < arr.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}
            >
              <span style={{ color: '#6b7280', fontWeight: 500 }}>{label}</span>
              <span
                style={{
                  color: value === '—' ? '#d1d5db' : '#111827',
                  fontFamily:
                    key === 'github_username' || key === 'plausible_domain' || key === 'calendar_url'
                      ? 'monospace'
                      : 'inherit',
                  fontSize: key === 'calendar_url' && value !== '—' ? 11 : 13,
                  maxWidth: 320,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={value}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default StatsAdmin;
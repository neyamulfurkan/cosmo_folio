// src/admin/AdminApp.tsx

import { useState, useEffect, lazy, Suspense } from 'react';
import { ClerkProvider, SignedIn, SignedOut, useSignIn } from '@clerk/clerk-react';
import styles from './AdminApp.module.css';

// ─── Lazy-loaded admin section components ────────────────────────────────────
// Each section is in its own chunk — only loaded when the user navigates to it.
const IdentityAdmin    = lazy(() => import('./sections/IdentityAdmin'));
const ProjectsAdmin    = lazy(() => import('./sections/ProjectsAdmin'));
const SkillsAdmin      = lazy(() => import('./sections/SkillsAdmin'));
const ExperienceAdmin  = lazy(() => import('./sections/ExperienceAdmin'));
const EducationAdmin   = lazy(() => import('./sections/EducationAdmin'));
const BlogAdmin        = lazy(() => import('./sections/BlogAdmin'));
const LabAdmin         = lazy(() => import('./sections/LabAdmin'));
const AchievementsAdmin = lazy(() => import('./sections/AchievementsAdmin'));
const MessagesAdmin    = lazy(() => import('./sections/MessagesAdmin'));
const StatsAdmin       = lazy(() => import('./sections/StatsAdmin'));
const ThemeAdmin       = lazy(() => import('./sections/ThemeAdmin'));
const SiteSettingsAdmin = lazy(() => import('./sections/SiteSettingsAdmin'));

// Sidebar is not lazy — it renders immediately and is tiny.
import AdminSidebar from './components/AdminSidebar';

// ─── Types ───────────────────────────────────────────────────────────────────
type AdminSection =
  | 'identity'
  | 'projects'
  | 'skills'
  | 'experience'
  | 'education'
  | 'blog'
  | 'lab'
  | 'achievements'
  | 'messages'
  | 'stats'
  | 'theme'
  | 'settings';

// ─── Section fallback (shown while lazy chunk loads) ─────────────────────────
const SectionFallback = (): JSX.Element => (
  <div className={styles.sectionFallback}>
    <div className={styles.sectionFallbackSpinner} />
    <span>Loading…</span>
  </div>
);

// ─── Section router ───────────────────────────────────────────────────────────
const renderSection = (section: AdminSection): JSX.Element => {
  switch (section) {
    case 'identity':     return <IdentityAdmin />;
    case 'projects':     return <ProjectsAdmin />;
    case 'skills':       return <SkillsAdmin />;
    case 'experience':   return <ExperienceAdmin />;
    case 'education':    return <EducationAdmin />;
    case 'blog':         return <BlogAdmin />;
    case 'lab':          return <LabAdmin />;
    case 'achievements': return <AchievementsAdmin />;
    case 'messages':     return <MessagesAdmin />;
    case 'stats':        return <StatsAdmin />;
    case 'theme':        return <ThemeAdmin />;
    case 'settings':     return <SiteSettingsAdmin />;
    default:             return <IdentityAdmin />;
  }
};

// ─── Section display labels ───────────────────────────────────────────────────
const SECTION_LABELS: Record<AdminSection, string> = {
  identity:     'Identity',
  projects:     'Projects',
  skills:       'Skills',
  experience:   'Experience',
  education:    'Education',
  blog:         'Blog',
  lab:          'Lab',
  achievements: 'Achievements',
  messages:     'Messages',
  stats:        'Stats & Integrations',
  theme:        'Theme',
  settings:     'Site Settings',
};

// ─── Sign-in wall ─────────────────────────────────────────────────────────────
const SignInWall = (): JSX.Element => {
  const signInResult = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Force-cast through unknown to bypass Clerk's version-specific signal type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signInAny = signInResult as unknown as Record<string, any>;
  const isLoaded: boolean = Boolean(signInAny?.isLoaded);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signIn: any = signInAny?.signIn ?? null;

  const handleSubmit = async (): Promise<void> => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    setError(null);
    try {
      // Use any-cast to bypass strict type checking on Clerk's version-specific API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (signIn as any).create({
        identifier: email,
        strategy: 'password',
        password,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((result as any).status === 'complete') {
        window.location.href = '/admin';
      } else {
        setError('Sign-in incomplete. Please try again.');
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[]; message?: string } | null;
      const msg =
        Array.isArray(clerkErr?.errors) && clerkErr!.errors!.length > 0
          ? clerkErr!.errors![0].message
          : (clerkErr?.message ?? 'Sign-in failed. Check your credentials.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.signInWall}>
      <div className={styles.signInCard}>
        <div className={styles.signInLogo}>
          <span className={styles.signInLogoMark}>◆</span>
          <span className={styles.signInLogoText}>Cosmofolio Admin</span>
        </div>
        <p className={styles.signInHint}>Sign in with your authorised account to continue.</p>

        <div className={styles.customSignIn}>
          <div className={styles.customSignInField}>
            <label className={styles.customSignInLabel}>Email</label>
            <input
              className={styles.customSignInInput}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
              disabled={loading}
              autoComplete="email"
            />
          </div>
          <div className={styles.customSignInField}>
            <label className={styles.customSignInLabel}>Password</label>
            <input
              className={styles.customSignInInput}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          {error && <p className={styles.customSignInError}>{error}</p>}
          <button
            className={styles.customSignInBtn}
            onClick={() => void handleSubmit()}
            disabled={loading || !isLoaded || !email || !password}
            type="button"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Authenticated admin shell ────────────────────────────────────────────────
const AdminShell = (): JSX.Element => {
  const [activeSection, setActiveSection] = useState<AdminSection>('identity');

  return (
    <div className={styles.adminRoot}>
      {/* Fixed sidebar */}
      <aside className={styles.adminSidebarWrapper}>
        <AdminSidebar
          activeSection={activeSection}
          onNavigate={(section) => setActiveSection(section as AdminSection)}
        />
      </aside>

      {/* Main content */}
      <div className={styles.adminMain}>
        {/* Header bar */}
        <header className={styles.adminHeader}>
          <h1 className={styles.adminHeaderTitle}>
            {SECTION_LABELS[activeSection]}
          </h1>
          <span className={styles.adminHeaderBadge}>Admin Panel</span>
        </header>

        {/* Section content — each section is a Suspense boundary */}
        <main className={styles.adminContent}>
          <Suspense fallback={<SectionFallback />}>
            {renderSection(activeSection)}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

// ─── AdminApp root ────────────────────────────────────────────────────────────
const AdminApp = (): JSX.Element => {
  // The portfolio applies .theme-* classes to document.body.
  // The admin panel needs a clean white background — reset body here and
  // restore when the admin unmounts (i.e. user navigates back, unlikely but safe).
  useEffect(() => {
    const previous = document.body.className;
    // Strip all theme classes and set a plain admin class.
    document.body.className = previous.replace(/theme-\w+/g, '').trim() + ' admin-mode';
    document.body.style.background = '#f5f5f5';
    document.body.style.color = '#1a1a1a';

    return () => {
      // Restore — in practice the user rarely navigates from /admin back to
      // the portfolio without a full page reload, but this keeps it clean.
      document.body.className = previous;
      document.body.style.background = '';
      document.body.style.color = '';
    };
  }, []);

  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

  if (!publishableKey) {
    return (
      <div className={styles.missingKeyError}>
        <strong>Configuration error:</strong> <code>VITE_CLERK_PUBLISHABLE_KEY</code> is not set.
        Add it to your <code>.env.local</code> file and restart the dev server.
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <SignedOut>
        <SignInWall />
      </SignedOut>
      <SignedIn>
        <AdminShell />
      </SignedIn>
    </ClerkProvider>
  );
};

export default AdminApp;
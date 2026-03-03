// src/components/sections/Stats/Stats.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@/store';
import styles from './Stats.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ContributionDay = {
  count: number;
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
};

type ContributionWeek = {
  days: ContributionDay[];
};

type GitHubData = {
  weeks: ContributionWeek[];
  totalStars: number;
  repoCount: number;
  streakDays: number;
};

type SpotifyTrack = {
  name: string;
  artist: string;
  albumArt: string;
  spotifyUrl: string;
};

type SpotifyData =
  | { playing: true; track: SpotifyTrack }
  | { playing: false };

// ---------------------------------------------------------------------------
// Heatmap canvas renderer
// ---------------------------------------------------------------------------
const CELL_SIZE = 10;
const CELL_GAP = 2;

const drawHeatmap = (
  canvas: HTMLCanvasElement,
  weeks: ContributionWeek[],
  accentColor: string
): void => {
  const dpr = window.devicePixelRatio || 1;
  const cols = weeks.length;
  const rows = 7;

  const logicalWidth = cols * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const logicalHeight = rows * (CELL_SIZE + CELL_GAP) - CELL_GAP;

  canvas.width = logicalWidth * dpr;
  canvas.height = logicalHeight * dpr;
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, logicalWidth, logicalHeight);

  // Parse accent color for level-based opacity fills
  // We'll use rgba overlays on a base color derived from accentColor
  const levelOpacity: Record<0 | 1 | 2 | 3 | 4, number> = {
    0: 0,
    1: 0.25,
    2: 0.5,
    3: 0.75,
    4: 1.0,
  };

  weeks.forEach((week, colIdx) => {
    week.days.forEach((day, rowIdx) => {
      const x = colIdx * (CELL_SIZE + CELL_GAP);
      const y = rowIdx * (CELL_SIZE + CELL_GAP);
      const level = day.level as 0 | 1 | 2 | 3 | 4;

      // Base cell (empty)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, 2);
      ctx.fill();

      // Contribution fill
      if (level > 0) {
        ctx.globalAlpha = levelOpacity[level];
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
  });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const Stats = (): JSX.Element => {
  const activeTheme = useStore((s) => s.activeTheme);

  // GitHub state
  const [githubData, setGithubData] = useState<GitHubData | null>(null);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [githubLoading, setGithubLoading] = useState<boolean>(true);

  // Spotify state
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyLoading, setSpotifyLoading] = useState<boolean>(true);

  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const spotifyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derive accent color from CSS variable for heatmap drawing
  const getAccentColor = useCallback((): string => {
    if (typeof window === 'undefined') return '#7b5cf0';
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-primary')
        .trim() || '#7b5cf0'
    );
  }, []);

  // Redraw heatmap whenever data or theme changes
  useEffect(() => {
    if (!githubData || !heatmapCanvasRef.current) return;
    // Slight defer so CSS variables have updated after theme switch
    const id = requestAnimationFrame(() => {
      if (heatmapCanvasRef.current) {
        drawHeatmap(heatmapCanvasRef.current, githubData.weeks, getAccentColor());
      }
    });
    return () => cancelAnimationFrame(id);
  }, [githubData, activeTheme, getAccentColor]);

  // Fetch GitHub stats once on mount
  useEffect(() => {
    let cancelled = false;

    const fetchGitHub = async (): Promise<void> => {
      setGithubLoading(true);
      setGithubError(null);
      try {
        const res = await fetch('/api/github-stats');
        if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
        const data: GitHubData = await res.json();
        if (!cancelled) setGithubData(data);
      } catch (err) {
        if (!cancelled) {
          setGithubError(err instanceof Error ? err.message : 'Failed to load GitHub data');
        }
      } finally {
        if (!cancelled) setGithubLoading(false);
      }
    };

    fetchGitHub();
    return () => { cancelled = true; };
  }, []);

  // Fetch Spotify on mount and every 30s
  const fetchSpotify = useCallback(async (): Promise<void> => {
    setSpotifyError(null);
    try {
      const res = await fetch('/api/spotify');
      if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
      const data: SpotifyData = await res.json();
      setSpotifyData(data);
    } catch (err) {
      setSpotifyError(err instanceof Error ? err.message : 'Failed to load Spotify data');
      setSpotifyData({ playing: false });
    } finally {
      setSpotifyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpotify();
    spotifyIntervalRef.current = setInterval(fetchSpotify, 30_000);
    return () => {
      if (spotifyIntervalRef.current !== null) {
        clearInterval(spotifyIntervalRef.current);
      }
    };
  }, [fetchSpotify]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const renderGitHub = (): JSX.Element => {
    if (githubLoading) {
      return (
        <div className={styles.loadingState}>
          <div className={styles.skeletonHeatmap} />
          <div className={styles.skeletonStats} />
        </div>
      );
    }

    if (githubError) {
      return (
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{githubError}</span>
        </div>
      );
    }

    if (!githubData) return <></>;

    return (
      <>
        <div className={styles.heatmapWrapper}>
          <canvas ref={heatmapCanvasRef} className={styles.heatmapCanvas} />
        </div>
        <div className={styles.repoStats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{githubData.repoCount}</span>
            <span className={styles.statLabel}>Repositories</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{githubData.totalStars}</span>
            <span className={styles.statLabel}>Stars earned</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{githubData.streakDays}</span>
            <span className={styles.statLabel}>Day streak</span>
          </div>
        </div>
      </>
    );
  };

  const renderSpotify = (): JSX.Element => {
    if (spotifyLoading) {
      return (
        <div className={styles.spotifyCard}>
          <div className={styles.skeletonAlbumArt} />
          <div className={styles.skeletonTrackInfo}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        </div>
      );
    }

    if (spotifyError) {
      return (
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{spotifyError}</span>
        </div>
      );
    }

    if (!spotifyData || !spotifyData.playing) {
      return (
        <div className={styles.spotifyCard}>
          <div className={styles.spotifyIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </div>
          <div className={styles.notPlayingText}>Not currently playing</div>
        </div>
      );
    }

    const { track } = spotifyData;

    return ( <a 
      
        href={track.spotifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.spotifyCard}
        aria-label={`Now playing: ${track.name} by ${track.artist} on Spotify`}
      >
        <img
          src={track.albumArt}
          alt={`${track.name} album art`}
          className={styles.albumArt}
          loading="lazy"
        />
        <div className={styles.trackInfo}>
          <div className={styles.nowPlayingLabel}>Now playing</div>
          <div className={styles.trackName}>{track.name}</div>
          <div className={styles.artistName}>{track.artist}</div>
        </div>
        <div className={styles.equalizerBars} aria-hidden="true">
          <div className={styles.eqBar} />
          <div className={styles.eqBar} />
          <div className={styles.eqBar} />
        </div>
      </a>
    );
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <div className={styles.statsContainer}>
      {/* GitHub Section */}
      <section className={styles.githubSection}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </span>
          GitHub Activity
        </h2>
        {renderGitHub()}
      </section>

      {/* Spotify Section */}
      <section className={styles.spotifySection}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </span>
          Listening To
        </h2>
        {renderSpotify()}
      </section>
    </div>
  );
};

export default Stats;
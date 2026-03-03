// src/components/Layer1World/Layer1World.tsx

import { useEffect, useRef } from 'react';
import { useShallowStore } from '@/store';
import WorldCanvas from '@/canvas/WorldCanvas';
import { createAudioEngine } from '@/audio/audioEngine';
import type { AudioEngine } from '@/audio/audioEngine';
import type { ThemeName } from '@/types';
import styles from './Layer1World.module.css';

const Layer1World = (): JSX.Element => {
  const { activeTheme, nightMode, ambienceOn, ambienceVolume } = useShallowStore((s) => ({
    activeTheme:   s.activeTheme,
    nightMode:     s.nightMode,
    ambienceOn:    s.ambienceOn,
    ambienceVolume: s.ambienceVolume,
  }));

  // Stable ref to the audio engine — created once, never recreated
  const audioEngineRef = useRef<AudioEngine | null>(null);

  // Keep refs for values used inside effects that shouldn't trigger re-runs
  const activeThemeRef   = useRef<ThemeName>(activeTheme);
  const ambienceOnRef    = useRef<boolean>(ambienceOn);

  // Sync refs on every render so effects always see the latest values
  activeThemeRef.current = activeTheme;
  ambienceOnRef.current  = ambienceOn;

  // ── Create the audio engine exactly once on mount ─────────────────────────
  useEffect(() => {
    audioEngineRef.current = createAudioEngine();
    return () => {
      // Stop audio on unmount (e.g. hot-reload, admin route change)
      audioEngineRef.current?.stop();
      audioEngineRef.current = null;
    };
  }, []);

  // ── Ambience on/off ────────────────────────────────────────────────────────
  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;

    if (ambienceOn) {
      engine.start(activeThemeRef.current);
    } else {
      engine.stop();
    }
    // We intentionally only react to ambienceOn changes here.
    // Theme changes while audio is on are handled by the next effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambienceOn]);

  // ── Theme changes ──────────────────────────────────────────────────────────
  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine || !ambienceOnRef.current) return;
    engine.setTheme(activeTheme);
  }, [activeTheme]);

  // ── Volume changes ─────────────────────────────────────────────────────────
  useEffect(() => {
    const engine = audioEngineRef.current;
    if (!engine) return;
    engine.setVolume(ambienceVolume);
  }, [ambienceVolume]);

  // ── Dramatic event handler: briefly adds a CSS class to the world container ─
  const worldContainerRef = useRef<HTMLDivElement>(null);

  const handleDramaticEvent = (eventClass: string): void => {
    const el = worldContainerRef.current;
    if (!el || !eventClass) return;
    // Remove first in case a previous animation hasn't fully cleared
    el.classList.remove(eventClass);
    // Force reflow so re-adding the class re-triggers the animation
    void el.offsetWidth;
    el.classList.add(eventClass);
    // CSS animations are one-shot; remove the class after 3 seconds to reset
    setTimeout(() => {
      el.classList.remove(eventClass);
    }, 3000);
  };

  // ── Build container class list ─────────────────────────────────────────────
  const containerClasses = [
    styles.worldContainer,
    nightMode ? 'night-mode-active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={worldContainerRef} className={containerClasses}>
      {/* Background gradient — transitions smoothly on theme change via CSS */}
      <div className={styles.bgGradient} aria-hidden="true" />

      {/* Dual-canvas particle world */}
      <WorldCanvas onDramaticEvent={handleDramaticEvent} />
    </div>
  );
};

export default Layer1World;
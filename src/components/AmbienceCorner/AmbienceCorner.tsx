// src/components/AmbienceCorner/AmbienceCorner.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useShallowStore } from '@/store';
import styles from './AmbienceCorner.module.css';

const AmbienceCorner = (): React.JSX.Element => {
  const { ambienceOn, ambienceVolume, setAmbienceOn, setAmbienceVolume } = useShallowStore(
    (s) => ({
      ambienceOn: s.ambienceOn,
      ambienceVolume: s.ambienceVolume,
      setAmbienceOn: s.setAmbienceOn,
      setAmbienceVolume: s.setAmbienceVolume,
    })
  );

  const [showVolume, setShowVolume] = useState<boolean>(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setShowVolume(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hideTimerRef.current = setTimeout(() => {
      setShowVolume(false);
      hideTimerRef.current = null;
    }, 300);
  }, []);

  const handleToggle = useCallback(() => {
    setAmbienceOn(!ambienceOn);
  }, [ambienceOn, setAmbienceOn]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAmbienceVolume(parseFloat(e.target.value));
    },
    [setAmbienceVolume]
  );

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'fixed', top: 'var(--space-5)', right: 'var(--space-5)', zIndex: 'calc(var(--z-controls) + 5)' } as React.CSSProperties}
    >
      {/* Volume slider — appears on hover */}
      <div
        className={`${styles.volumeContainer} ${showVolume ? styles.volumeContainerVisible : ''}`}
        aria-hidden={showVolume ? undefined : 'true'}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={ambienceVolume}
          onChange={handleVolumeChange}
          className={styles.volumeSlider}
          aria-label="Ambience volume"
          tabIndex={showVolume ? 0 : -1}
        />
        <span className={styles.volumeLabel} aria-live="polite">
          {Math.round(ambienceVolume * 100)}%
        </span>
      </div>

      {/* Toggle button */}
      <button
        className={styles.cornerButton}
        onClick={handleToggle}
        aria-label={ambienceOn ? 'Turn off ambient audio' : 'Turn on ambient audio'}
        title={ambienceOn ? 'Ambience on' : 'Ambience off'}
        type="button"
      >
        {ambienceOn ? (
          <span className={styles.soundWave} aria-hidden="true">
            <span className={`${styles.soundBar} ${styles.soundBarActive}`} />
            <span className={`${styles.soundBar} ${styles.soundBarActive}`} />
            <span className={`${styles.soundBar} ${styles.soundBarActive}`} />
          </span>
        ) : (
          <span className={styles.muteIcon} aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M3 7.5H5.5L9.5 4V16L5.5 12.5H3V7.5Z"
                fill="currentColor"
                fillOpacity="0.6"
              />
              <line
                x1="13"
                y1="7"
                x2="17"
                y2="13"
                stroke="currentColor"
                strokeOpacity="0.4"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="17"
                y1="7"
                x2="13"
                y2="13"
                stroke="currentColor"
                strokeOpacity="0.4"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        )}
      </button>
    </div>
  );
};

export default AmbienceCorner;
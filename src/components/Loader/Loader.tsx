// src/components/Loader/Loader.tsx

import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import styles from './Loader.module.css';

const Loader = (): JSX.Element | null => {
  const contentLoaded = useStore((s) => s.contentLoaded);
  const identity = useStore((s) => s.identity);

  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (!contentLoaded) return;
    setIsFading(true);
    const timer = setTimeout(() => setIsVisible(false), 400);
    return () => clearTimeout(timer);
  }, [contentLoaded]);

  if (!isVisible) return null;

  const name = identity?.name ?? 'Portfolio';
  const letters = name.split('');

  return (
    <div className={`${styles.loader} ${isFading ? styles.loaderHidden : ''}`}>
      <div className={styles.nameContainer}>
        {letters.map((char, i) => (
          <span
            key={i}
            className={styles.nameLetter}
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Loader;
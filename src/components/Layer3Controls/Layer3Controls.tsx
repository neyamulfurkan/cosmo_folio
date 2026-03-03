// src/components/Layer3Controls/Layer3Controls.tsx

import { useState, useEffect, useCallback } from 'react';
import { isMobile } from '@/lib/utils';
import { useStore } from '@/store';
import ArcNav from '@/components/ArcNav/ArcNav';
import ThemeCorner from '@/components/ThemeCorner/ThemeCorner';
import AmbienceCorner from '@/components/AmbienceCorner/AmbienceCorner';
import LayoutCorner from '@/components/LayoutCorner/LayoutCorner';
import AICorner from '@/components/AICorner/AICorner';
import MobileControls from '@/components/MobileControls/MobileControls';
import styles from './Layer3Controls.module.css';

// ─── Component ────────────────────────────────────────────────────────────────

const Layer3Controls = (): JSX.Element => {
  const [isMobileView, setIsMobileView] = useState<boolean>(() => isMobile());

  const handleResize = useCallback(() => {
    setIsMobileView(isMobile());
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const activeLayout = useStore((s) => s.activeLayout);

  return (
    <div className={styles.controlsWrapper} aria-label="Site controls">
      {/* Arc nav — desktop always, mobile only for arc layout */}
      {!isMobileView && <ArcNav />}
      {isMobileView && activeLayout === 'arc' && <ArcNav />}

      {/* Mobile dock/scattered/orbital nav + gear button */}
      {isMobileView && <MobileControls />}

      {/* 4 corner controls — always visible on both desktop and mobile */}
      <ThemeCorner />
      <AmbienceCorner />
      <LayoutCorner />
      <AICorner />
    </div>
  );
};

export default Layer3Controls;
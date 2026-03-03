// src/components/sections/Skills/Skills.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@/store';
import type { Skill } from '@/types';
import styles from './Skills.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SkillNode = {
  skill: Skill;
  x: number;
  y: number;
  baseRadius: number;
  currentRadius: number;
  phase: number;
};

type CategoryCluster = {
  category: string;
  cx: number;
  cy: number;
  nodes: SkillNode[];
};

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  skill: Skill | null;
};

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
const MIN_NODE_RADIUS = 8;
const MAX_NODE_RADIUS = 20;
const ORBIT_BASE_RADIUS = 72;
const PULSE_AMPLITUDE = 2.5;
const PULSE_SPEED = 0.8;
const CONNECTION_ALPHA = 0.18;
const CATEGORY_FONT_SIZE = 11;
const LINE_WIDTH = 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const proficiencyToRadius = (proficiency: number): number => {
  const t = (Math.max(1, Math.min(10, proficiency)) - 1) / 9;
  return MIN_NODE_RADIUS + t * (MAX_NODE_RADIUS - MIN_NODE_RADIUS);
};

const yearsToOpacity = (years: number, maxYears: number): number => {
  if (maxYears === 0) return 0.7;
  return 0.4 + (Math.min(years, maxYears) / maxYears) * 0.6;
};

const buildClusters = (
  skills: Skill[],
  canvasW: number,
  canvasH: number
): CategoryCluster[] => {
  if (skills.length === 0) return [];

  // Group by category
  const grouped = new Map<string, Skill[]>();
  for (const skill of skills) {
    const arr = grouped.get(skill.category) ?? [];
    arr.push(skill);
    grouped.set(skill.category, arr);
  }

  const categories = Array.from(grouped.keys());
  const count = categories.length;
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const clusterSpreadRadius = Math.min(canvasW, canvasH) * 0.32;

  return categories.map((cat, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const clusterCx = count === 1 ? cx : cx + Math.cos(angle) * clusterSpreadRadius;
    const clusterCy = count === 1 ? cy : cy + Math.sin(angle) * clusterSpreadRadius;

    const catSkills = grouped.get(cat)!;
    const nodeCount = catSkills.length;

    const nodes: SkillNode[] = catSkills.map((skill, j) => {
      const nodeAngle = (j / Math.max(nodeCount, 1)) * Math.PI * 2 - Math.PI / 2;
      const orbitR = ORBIT_BASE_RADIUS + Math.floor(j / 8) * 36;
      const nx = clusterCx + Math.cos(nodeAngle) * orbitR;
      const ny = clusterCy + Math.sin(nodeAngle) * orbitR;
      const baseR = proficiencyToRadius(skill.proficiency);

      return {
        skill,
        x: nx,
        y: ny,
        baseRadius: baseR,
        currentRadius: baseR,
        phase: Math.random() * Math.PI * 2,
      };
    });

    return { category: cat, cx: clusterCx, cy: clusterCy, nodes };
  });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const Skills = (): JSX.Element => {
  const skills = useStore((s) => s.skills);
  const activeTheme = useStore((s) => s.activeTheme);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clustersRef = useRef<CategoryCluster[]>([]);
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const dprRef = useRef<number>(1);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    skill: null,
  });

  // Resolve accent colors from CSS variables
  const getColors = useCallback(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    return {
      accent: style.getPropertyValue('--accent-primary').trim() || '#7b5cf0',
      secondary: style.getPropertyValue('--accent-secondary').trim() || '#4a9eff',
      glow: style.getPropertyValue('--particle-glow').trim() || 'rgba(120,80,255,0.5)',
    };
  }, []);

  // Build cluster layout from current canvas dimensions
  const rebuildClusters = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width / dprRef.current;
    const h = canvas.height / dprRef.current;
    clustersRef.current = buildClusters(skills, w, h);
  }, [skills]);

  // Draw one frame
  const draw = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = dprRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const logicalW = w / dpr;
      const logicalH = h / dpr;

      const elapsed = timeRef.current === 0 ? 0 : (timestamp - timeRef.current) / 1000;
      timeRef.current = timestamp;

      const { accent, secondary, glow } = getColors();

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.scale(dpr, dpr);

      const maxYears = skills.reduce((m, s) => Math.max(m, s.years), 0);
      const clusters = clustersRef.current;

      // Update pulsing radii
      for (const cluster of clusters) {
        for (const node of cluster.nodes) {
          node.phase += elapsed * PULSE_SPEED;
          node.currentRadius =
            node.baseRadius + Math.sin(node.phase) * PULSE_AMPLITUDE;
        }
      }

      // Draw connection lines within each cluster
      ctx.lineWidth = LINE_WIDTH;
      for (const cluster of clusters) {
        const nodes = cluster.nodes;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            // Only connect nearby nodes to avoid visual chaos
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (dist > 160) continue;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = secondary;
            ctx.globalAlpha = CONNECTION_ALPHA * (1 - dist / 160);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      // Draw nodes
      for (const cluster of clusters) {
        for (const node of cluster.nodes) {
          const r = node.currentRadius;
          const opacity = yearsToOpacity(node.skill.years, maxYears);

          // Outer glow
          const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 2.4);
          grad.addColorStop(0, accent);
          grad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(node.x, node.y, r * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.globalAlpha = opacity * 0.18;
          ctx.fill();

          // Main node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fillStyle = accent;
          ctx.globalAlpha = opacity;
          ctx.fill();

          // Icon or first letter
          if (r >= 12) {
            const label = node.skill.icon ?? node.skill.name.charAt(0).toUpperCase();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.font = `${Math.round(r * 0.9)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label.length <= 2 ? label : label.charAt(0), node.x, node.y);
          }
        }
        ctx.globalAlpha = 1;
      }

      // Draw category labels
      for (const cluster of clusters) {
        const label = cluster.category;
        ctx.font = `600 ${CATEGORY_FONT_SIZE}px var(--font-display, system-ui, sans-serif)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Pill background
        const metrics = ctx.measureText(label);
        const padX = 10;
        const padY = 5;
        const bw = metrics.width + padX * 2;
        const bh = CATEGORY_FONT_SIZE + padY * 2;
        const bx = cluster.cx - bw / 2;
        const by = cluster.cy - bh / 2;

        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.globalAlpha = 0.85;
        ctx.fill();

        ctx.fillStyle = secondary;
        ctx.globalAlpha = 1;
        ctx.fillText(label, cluster.cx, cluster.cy);
      }

      // Boundary hint so nodes near edges aren't clipped visually
      // (no-op: canvas clips naturally; clusters are inset by layout)

      ctx.restore();

      void logicalW; // used indirectly via cluster positions
      void logicalH;

      rafRef.current = requestAnimationFrame(draw);
    },
    [skills, getColors]
  );

  // Resize handler
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const rect = container.getBoundingClientRect();
    const h = Math.max(320, Math.min(rect.width * 0.75, 520));
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${h}px`;

    rebuildClusters();
  }, [rebuildClusters]);

  // Mouse move handler for hover
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let found: Skill | null = null;
      let tx = 0;
      let ty = 0;

      outer: for (const cluster of clustersRef.current) {
        for (const node of cluster.nodes) {
          const dist = Math.hypot(mx - node.x, my - node.y);
          if (dist <= node.currentRadius + 4) {
            found = node.skill;
            tx = node.x;
            ty = node.y - node.currentRadius - 10;
            break outer;
          }
        }
      }

      if (found) {
        setTooltip({ visible: true, x: tx, y: ty, skill: found });
      } else {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  // Mount / unmount
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    handleResize();
    timeRef.current = 0;
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleResize, draw]);

  // Rebuild clusters when skills or theme change
  useEffect(() => {
    rebuildClusters();
  }, [skills, activeTheme, rebuildClusters]);

  const proficiencyLabel = (p: number): string => {
    if (p <= 2) return 'Beginner';
    if (p <= 4) return 'Familiar';
    if (p <= 6) return 'Proficient';
    if (p <= 8) return 'Advanced';
    return 'Expert';
  };

  if (skills.length === 0) {
    return (
      <div className={styles.skillsContainer}>
        <p className={styles.emptyState}>No skills to display yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.skillsContainer}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>Skills</h2>
        <p className={styles.subtitle}>Hover a node to explore</p>
      </div>

      <div ref={containerRef} className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {tooltip.visible && tooltip.skill && (
          <div
            className={styles.tooltip}
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <span className={styles.tooltipName}>{tooltip.skill.name}</span>
            <span className={styles.tooltipMeta}>
              {tooltip.skill.years}y · {proficiencyLabel(tooltip.skill.proficiency)}
            </span>
            <div className={styles.tooltipBar}>
              <div
                className={styles.tooltipBarFill}
                style={{ width: `${(tooltip.skill.proficiency / 10) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Skills;
// src/components/ArcNav/arcPhysics.ts

import {
  ARC_CIRCLE_RADIUS_MULTIPLIER,
  ARC_VISIBLE_HEIGHT,
  ARC_ICON_MAX_SIZE,
  ARC_ICON_MIN_SIZE,
  ARC_VISIBLE_ICON_COUNT,
} from '@/lib/constants';
import { clamp, lerp, easeOutCubic } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArcIconPosition = {
  index: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  visible: boolean;
};

export type ArcPhysicsController = {
  onDragStart(clientX: number): void;
  onDragMove(clientX: number): void;
  onDragEnd(): void;
  getCurrentAngle(): number;
  setAngle(angle: number): void;
  startMomentumLoop(): void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

/** Degrees between adjacent arc icons. */
const ICON_SPACING_DEG = 6;

/** Number of recent drag samples used to compute release velocity. */
const VELOCITY_SAMPLE_COUNT = 4;

/** Velocity magnitude (deg/frame) below which momentum is considered stopped. */
const VELOCITY_THRESHOLD = 0.1;

/** Friction multiplier applied each frame during momentum decay. */
const FRICTION = 0.92;

/** Number of frames for the snap-to-icon easing animation. */
const SNAP_FRAMES = 20;

/** How many px of horizontal drag map to 1 degree of arc rotation. */
const DRAG_SENSITIVITY = 0.15;

// ─── computeArcIconPositions ──────────────────────────────────────────────────

/**
 * Computes the screen-space position, scale, opacity, and visibility for every
 * arc icon given the currently active (centred) index.
 *
 * The arc is a large circle whose centre sits below the viewport bottom edge.
 * Icons are placed along its top curve at evenly-spaced angular intervals.
 *
 * @param activeIndex   Index of the currently centred icon (0-based).
 * @param totalIcons    Total number of section icons.
 * @param containerWidth   Width of the arc container element in px.
 * @param containerHeight  Height of the arc container element in px.
 */
export const computeArcIconPositions = (
  activeIndex: number,
  totalIcons: number,
  containerWidth: number,
  containerHeight: number,
): ArcIconPosition[] => {
  const radius =
    Math.max(containerWidth, containerHeight) * ARC_CIRCLE_RADIUS_MULTIPLIER;

  // Circle centre sits below the viewport so only the top arc is visible.
  const centerX = containerWidth / 2;
  const centerY = containerHeight + radius - ARC_VISIBLE_HEIGHT;

  const positions: ArcIconPosition[] = [];

  for (let i = 0; i < totalIcons; i++) {
    // Angular distance from the active (12-o'clock) position, in degrees.
    const distFromActive = i - activeIndex;

    // Absolute angular distance — used for scale/opacity/visibility.
    const absDist = Math.abs(distFromActive);

    const visible = absDist <= ARC_VISIBLE_ICON_COUNT;

    // Angle in radians measured from the topmost point of the arc.
    // Positive distFromActive → icon is to the right of centre.
    const angleRad = (distFromActive * ICON_SPACING_DEG * Math.PI) / 180;

    // Project onto the circle.
    const x = centerX + radius * Math.sin(angleRad);
    const y = centerY - radius * Math.cos(angleRad);

    // Interpolation factor: 0 at centre, 1 at the outermost visible position.
    const t = clamp(absDist / ARC_VISIBLE_ICON_COUNT, 0, 1);

    const scale = lerp(1.0, ARC_ICON_MIN_SIZE / ARC_ICON_MAX_SIZE, t);
    const opacity = lerp(1.0, 0.45, t);

    positions.push({ index: i, x, y, scale, opacity, visible });
  }

  return positions;
};

// ─── createArcPhysics ─────────────────────────────────────────────────────────

/**
 * Creates an arc physics controller that handles drag input, momentum decay,
 * and snapping to the nearest icon.
 *
 * The controller is intentionally free of DOM access — the caller attaches
 * pointer/touch listeners and forwards coordinates here.
 *
 * @param onSnap  Called with the snapped icon index after every drag release.
 */
export const createArcPhysics = (
  onSnap: (index: number) => void,
): ArcPhysicsController => {
  // ── Internal state ────────────────────────────────────────────────────────

  /** Current rotation expressed as a continuous angle in degrees.
   *  Angle 0 means icon 0 is at the centre; positive values rotate left
   *  (icon indices increase toward centre). */
  let currentAngle = 0;

  /** X coordinate where the current drag started. */
  let dragStartX = 0;

  /** Angle at the start of the current drag. */
  let dragStartAngle = 0;

  /** Whether a drag is currently in progress. */
  let isDragging = false;

  /** Velocity in degrees per frame, carried over after drag release. */
  let velocity = 0;

  /** Ring buffer of recent [timestamp, angle] samples for velocity estimation. */
  const velocitySamples: Array<{ t: number; angle: number }> = [];

  /** Handle for the running requestAnimationFrame loop (0 = none). */
  let rafId = 0;

  /** Handle for the snap animation's requestAnimationFrame loop. */
  let snapRafId = 0;

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Convert a continuous angle to the nearest icon index (≥ 0). */
  const angleToNearestIndex = (angle: number, totalIcons: number): number => {
    const raw = Math.round(angle / ICON_SPACING_DEG);
    return clamp(raw, 0, totalIcons - 1);
  };

  /** Target angle (degrees) that places icon at `index` in the centre. */
  const indexToAngle = (index: number): number => index * ICON_SPACING_DEG;

  /** Record an angle sample for velocity estimation. */
  const recordSample = (angle: number): void => {
    velocitySamples.push({ t: performance.now(), angle });
    if (velocitySamples.length > VELOCITY_SAMPLE_COUNT) {
      velocitySamples.shift();
    }
  };

  /** Compute release velocity from the last few samples (degrees / ms → deg/frame @60fps). */
  const computeReleaseVelocity = (): number => {
    if (velocitySamples.length < 2) return 0;

    const first = velocitySamples[0];
    const last = velocitySamples[velocitySamples.length - 1];
    const dt = last.t - first.t;

    if (dt === 0) return 0;

    const dAngle = last.angle - first.angle;
    // Convert from deg/ms to deg/frame (assuming 60 fps ≈ 16.67 ms/frame).
    return (dAngle / dt) * 16.667;
  };

  /** Cancel any running momentum or snap animation loop. */
  const cancelLoops = (): void => {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (snapRafId !== 0) {
      cancelAnimationFrame(snapRafId);
      snapRafId = 0;
    }
  };

  // ── Snap animation ────────────────────────────────────────────────────────

  /**
   * Smoothly eases `currentAngle` toward `targetAngle` over SNAP_FRAMES
   * frames using an easeOutCubic curve, then fires onSnap.
   */
  const animateSnap = (targetAngle: number, targetIndex: number): void => {
    const startAngle = currentAngle;
    let frame = 0;

    const tick = (): void => {
      frame += 1;
      const t = easeOutCubic(clamp(frame / SNAP_FRAMES, 0, 1));
      currentAngle = lerp(startAngle, targetAngle, t);

      if (frame < SNAP_FRAMES) {
        snapRafId = requestAnimationFrame(tick);
      } else {
        currentAngle = targetAngle;
        snapRafId = 0;
        onSnap(targetIndex);
      }
    };

    snapRafId = requestAnimationFrame(tick);
  };

  // ── Public API ────────────────────────────────────────────────────────────

  const onDragStart = (clientX: number): void => {
    cancelLoops();
    isDragging = true;
    dragStartX = clientX;
    dragStartAngle = currentAngle;
    velocitySamples.length = 0;
    recordSample(currentAngle);
  };

  const onDragMove = (clientX: number): void => {
    if (!isDragging) return;

    const deltaX = clientX - dragStartX;
    // Moving right (positive deltaX) rotates the arc so lower-index icons
    // come into view — equivalent to decreasing the angle.
    currentAngle = dragStartAngle - deltaX * DRAG_SENSITIVITY;

    recordSample(currentAngle);
  };

  const onDragEnd = (): void => {
    if (!isDragging) return;
    isDragging = false;

    velocity = computeReleaseVelocity();
    velocitySamples.length = 0;

    startMomentumLoop();
  };

  const getCurrentAngle = (): number => currentAngle;

  const setAngle = (angle: number): void => {
    cancelLoops();
    currentAngle = angle;
  };

  /**
   * Starts the momentum decay loop.  Called automatically after drag-end but
   * also exposed on the controller so callers can trigger programmatic inertia.
   *
   * Requires the caller to have set up a way to read totalIcons — we infer it
   * from the current angle: we clamp to a safe upper bound (100) because the
   * physics module is decoupled from section count.  ArcNav.tsx passes the
   * real totalIcons via setAngle + onSnap index and re-initialises when needed.
   */
  const startMomentumLoop = (): void => {
    cancelLoops();

    // We do not know totalIcons here, so we use a sentinel that the caller
    // overrides via the onSnap callback.  The loop will keep decaying and snap
    // to whatever index is nearest at the time velocity dies out.
    // ArcNav.tsx always calls setAngle(indexToAngle(index)) after a snap to
    // keep the angle in a known valid range.
    const TOTAL_ICONS_SENTINEL = 100;

    const tick = (): void => {
      velocity *= FRICTION;
      currentAngle += velocity;

      if (Math.abs(velocity) < VELOCITY_THRESHOLD) {
        velocity = 0;
        rafId = 0;

        const nearest = angleToNearestIndex(currentAngle, TOTAL_ICONS_SENTINEL);
        const snapTarget = indexToAngle(nearest);
        animateSnap(snapTarget, nearest);
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  };

  return {
    onDragStart,
    onDragMove,
    onDragEnd,
    getCurrentAngle,
    setAngle,
    startMomentumLoop,
  };
};
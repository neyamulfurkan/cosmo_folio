// src/canvas/themes.ts

import type { ThemeName } from '@/types';

export type ThemeParticleConfig = {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  bgGradientStart: string;
  bgGradientEnd: string;
  particleBehavior: 'drift' | 'undulate' | 'blink' | 'rise' | 'grid';
  dramaticEvent: 'shootingStar' | 'lightPulse' | 'leafDrift' | 'sparkBurst' | null;
};

export const THEME_PARTICLE_CONFIGS: Record<ThemeName, ThemeParticleConfig> = {
  space: {
    primaryColor: 'rgba(255, 255, 255, 0.9)',
    secondaryColor: 'rgba(147, 112, 219, 0.7)',
    glowColor: 'rgba(120, 80, 255, 0.5)',
    bgGradientStart: '#020818',
    bgGradientEnd: '#0d0621',
    particleBehavior: 'drift',
    dramaticEvent: 'shootingStar',
  },
  ocean: {
    primaryColor: 'rgba(64, 224, 208, 0.8)',
    secondaryColor: 'rgba(0, 128, 180, 0.6)',
    glowColor: 'rgba(64, 224, 208, 0.4)',
    bgGradientStart: '#020d14',
    bgGradientEnd: '#031a2e',
    particleBehavior: 'undulate',
    dramaticEvent: 'lightPulse',
  },
  forest: {
    primaryColor: 'rgba(144, 238, 144, 0.6)',
    secondaryColor: 'rgba(50, 205, 50, 0.4)',
    glowColor: 'rgba(100, 200, 100, 0.3)',
    bgGradientStart: '#020a04',
    bgGradientEnd: '#041208',
    particleBehavior: 'blink',
    dramaticEvent: 'leafDrift',
  },
  ember: {
    primaryColor: 'rgba(255, 100, 20, 0.8)',
    secondaryColor: 'rgba(200, 50, 10, 0.5)',
    glowColor: 'rgba(255, 120, 30, 0.4)',
    bgGradientStart: '#0a0202',
    bgGradientEnd: '#140804',
    particleBehavior: 'rise',
    dramaticEvent: 'sparkBurst',
  },
  minimal: {
    primaryColor: 'rgba(255, 255, 255, 0.85)',
    secondaryColor: 'rgba(200, 200, 200, 0.4)',
    glowColor: 'rgba(255, 255, 255, 0.2)',
    bgGradientStart: '#000000',
    bgGradientEnd: '#050505',
    particleBehavior: 'grid',
    dramaticEvent: null,
  },
};
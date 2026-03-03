// src/lib/utils.ts

/**
 * Formats a date string into a human-readable format.
 * Returns 'Present' if dateStr is null or empty.
 */
export const formatDate = (
  dateStr: string | null | undefined,
  format: 'short' | 'long' | 'year'
): string => {
  if (!dateStr) return 'Present';

  const date = new Date(dateStr);

  if (isNaN(date.getTime())) return 'Present';

  switch (format) {
    case 'short':
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: 'numeric',
      }).format(date);
    case 'long':
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
    case 'year':
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
      }).format(date);
    default:
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: 'numeric',
      }).format(date);
  }
};

/**
 * Clamps a number between min and max (inclusive).
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Linear interpolation between a and b by factor t (0–1).
 */
export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

/**
 * Returns a random float between min (inclusive) and max (exclusive).
 */
export const randomBetween = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
export const randomBetweenInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Exponential ease-out: fast start, slow finish.
 * Returns 1 at t=1, 0 at t=0.
 */
export const easeOutExpo = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

/**
 * Cubic ease-out: moderate deceleration curve.
 */
export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

/**
 * Returns true if the viewport width is below the mobile breakpoint (768px).
 * Safe to call server-side — returns false if window is not defined.
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

/**
 * Constructs a Cloudinary transformation URL from a public ID and options.
 * Reads the cloud name from import.meta.env.VITE_CLOUDINARY_CLOUD_NAME.
 */
export const buildCloudinaryUrl = (
  publicId: string,
  options: { width?: number; quality?: number; format?: string } = {}
): string => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;

  if (!cloudName) {
    console.warn('buildCloudinaryUrl: VITE_CLOUDINARY_CLOUD_NAME is not set.');
    return '';
  }

  const transformations: string[] = [];

  if (options.width !== undefined) {
    transformations.push(`w_${options.width}`);
  }
  if (options.quality !== undefined) {
    transformations.push(`q_${options.quality}`);
  } else {
    transformations.push('q_auto');
  }
  if (options.format) {
    transformations.push(`f_${options.format}`);
  } else {
    transformations.push('f_auto');
  }

  const transformString = transformations.join(',');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${publicId}`;
};

/**
 * Converts a string to a URL-safe slug.
 * Lowercases, replaces spaces with hyphens, strips non-alphanumeric characters except hyphens.
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Truncates text to maxLength characters at a word boundary, appending an ellipsis.
 * Returns the original string if it is shorter than maxLength.
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace === -1) {
    return truncated + '…';
  }

  return truncated.slice(0, lastSpace) + '…';
};
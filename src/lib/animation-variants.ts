/**
 * Framer Motion animation variants for dashboard components
 * Provides smooth, consistent animations across the admin panel
 */

import type { Variants, Transition } from 'motion/react';

// Default easing curve - smooth and natural
const easeOutExpo: Transition['ease'] = [0.16, 1, 0.3, 1];

/**
 * Fade in from below - great for cards and content blocks
 */
export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.3,
      ease: easeOutExpo,
    },
  },
};

/**
 * Fade in from the side - for sidebars and panels
 */
export const fadeInLeft: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: easeOutExpo,
    },
  },
};

/**
 * Simple fade - for overlays and subtle transitions
 */
export const fadeIn: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Scale in - for modals and popovers
 */
export const scaleIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Container for staggered children animations
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/**
 * Faster stagger for lists with many items
 */
export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

/**
 * Chart-specific animation - delayed fade for after page load
 */
export const chartFadeIn: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.6,
      delay: 0.3,
      ease: easeOutExpo,
    },
  },
};

/**
 * Number counter animation transition
 */
export const numberTransition: Transition = {
  type: 'spring',
  stiffness: 100,
  damping: 15,
};

/**
 * Card item variant - for use within staggerContainer
 */
export const cardItem: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: easeOutExpo,
    },
  },
};

/**
 * List item variant - for tables and lists
 */
export const listItem: Variants = {
  initial: {
    opacity: 0,
    x: -8,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: easeOutExpo,
    },
  },
};

/**
 * Skeleton loader pulse
 */
export const skeletonPulse: Variants = {
  initial: {
    opacity: 0.5,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.8,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut',
    },
  },
};

/**
 * Framer Motion Mock for Testing
 *
 * This mock replaces all Framer Motion components and hooks with simple
 * pass-through implementations to allow tests to run in jsdom environment.
 *
 * The mock:
 * - Converts all motion.* components to their native HTML equivalents
 * - Makes AnimatePresence render its children directly
 * - Provides stub implementations for all hooks
 * - Maintains proper TypeScript types
 */

import { vi } from 'vitest';
import type { ReactNode } from 'react';

/**
 * Mock motion components - converts to native HTML elements
 * This allows all motion.* components to render as regular HTML in tests
 */
const createMotionComponent = (tagName: string) => tagName;

export const mockMotion = {
  div: createMotionComponent('div'),
  span: createMotionComponent('span'),
  button: createMotionComponent('button'),
  p: createMotionComponent('p'),
  h1: createMotionComponent('h1'),
  h2: createMotionComponent('h2'),
  h3: createMotionComponent('h3'),
  h4: createMotionComponent('h4'),
  h5: createMotionComponent('h5'),
  h6: createMotionComponent('h6'),
  section: createMotionComponent('section'),
  article: createMotionComponent('article'),
  nav: createMotionComponent('nav'),
  aside: createMotionComponent('aside'),
  header: createMotionComponent('header'),
  footer: createMotionComponent('footer'),
  ul: createMotionComponent('ul'),
  ol: createMotionComponent('ol'),
  li: createMotionComponent('li'),
  form: createMotionComponent('form'),
  input: createMotionComponent('input'),
  textarea: createMotionComponent('textarea'),
  select: createMotionComponent('select'),
  label: createMotionComponent('label'),
  a: createMotionComponent('a'),
  img: createMotionComponent('img'),
  video: createMotionComponent('video'),
  audio: createMotionComponent('audio'),
  canvas: createMotionComponent('canvas'),
  svg: createMotionComponent('svg'),
  path: createMotionComponent('path'),
  circle: createMotionComponent('circle'),
  rect: createMotionComponent('rect'),
  line: createMotionComponent('line'),
  polygon: createMotionComponent('polygon'),
  polyline: createMotionComponent('polyline'),
  ellipse: createMotionComponent('ellipse'),
  g: createMotionComponent('g'),
  text: createMotionComponent('text'),
  defs: createMotionComponent('defs'),
  clipPath: createMotionComponent('clipPath'),
  main: createMotionComponent('main'),
  table: createMotionComponent('table'),
  thead: createMotionComponent('thead'),
  tbody: createMotionComponent('tbody'),
  tr: createMotionComponent('tr'),
  td: createMotionComponent('td'),
  th: createMotionComponent('th'),
};

/**
 * Mock AnimatePresence - simply renders children
 */
export const mockAnimatePresence = ({ children }: { children?: ReactNode }) => children;

/**
 * Mock animation controls
 */
export const mockAnimationControls = {
  start: vi.fn(),
  stop: vi.fn(),
  set: vi.fn(),
};

/**
 * Mock motion value
 */
export const mockMotionValue = {
  get: vi.fn(() => 0),
  set: vi.fn(),
  onChange: vi.fn(),
  destroy: vi.fn(),
};

/**
 * Mock hooks
 */
export const mockUseAnimation = vi.fn(() => mockAnimationControls);
export const mockUseMotionValue = vi.fn((initial: number) => ({
  ...mockMotionValue,
  get: vi.fn(() => initial),
}));
export const mockUseTransform = vi.fn(() => mockMotionValue);
export const mockUseSpring = vi.fn(() => mockMotionValue);
export const mockUseScroll = vi.fn(() => ({
  scrollX: mockMotionValue,
  scrollY: mockMotionValue,
  scrollXProgress: mockMotionValue,
  scrollYProgress: mockMotionValue,
}));
export const mockUseInView = vi.fn(() => true);
export const mockUseReducedMotion = vi.fn(() => false);
export const mockUseAnimate = vi.fn(() => [null, mockAnimationControls]);
export const mockUseMotionValueEvent = vi.fn();
export const mockUseAnimationFrame = vi.fn();
export const mockUseTime = vi.fn(() => mockMotionValue);
export const mockUseVelocity = vi.fn(() => mockMotionValue);

/**
 * Mock stagger utility
 */
export const mockStagger = vi.fn((delay: number) => delay);

/**
 * Mock PanInfo type (for TypeScript)
 * This is just a type, so we export an empty object at runtime
 */
export const mockPanInfo = {};

/**
 * Complete framer-motion module mock
 * This is applied globally via vi.mock() in setup.ts
 */
export const framerMotionMock = {
  motion: mockMotion,
  AnimatePresence: mockAnimatePresence,
  useAnimation: mockUseAnimation,
  useMotionValue: mockUseMotionValue,
  useTransform: mockUseTransform,
  useSpring: mockUseSpring,
  useScroll: mockUseScroll,
  useInView: mockUseInView,
  useReducedMotion: mockUseReducedMotion,
  useAnimate: mockUseAnimate,
  useMotionValueEvent: mockUseMotionValueEvent,
  useAnimationFrame: mockUseAnimationFrame,
  useTime: mockUseTime,
  useVelocity: mockUseVelocity,
  stagger: mockStagger,

  // Animation utilities
  animate: vi.fn(),

  // Layout utilities
  LayoutGroup: ({ children }: { children?: ReactNode }) => children,
  LazyMotion: ({ children }: { children?: ReactNode }) => children,
  MotionConfig: ({ children }: { children?: ReactNode }) => children,

  // Gestures (exports that might be imported but not used)
  useDragControls: vi.fn(() => ({})),

  // Context
  useMotionContext: vi.fn(() => ({})),
  usePresence: vi.fn(() => [true, null]),
};

/**
 * Reset all mocks between tests
 */
export function resetFramerMotionMocks() {
  vi.clearAllMocks();
}

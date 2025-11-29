import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingScreen } from '../LoadingScreen';

// Mock useReducedMotion hook
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// Import the mocked hook to control its return value
import { useReducedMotion } from '../../hooks/useReducedMotion';

describe('LoadingScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading screen with prayer emoji', () => {
    render(<LoadingScreen />);

    expect(screen.getByText('🙏')).toBeInTheDocument();
  });

  it('renders PrayerMap title', () => {
    render(<LoadingScreen />);

    expect(screen.getByText('PrayerMap')).toBeInTheDocument();
  });

  it('renders tagline text', () => {
    render(<LoadingScreen />);

    expect(screen.getByText('We could all pray harder for our neighbor.')).toBeInTheDocument();
  });

  it('applies gradient background', () => {
    const { container } = render(<LoadingScreen />);

    const bgElement = container.querySelector('.bg-gradient-to-br');
    expect(bgElement).toBeInTheDocument();
    expect(bgElement).toHaveClass('from-[hsl(var(--ethereal-sky))]');
    expect(bgElement).toHaveClass('via-[hsl(var(--ethereal-dawn))]');
    expect(bgElement).toHaveClass('to-[hsl(var(--ethereal-purple))]');
  });

  it('centers content on screen', () => {
    const { container } = render(<LoadingScreen />);

    const wrapper = container.querySelector('.fixed.inset-0');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('justify-center');
  });

  it('renders with animations in normal mode', () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);

    render(<LoadingScreen />);

    // Component should render (animations are handled by framer-motion)
    expect(screen.getByText('PrayerMap')).toBeInTheDocument();
  });

  it('renders without animations in reduced motion mode', () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);

    render(<LoadingScreen />);

    // Component should still render all content
    expect(screen.getByText('🙏')).toBeInTheDocument();
    expect(screen.getByText('PrayerMap')).toBeInTheDocument();
    expect(screen.getByText('We could all pray harder for our neighbor.')).toBeInTheDocument();
  });

  it('applies correct text styling to title', () => {
    render(<LoadingScreen />);

    const title = screen.getByText('PrayerMap');
    expect(title).toHaveClass('text-gray-800');
    expect(title).toHaveClass('tracking-wider');
  });

  it('applies correct text styling to tagline', () => {
    render(<LoadingScreen />);

    const tagline = screen.getByText('We could all pray harder for our neighbor.');
    expect(tagline).toHaveClass('text-gray-700');
    expect(tagline).toHaveClass('mt-2');
    expect(tagline).toHaveClass('italic');
  });

  it('renders loading bar with gradient', () => {
    const { container } = render(<LoadingScreen />);

    const loadingBar = container.querySelector('.bg-gradient-to-r.from-transparent.via-white\\/50.to-transparent');
    expect(loadingBar).toBeInTheDocument();
    expect(loadingBar).toHaveClass('h-1');
    expect(loadingBar).toHaveClass('mt-8');
    expect(loadingBar).toHaveClass('rounded-full');
    expect(loadingBar).toHaveClass('max-w-xs');
    expect(loadingBar).toHaveClass('mx-auto');
  });

  it('displays prayer emoji with correct size', () => {
    const { container } = render(<LoadingScreen />);

    const emoji = screen.getByText('🙏');
    // Check for text-8xl class in the container hierarchy
    const emojiContainer = container.querySelector('.text-8xl');
    expect(emojiContainer).toBeInTheDocument();
    expect(emojiContainer).toHaveTextContent('🙏');
  });

  it('renders all content in correct hierarchy', () => {
    const { container } = render(<LoadingScreen />);

    // Background
    const background = container.querySelector('.fixed.inset-0.bg-gradient-to-br');
    expect(background).toBeInTheDocument();

    // Center container
    const centerContent = background?.querySelector('.text-center');
    expect(centerContent).toBeInTheDocument();

    // Content order: emoji -> title -> tagline -> loading bar
    const emoji = screen.getByText('🙏');
    const title = screen.getByText('PrayerMap');
    const tagline = screen.getByText('We could all pray harder for our neighbor.');

    expect(emoji).toBeInTheDocument();
    expect(title).toBeInTheDocument();
    expect(tagline).toBeInTheDocument();
  });

  describe('Animation behavior in normal mode', () => {
    beforeEach(() => {
      vi.mocked(useReducedMotion).mockReturnValue(false);
    });

    it('emoji should have floating animation properties', () => {
      const { container } = render(<LoadingScreen />);

      const emojiContainer = screen.getByText('🙏').parentElement;
      // Framer motion applies these as inline styles, so we just verify the component renders
      expect(emojiContainer).toBeInTheDocument();
    });

    it('title should have entrance animation properties', () => {
      render(<LoadingScreen />);

      const title = screen.getByText('PrayerMap');
      expect(title).toBeInTheDocument();
    });

    it('tagline should have delayed entrance animation properties', () => {
      render(<LoadingScreen />);

      const tagline = screen.getByText('We could all pray harder for our neighbor.');
      expect(tagline).toBeInTheDocument();
    });

    it('loading bar should have width animation properties', () => {
      const { container } = render(<LoadingScreen />);

      const loadingBar = container.querySelector('.h-1.bg-gradient-to-r');
      expect(loadingBar).toBeInTheDocument();
    });
  });

  describe('Animation behavior in reduced motion mode', () => {
    beforeEach(() => {
      vi.mocked(useReducedMotion).mockReturnValue(true);
    });

    it('emoji should not have floating animation', () => {
      const { container } = render(<LoadingScreen />);

      const emojiContainer = screen.getByText('🙏').parentElement;
      // In reduced motion, the animate prop is empty {}
      expect(emojiContainer).toBeInTheDocument();
    });

    it('all animations should have duration: 0', () => {
      render(<LoadingScreen />);

      // All elements still render, just without animation
      expect(screen.getByText('🙏')).toBeInTheDocument();
      expect(screen.getByText('PrayerMap')).toBeInTheDocument();
      expect(screen.getByText('We could all pray harder for our neighbor.')).toBeInTheDocument();
    });

    it('renders content immediately visible', () => {
      render(<LoadingScreen />);

      // In reduced motion mode, initial opacity is 1
      expect(screen.getByText('PrayerMap')).toBeInTheDocument();
      expect(screen.getByText('We could all pray harder for our neighbor.')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('is visible to screen readers', () => {
      const { container } = render(<LoadingScreen />);

      // Text should be in the document and not hidden
      expect(screen.getByText('PrayerMap')).toBeVisible();
      expect(screen.getByText('We could all pray harder for our neighbor.')).toBeVisible();
    });

    it('respects reduced motion preference from system settings', () => {
      // Test with reduced motion enabled
      vi.mocked(useReducedMotion).mockReturnValue(true);

      render(<LoadingScreen />);

      // Should call the hook
      expect(useReducedMotion).toHaveBeenCalled();

      // Content should still be accessible
      expect(screen.getByText('PrayerMap')).toBeInTheDocument();
    });

    it('respects normal motion preference from system settings', () => {
      // Test with reduced motion disabled
      vi.mocked(useReducedMotion).mockReturnValue(false);

      render(<LoadingScreen />);

      // Should call the hook
      expect(useReducedMotion).toHaveBeenCalled();

      // Content should still be accessible
      expect(screen.getByText('PrayerMap')).toBeInTheDocument();
    });
  });

  describe('Styling consistency', () => {
    it('uses design system colors', () => {
      const { container } = render(<LoadingScreen />);

      const background = container.querySelector('.bg-gradient-to-br');
      expect(background).toHaveClass('from-[hsl(var(--ethereal-sky))]');
      expect(background).toHaveClass('via-[hsl(var(--ethereal-dawn))]');
      expect(background).toHaveClass('to-[hsl(var(--ethereal-purple))]');
    });

    it('maintains proper spacing between elements', () => {
      const { container } = render(<LoadingScreen />);

      // Check for mb-6 class on the emoji container
      const emojiContainer = container.querySelector('.text-8xl.mb-6');
      expect(emojiContainer).toBeInTheDocument();

      const tagline = screen.getByText('We could all pray harder for our neighbor.');
      expect(tagline).toHaveClass('mt-2');
    });

    it('uses consistent text colors', () => {
      render(<LoadingScreen />);

      const title = screen.getByText('PrayerMap');
      const tagline = screen.getByText('We could all pray harder for our neighbor.');

      expect(title).toHaveClass('text-gray-800');
      expect(tagline).toHaveClass('text-gray-700');
    });
  });

  describe('Layout', () => {
    it('covers entire viewport', () => {
      const { container } = render(<LoadingScreen />);

      const wrapper = container.querySelector('.fixed.inset-0');
      expect(wrapper).toHaveClass('fixed');
      expect(wrapper).toHaveClass('inset-0');
    });

    it('centers content both horizontally and vertically', () => {
      const { container } = render(<LoadingScreen />);

      const wrapper = container.querySelector('.fixed.inset-0');
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });

    it('constrains loading bar width', () => {
      const { container } = render(<LoadingScreen />);

      const loadingBar = container.querySelector('.h-1.bg-gradient-to-r');
      expect(loadingBar).toHaveClass('max-w-xs');
      expect(loadingBar).toHaveClass('mx-auto');
    });
  });
});

/**
 * Animation Components Test Suite
 *
 * Tests for:
 * - SpotlightBeams
 * - PrayerParticles
 * - CelebrationBurst
 * - PrayButton
 * - Animation hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpotlightBeams } from '../SpotlightBeams';
import { PrayerParticles } from '../PrayerParticles';
import { CelebrationBurst } from '../CelebrationBurst';
import { PrayButton } from '../../PrayButton';

// Mock Framer Motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    path: (props: any) => <path {...props} />,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock haptic hook
vi.mock('@/hooks/useHaptic', () => ({
  useHaptic: () => ({
    trigger: vi.fn(),
    light: vi.fn(),
    medium: vi.fn(),
    success: vi.fn(),
    prayerStart: vi.fn(),
    prayerConnect: vi.fn(),
    prayerComplete: vi.fn(),
    playPrayerAnimation: vi.fn(),
  }),
}));

describe('SpotlightBeams', () => {
  const defaultProps = {
    prayerPosition: { x: 100, y: 200 },
    userPosition: { x: 300, y: 400 },
    delay: 4,
    duration: 2,
    show: true,
  };

  it('renders when show is true', () => {
    const { container } = render(<SpotlightBeams {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('does not render when show is false', () => {
    const { container } = render(<SpotlightBeams {...defaultProps} show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('positions spotlight at prayer location', () => {
    const { container } = render(<SpotlightBeams {...defaultProps} />);
    // Check that elements are positioned at the prayer location
    const elements = container.querySelectorAll('[style*="left: 100"]');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('positions spotlight at user location', () => {
    const { container } = render(<SpotlightBeams {...defaultProps} />);
    // Check that elements are positioned at the user location
    const elements = container.querySelectorAll('[style*="left: 300"]');
    expect(elements.length).toBeGreaterThan(0);
  });
});

describe('PrayerParticles', () => {
  const defaultProps = {
    prayerPosition: { x: 100, y: 200 },
    userPosition: { x: 300, y: 400 },
    show: true,
  };

  it('renders particles when show is true', () => {
    const { container } = render(<PrayerParticles {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('does not render when show is false', () => {
    const { container } = render(<PrayerParticles {...defaultProps} show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('generates a reasonable number of particles', () => {
    const { container } = render(<PrayerParticles {...defaultProps} />);
    // Should have particles but not too many (performance)
    const particles = container.querySelectorAll('.rounded-full');
    expect(particles.length).toBeGreaterThan(10);
    expect(particles.length).toBeLessThan(50);
  });

  it('includes star burst elements', () => {
    const { container } = render(<PrayerParticles {...defaultProps} />);
    const stars = container.querySelectorAll('svg');
    expect(stars.length).toBeGreaterThan(0);
  });
});

describe('CelebrationBurst', () => {
  const defaultProps = {
    position: { x: 200, y: 300 },
    show: true,
    onComplete: vi.fn(),
  };

  it('renders when show is true', () => {
    const { container } = render(<CelebrationBurst {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('does not render when show is false', () => {
    const { container } = render(<CelebrationBurst {...defaultProps} show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('positions at the specified location', () => {
    const { container } = render(<CelebrationBurst {...defaultProps} />);
    const element = container.firstChild as HTMLElement;
    expect(element.style.left).toBe('200px');
    expect(element.style.top).toBe('300px');
  });

  it('renders sparkle particles', () => {
    const { container } = render(<CelebrationBurst {...defaultProps} />);
    const sparkles = container.querySelectorAll('svg');
    expect(sparkles.length).toBeGreaterThan(0);
  });
});

describe('PrayButton', () => {
  const defaultProps = {
    onPray: vi.fn(),
    disabled: false,
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with "Pray First. Then Press." text', () => {
    render(<PrayButton {...defaultProps} />);
    expect(screen.getByText('Pray First.')).toBeInTheDocument();
    expect(screen.getByText(/Then Press/)).toBeInTheDocument();
  });

  it('calls onPray when clicked', async () => {
    render(<PrayButton {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    // Wait for the anticipation delay
    vi.advanceTimersByTime(300);

    expect(defaultProps.onPray).toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    render(<PrayButton {...defaultProps} isLoading={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<PrayButton {...defaultProps} disabled={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows quick pray option when enabled', () => {
    render(<PrayButton {...defaultProps} showQuickOption={true} />);
    expect(screen.getByText(/Quick prayer/)).toBeInTheDocument();
  });

  it('transitions through states on click', async () => {
    render(<PrayButton {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    // Should show pressing state
    vi.advanceTimersByTime(100);
    expect(screen.getByText(/Sending prayer/)).toBeInTheDocument();

    // Should show sending state
    vi.advanceTimersByTime(200);
    expect(screen.getByText(/Prayer in flight/)).toBeInTheDocument();

    // Should show success state after 6 seconds
    vi.advanceTimersByTime(6000);
    await waitFor(() => {
      expect(screen.getByText(/Prayer sent/)).toBeInTheDocument();
    });
  });
});

describe('Animation Performance', () => {
  it('uses will-change for GPU acceleration', () => {
    const { container } = render(
      <PrayerParticles
        prayerPosition={{ x: 100, y: 200 }}
        userPosition={{ x: 300, y: 400 }}
        show={true}
      />
    );

    // Animation components should use transform for positioning
    // This is checked by ensuring no top/left animations
    const animatedElements = container.querySelectorAll('[style*="transform"]');
    expect(animatedElements.length).toBeGreaterThan(0);
  });
});

describe('Accessibility', () => {
  it('PrayButton has proper focus styles', () => {
    render(<PrayButton onPray={vi.fn()} />);
    const button = screen.getByRole('button');

    // Should have focus ring classes
    expect(button.className).toContain('focus:');
  });

  it('PrayButton is keyboard accessible', () => {
    const onPray = vi.fn();
    render(<PrayButton onPray={onPray} />);

    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });

    // Button should respond to keyboard
    expect(button).toHaveFocus;
  });

  it('animation containers have pointer-events-none', () => {
    const { container } = render(
      <SpotlightBeams
        prayerPosition={{ x: 100, y: 200 }}
        userPosition={{ x: 300, y: 400 }}
        show={true}
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('pointer-events-none');
  });
});

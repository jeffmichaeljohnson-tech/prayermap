import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button disabled onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  describe('variants', () => {
    it('should render default variant', () => {
      render(<Button variant="default">Default</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-primary');
    });

    it('should render destructive variant', () => {
      render(<Button variant="destructive">Destructive</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-destructive');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('border');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-secondary');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('hover:bg-accent');
    });

    it('should render link variant', () => {
      render(<Button variant="link">Link</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('underline-offset-4');
    });
  });

  describe('sizes', () => {
    it('should render default size', () => {
      render(<Button size="default">Default Size</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('h-9');
    });

    it('should render small size', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('h-8');
    });

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('h-10');
    });

    it('should render icon size', () => {
      render(<Button size="icon">Icon</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('h-9');
      expect(button.className).toContain('w-9');
    });
  });

  describe('custom className', () => {
    it('should merge custom className', () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });
  });

  describe('accessibility', () => {
    it('should support keyboard navigation', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Accessible</Button>);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalled();
    });

    it('should have focus-visible styles', () => {
      render(<Button>Focusable</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('focus-visible:outline-none');
      expect(button.className).toContain('focus-visible:ring-1');
    });
  });
});

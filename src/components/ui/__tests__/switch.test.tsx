import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../switch';

describe('Switch', () => {
  it('should render switch', () => {
    render(<Switch />);

    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeInTheDocument();
  });

  it('should toggle when clicked', async () => {
    const user = userEvent.setup();
    render(<Switch />);

    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('aria-checked', 'false');

    await user.click(switchElement);
    expect(switchElement).toHaveAttribute('aria-checked', 'true');

    await user.click(switchElement);
    expect(switchElement).toHaveAttribute('aria-checked', 'false');
  });

  it('should call onCheckedChange when toggled', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch onCheckedChange={handleChange} />);

    const switchElement = screen.getByRole('switch');
    await user.click(switchElement);

    expect(handleChange).toHaveBeenCalledWith(true);

    await user.click(switchElement);
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Switch disabled />);

    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('data-disabled', '');
  });

  it('should not toggle when disabled', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch disabled onCheckedChange={handleChange} />);

    const switchElement = screen.getByRole('switch');
    await user.click(switchElement);

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should support controlled checked state', () => {
    const { rerender } = render(<Switch checked={false} onCheckedChange={() => {}} />);

    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('aria-checked', 'false');

    rerender(<Switch checked={true} onCheckedChange={() => {}} />);
    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });

  it('should support keyboard navigation', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch onCheckedChange={handleChange} />);

    // Tab to focus the switch
    await user.tab();

    // Press Space to toggle
    await user.keyboard(' ');

    expect(handleChange).toHaveBeenCalledWith(true);
  });
});

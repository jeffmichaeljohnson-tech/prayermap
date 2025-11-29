import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input', () => {
  it('should render input field', () => {
    render(<Input placeholder="Enter text" />);

    expect(screen.getByPlaceholderText(/enter text/i)).toBeInTheDocument();
  });

  it('should accept user input', async () => {
    const user = userEvent.setup();
    render(<Input />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello World');

    expect(input).toHaveValue('Hello World');
  });

  it('should call onChange handler', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Test');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('should support different types', () => {
    render(<Input type="email" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should merge custom className', () => {
    render(<Input className="custom-input" />);

    const input = screen.getByRole('textbox');
    expect(input.className).toContain('custom-input');
  });

  it('should support default value', () => {
    render(<Input defaultValue="Default text" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Default text');
  });

  it('should support controlled value', () => {
    const { rerender } = render(<Input value="Controlled" onChange={() => {}} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Controlled');

    rerender(<Input value="Updated" onChange={() => {}} />);
    expect(input).toHaveValue('Updated');
  });
});

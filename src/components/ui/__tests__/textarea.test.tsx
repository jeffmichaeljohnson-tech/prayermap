import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '../textarea';

describe('Textarea', () => {
  it('should render textarea field', () => {
    render(<Textarea placeholder="Enter text" />);

    expect(screen.getByPlaceholderText(/enter text/i)).toBeInTheDocument();
  });

  it('should accept user input', async () => {
    const user = userEvent.setup();
    render(<Textarea />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Multi-line text');

    expect(textarea).toHaveValue('Multi-line text');
  });

  it('should call onChange handler', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Textarea onChange={handleChange} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Test');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Textarea disabled />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('should support rows prop', () => {
    render(<Textarea rows={10} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '10');
  });

  it('should merge custom className', () => {
    render(<Textarea className="custom-textarea" />);

    const textarea = screen.getByRole('textbox');
    expect(textarea.className).toContain('custom-textarea');
  });

  it('should support default value', () => {
    render(<Textarea defaultValue="Default text" />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Default text');
  });

  it('should support controlled value', () => {
    const { rerender } = render(<Textarea value="Controlled" onChange={() => {}} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Controlled');

    rerender(<Textarea value="Updated" onChange={() => {}} />);
    expect(textarea).toHaveValue('Updated');
  });
});

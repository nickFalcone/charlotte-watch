import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { AlertIcon } from './AlertIcon';
import { lightTheme } from '../theme/theme';

// Helper to render with theme context
function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>);
}

describe('AlertIcon', () => {
  it('renders icon for source', () => {
    renderWithTheme(<AlertIcon source="cmpd" />);
    const img = screen.getByRole('img', { name: 'cmpd' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src');
  });

  it('renders icon for category when source is not provided', () => {
    renderWithTheme(<AlertIcon category="weather" />);
    const img = screen.getByRole('img', { name: 'weather' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src');
  });

  it('prioritizes source over category', () => {
    renderWithTheme(<AlertIcon source="faa" category="weather" />);
    const img = screen.getByRole('img', { name: 'faa' });
    expect(img).toHaveAttribute('src');
  });

  it('returns null when no icon available', () => {
    const { container } = renderWithTheme(<AlertIcon source="custom" />);
    expect(container.firstChild).toBeNull();
  });

  it('applies custom size', () => {
    renderWithTheme(<AlertIcon source="duke" size={32} />);
    const img = screen.getByRole('img', { name: 'duke' });
    // Styled component sets width/height via CSS, check computed style instead
    expect(img).toHaveStyle({ width: '32px', height: '32px' });
  });

  it('applies className', () => {
    renderWithTheme(<AlertIcon source="nws" className="custom-class" />);
    const img = screen.getByRole('img', { name: 'nws' });
    expect(img).toHaveClass('custom-class');
  });

  it('uses default size of 20px when not specified', () => {
    renderWithTheme(<AlertIcon source="cats" />);
    const img = screen.getByRole('img', { name: 'cats' });
    expect(img).toHaveStyle({ width: '20px', height: '20px' });
  });
});

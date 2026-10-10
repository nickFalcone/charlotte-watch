import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../../theme/theme';
import { NcdotMapTab, NCDOT_EMBED_URL } from './NcdotMapTab';

afterEach(cleanup);

describe('NcdotMapTab', () => {
  it('embeds the DriveNC Charlotte map with a descriptive title', () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <NcdotMapTab />
      </ThemeProvider>
    );

    const frame = screen.getByTitle('NCDOT DriveNC traffic map for the Charlotte region');
    expect(frame).toHaveAttribute('src', NCDOT_EMBED_URL);
    expect(NCDOT_EMBED_URL).toContain('region=NC_Charlotte');
    expect(NCDOT_EMBED_URL).toContain('Cameras');
  });

  it('offers a link to open DriveNC in a new tab', () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <NcdotMapTab />
      </ThemeProvider>
    );

    const link = screen.getByRole('link', { name: /open drivenc map in a new tab/i });
    expect(link).toHaveAttribute('href', 'https://www.drivenc.gov/map');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});

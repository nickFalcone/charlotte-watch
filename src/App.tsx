import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { Dashboard } from './components/Dashboard';
import { useThemeStore, GlobalStyles } from './theme';
import type { ThemeStore } from './theme/themeStore';

// Create QueryClient OUTSIDE component to preserve cache across renders.
// Server-side KV caching (see docs/CLOUDFLARE_KV_CACHING.md) handles cross-client
// response sharing; in-memory React Query cache handles within-session dedup.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes in-memory retention
      retry: 2,
    },
  },
});

function App() {
  const theme = useThemeStore((state: ThemeStore) => state.theme);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

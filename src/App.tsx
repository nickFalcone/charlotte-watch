import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { ThemeProvider } from 'styled-components';
import { Dashboard } from './components/Dashboard';
import { useThemeStore, GlobalStyles } from './theme';
import type { ThemeStore } from './theme/themeStore';

// Create QueryClient OUTSIDE component to preserve cache across renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24, // Keep inactive queries in cache for 24 hours by default
      retry: 2,
      refetchOnMount: false, // CRITICAL: Don't refetch on mount if data exists
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: false, // Don't refetch when reconnecting
    },
  },
});

// Create persister to save query cache to localStorage
const persister = createAsyncStoragePersister({
  storage: window.localStorage,
  key: 'charlotte-watch-query-cache',
});

function App() {
  const theme = useThemeStore((state: ThemeStore) => state.theme);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <Dashboard />
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

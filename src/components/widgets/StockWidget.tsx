import { useRef, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useTheme } from 'styled-components';
import { ResponsiveTreeMap } from '@nivo/treemap';
import type { WidgetProps } from '../../types';
import { useWidgetMetadata } from '../Widget';
import { queryKeys } from '../../utils/queryKeys';
import {
  StockContainer,
  TreemapContainer,
  LoadingContainer,
  LoadingIcon,
  LoadingText,
  ErrorContainer,
  ErrorIcon,
  ErrorText,
  RetryButton,
  StockTooltip,
  TooltipSymbol,
  TooltipName,
  TooltipPrice,
  TooltipMarketCap,
  TooltipChange,
} from './StockWidget.styles';

// Use Pages Functions in production, dev proxy in development
const FINNHUB_QUOTE_URL = import.meta.env.DEV
  ? '/proxy/finnhub/api/v1/quote'
  : '/api/finnhub-quote';

const FINNHUB_PROFILE_URL = import.meta.env.DEV
  ? '/proxy/finnhub/api/v1/stock/profile2'
  : '/api/finnhub-profile';

function isMarketOpen(): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find(p => p.type === 'weekday')?.value;
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);

  const isWeekday = weekday && !['Sat', 'Sun'].includes(weekday);
  if (!isWeekday) return false;

  const timeInMinutes = hour * 60 + minute;
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM

  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
}

const STOCK_TICKERS = [
  'BAC',
  'LOW',
  'HON',
  'NUE',
  'DUK',
  'TT',
  'SAH',
  'TFC',
  'IR',
  'COKE',
  'ALB',
  'RXO',
  'COMM',
  'XRAY',
  'JELD',
  'CW',
  'FUN',
  'DRVN',
  'SPXC',
  'DNUT',
  'HAYW',
  'NPO',
  'CMCO',
  'TREE',
  'PAY',
  'CATO',
  'NNBR',
  'DDD',
  'KEQU',
  'BBDC',
  'PEBK',
  'AKTSQ',
  'YCBD',
  'FGF',
  'SATL',
  'STLY',
  'VTAK',
];

interface StockQuote {
  symbol: string;
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High
  l: number; // Low
  o: number; // Open
  pc: number; // Previous close
}

interface CompanyProfile {
  symbol: string;
  name: string;
  marketCapitalization: number; // In millions
}

interface TreemapNode {
  id: string;
  value: number;
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  marketCap: number;
  children?: TreemapNode[];
}

async function fetchStockQuote(symbol: string, signal?: AbortSignal): Promise<StockQuote | null> {
  try {
    const response = await fetch(`${FINNHUB_QUOTE_URL}?symbol=${symbol}`, { signal });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (data.c === 0 && data.d === null) {
      return null;
    }
    return { symbol, ...data };
  } catch {
    return null;
  }
}

async function fetchCompanyProfile(
  symbol: string,
  signal?: AbortSignal
): Promise<CompanyProfile | null> {
  try {
    const response = await fetch(`${FINNHUB_PROFILE_URL}?symbol=${symbol}`, { signal });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (!data.name) {
      return null;
    }
    return {
      symbol,
      name: data.name,
      marketCapitalization: data.marketCapitalization ?? 0,
    };
  } catch {
    return null;
  }
}

function getColorForChange(percentChange: number): string {
  if (percentChange > 3) return '#16a34a';
  if (percentChange > 1.5) return '#22c55e';
  if (percentChange > 0.5) return '#4ade80';
  if (percentChange > 0) return '#86efac';
  if (percentChange > -0.5) return '#fca5a5';
  if (percentChange > -1.5) return '#f87171';
  if (percentChange > -3) return '#ef4444';
  return '#dc2626';
}

function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1000000) return `$${(marketCap / 1000000).toFixed(1)}T`;
  if (marketCap >= 1000) return `$${(marketCap / 1000).toFixed(1)}B`;
  return `$${marketCap.toFixed(0)}M`;
}

function transformToTreemapData(quotes: StockQuote[], profiles: CompanyProfile[]): TreemapNode {
  const profileMap = new Map(profiles.map(p => [p.symbol, p]));

  const children: TreemapNode[] = quotes
    .map(quote => {
      const profile = profileMap.get(quote.symbol);
      return {
        id: quote.symbol,
        value: Math.max(profile?.marketCapitalization ?? 1, 1),
        symbol: quote.symbol,
        name: profile?.name ?? quote.symbol,
        price: quote.c,
        change: quote.d ?? 0,
        percentChange: quote.dp ?? 0,
        marketCap: profile?.marketCapitalization ?? 0,
      };
    })
    .filter(node => node.marketCap > 0);

  return {
    id: 'stocks',
    value: 0,
    symbol: '',
    name: '',
    price: 0,
    change: 0,
    percentChange: 0,
    marketCap: 0,
    children,
  };
}

function getPausedReason(): string | null {
  return isMarketOpen() ? null : 'Market closed';
}

export function StockWidget(_props: WidgetProps) {
  const theme = useTheme();
  const { setLastUpdated, setPausedReasonFn } = useWidgetMetadata();

  // Register the paused reason function once on first render.
  // Using a ref avoids needing useEffect - the function is stable and
  // TimeUpdated will call it fresh on each of its 10-second re-renders.
  const hasRegisteredPausedReason = useRef(false);
  if (!hasRegisteredPausedReason.current) {
    setPausedReasonFn(getPausedReason);
    hasRegisteredPausedReason.current = true;
  }

  // Fetch individual profiles with per-symbol caching
  const profileQueries = useQueries({
    queries: STOCK_TICKERS.map(symbol => ({
      queryKey: queryKeys.stock.profile(symbol),
      queryFn: ({ signal }: { signal?: AbortSignal }) => fetchCompanyProfile(symbol, signal),
      staleTime: 1000 * 60 * 60 * 24, // 24 hours - data stays fresh for 1 day
      gcTime: Infinity, // Keep in cache forever (until manually cleared)
      refetchInterval: 1000 * 60 * 60 * 24, // Auto-refresh once per day (24 hours)
      refetchOnMount: false, // Don't refetch on mount if data exists
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: false, // Don't refetch on reconnect
      retry: 1, // Only retry once on failure to avoid hammering API
    })),
  });

  const profilesLoading = profileQueries.some(q => q.isLoading);
  const profilesError = profileQueries.some(q => q.isError);
  const profiles = profileQueries
    .map(q => q.data)
    .filter((p): p is CompanyProfile => p !== null && p !== undefined);

  // Fetch individual quotes with per-symbol caching
  const quoteQueries = useQueries({
    queries: STOCK_TICKERS.map(symbol => ({
      queryKey: queryKeys.stock.quote(symbol),
      queryFn: ({ signal }: { signal?: AbortSignal }) => fetchStockQuote(symbol, signal),
      staleTime: 1000 * 60 * 15, // 15 minutes - data stays fresh
      gcTime: Infinity, // Keep in cache forever (until manually cleared)
      refetchInterval: () => (isMarketOpen() ? 1000 * 60 * 15 : false), // Auto-refresh every 15 min when market is open
      refetchOnMount: false, // Don't refetch on mount if data exists
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: false, // Don't refetch on reconnect
      enabled: profileQueries.every(q => q.isFetched), // Wait for profiles to load first
      retry: 1, // Only retry once on failure
    })),
  });

  const quotesLoading = quoteQueries.some(q => q.isLoading);
  const quotesError = quoteQueries.some(q => q.isError);
  const quotes = quoteQueries
    .map(q => q.data)
    .filter((q): q is StockQuote => q !== null && q !== undefined);

  // Use the latest dataUpdatedAt from any quote query
  const dataUpdatedAt = Math.max(...quoteQueries.map(q => q.dataUpdatedAt || 0));
  const error = quoteQueries.find(q => q.error)?.error;

  const refetch = () => {
    profileQueries.forEach(q => q.refetch());
    quoteQueries.forEach(q => q.refetch());
  };

  // Sync React Query's dataUpdatedAt timestamp to widget metadata context.
  // MUST use useEffect to avoid infinite render loops.
  useEffect(() => {
    setLastUpdated(dataUpdatedAt || null);
  }, [dataUpdatedAt, setLastUpdated]);

  const isLoading = profilesLoading || quotesLoading;
  const isError = profilesError || quotesError;

  if (isLoading) {
    return (
      <LoadingContainer>
        <LoadingIcon>📈</LoadingIcon>
        <LoadingText>Loading stock data...</LoadingText>
      </LoadingContainer>
    );
  }

  if (isError) {
    return (
      <ErrorContainer>
        <ErrorIcon>⚠️</ErrorIcon>
        <ErrorText>
          {error instanceof Error ? error.message : 'Failed to load stock data'}
        </ErrorText>
        <RetryButton onClick={() => refetch()}>Retry</RetryButton>
      </ErrorContainer>
    );
  }

  if (!quotes || quotes.length === 0 || !profiles) {
    return (
      <ErrorContainer>
        <ErrorIcon>📊</ErrorIcon>
        <ErrorText>No stock data available</ErrorText>
        <RetryButton onClick={() => refetch()}>Retry</RetryButton>
      </ErrorContainer>
    );
  }

  const treemapData = transformToTreemapData(quotes, profiles);

  return (
    <StockContainer>
      <TreemapContainer>
        <ResponsiveTreeMap<TreemapNode>
          data={treemapData}
          identity="id"
          value="value"
          valueFormat=" >-.2s"
          tile="squarify"
          leavesOnly={true}
          innerPadding={2}
          outerPadding={2}
          borderWidth={1}
          borderColor="rgba(0,0,0,0.3)"
          colors={node => getColorForChange(node.data.percentChange)}
          label={node => `${node.id}`}
          labelSkipSize={30}
          // orientLabel={false}
          labelTextColor={theme.colors.text}
          parentLabelPosition="left"
          parentLabelTextColor={theme.colors.text}
          tooltip={({ node }) => (
            <StockTooltip>
              <TooltipSymbol>{node.data.symbol}</TooltipSymbol>
              <TooltipName>{node.data.name}</TooltipName>
              <TooltipPrice>${node.data.price.toFixed(2)}</TooltipPrice>
              <TooltipChange $positive={node.data.percentChange >= 0}>
                {node.data.percentChange >= 0 ? '+' : ''}
                {node.data.percentChange.toFixed(2)}% ({node.data.change >= 0 ? '+' : ''}$
                {node.data.change.toFixed(2)})
              </TooltipChange>
              <TooltipMarketCap>Mkt Cap: {formatMarketCap(node.data.marketCap)}</TooltipMarketCap>
            </StockTooltip>
          )}
        />
      </TreemapContainer>
    </StockContainer>
  );
}

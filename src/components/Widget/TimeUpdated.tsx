import { useState, useEffect } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import styled from 'styled-components';

const TimeText = styled.span`
  font-size: 11px;
  color: ${props => props.theme.colors.text};
  white-space: nowrap;
  flex-shrink: 0;
`;

interface TimeUpdatedProps {
  timestamp: number | null;
  getPausedReason: () => string | null;
}

export function TimeUpdated({ timestamp, getPausedReason }: TimeUpdatedProps) {
  const [, forceUpdate] = useState(0);

  // Sync with system clock (browser API) to update relative time display every 10 seconds.
  // This ensures "2 minutes ago" updates to "3 minutes ago" without manual refreshes.
  // Cleanup: clears the interval to prevent memory leaks.
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(prev => prev + 1), 10000);
    return () => clearInterval(interval);
  }, []); // Empty deps: set up once on mount, no need to recreate interval

  const pausedReason = getPausedReason();
  if (pausedReason) {
    return <TimeText>{pausedReason}</TimeText>;
  }

  if (!timestamp) {
    return <TimeText>Timestamp unavailable</TimeText>;
  }

  const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);

  if (secondsAgo < 10) {
    return <TimeText>just now</TimeText>;
  }

  return <TimeText>{formatDistanceToNowStrict(timestamp, { addSuffix: true })}</TimeText>;
}

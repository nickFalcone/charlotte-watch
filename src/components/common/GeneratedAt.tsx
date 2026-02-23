import styled from 'styled-components';
import { formatGeneratedAt } from './formatTimestamp';

const StyledGeneratedAt = styled.div`
  font-size: 10px;
  /* 7:1 on backgroundTertiary for WCAG AAA (textMuted fails at 6.74:1) */
  color: ${props => (props.theme.name === 'light' ? '#4e4e52' : props.theme.colors.textMuted)};
`;

interface GeneratedAtProps {
  date: Date | string;
}

export function GeneratedAt({ date }: GeneratedAtProps) {
  return <StyledGeneratedAt>Generated: {formatGeneratedAt(date)}</StyledGeneratedAt>;
}

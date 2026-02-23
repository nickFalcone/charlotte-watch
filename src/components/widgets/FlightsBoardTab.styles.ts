import styled from 'styled-components';

export const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0;
  overflow-y: auto;
  height: 100%;
`;

export const SectionLabel = styled.h4`
  margin: 0 0 8px 0;
  font-size: 11px;
  font-weight: 700;
  color: ${props => props.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.6px;
`;

export const SectionBlock = styled.div`
  flex-shrink: 0;
`;

export const FlightTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
`;

export const TableHead = styled.thead`
  th {
    padding: 0 6px 6px 0;
    font-size: 10px;
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    white-space: nowrap;
  }
  th:nth-child(3) {
    text-align: right;
  }
  th:last-child {
    padding-right: 0;
    text-align: right;
  }
`;

export const TableBody = styled.tbody``;

export const FlightRow = styled.tr`
  border-bottom: 1px solid ${props => props.theme.colors.border}20;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${props => props.theme.colors.backgroundSecondary}40;
  }
`;

export const FlightCell = styled.td`
  padding: 7px 6px 7px 0;
  color: ${props => props.theme.colors.text};
  vertical-align: middle;

  &:last-child {
    padding-right: 0;
    text-align: right;
  }
`;

export const FlightNumber = styled.span`
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  white-space: nowrap;
`;

export const AirlineName = styled.span`
  font-size: 11px;
  color: ${props => props.theme.colors.textSecondary};
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
`;

export const AirportCode = styled.span`
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

export const AirportName = styled.span`
  font-size: 10px;
  color: ${props => props.theme.colors.textMuted};
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 110px;
`;

export const TimeCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
`;

export const ScheduledTime = styled.span`
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', monospace;
  color: ${props => props.theme.colors.text};
  white-space: nowrap;
`;

export const RevisedTime = styled.span`
  font-size: 10px;
  font-family: 'Monaco', 'Menlo', monospace;
  color: ${props => props.theme.colors.warning};
  white-space: nowrap;
`;

export const StatusBadge = styled.span<{ $color: string }>`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  background: ${({ $color }) => `${$color}20`};
  color: ${({ $color }) => $color};
  white-space: nowrap;
`;

export const EmptyRow = styled.tr``;

export const EmptyCell = styled.td`
  padding: 12px 0;
  font-size: 12px;
  color: ${props => props.theme.colors.textMuted};
  font-style: italic;
`;

export const TableContainer = styled.div`
  overflow-y: auto;
  height: 100%;
`;

export const LoadingText = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textMuted};
  padding: 16px 0;
  text-align: center;
`;

export const ErrorText = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.error};
  padding: 16px 0;
  text-align: center;
`;

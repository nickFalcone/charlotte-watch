import styled from 'styled-components';

export const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  flex: 1;
  padding-right: 4px;
  /* Make scrollable region keyboard accessible */
  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: -2px;
  }
`;

export const CardItem = styled.button<{ $accentColor: string; $accentBg?: string }>`
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 0;
  padding: 12px;
  font: inherit;
  text-align: left;
  border: none;
  border-left: 4px solid ${({ $accentColor }) => $accentColor};
  border-radius: 8px;
  background: ${props => props.theme.colors.backgroundSecondary};
  cursor: pointer;
  transition: all 0.15s ease;
  appearance: none;

  &:hover {
    background: ${props => props.theme.colors.backgroundTertiary};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const CardItemHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`;

export const CardTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
`;

export const CardSourceIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  color: ${props => props.theme.colors.text};
`;

export const CardTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  line-height: 1.3;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const CardBadge = styled.span<{ $color: string; $bg: string }>`
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-radius: 4px;
  flex-shrink: 0;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

export const CardSummary = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.textSecondary};
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
`;

export const CardMetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

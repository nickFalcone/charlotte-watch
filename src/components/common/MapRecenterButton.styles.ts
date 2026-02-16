import styled from 'styled-components';

export const MapRecenterButtonBase = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  color: ${props => props.theme.colors.text};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.backgroundTertiary};
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
`;

export const MapRecenterButtonIcon = styled.img`
  width: 16px;
  height: 16px;
  object-fit: contain;
  filter: ${props => props.theme.iconFilter};
`;

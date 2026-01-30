import styled from 'styled-components';

/**
 * Shared info icon and popover components
 * Used in AlertsWidget and NewsWidget for AI summary info tooltips
 */

export const InfoIcon = styled.img`
  width: 14px;
  height: 14px;
  object-fit: contain;
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
`;

export const InfoTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${props => props.theme.colors.textMuted};
  cursor: pointer;
  flex-shrink: 0;
  transition:
    color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: ${props => props.theme.colors.text};
    background: ${props => props.theme.colors.backgroundSecondary};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const PopoverContent = styled.div`
  padding: 10px 12px;
  background: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  line-height: 1.45;
  color: ${props => props.theme.colors.text};
  max-width: 260px;
  z-index: 3000;
`;

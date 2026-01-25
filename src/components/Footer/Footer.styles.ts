import styled from 'styled-components';

export const FooterBar = styled.footer`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  padding: 12px 0 0;
  margin-top: 20px;
  border-top: 1px solid ${props => props.theme.colors.border};
  font-size: 12px;
  color: ${props => props.theme.colors.textMuted};
  flex-shrink: 0;
`;

export const FooterReportLink = styled.a`
  &:visited {
    color: ${props => props.theme.colors.link};
  }
`;

export const FooterLinkButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-size: 12px;
  color: ${props => props.theme.colors.link};
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover {
    color: ${props => props.theme.colors.primaryHover};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const FooterDialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2000;
  overflow-y: auto;
`;

export const FooterDialogContent = styled.div`
  max-width: 600px;
  width: 100%;
  background: ${props => props.theme.colors.widgetBackground};
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.widgetBorder};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const FooterDialogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

export const FooterDialogTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

export const FooterDialogClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: ${props => props.theme.colors.textMuted};
  font-size: 18px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${props => props.theme.colors.backgroundTertiary};
    color: ${props => props.theme.colors.text};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const FooterDialogCloseIcon = styled.img`
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
`;

export const FooterDialogBody = styled.div`
  padding: 20px;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 13px;
  line-height: 1.6;

  p {
    margin: 0 0 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

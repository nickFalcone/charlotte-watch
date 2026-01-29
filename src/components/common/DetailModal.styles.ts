import styled from 'styled-components';

export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.7);
  z-index: 2000;
  overflow-y: auto;
`;

export const ModalContent = styled.div`
  max-width: 600px;
  max-height: 80vh;
  width: 100%;
  background: ${props => props.theme.colors.widgetBackground};
  border-radius: 12px;
  border: 1px solid ${props => props.theme.colors.widgetBorder};
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const ModalHeader = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: ${({ $color }) => `${$color}15`};
  border-bottom: 1px solid ${props => props.theme.colors.border};
`;

export const ModalTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const ModalTitleText = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

export const ModalCloseIcon = styled.img`
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: ${props => (props.theme.name === 'dark' ? 'invert(1) brightness(0.9)' : 'none')};
`;

export const ModalClose = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
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
`;

export const ModalBody = styled.div`
  padding: 20px;
  overflow-y: auto;
  flex: 1;
`;

export const ModalSection = styled.div`
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const ModalLabel = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

export const ModalText = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.text};
  line-height: 1.5;
  white-space: pre-wrap;
`;

import styled from 'styled-components';

export const NcdotMapContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  gap: 6px;
`;

export const NcdotMapFrame = styled.iframe`
  flex: 1;
  min-height: 0;
  width: 100%;
  border: none;
  overflow: hidden;
  border-radius: 8px;

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const NcdotMapFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 12px;
`;

export const NcdotMapLink = styled.a`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 8px;
  color: ${props => props.theme.colors.link};

  &:visited {
    color: ${props => props.theme.colors.linkVisited};
  }

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

import styled from 'styled-components';

export const NewsContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  overflow: hidden;
`;

export const NewsHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

export const ArticleCount = styled.span`
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  white-space: nowrap;
  background: ${props => props.theme.colors.primary}20;
  color: ${props => props.theme.colors.primary};
`;

export const ArticleSource = styled.span`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: ${props => props.theme.colors.textMuted};
`;

export const ArticleLink = styled.a`
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  word-break: break-all;

  &:hover {
    text-decoration: underline;
  }
`;

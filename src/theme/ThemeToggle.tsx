import styled from 'styled-components';
import { useThemeStore } from './themeStore';

const ToggleButton = styled.button`
  background: ${props => props.theme.colors.backgroundSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.colors.text};
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.backgroundTertiary};
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  span {
    font-size: 18px;
  }
`;

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme.name === 'dark';

  return (
    <ToggleButton
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span>{isDark ? '☀️' : '🌙'}</span>
    </ToggleButton>
  );
}

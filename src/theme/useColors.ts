/**
 * Hook per accedere ai colori del tema corrente.
 */
import { useTheme } from './ThemeContext';
import { getColors, type ThemeColors } from './colors';

export function useColors(): ThemeColors {
  const { effective } = useTheme();
  return getColors(effective);
}
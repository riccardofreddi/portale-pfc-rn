/**
 * Portale PFC RN — Design System
 *
 * Palette: navy profondo come primario, coral/amber come accento.
 * Supporto light + dark mode tramite la funzione getColors(theme).
 */

export interface ThemeColors {
  // === Primari ===
  primary: string;
  primaryLight: string;
  background: string;
  surface: string;
  surfaceAlt: string;

  // === Accent ===
  accent: string;
  accentSoft: string;
  accentDark: string;

  // === Stato ===
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  // === Testo ===
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // === Bordi ===
  border: string;
  borderStrong: string;

  // === Overlay ===
  overlay: string;
}

const lightColors: ThemeColors = {
  primary: '#0F172A',
  primaryLight: '#1E293B',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',

  accent: '#F97316',
  accentSoft: '#FFEDD5',
  accentDark: '#C2410C',

  success: '#10B981',
  successSoft: '#D1FAE5',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  info: '#3B82F6',
  infoSoft: '#DBEAFE',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  overlay: 'rgba(15, 23, 42, 0.6)',
};

const darkColors: ThemeColors = {
  primary: '#020617',
  primaryLight: '#0F172A',
  background: '#020617',
  surface: '#0F172A',
  surfaceAlt: '#1E293B',

  accent: '#FB923C',
  accentSoft: 'rgba(251, 146, 60, 0.15)',
  accentDark: '#F97316',

  success: '#34D399',
  successSoft: 'rgba(52, 211, 153, 0.15)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.15)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.15)',
  info: '#60A5FA',
  infoSoft: 'rgba(96, 165, 250, 0.15)',

  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textTertiary: '#64748B',
  textInverse: '#0F172A',

  border: '#1E293B',
  borderStrong: '#334155',

  overlay: 'rgba(0, 0, 0, 0.7)',
};

export function getColors(theme: 'light' | 'dark'): ThemeColors {
  return theme === 'dark' ? darkColors : lightColors;
}

// Export `colors` come alias al light theme per compatibilità
export const colors: ThemeColors = lightColors;
export type Color = keyof ThemeColors;
/**
 * Portale PFC RN — Design System
 *
 * Palette: "Midnight Sapphire & Champagne Gold" (ripresa dall'app Android v4):
 * blu notte come primario, oro champagne come accento.
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
  primary: '#003566',
  primaryLight: '#034078',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',

  accent: '#D4AF37',
  accentSoft: '#FFF7E6',
  accentDark: '#996515',

  success: '#10B981',
  successSoft: '#ECFDF5',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  danger: '#EF4444',
  dangerSoft: '#FEF2F2',
  info: '#0284C7',
  infoSoft: '#E0F2FE',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textInverse: '#FFFFFF',

  border: '#E2E8F0',
  borderStrong: '#94A3B8',

  overlay: 'rgba(10, 17, 40, 0.6)',
};

// Dark: "Midnight Luxury" (dall'app Android v4)
const darkColors: ThemeColors = {
  primary: '#1C2B4B',
  primaryLight: '#334A75',
  background: '#070B19',
  surface: '#0D1527',
  surfaceAlt: '#131D36',

  accent: '#D4AF37',
  accentSoft: 'rgba(212, 175, 55, 0.15)',
  accentDark: '#F7E7B4',

  success: '#34D399',
  successSoft: 'rgba(52, 211, 153, 0.15)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.15)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.15)',
  info: '#60A5FA',
  infoSoft: 'rgba(96, 165, 250, 0.15)',

  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textInverse: '#0F172A',

  border: '#1E2D4A',
  borderStrong: '#334A75',

  overlay: 'rgba(0, 0, 0, 0.7)',
};

export function getColors(theme: 'light' | 'dark'): ThemeColors {
  return theme === 'dark' ? darkColors : lightColors;
}

// Export `colors` come alias al light theme per compatibilità
export const colors: ThemeColors = lightColors;
export type Color = keyof ThemeColors;

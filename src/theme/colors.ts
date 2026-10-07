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
  // v4.97: ogni famiglia di stato ha DUE tonalita': `xxx` (il colore
  // acceso, per le ICONE grandi) e `xxxText` (la versione piu' scura
  // della stessa tinta, per le SCRITTE piccole da 11px, cosi' il testo
  // resta sempre >= 4.5:1 di contrasto sul fondo soft). Nel tema scuro
  // `xxxText` coincide con `xxx`: i colori chiari sul fondo notte sono
  // gia' leggibili cosi' come sono.
  success: string;
  successText: string;
  successSoft: string;
  warning: string;
  warningText: string;
  warningSoft: string;
  danger: string;
  dangerText: string;
  dangerSoft: string;
  info: string;
  infoText: string;
  infoSoft: string;

  // === Verde-acqua (v4.97: la famiglia "carica") ===
  // Stessa struttura: acceso per l'icona, soft per il fondo, text per
  // la scritta. Caricare e' il contrario di scaricare: le voci di
  // UPLOAD portano questa tinta, il verde resta allo scarico.
  teal: string;
  tealText: string;
  tealSoft: string;

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
  successText: '#047857',
  successSoft: '#ECFDF5',
  warning: '#F59E0B',
  warningText: '#B45309',
  warningSoft: '#FFFBEB',
  danger: '#EF4444',
  dangerText: '#B91C1C',
  dangerSoft: '#FEF2F2',
  info: '#0284C7',
  infoText: '#0369A1',
  infoSoft: '#E0F2FE',

  teal: '#0D9488',
  tealText: '#0F766E',
  tealSoft: '#E6F4F1',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textInverse: '#FFFFFF',

  border: '#E2E8F0',
  borderStrong: '#94A3B8',

  overlay: 'rgba(10, 17, 40, 0.6)',
};

// Dark: "Midnight Luxury" (dall'app Android v4)
// v4.33: VIA il nero — lo sfondo era quasi nero e il velo dei pannelli
// era nero puro: ora sfondo blu notte #0A1128 (il colore firma del
// brand) e velo azzurro notte uguale al tema chiaro.
const darkColors: ThemeColors = {
  primary: '#1C2B4B',
  primaryLight: '#334A75',
  background: '#0A1128',
  surface: '#0D1527',
  surfaceAlt: '#131D36',

  accent: '#D4AF37',
  accentSoft: 'rgba(212, 175, 55, 0.15)',
  accentDark: '#F7E7B4',

  // v4.97: xxxText = xxx (nel tema scuro la scritta e l'icona stanno
  // bene con la stessa tinta chiara)
  success: '#34D399',
  successText: '#34D399',
  successSoft: 'rgba(52, 211, 153, 0.15)',
  warning: '#FBBF24',
  warningText: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.15)',
  danger: '#F87171',
  dangerText: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.15)',
  info: '#60A5FA',
  infoText: '#60A5FA',
  infoSoft: 'rgba(96, 165, 250, 0.15)',

  teal: '#2DD4BF',
  tealText: '#5EEAD4',
  tealSoft: 'rgba(45, 212, 191, 0.15)',

  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textInverse: '#0F172A',

  border: '#1E2D4A',
  borderStrong: '#334A75',

  // v4.33: velo dei pannelli = blu notte translucido (prima nero puro)
  overlay: 'rgba(10, 17, 40, 0.6)',
};

export function getColors(theme: 'light' | 'dark'): ThemeColors {
  return theme === 'dark' ? darkColors : lightColors;
}

// Export `colors` come alias al light theme per compatibilità
export const colors: ThemeColors = lightColors;
export type Color = keyof ThemeColors;

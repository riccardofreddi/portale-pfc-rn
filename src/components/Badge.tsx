/**
 * Badge — pill colorato per stato/contatore.
 *
 * v4.11: palette allineata agli StatusBadge dell'app Android v4:
 * success = NUOVO (verde), neutral = VISTO (blu), accent = SCARICATO/PREFERITO
 * (oro), danger = scadenze, warning = richieste documento, info = informativi.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography, useColors, type ThemeColors } from '@/theme';

type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  label: string | number;
  variant?: BadgeVariant;
}

function variantStyles(colors: ThemeColors): Record<BadgeVariant, { bg: string; fg: string }> {
  return {
    // Oro champagne (SCARICATO / PREFERITO nell'app v4)
    accent: { bg: colors.accentSoft, fg: colors.accentDark },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
    // Blu navy su contenitore azzurro (VISTO nell'app v4)
    neutral: { bg: colors.surfaceAlt, fg: colors.primary },
  };
}

export function Badge({ label, variant = 'accent' }: BadgeProps) {
  const colors = useColors();
  const v = variantStyles(colors)[variant];
  return (
    <View
      style={[styles.badge, { backgroundColor: v.bg, borderColor: v.fg }]}
    >
      <Text style={[styles.text, { color: v.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  text: {
    ...typography.labelSmall,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

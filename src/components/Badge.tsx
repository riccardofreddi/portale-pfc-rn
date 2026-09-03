/**
 * Badge — pill colorato per stato/contatore.
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
    accent: { bg: colors.accentSoft, fg: colors.accentDark },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
    neutral: { bg: colors.surfaceAlt, fg: colors.textSecondary },
  };
}

export function Badge({ label, variant = 'accent' }: BadgeProps) {
  const colors = useColors();
  const v = variantStyles(colors)[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      <Text style={[styles.text, { color: v.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.labelSmall,
    fontSize: 10,
    letterSpacing: 0.3,
  },
});

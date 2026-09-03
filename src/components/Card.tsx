/**
 * Card — container con sfondo surface, border sottile, radius lg.
 */
import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { radius, shadow, spacing, useColors, type ThemeColors } from '@/theme';

interface CardProps extends ViewProps {
  padded?: boolean;
}

export function Card({ style, padded = true, children, ...rest }: CardProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <View style={[styles.card, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.sm,
    },
    padded: {
      padding: spacing.lg,
    },
  });

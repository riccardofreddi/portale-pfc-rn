/**
 * EmptyState — placeholder per liste vuote.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography, useColors, type ThemeColors } from '@/theme';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxxl,
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
    },
    iconWrap: {
      marginBottom: spacing.sm,
      opacity: 0.4,
    },
    title: {
      ...typography.body,
      color: colors.textTertiary,
      fontWeight: '500',
    },
    subtitle: {
      ...typography.caption,
      color: colors.textTertiary,
    },
  });

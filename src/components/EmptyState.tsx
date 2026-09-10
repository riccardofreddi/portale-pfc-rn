/**
 * EmptyState — placeholder per liste vuote (stile EmptyStateView dell'app v4).
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
      width: 76,
      height: 76,
      borderRadius: 22,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: 'rgba(212, 175, 55, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '700',
      textAlign: 'center',
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
    },
  });

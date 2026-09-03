/**
 * Button — componente CTA primario.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { radius, spacing, typography, useColors, type ThemeColors } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  loading = false,
  icon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';

  const containerStyle: ViewStyle = {
    ...styles.base,
    ...(size === 'lg' ? styles.sizeLg : styles.sizeMd),
    ...(isPrimary ? styles.primary : {}),
    ...(isSecondary ? styles.secondary : {}),
    ...(isGhost ? styles.ghost : {}),
    ...(disabled ? styles.disabled : {}),
    ...style,
  };

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [containerStyle, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      {...rest}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            color={isPrimary ? colors.textInverse : colors.accent}
            size="small"
          />
        ) : (
          <>
            {icon}
            <Text
              style={[
                styles.label,
                isPrimary && styles.labelPrimary,
                isSecondary && styles.labelSecondary,
                isGhost && styles.labelGhost,
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    base: {
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sizeLg: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      minHeight: 56,
    },
    sizeMd: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      minHeight: 44,
    },
    primary: {
      backgroundColor: colors.accent,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    disabled: {
      opacity: 0.5,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    label: {
      ...typography.button,
    },
    labelPrimary: {
      color: colors.textInverse,
    },
    labelSecondary: {
      color: colors.textPrimary,
    },
    labelGhost: {
      color: colors.accent,
    },
  });

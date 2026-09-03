/**
 * Splash screen mostrato durante il bootstrap iniziale.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing, typography, useColors, type ThemeColors } from '@/theme';

export function SplashScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>PF</Text>
        </View>
        <Text style={styles.title}>Portale PFC</Text>
        <Text style={styles.subtitle}>Caricamento...</Text>
        <ActivityIndicator
          size="large"
          color={colors.accent}
          style={styles.spinner}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.md,
    },
    logo: {
      width: 80,
      height: 80,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    logoText: {
      ...typography.h1,
      color: colors.textInverse,
      fontWeight: '800',
      fontSize: 36,
    },
    title: {
      ...typography.h2,
      color: colors.textInverse,
      fontWeight: '700',
    },
    subtitle: {
      ...typography.bodySmall,
      color: colors.textTertiary,
    },
    spinner: {
      marginTop: spacing.lg,
    },
  });

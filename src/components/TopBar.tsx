/**
 * TopBar — header fisso con logo + badge notifiche + menu utente.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/auth';
import { getInitials } from '@/lib/utils';
import { spacing, typography, useColors, type ThemeColors } from '@/theme';

export function TopBar() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const user = useAppStore((s) => s.user);
  const nNotifiche = useAppStore((s) => s.nNotifiche);
  const setShowNotifPanel = useAppStore((s) => s.setShowNotifPanel);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>PF</Text>
          </View>
          <Text style={styles.brandName}>Portale PFC</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => setShowNotifPanel(true)}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && styles.iconBtnPressed,
            ]}
            accessibilityLabel="Notifiche"
          >
            <Text style={styles.bellIcon}>🔔</Text>
            {nNotifiche > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {nNotifiche > 99 ? '99+' : nNotifiche}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={({ pressed }) => [
              styles.avatarBtn,
              pressed && styles.iconBtnPressed,
            ]}
            accessibilityLabel="Menu utente"
          >
            <Text style={styles.avatarText}>
              {user ? getInitials(user.name) : '?'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      backgroundColor: colors.primary,
    },
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      minHeight: 56,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    logo: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      ...typography.h4,
      color: colors.textInverse,
      fontWeight: '800',
    },
    brandName: {
      ...typography.h4,
      color: colors.textInverse,
      fontWeight: '700',
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBtnPressed: {
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    bellIcon: {
      fontSize: 18,
    },
    badge: {
      position: 'absolute',
      top: 6,
      right: 6,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      color: colors.textInverse,
      fontSize: 10,
      fontWeight: '700',
    },
    avatarBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.textInverse,
      fontWeight: '700',
      fontSize: 13,
    },
  });

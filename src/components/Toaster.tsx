/**
 * Toast/Snackbar system globale.
 */
import React, { useEffect } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { create } from 'zustand';
import { radius, spacing, typography, useColors, type ThemeColors } from '@/theme';
import { haptics } from '@/lib/haptics';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  subtitle?: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, subtitle?: string) => {
    haptics.success();
    return useToastStore.getState().push({ variant: 'success', title, subtitle });
  },
  error: (title: string, subtitle?: string) => {
    haptics.error();
    return useToastStore.getState().push({ variant: 'error', title, subtitle, duration: 5000 });
  },
  warning: (title: string, subtitle?: string) => {
    haptics.warning();
    return useToastStore.getState().push({ variant: 'warning', title, subtitle });
  },
  info: (title: string, subtitle?: string) => {
    haptics.tap();
    return useToastStore.getState().push({ variant: 'info', title, subtitle });
  },
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
};

function variantStyles(colors: ThemeColors): Record<ToastVariant, { bg: string; fg: string; icon: string; bar: string }> {
  return {
    success: { bg: colors.successSoft, fg: colors.success, icon: '✓', bar: colors.success },
    error: { bg: colors.dangerSoft, fg: colors.danger, icon: '✕', bar: colors.danger },
    warning: { bg: colors.warningSoft, fg: colors.warning, icon: '⚠', bar: colors.warning },
    info: { bg: colors.infoSoft, fg: colors.info, icon: 'ℹ', bar: colors.info },
  };
}

function ToastCard({ item }: { item: ToastItem }) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const dismiss = useToastStore((s) => s.dismiss);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const v = variantStyles(colors)[item.variant];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => dismiss(item.id));
    }, item.duration ?? 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim, dismiss, item.id, item.duration]);

  return (
    <Animated.View style={[styles.toastWrap, { opacity: fadeAnim }]}>
      <Pressable onPress={() => dismiss(item.id)}>
        <View style={[styles.toast, { backgroundColor: v.bg }]}>
          <View style={[styles.toastBar, { backgroundColor: v.bar }]} />
          <View style={styles.toastContent}>
            <View style={[styles.toastIcon, { backgroundColor: v.bar }]}>
              <Text style={styles.toastIconText}>{v.icon}</Text>
            </View>
            <View style={styles.toastText}>
              <Text style={[styles.toastTitle, { color: v.fg }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text style={[styles.toastSubtitle, { color: v.fg }]} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function Toaster() {
  const styles = useStyles();
  const toasts = useToastStore((s) => s.toasts);
  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </View>
  );
}

function useStyles() {
  const colors = useColors();
  return React.useMemo(() => makeStyles(colors), [colors]);
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 60,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 9999,
      elevation: 9999,
      pointerEvents: 'box-none',
    },
    toastWrap: {
      width: '90%',
      maxWidth: 400,
      marginBottom: spacing.sm,
    },
    toast: {
      flexDirection: 'row',
      borderRadius: radius.md,
      overflow: 'hidden',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },
    toastBar: {
      width: 4,
    },
    toastContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      flex: 1,
    },
    toastIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toastIconText: {
      color: colors.textInverse,
      fontSize: 14,
      fontWeight: '700',
    },
    toastText: {
      flex: 1,
      gap: 2,
    },
    toastTitle: {
      ...typography.bodySmall,
      fontWeight: '700',
    },
    toastSubtitle: {
      ...typography.caption,
    },
  });

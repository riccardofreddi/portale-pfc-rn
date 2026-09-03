/**
 * Skeleton — placeholder animato per loading stato.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { spacing, useColors } from '@/theme';

interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height?: number | `${number}%` | 'auto';
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.border },
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonList({ count = 4, height = 64 }: { count?: number; height?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} style={styles.listItem} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  listItem: {
    width: '100%',
  },
});

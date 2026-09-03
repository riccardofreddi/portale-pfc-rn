/**
 * Modal — bottom sheet style modal.
 */
import React from 'react';
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { radius, spacing, useColors, type ThemeColors } from '@/theme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Modal({ visible, onClose, children, style }: ModalProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, style]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      maxHeight: '85%',
      paddingBottom: spacing.xxxl,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderStrong,
      alignSelf: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
  });

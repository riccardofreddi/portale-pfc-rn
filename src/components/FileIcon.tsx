/**
 * FileIcon — badge con estensione del file e colore.
 *
 * v4.11: come il FileFormatIcon dell'app Android v4 — box arrotondato con
 * tinta soft per estensione e bordo sottile della stessa tinta.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography, useColors, type ThemeColors } from '@/theme';

interface FileIconProps {
  filename: string;
  size?: number;
}

interface IconConfig {
  icon: string;
  bg: string;
  fg: string;
}

function getIconConfig(filename: string, colors: ThemeColors): IconConfig {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, IconConfig> = {
    pdf: { icon: 'PDF', bg: '#FEF2F2', fg: '#DC2626' },
    xml: { icon: 'XML', bg: '#EEF2FF', fg: '#4F46E5' },
    p7m: { icon: 'XML', bg: '#EEF2FF', fg: '#4F46E5' },
    doc: { icon: 'DOC', bg: '#F0F9FF', fg: '#0284C7' },
    docx: { icon: 'DOC', bg: '#F0F9FF', fg: '#0284C7' },
    xls: { icon: 'XLS', bg: '#F0F9FF', fg: '#0284C7' },
    xlsx: { icon: 'XLS', bg: '#F0F9FF', fg: '#0284C7' },
    ppt: { icon: 'PPT', bg: '#FFFBEB', fg: '#D97706' },
    pptx: { icon: 'PPT', bg: '#FFFBEB', fg: '#D97706' },
    jpg: { icon: 'IMG', bg: '#ECFDF5', fg: '#059669' },
    jpeg: { icon: 'IMG', bg: '#ECFDF5', fg: '#059669' },
    png: { icon: 'IMG', bg: '#ECFDF5', fg: '#059669' },
    gif: { icon: 'IMG', bg: '#ECFDF5', fg: '#059669' },
    zip: { icon: 'ZIP', bg: '#FFFBEB', fg: '#D97706' },
    rar: { icon: 'RAR', bg: '#FFFBEB', fg: '#D97706' },
    txt: { icon: 'TXT', bg: '#F8FAFC', fg: '#64748B' },
    csv: { icon: 'CSV', bg: '#F8FAFC', fg: '#64748B' },
  };
  return (
    map[ext] ?? {
      icon: ext.slice(0, 3).toUpperCase() || 'FILE',
      bg: colors.surfaceAlt,
      fg: colors.textSecondary,
    }
  );
}

export function canPreviewFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return ['pdf'].includes(ext);
}

export function FileIcon({ filename, size = 40 }: FileIconProps) {
  const colors = useColors();
  const cfg = getIconConfig(filename, colors);
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: cfg.bg,
          width: size,
          height: size,
          borderRadius: size * 0.28,
          borderWidth: 1,
          borderColor: `${cfg.fg}33`,
        },
      ]}
    >
      <Text style={[styles.text, { color: cfg.fg, fontSize: size * 0.24 }]}>
        {cfg.icon}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.labelSmall,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

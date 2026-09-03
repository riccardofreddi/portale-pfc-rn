/**
 * FileIcon — badge con estensione del file e colore.
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
    pdf: { icon: 'PDF', bg: '#FEE2E2', fg: '#DC2626' },
    doc: { icon: 'DOC', bg: '#DBEAFE', fg: '#2563EB' },
    docx: { icon: 'DOC', bg: '#DBEAFE', fg: '#2563EB' },
    xls: { icon: 'XLS', bg: '#D1FAE5', fg: '#059669' },
    xlsx: { icon: 'XLS', bg: '#D1FAE5', fg: '#059669' },
    ppt: { icon: 'PPT', bg: '#FFEDD5', fg: '#EA580C' },
    pptx: { icon: 'PPT', bg: '#FFEDD5', fg: '#EA580C' },
    jpg: { icon: 'IMG', bg: '#F3E8FF', fg: '#7C3AED' },
    jpeg: { icon: 'IMG', bg: '#F3E8FF', fg: '#7C3AED' },
    png: { icon: 'IMG', bg: '#F3E8FF', fg: '#7C3AED' },
    gif: { icon: 'IMG', bg: '#F3E8FF', fg: '#7C3AED' },
    zip: { icon: 'ZIP', bg: '#F1F5F9', fg: '#475569' },
    rar: { icon: 'RAR', bg: '#F1F5F9', fg: '#475569' },
    txt: { icon: 'TXT', bg: '#F1F5F9', fg: '#475569' },
    csv: { icon: 'CSV', bg: '#D1FAE5', fg: '#059669' },
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
        { backgroundColor: cfg.bg, width: size, height: size, borderRadius: size * 0.25 },
      ]}
    >
      <Text style={[styles.text, { color: cfg.fg, fontSize: size * 0.25 }]}>
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

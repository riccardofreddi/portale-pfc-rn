/**
 * Schermata Preview PDF.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Pdf from 'react-native-pdf';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { spacing, typography, useColors, type ThemeColors } from '@/theme';

interface Props {
  route: { params: { key: string; nome: string } };
}

export default function PdfPreviewScreen({ route }: Props) {
  const colors = useColors();
  const styles = makeStyles(colors);

  const { key, nome } = route.params;
  const navigation = useNavigation();
  const setPreviewFile = useAppStore((s) => s.setPreviewFile);
  const [loading, setLoading] = useState(true);
  const [cookie, setCookie] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.documenti
      .sessionCookieHeader()
      .then(setCookie)
      .catch(() => setCookie(''));
    const unsub = navigation.addListener('blur', () => {
      setPreviewFile(null);
    });
    return unsub;
  }, [navigation, setPreviewFile]);

  const previewUrl = api.documenti.previewUrl(key);

  async function handleDownload() {
    haptics.impact();
    try {
      const cookieHeader = await api.documenti.sessionCookieHeader();
      const url = api.documenti.downloadUrl(key);
      const ext = nome.includes('.') ? '' : '.pdf';
      const localPath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${nome}${ext}`;
      const res = await ReactNativeBlobUtil.config({
        path: localPath,
        fileCache: true,
      }).fetch('GET', url, { Cookie: cookieHeader });
      toast.success('Download completato', `Salvato in: ${res.path()}`);
    } catch (err) {
      toast.error('Errore download', err instanceof Error ? err.message : 'Errore sconosciuto');
    }
  }

  if (cookie === null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Preparazione...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            setPreviewFile(null);
            navigation.goBack();
          }}
          style={styles.closeBtn}
          accessibilityLabel="Chiudi"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {nome}
        </Text>
        <Pressable onPress={handleDownload} hitSlop={8} style={styles.downloadBtn}>
          <Text style={styles.downloadBtnText}>⬇ Scarica</Text>
        </Pressable>
      </View>

      <View style={styles.pdfContainer}>
        {loading && !error && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Caricamento...</Text>
          </View>
        )}
        {error ? (
          <View style={styles.overlay}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <Pdf
          source={{
            uri: previewUrl,
            headers: {
              Cookie: cookie,
            },
            cache: true,
          }}
          onLoadComplete={() => setLoading(false)}
          onError={(err) => {
            setLoading(false);
            const msg = err && typeof err === 'object' && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'Errore caricamento PDF';
            setError(msg);
          }}
          style={styles.pdf}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    title: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
    },
    downloadBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      backgroundColor: colors.accentSoft,
    },
    downloadBtnText: {
      ...typography.bodySmall,
      color: colors.accent,
      fontWeight: '600',
    },
    pdfContainer: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
    },
    pdf: {
      flex: 1,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      zIndex: 1,
      gap: spacing.md,
    },
    loadingText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    errorText: {
      ...typography.body,
      color: colors.danger,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
  });

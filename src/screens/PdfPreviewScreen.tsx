/**
 * Schermata Preview PDF (v3.2 — metodo robusto).
 *
 * Prima il PDF veniva caricato DA INTERNET dentro il lettore, passando il
 * cookie: bastava poco (cookie mancante, risposta di errore del server) e
 * l'anteprima restava "Caricamento..." o dava errore. Ora il file viene
 * PRIMA scaricato in una cartella temporanea con il metodo sicuro usato
 * anche per i download (stessa sessione, controllo dello stato HTTP, errore
 * chiaro) e POI aperto da lì: funziona sempre, e se lo riapri è immediato
 * perché riusa la copia già scaricata.
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
import { useAppStore } from '@/store/auth';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { scaricaInDownload, scaricaInCache } from '@/lib/download';
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
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carica = React.useCallback(async () => {
    setError(null);
    setFileUri(null);
    try {
      const path = await scaricaInCache(key);
      setFileUri(`file://${path}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile aprire il file');
    }
  }, [key]);

  useEffect(() => {
    carica();
    const unsub = navigation.addListener('blur', () => {
      setPreviewFile(null);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, setPreviewFile]);

  async function handleDownload() {
    haptics.impact();
    setSalvando(true);
    try {
      await scaricaInDownload(key, nome);
      haptics.success();
      toast.success('File scaricato', 'Salvato in Download');
    } catch (err) {
      toast.error('Errore download', err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setSalvando(false);
    }
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
        <Pressable onPress={handleDownload} hitSlop={8} style={styles.downloadBtn} disabled={salvando}>
          {salvando ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={styles.downloadBtnText}>⬇ Scarica</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.pdfContainer}>
        {!fileUri && !error && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Caricamento...</Text>
          </View>
        )}
        {error ? (
          <View style={styles.overlay}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={carica} style={styles.retryBtn}>
              <Text style={styles.retryText}>↻ Riprova</Text>
            </Pressable>
          </View>
        ) : null}
        {fileUri ? (
          <Pdf
            source={{ uri: fileUri }}
            onError={(err) => {
              const msg = err && typeof err === 'object' && 'message' in err
                ? String((err as { message: unknown }).message)
                : 'Errore caricamento PDF';
              setError(msg);
            }}
            style={styles.pdf}
          />
        ) : null}
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
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
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
    retryBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 10,
      backgroundColor: colors.accent,
    },
    retryText: {
      ...typography.button,
      color: colors.textInverse,
      fontWeight: '700',
    },
  });

/**
 * Schermata Attività (registro audit).
 *
 * v4.11 — grafica replicata dall'app Android v4 (AttivitaScreen.kt):
 * - Testata su superficie chiara: overline oro "REGISTRO ATTIVITÀ & AUDIT",
 *   titolo "Tracciamento Operazioni" e descrizione.
 * - Ogni attività è una card con CERCHIO icona colorato per tipo azione,
 *   pillola etichetta colorata e timestamp allineato a destra.
 * - Tolto il pulsante "Aggiorna": si usa il trascina-per-aggiornare.
 * - Logica INTATTA: caricamento paginato (30 per pagina), "Carica altre
 *   attività", trascina per aggiornare, gestione errori silenziosa.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { formatDateAudit } from '@/lib/utils';
import type { AuditEntry } from '@/types/api';
import { spacing, typography, useColors, type ThemeColors } from '@/theme';

const PAGE_SIZE = 30;

/** Icona + tinta per tipo di azione (mappa dell'AuditLogRow dell'app v4). */
function getActionConfig(
  colors: ThemeColors,
): Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> {
  return {
    LOGIN_SUCCESS: { label: 'Accesso effettuato', icon: 'log-in-outline', bg: colors.successSoft, fg: colors.success },
    LOGIN_FAIL: { label: 'Tentativo di accesso', icon: 'alert-circle-outline', bg: colors.dangerSoft, fg: colors.danger },
    LOGOUT: { label: 'Disconnessione', icon: 'log-out-outline', bg: colors.surfaceAlt, fg: colors.textSecondary },
    DOWNLOAD_DOC: { label: 'Download documento', icon: 'download-outline', bg: colors.surfaceAlt, fg: colors.primary },
    PREVIEW_DOC: { label: 'Anteprima documento', icon: 'eye-outline', bg: colors.accentSoft, fg: colors.accentDark },
    TOGGLE_PREFERITO: { label: 'Preferito aggiornato', icon: 'star', bg: colors.accentSoft, fg: colors.accentDark },
    UPLOAD_CASSETTO: { label: 'Upload cassetto', icon: 'cloud-upload-outline', bg: colors.surfaceAlt, fg: colors.primary },
    UPLOAD_RISPOSTA: { label: 'Risposta inviata', icon: 'paper-plane-outline', bg: colors.infoSoft, fg: colors.info },
    ARCHIVIA_MESSAGGIO: { label: 'Messaggio archiviato', icon: 'archive-outline', bg: colors.surfaceAlt, fg: colors.textSecondary },
    DEARCHIVIA_MESSAGGIO: { label: 'Messaggio ripristinato', icon: 'arrow-undo-outline', bg: colors.surfaceAlt, fg: colors.textSecondary },
    SEGNA_LETTI: { label: 'Messaggi letti', icon: 'checkmark-done-outline', bg: colors.successSoft, fg: colors.success },
    DELETE_CASSETTO: { label: 'Eliminazione cassetto', icon: 'trash-outline', bg: colors.dangerSoft, fg: colors.danger },
    RENAME_CASSETTO: { label: 'Rinominato cassetto', icon: 'pencil-outline', bg: colors.surfaceAlt, fg: colors.primary },
    RICERCA: { label: 'Ricerca effettuata', icon: 'search-outline', bg: colors.surfaceAlt, fg: colors.textSecondary },
    NOTIFICA_LETTA: { label: 'Notifica letta', icon: 'notifications-outline', bg: colors.successSoft, fg: colors.success },
  };
}

export default function AttivitaScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const actionConfig = getActionConfig(colors);

  const getConfig = useCallback(
    (action: string) =>
      actionConfig[action] ?? {
        label: action,
        icon: 'information-circle-outline' as keyof typeof Ionicons.glyphMap,
        bg: colors.surfaceAlt,
        fg: colors.textSecondary,
      },
    [actionConfig, colors.surfaceAlt, colors.textSecondary],
  );

  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const limit = page * PAGE_SIZE;
        const res = await api.audit.meList(limit);
        const entries = res.logs ?? [];
        setLogs(entries);
        setHasMore(entries.length === limit);
      } catch (err) {
        console.error('[Attivita] errore:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Testata "Registro attività & audit" (come l'app v4) */}
      <View style={styles.header}>
        <Text style={styles.headerOverline}>REGISTRO ATTIVITÀ &amp; AUDIT</Text>
        <Text style={styles.headerTitle}>Tracciamento Operazioni</Text>
        <Text style={styles.headerSubtitle}>
          Tutte le consultazioni, download e accessi registrati con timestamp protetto.
        </Text>
      </View>

      {loading && !refreshing ? (
        <SkeletonList count={6} height={76} />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={logs}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={({ item }) => {
            const cfg = getConfig(item.action);
            return (
              <Card style={styles.entryCard} padded={false}>
                <View style={styles.entryContent}>
                  <View style={[styles.entryIcon, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={21} color={cfg.fg} />
                  </View>
                  <View style={styles.entryText}>
                    <View style={styles.entryTopRow}>
                      <View style={[styles.entryPill, { backgroundColor: cfg.bg, borderColor: `${cfg.fg}4D` }]}>
                        <Text style={[styles.entryPillText, { color: cfg.fg }]}>{cfg.label}</Text>
                      </View>
                      <Text style={styles.entryDate}>{formatDateAudit(item.ts)}</Text>
                    </View>
                    {item.detail ? (
                      <Text style={styles.entryDetail} numberOfLines={2}>
                        {item.detail}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            );
          }}
          ListFooterComponent={
            hasMore ? (
              <Pressable
                onPress={() => {
                  haptics.tap();
                  setPage((p) => p + 1);
                }}
                style={({ pressed }) => [styles.loadMoreBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.loadMoreText}>Carica altre attività</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="time-outline" size={36} color={colors.primary} />}
              title="Nessuna attività registrata"
              subtitle="Le azioni eseguite sul portale verranno elencate in questa cronologia"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerOverline: { color: colors.accentDark, fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
    headerTitle: { ...typography.h4, color: colors.textPrimary, fontWeight: '800', marginTop: 2 },
    headerSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    list: { flex: 1 },
    listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: 12 },
    entryCard: { borderRadius: 18 },
    entryContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: spacing.lg },
    entryIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    entryText: { flex: 1, gap: 5 },
    entryTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    entryPill: { borderRadius: 999, borderWidth: 0.5, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
    entryPillText: { fontSize: 11, fontWeight: '700' },
    entryDate: { ...typography.caption, color: colors.textTertiary, fontSize: 11 },
    entryDetail: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
    loadMoreBtn: { paddingVertical: spacing.lg, alignItems: 'center' },
    loadMoreText: { ...typography.bodySmall, color: colors.accentDark, fontWeight: '700' },
  });

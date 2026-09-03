/**
 * Schermata Attività (audit log).
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
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { formatDateAudit } from '@/lib/utils';
import type { AuditEntry } from '@/types/api';
import { spacing, typography, useColors, type ThemeColors } from '@/theme';

const PAGE_SIZE = 30;

function getActionConfig(
  colors: ThemeColors,
): Record<string, { label: string; icon: string; color: string }> {
  return {
    DOWNLOAD_DOC: { label: 'Download documento', icon: '⬇', color: colors.success },
    UPLOAD_CASSETTO: { label: 'Upload cassetto', icon: '⬆', color: colors.info },
    LOGIN_SUCCESS: { label: 'Accesso effettuato', icon: '→', color: colors.success },
    LOGIN_FAIL: { label: 'Tentativo di accesso', icon: '⚠', color: colors.danger },
    LOGOUT: { label: 'Disconnessione', icon: '←', color: colors.textSecondary },
    PREVIEW_DOC: { label: 'Anteprima documento', icon: '👁', color: colors.info },
    TOGGLE_PREFERITO: { label: 'Preferito aggiornato', icon: '★', color: colors.warning },
    UPLOAD_RISPOSTA: { label: 'Risposta inviata', icon: '💬', color: colors.info },
    ARCHIVIA_MESSAGGIO: { label: 'Messaggio archiviato', icon: '📦', color: colors.textSecondary },
    DEARCHIVIA_MESSAGGIO: { label: 'Messaggio ripristinato', icon: '↩', color: colors.textSecondary },
    SEGNA_LETTI: { label: 'Messaggi letti', icon: '✓', color: colors.success },
    DELETE_CASSETTO: { label: 'Eliminazione cassetto', icon: '🗑', color: colors.danger },
    RENAME_CASSETTO: { label: 'Rinominato cassetto', icon: '✎', color: colors.warning },
    RICERCA: { label: 'Ricerca effettuata', icon: '🔍', color: colors.textSecondary },
    NOTIFICA_LETTA: { label: 'Notifica letta', icon: '🔔', color: colors.success },
  };
}

export default function AttivitaScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const actionConfig = getActionConfig(colors);

  const getConfig = useCallback(
    (action: string) =>
      actionConfig[action] ?? { label: action, icon: '•', color: colors.textSecondary },
    [actionConfig, colors.textSecondary],
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
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>📋 Registro Attività</Text>
        <Pressable
          onPress={() => load(true)}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          accessibilityLabel="Aggiorna"
        >
          <Text style={[styles.iconBtnText, refreshing && { opacity: 0.5 }]}>↻</Text>
        </Pressable>
      </View>

      {loading && !refreshing ? (
        <SkeletonList count={6} height={68} />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={logs}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          renderItem={({ item }) => {
            const cfg = getConfig(item.action);
            return (
              <View style={styles.entryWrap}>
                <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />
                <Card style={styles.entryCard} padded={false}>
                  <View style={styles.entryContent}>
                    <View style={[styles.entryIcon, { backgroundColor: `${cfg.color}20` }]}>
                      <Text style={[styles.entryIconText, { color: cfg.color }]}>{cfg.icon}</Text>
                    </View>
                    <View style={styles.entryText}>
                      <Text style={styles.entryLabel}>{cfg.label}</Text>
                      {item.detail ? (
                        <Text style={styles.entryDetail} numberOfLines={2}>{item.detail}</Text>
                      ) : null}
                      <Text style={styles.entryDate}>{formatDateAudit(item.ts)}</Text>
                    </View>
                  </View>
                </Card>
              </View>
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
              icon={<Text style={styles.emptyIcon}>📋</Text>}
              title="Nessuna attività registrata"
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
    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    toolbarTitle: { ...typography.h4, color: colors.textPrimary, fontWeight: '700' },
    iconBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    iconBtnPressed: { backgroundColor: colors.surfaceAlt },
    iconBtnText: { fontSize: 20, color: colors.textSecondary },
    list: { flex: 1 },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
    entryWrap: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface },
    accentBar: { width: 4 },
    entryCard: { flex: 1, borderRadius: 0, borderWidth: 0, shadowOpacity: 0.03 },
    entryContent: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md },
    entryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    entryIconText: { fontSize: 16, fontWeight: '700' },
    entryText: { flex: 1, gap: 2 },
    entryLabel: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    entryDetail: { ...typography.caption, color: colors.textSecondary },
    entryDate: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    loadMoreBtn: { paddingVertical: spacing.lg, alignItems: 'center' },
    loadMoreText: { ...typography.bodySmall, color: colors.accent, fontWeight: '600' },
    emptyIcon: { fontSize: 48 },
  });

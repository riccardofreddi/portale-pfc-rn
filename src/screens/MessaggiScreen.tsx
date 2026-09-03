/**
 * Schermata Messaggi.
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
import DocumentPicker, { types } from 'react-native-document-picker';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/Badge';
import { SkeletonList } from '@/components/Skeleton';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';
import type { Messaggio } from '@/types/api';
import { spacing, typography, useColors, type ThemeColors } from '@/theme';

type Tab = 'attivi' | 'archiviati';

export default function MessaggiScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const user = useAppStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('attivi');
  const [messaggi, setMessaggi] = useState<Messaggio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = useCallback(
    async (showRefresh = false) => {
      if (!user) return;
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await api.messaggi.list(user.username);
        setMessaggi(res.messaggi);
      } catch (err) {
        toast.error('Errore caricamento', err instanceof Error ? err.message : 'Errore caricamento messaggi');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    load();
  }, [load]);

  const attivi = messaggi.filter((m) => !m.archiviato);
  const archiviati = messaggi.filter((m) => m.archiviato);
  const displayList = tab === 'attivi' ? attivi : archiviati;
  const unreadCount = attivi.filter((m) => !m.letto).length;

  async function handleSegnaLetti() {
    try {
      await api.messaggi.segnaLetti();
      setMessaggi((prev) => prev.map((m) => ({ ...m, letto: true })));
      toast.success('Tutti contrassegnati come letti');
    } catch {
      toast.error('Errore', 'Impossibile aggiornare i messaggi');
    }
  }

  async function handleArchivia(id: string) {
    haptics.tap();
    try {
      await api.messaggi.archivia(id);
      setMessaggi((prev) => prev.map((m) => (m.id === id ? { ...m, archiviato: true } : m)));
      toast.success('Messaggio archiviato');
    } catch {
      toast.error('Errore', 'Impossibile archiviare');
    }
  }

  async function handleDearchivia(id: string) {
    haptics.tap();
    try {
      await api.messaggi.dearchivia(id);
      setMessaggi((prev) => prev.map((m) => (m.id === id ? { ...m, archiviato: false } : m)));
      toast.success('Messaggio ripristinato');
    } catch {
      toast.error('Errore', 'Impossibile ripristinare');
    }
  }

  async function handleUpload(msg: Messaggio) {
    try {
      const picked = await DocumentPicker.pick({ type: [types.allFiles], allowMultiSelection: false });
      const doc = picked[0];
      if (!doc) return;
      setUploadingId(msg.id);
      const fd = new FormData();
      fd.append('file', { uri: doc.uri, type: doc.type ?? 'application/octet-stream', name: doc.name } as unknown as Blob);
      fd.append('msgId', msg.id);
      await api.risposte.upload(fd);
      setMessaggi((prev) => prev.map((m) => (m.id === msg.id ? { ...m, haRisposta: true } : m)));
      toast.success('File inviato con successo');
    } catch (err) {
      if (DocumentPicker.isCancel(err)) return;
      toast.error('Errore upload', err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => load(true)}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          accessibilityLabel="Aggiorna"
        >
          <Text style={[styles.iconBtnText, refreshing && { opacity: 0.5 }]}>↻</Text>
        </Pressable>
        {unreadCount > 0 && tab === 'attivi' && (
          <Pressable onPress={handleSegnaLetti} style={styles.segnaLettiBtn}>
            <Text style={styles.segnaLettiText}>✓ Tutti letti</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.tabsWrap}>
        <Pressable onPress={() => setTab('attivi')} style={[styles.tab, tab === 'attivi' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'attivi' && styles.tabTextActive]}>
            Attivi{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </Text>
        </Pressable>
        <Pressable onPress={() => setTab('archiviati')} style={[styles.tab, tab === 'archiviati' && styles.tabActive]}>
          <Text style={[styles.tabText, tab === 'archiviati' && styles.tabTextActive]}>
            Archiviati{archiviati.length > 0 ? ` (${archiviati.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {loading && !refreshing ? (
        <SkeletonList count={4} height={96} />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={displayList}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          renderItem={({ item: msg }) => {
            const expanded = expandedId === msg.id;
            return (
              <Card style={[styles.msgCard, !msg.letto && styles.msgCardUnread, expanded && styles.msgCardExpanded]} padded={false}>
                <Pressable onPress={() => setExpandedId(expanded ? null : msg.id)} style={styles.msgHeader}>
                  <View style={[styles.msgIcon, !msg.letto ? styles.msgIconUnread : styles.msgIconRead]}>
                    <Text style={styles.msgIconText}>✉</Text>
                  </View>
                  <View style={styles.msgHeaderText}>
                    <View style={styles.msgTitleRow}>
                      {!msg.letto && <View style={styles.unreadDot} />}
                      <Text style={[styles.msgTitle, !msg.letto && styles.msgTitleUnread]} numberOfLines={1}>{msg.titolo}</Text>
                    </View>
                    <Text style={styles.msgDate}>{formatDate(msg.dataInvio)}</Text>
                    {msg.richiedeUpload && !msg.haRisposta && (
                      <View style={styles.msgBadgesRow}><Badge label="Richiede upload" variant="warning" /></View>
                    )}
                    {msg.haRisposta && (
                      <View style={styles.msgBadgesRow}><Badge label="✓ Risposto" variant="success" /></View>
                    )}
                  </View>
                  <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
                </Pressable>

                {expanded && (
                  <View style={styles.msgBody}>
                    <Text style={styles.msgCorpo}>{msg.corpo}</Text>
                    {msg.richiedeUpload && !msg.haRisposta && (
                      <Pressable
                        onPress={() => handleUpload(msg)}
                        disabled={uploadingId === msg.id}
                        style={({ pressed }) => [styles.uploadBtn, pressed && styles.uploadBtnPressed, uploadingId === msg.id && styles.uploadBtnDisabled]}
                      >
                        <Text style={styles.uploadBtnText}>
                          {uploadingId === msg.id ? '⏳ Invio...' : '⬆ Carica file'}
                        </Text>
                      </Pressable>
                    )}
                    <View style={styles.msgActions}>
                      {tab === 'attivi' ? (
                        <Pressable onPress={() => handleArchivia(msg.id)} style={styles.msgActionBtn}>
                          <Text style={styles.msgActionText}>📦 Archivia</Text>
                        </Pressable>
                      ) : (
                        <Pressable onPress={() => handleDearchivia(msg.id)} style={styles.msgActionBtn}>
                          <Text style={styles.msgActionText}>↩ Ripristina</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </Card>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<Text style={styles.emptyIcon}>💬</Text>}
              title={tab === 'attivi' ? 'Nessun messaggio' : 'Nessun messaggio archiviato'}
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
    toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
    iconBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    iconBtnPressed: { backgroundColor: colors.surfaceAlt },
    iconBtnText: { fontSize: 20, color: colors.textSecondary },
    segnaLettiBtn: { height: 36, paddingHorizontal: spacing.md, borderRadius: 18, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
    segnaLettiText: { ...typography.bodySmall, color: colors.success, fontWeight: '600' },
    tabsWrap: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: 4, borderRadius: 12, backgroundColor: colors.surfaceAlt, gap: 4 },
    tab: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    tabActive: { backgroundColor: colors.surface, shadowColor: colors.primary, shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    tabText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
    tabTextActive: { color: colors.textPrimary },
    list: { flex: 1 },
    listContent: { padding: spacing.lg, gap: spacing.sm },
    msgCard: { overflow: 'hidden' },
    msgCardUnread: { borderColor: colors.accent, borderWidth: 1.5, backgroundColor: colors.accentSoft },
    msgCardExpanded: { borderColor: colors.accent },
    msgHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.lg, gap: spacing.md },
    msgIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    msgIconUnread: { backgroundColor: colors.accentSoft },
    msgIconRead: { backgroundColor: colors.surfaceAlt },
    msgIconText: { fontSize: 18 },
    msgHeaderText: { flex: 1, gap: 2 },
    msgTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
    msgTitle: { ...typography.body, color: colors.textSecondary, fontWeight: '500', flex: 1 },
    msgTitleUnread: { color: colors.textPrimary, fontWeight: '700' },
    msgDate: { ...typography.caption, color: colors.textTertiary },
    msgBadgesRow: { marginTop: spacing.xs, alignSelf: 'flex-start' },
    chevron: { fontSize: 12, color: colors.textTertiary },
    msgBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingLeft: spacing.lg + 40 + spacing.md },
    msgCorpo: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 22 },
    uploadBtn: { marginTop: spacing.md, height: 44, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
    uploadBtnPressed: { opacity: 0.85 },
    uploadBtnDisabled: { opacity: 0.5 },
    uploadBtnText: { ...typography.button, color: colors.textInverse },
    msgActions: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
    msgActionBtn: { height: 36, paddingHorizontal: spacing.md, borderRadius: 8, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    msgActionText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
    emptyIcon: { fontSize: 48 },
  });

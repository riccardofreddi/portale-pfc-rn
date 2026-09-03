/**
 * Schermata Notifiche (bottom sheet modal).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';
import type { Notifica, TipoNotifica } from '@/types/api';
import { spacing, typography, useColors, type ThemeColors } from '@/theme';

function getNotifConfig(
  colors: ThemeColors,
): Record<string, { icon: string; color: string; bg: string }> {
  return {
    documento_nuovo: { icon: '📄', color: colors.success, bg: colors.successSoft },
    messaggio: { icon: '💬', color: colors.info, bg: colors.infoSoft },
    avviso: { icon: '⚠', color: colors.warning, bg: colors.warningSoft },
    richiesta_upload: { icon: '⬆', color: '#7C3AED', bg: '#F3E8FF' },
    scadenza: { icon: '⏰', color: colors.danger, bg: colors.dangerSoft },
    upload_confermato: { icon: '✓', color: colors.success, bg: colors.successSoft },
  };
}

export function NotificheModal() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const notifConfig = getNotifConfig(colors);

  const getConfig = useCallback(
    (tipo: string) =>
      notifConfig[tipo as TipoNotifica] ?? {
        icon: '🔔',
        color: colors.textSecondary,
        bg: colors.surfaceAlt,
      },
    [notifConfig, colors.textSecondary, colors.surfaceAlt],
  );

  const visible = useAppStore((s) => s.showNotifPanel);
  const setVisible = useAppStore((s) => s.setShowNotifPanel);
  const setNNotifiche = useAppStore((s) => s.setNNotifiche);

  const [notifiche, setNotifiche] = useState<Notifica[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.notifiche.list();
      setNotifiche(res.notifiche);
      setNNotifiche(res.notifiche.filter((n) => !n.letta).length);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [setNNotifiche]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  async function handleSegnaLetta(id: string) {
    haptics.tap();
    try {
      await api.notifiche.segnaLetta(id);
      setNotifiche((prev) => prev.map((n) => (n.id === id ? { ...n, letta: true } : n)));
      setNNotifiche(Math.max(0, useAppStore.getState().nNotifiche - 1));
    } catch {
      toast.error('Errore', 'Impossibile aggiornare la notifica');
    }
  }

  async function handleSegnaTutteLette() {
    haptics.success();
    try {
      await api.notifiche.segnaLette();
      setNotifiche((prev) => prev.map((n) => ({ ...n, letta: true })));
      setNNotifiche(0);
      toast.success('Tutte le notifiche segnate come lette');
    } catch {
      toast.error('Errore', 'Impossibile aggiornare le notifiche');
    }
  }

  async function handlePulisciLette() {
    haptics.tap();
    try {
      await api.notifiche.pulisciLette();
      setNotifiche((prev) => prev.filter((n) => !n.letta));
      toast.success('Notifiche lette eliminate');
    } catch {
      toast.error('Errore', 'Impossibile pulire le notifiche');
    }
  }

  const nonLette = notifiche.filter((n) => !n.letta);

  return (
    <Modal visible={visible} onClose={() => setVisible(false)}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Notifiche</Text>
        {nonLette.length > 0 && (
          <Pressable onPress={handleSegnaTutteLette} style={styles.headerAction}>
            <Text style={styles.headerActionText}>✓ Tutte</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <SkeletonList count={4} height={72} />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={notifiche}
          keyExtractor={(item) => item.id}
          renderItem={({ item: n }) => {
            const cfg = getConfig(n.tipo);
            return (
              <View style={[styles.notifCard, !n.letta && styles.notifCardUnread]}>
                <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
                  <Text style={styles.notifIconText}>{cfg.icon}</Text>
                </View>
                <View style={styles.notifText}>
                  <View style={styles.notifTitleRow}>
                    {!n.letta && <View style={styles.unreadDot} />}
                    <Text
                      style={[styles.notifTitle, !n.letta && styles.notifTitleUnread]}
                      numberOfLines={2}
                    >
                      {n.titolo}
                    </Text>
                  </View>
                  {n.corpo ? (
                    <Text style={styles.notifCorpo} numberOfLines={2}>{n.corpo}</Text>
                  ) : null}
                  <Text style={styles.notifDate}>{formatDate(n.dataCreazione)}</Text>
                </View>
                {!n.letta && (
                  <Pressable
                    onPress={() => handleSegnaLetta(n.id)}
                    style={styles.notifAction}
                    accessibilityLabel="Segna come letta"
                  >
                    <Text style={styles.notifActionText}>✓</Text>
                  </Pressable>
                )}
              </View>
            );
          }}
          ListFooterComponent={
            notifiche.some((n) => n.letta) ? (
              <Pressable
                onPress={handlePulisciLette}
                style={({ pressed }) => [styles.pulisciBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.pulisciText}>🗑 Elimina notifiche lette</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Text style={styles.emptyIcon}>🔔</Text>}
              title="Nessuna notifica"
            />
          }
        />
      )}
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
    title: { ...typography.h4, color: colors.textPrimary, fontWeight: '700' },
    headerAction: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8, backgroundColor: colors.accentSoft },
    headerActionText: { ...typography.caption, color: colors.accent, fontWeight: '600' },
    list: { maxHeight: 500 },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
    notifCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md, borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
    notifCardUnread: { backgroundColor: colors.surface, borderColor: colors.accent, borderWidth: 1.5 },
    notifIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    notifIconText: { fontSize: 20 },
    notifText: { flex: 1, gap: 2 },
    notifTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6 },
    notifTitle: { ...typography.body, color: colors.textSecondary, fontWeight: '500', flex: 1 },
    notifTitleUnread: { color: colors.textPrimary, fontWeight: '700' },
    notifCorpo: { ...typography.caption, color: colors.textSecondary },
    notifDate: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    notifAction: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    notifActionText: { fontSize: 16, color: colors.accent, fontWeight: '700' },
    pulisciBtn: { paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
    pulisciText: { ...typography.bodySmall, color: colors.danger, fontWeight: '500' },
    emptyIcon: { fontSize: 48 },
  });

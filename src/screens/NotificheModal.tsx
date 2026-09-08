/**
 * Schermata Notifiche (bottom sheet modal).
 *
 * v4.5:
 * - Le righe sono CLICCABILI: il tocco segna la notifica come letta e
 *   porta direttamente al contenuto (messaggi, archivio, attivita').
 * - Chiudendo il pannello, le notifiche gia' lette si ELIMINANO DA SOLE
 *   (non restano piu' "a vita").
 * - Nuovo bottone "Cancella tutte" (con conferma).
 *
 * v4.6: la riga di una scadenza apre DIRETTAMENTE IL DOCUMENTO (cartella
 * + anteprima del file): il percorso completo e' gia' dentro la notifica
 * (campo detail), basta leggerlo. Per il tocco sulle notifiche di sistema
 * a app chiusa vedi il manifest (clickAction FCM_PLUGIN_ACTIVITY).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
import type { DeepLinkTarget } from '@/lib/deeplink';
import { partiFilePath } from '@/lib/deeplink';
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
  const setPendingDeepLink = useAppStore((s) => s.setPendingDeepLink);

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

  // v4.5: chiude il pannello e pulisce da sola le notifiche gia' lette:
  // chi l'ha lette non le deve rivedere mai piu' (niente notifiche
  // che restano appese "a vita").
  function chiudiEPulisci() {
    setVisible(false);
    if (notifiche.some((n) => n.letta)) {
      api.notifiche.pulisciLette().catch(() => {
        // silent: alla prossima apertura si riprova
      });
    }
  }

  // v4.5: tappando una notifica si va direttamente al contenuto:
  // messaggi => tab Messaggi, documento => Archivio (anno/cartella),
  // scadenza => tab Attivita'. La notifica diventa letta e il pannello
  // si chiude (con la pulizia automatica).
  // v4.6: la scadenza ora apre DIRETTAMENTE IL DOCUMENTO: il percorso
  // completo del file e' gia' dentro la notifica (campo "detail"), quindi
  // ricaviamo anno, cartella e file e l'Archivio apre l'anteprima appena
  // caricata la cartella. Solo se il percorso manca o non si capisce,
  // ripieghiamo sul tab Attivita' come prima.
  function targetPerTipo(n: Notifica): DeepLinkTarget | null {
    const tipo = String(n.tipo);
    if (tipo === 'messaggio' || tipo === 'richiesta_upload') {
      return { tab: 'messaggi' };
    }
    if (tipo === 'documento_nuovo' || tipo === 'upload_confermato') {
      if (n.year) return { tab: 'archivio', anno: n.year, cartella: n.folder };
      return { tab: 'archivio' };
    }
    if (tipo === 'scadenza') {
      // v4.6: apri il documento in scadenza (cartella + file).
      if (n.detail) {
        const parti = partiFilePath(n.detail);
        if (parti) {
          return { tab: 'archivio', ...parti };
        }
      }
      // Ripiego: la notifica conosce almeno anno/cartella...
      if (n.year && n.folder) {
        return { tab: 'archivio', anno: n.year, cartella: n.folder };
      }
      // ...altrimenti il tab Attivita' (elenco scadenze) come nella v4.5.
      return { tab: 'attivita' };
    }
    return null; // avvisi generici: solo chiudi
  }

  async function handleApriNotifica(n: Notifica) {
    haptics.tap();
    if (!n.letta) {
      try {
        await api.notifiche.segnaLetta(n.id);
        setNotifiche((prev) => prev.map((x) => (x.id === n.id ? { ...x, letta: true } : x)));
        setNNotifiche(Math.max(0, useAppStore.getState().nNotifiche - 1));
      } catch {
        // silent: la navigazione funziona comunque
      }
    }
    setVisible(false);
    const target = targetPerTipo(n);
    if (target) setPendingDeepLink(target);
  }

  // v4.5: cancella TUTTE le notifiche (con conferma, perche' non si
  // puo' tornare indietro).
  function handlePulisciTutte() {
    haptics.warning();
    Alert.alert(
      'Cancellare tutte le notifiche?',
      'Verranno eliminate tutte le notifiche della campanella, anche quelle non lette.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella tutte',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.notifiche.pulisciTutte();
              setNotifiche([]);
              setNNotifiche(0);
              toast.success('Notifiche eliminate');
            } catch {
              toast.error('Errore', 'Impossibile cancellare le notifiche');
            }
          },
        },
      ],
    );
  }

  const nonLette = notifiche.filter((n) => !n.letta);

  return (
    <Modal visible={visible} onClose={chiudiEPulisci}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Notifiche</Text>
        <View style={styles.headerActions}>
          {nonLette.length > 0 && (
            <Pressable onPress={handleSegnaTutteLette} style={styles.headerAction}>
              <Text style={styles.headerActionText}>✓ Tutte</Text>
            </Pressable>
          )}
          {notifiche.length > 0 && (
            <Pressable onPress={handlePulisciTutte} style={styles.headerActionCancella}>
              <Text style={styles.headerActionCancellaText}>🗑 Tutte</Text>
            </Pressable>
          )}
        </View>
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
            const navigabile = targetPerTipo(n) !== null;
            return (
              <Pressable
                onPress={() => handleApriNotifica(n)}
                style={[styles.notifCard, !n.letta && styles.notifCardUnread]}
                accessibilityLabel={navigabile ? 'Apri notifica' : 'Notifica'}
              >
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
              </Pressable>
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
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    headerActionCancella: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8, backgroundColor: colors.dangerSoft },
    headerActionCancellaText: { ...typography.caption, color: colors.danger, fontWeight: '600' },
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

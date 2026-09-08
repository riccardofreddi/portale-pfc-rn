/**
 * Schermata Messaggi (v4.0 - restyling completo, "stupiscimi").
 *
 * Novità v4.0 (grafica nuova ma stesse funzioni di sempre):
 * - Testata elegante come l'Archivio: card con bagliori, il numero di
 *   messaggi da leggere scritto CHIARO e il pulsante "Tutti letti"
 *   direttamente in testa (prima nascosto in una barra sospetta).
 * - Il trascina-per-aggiornare funziona da QUALUNQUE punto: la testata
 *   sta dentro la lista (stesso fix dell'Archivio).
 * - Date gentili: "Oggi alle 14:32", "Ieri alle 09:10" invece di date
 *   incomprensibili.
 * - Card messaggi: icona con pallino rosso se nuovo, anteprima del
 *   testo, badge chiari ("Nuovo", "Richiede un file", "Risposto"),
 *   corpo in un pannello con la linea colorata quando aperto.
 * - Schede Attivi/Archiviati a pillola, con contatore rosso sui nuovi.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  DeviceEventEmitter,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
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
import type { Messaggio } from '@/types/api';
import { radius, shadow, spacing, typography, useColors, type ThemeColors } from '@/theme';

type Tab = 'attivi' | 'archiviati';

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

function oggiBello(): string {
  const d = new Date();
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
}

/** Data gentile: "Oggi alle 14:32", "Ieri alle 09:10", poi data completa. */
function dataGentile(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const adesso = new Date();
  const ora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === adesso.toDateString()) return `Oggi alle ${ora}`;
  const ieri = new Date(adesso);
  ieri.setDate(adesso.getDate() - 1);
  if (d.toDateString() === ieri.toDateString()) return `Ieri alle ${ora}`;
  return `${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()} alle ${ora}`;
}

/** Anteprima: la seconda riga del messaggio (la prima e' gia' il titolo). */
function anteprima(corpo: string): string {
  const righe = corpo
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
  const resto = righe.slice(1).join(' ');
  if (!resto) return '';
  return resto.length > 110 ? `${resto.slice(0, 110).trimEnd()}…` : resto;
}

/** Entrata: fade + piccola scivolata dal basso (stessa dell'Archivio). */
function Entrata({
  delay = 0,
  style,
  children,
}: {
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 430,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default function MessaggiScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const user = useAppStore((s) => s.user);
  // v4.5: tab attivo e controllo del badge rosso sul tab Messaggi
  const clienteTab = useAppStore((s) => s.clienteTab);
  const setNMessaggiNonLetti = useAppStore((s) => s.setNMessaggiNonLetti);
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
        // v4.5: il badge rosso sul tab e' SEMPRE in linea con la lista
        // appena caricata (prima si aggiornava solo col polling dei 30s).
        setNMessaggiNonLetti(
          res.messaggi.filter((m) => !m.letto && !m.archiviato).length,
        );
      } catch (err) {
        toast.error('Errore caricamento', err instanceof Error ? err.message : 'Errore caricamento messaggi');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, setNMessaggiNonLetti],
  );

  useEffect(() => {
    load();
  }, [load]);

  // v4.5: segna tutto letto SENZA avvisi a schermo (usato quando il
  // cliente sta gia' guardando la tab Messaggi: quello che sta vedendo
  // e' letto, non ha senso il pallino rosso).
  const segnaLettiSilenzioso = useCallback(async () => {
    try {
      await api.messaggi.segnaLetti();
      setMessaggi((prev) => prev.map((m) => ({ ...m, letto: true })));
      setNMessaggiNonLetti(0);
    } catch {
      // silent: si riprova alla prossima apertura della tab
    }
  }, [setNMessaggiNonLetti]);

  // v4.5: entrando nella tab Messaggi i messaggi si considerano letti
  // (li sta guardando apposta) => niente rosso che resta appeso.
  useEffect(() => {
    if (clienteTab !== 'messaggi') return;
    (async () => {
      await segnaLettiSilenzioso();
      await load();
    })();
  }, [clienteTab, load, segnaLettiSilenzioso]);

  // v4.5: evento "arrivata una push" a app aperta: se e' un messaggio la
  // lista si aggiorna da sola (senza trascinare in giu'); e se il cliente
  // sta guardando proprio la tab Messaggi, il nuovo messaggio e' letto.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('pfc-push-ricevuta', (dati) => {
      const url =
        dati && typeof dati === 'object'
          ? String((dati as Record<string, unknown>).url ?? '')
          : '';
      if (!url.includes('tab=messaggi')) return;
      if (clienteTab === 'messaggi') {
        (async () => {
          await segnaLettiSilenzioso();
          await load();
        })();
      } else {
        load();
      }
    });
    return () => sub.remove();
  }, [clienteTab, load, segnaLettiSilenzioso]);

  // v4.5: ritorno sull'app (era in background) => lista fresca subito:
  // il messaggio arrivato fuori app e' LI', senza pull-to-refresh.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('pfc-app-risentita', () => {
      load();
    });
    return () => sub.remove();
  }, [load]);

  const attivi = messaggi.filter((m) => !m.archiviato);
  const archiviati = messaggi.filter((m) => m.archiviato);
  const displayList = tab === 'attivi' ? attivi : archiviati;
  const unreadCount = attivi.filter((m) => !m.letto).length;

  async function handleSegnaLetti() {
    haptics.tap();
    try {
      await api.messaggi.segnaLetti();
      setMessaggi((prev) => prev.map((m) => ({ ...m, letto: true })));
      setNMessaggiNonLetti(0);
      toast.success('Tutti contrassegnati come letti');
    } catch {
      toast.error('Errore', 'Impossibile aggiornare i messaggi');
    }
  }

  async function handleArchivia(id: string) {
    haptics.tap();
    try {
      await api.messaggi.archivia(id);
      const nuova = messaggi.map((m) => (m.id === id ? { ...m, archiviato: true } : m));
      setMessaggi(nuova);
      setNMessaggiNonLetti(nuova.filter((m) => !m.letto && !m.archiviato).length);
      toast.success('Messaggio archiviato');
    } catch {
      toast.error('Errore', 'Impossibile archiviare');
    }
  }

  async function handleDearchivia(id: string) {
    haptics.tap();
    try {
      await api.messaggi.dearchivia(id);
      const nuova = messaggi.map((m) => (m.id === id ? { ...m, archiviato: false } : m));
      setMessaggi(nuova);
      setNMessaggiNonLetti(nuova.filter((m) => !m.letto && !m.archiviato).length);
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
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={loading && !refreshing ? [] : displayList}
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
        ListHeaderComponent={
          <View style={styles.testataLista}>
            <Entrata>
              <Card style={styles.heroCard} padded={false}>
                <View style={styles.heroAurora1} pointerEvents="none" />
                <View style={styles.heroAurora2} pointerEvents="none" />
                <View style={styles.heroInner}>
                  <Text style={styles.heroOverline}>{`Messaggi v4.0 · ${oggiBello()}`}</Text>
                  <Text style={styles.heroTitle}>I tuoi messaggi</Text>
                  <Text style={styles.heroSubtitle}>
                    {unreadCount > 0
                      ? `Hai ${unreadCount} ${unreadCount === 1 ? 'messaggio da leggere' : 'messaggi da leggere'}`
                      : 'Tutto letto: qui sei a posto'}
                  </Text>
                  <View style={styles.heroChips}>
                    <View style={styles.heroChip}>
                      <Text style={styles.heroChipText}>
                        ✉ {attivi.length} attiv{attivi.length === 1 ? 'o' : 'i'}
                      </Text>
                    </View>
                    <View style={styles.heroChip}>
                      <Text style={styles.heroChipText}>
                        📦 {archiviati.length} archiviat{archiviati.length === 1 ? 'o' : 'i'}
                      </Text>
                    </View>
                    {unreadCount > 0 && tab === 'attivi' && (
                      <Pressable
                        onPress={handleSegnaLetti}
                        style={({ pressed }) => [styles.heroChipOk, pressed && { opacity: 0.8 }]}
                        accessibilityRole="button"
                        accessibilityLabel="Segna tutti come letti"
                      >
                        <Text style={styles.heroChipOkText}>✓ Tutti letti</Text>
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.heroHint}>Trascina in basso per aggiornare</Text>
                </View>
              </Card>
            </Entrata>

            <View style={styles.tabsWrap}>
              <Pressable
                onPress={() => {
                  haptics.tap();
                  setTab('attivi');
                }}
                style={[styles.tab, tab === 'attivi' && styles.tabActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: tab === 'attivi' }}
              >
                <Text style={[styles.tabText, tab === 'attivi' && styles.tabTextActive]}>
                  Attivi
                </Text>
                {unreadCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  haptics.tap();
                  setTab('archiviati');
                }}
                style={[styles.tab, tab === 'archiviati' && styles.tabActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: tab === 'archiviati' }}
              >
                <Text style={[styles.tabText, tab === 'archiviati' && styles.tabTextActive]}>
                  Archiviati
                </Text>
                {archiviati.length > 0 && tab === 'archiviati' && (
                  <View style={styles.tabBadgeMuto}>
                    <Text style={styles.tabBadgeMutoText}>{archiviati.length}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item: msg, index }) => {
          const expanded = expandedId === msg.id;
          const anteprimaTesto = anteprima(msg.corpo);
          return (
            <Entrata delay={Math.min(120 + index * 50, 500)}>
              <Card
                style={[
                  styles.msgCard,
                  !msg.letto && styles.msgCardUnread,
                  expanded && styles.msgCardExpanded,
                ]}
                padded={false}
              >
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    setExpandedId(expanded ? null : msg.id);
                  }}
                  style={styles.msgHeader}
                >
                  <View style={[styles.msgIcon, !msg.letto ? styles.msgIconUnread : styles.msgIconRead]}>
                    <Text style={styles.msgIconText}>{msg.archiviato ? '📦' : msg.letto ? '📨' : '✉️'}</Text>
                    {!msg.letto && <View style={styles.msgIconDot} />}
                  </View>
                  <View style={styles.msgHeaderText}>
                    <Text style={[styles.msgTitle, !msg.letto && styles.msgTitleUnread]} numberOfLines={2}>
                      {msg.titolo}
                    </Text>
                    {!expanded && anteprimaTesto !== '' && (
                      <Text style={styles.msgPreview} numberOfLines={2}>
                        {anteprimaTesto}
                      </Text>
                    )}
                    <View style={styles.msgMetaRow}>
                      <Text style={styles.msgDate}>🕒 {dataGentile(msg.dataInvio)}</Text>
                      {!msg.letto && <Badge label="Nuovo" variant="danger" />}
                      {msg.richiedeUpload && !msg.haRisposta && <Badge label="Richiede un file" variant="warning" />}
                      {msg.haRisposta && <Badge label="✓ Risposto" variant="success" />}
                    </View>
                  </View>
                  <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
                </Pressable>

                {expanded && (
                  <View style={styles.msgBody}>
                    <View style={styles.msgCorpoWrap}>
                      <Text style={styles.msgCorpo}>{msg.corpo}</Text>
                    </View>
                    {msg.richiedeUpload && !msg.haRisposta && (
                      <Pressable
                        onPress={() => handleUpload(msg)}
                        disabled={uploadingId === msg.id}
                        style={({ pressed }) => [
                          styles.uploadBtn,
                          pressed && styles.uploadBtnPressed,
                          uploadingId === msg.id && styles.uploadBtnDisabled,
                        ]}
                      >
                        <Text style={styles.uploadBtnText}>
                          {uploadingId === msg.id ? '⏳ Invio in corso…' : '⬆  Carica la risposta'}
                        </Text>
                      </Pressable>
                    )}
                    <View style={styles.msgActions}>
                      {tab === 'attivi' ? (
                        <Pressable onPress={() => handleArchivia(msg.id)} style={({ pressed }) => [styles.msgActionBtn, pressed && { opacity: 0.7 }]}>
                          <Text style={styles.msgActionText}>📦 Archivia</Text>
                        </Pressable>
                      ) : (
                        <Pressable onPress={() => handleDearchivia(msg.id)} style={({ pressed }) => [styles.msgActionBtn, pressed && { opacity: 0.7 }]}>
                          <Text style={styles.msgActionText}>↩ Ripristina</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}
              </Card>
            </Entrata>
          );
        }}
        ListEmptyComponent={
          loading && !refreshing ? (
            <View style={styles.skeletonInList}>
              <SkeletonList count={4} height={96} />
            </View>
          ) : (
            <EmptyState
              icon={<Text style={styles.emptyIcon}>{tab === 'attivi' ? '💬' : '📦'}</Text>}
              title={tab === 'attivi' ? 'Nessun messaggio' : 'Nessun messaggio archiviato'}
              subtitle={
                tab === 'attivi'
                  ? 'Quando lo studio ti scrive, il messaggio arriva qui'
                  : 'Archivia i messaggi finiti per tenere tutto in ordine'
              }
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    list: { flex: 1 },
    listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    testataLista: { gap: spacing.md, paddingBottom: spacing.xs },

    // Testata elegante (stessa famiglia della card di benvenuto dell'Archivio)
    heroCard: { backgroundColor: colors.surface, borderColor: colors.border, overflow: 'hidden', ...shadow.md },
    heroAurora1: { position: 'absolute', top: -70, right: -50, width: 210, height: 210, borderRadius: 105, backgroundColor: colors.accent, opacity: 0.12 },
    heroAurora2: { position: 'absolute', bottom: -80, left: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: colors.accent, opacity: 0.07 },
    heroInner: { padding: spacing.xl, gap: spacing.sm },
    heroOverline: { ...typography.labelSmall, color: colors.textTertiary, letterSpacing: 1.2 },
    heroTitle: { ...typography.h1, color: colors.textPrimary, marginTop: 2 },
    heroSubtitle: { ...typography.body, color: colors.textSecondary },
    heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
    heroChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
    heroChipText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
    heroChipOk: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.successSoft, borderWidth: 1, borderColor: colors.success },
    heroChipOkText: { ...typography.caption, color: colors.success, fontWeight: '800' },
    heroHint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },

    // Schede Attivi / Archiviati a pillola
    tabsWrap: { flexDirection: 'row', padding: 4, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, gap: 4 },
    tab: { flex: 1, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    tabActive: { backgroundColor: colors.surface, ...shadow.sm },
    tabText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
    tabTextActive: { color: colors.textPrimary, fontWeight: '800' },
    tabBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    tabBadgeText: { color: colors.textInverse, fontSize: 11, fontWeight: '800' },
    tabBadgeMuto: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    tabBadgeMutoText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },

    // Card messaggi
    msgCard: { overflow: 'hidden' },
    msgCardUnread: { borderColor: colors.accent, borderWidth: 1.5, backgroundColor: colors.accentSoft },
    msgCardExpanded: { borderColor: colors.accent },
    msgHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.lg, gap: spacing.md },
    msgIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    msgIconUnread: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.accent },
    msgIconRead: { backgroundColor: colors.surfaceAlt },
    msgIconText: { fontSize: 19 },
    msgIconDot: { position: 'absolute', top: -3, right: -3, width: 13, height: 13, borderRadius: 7, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.surface },
    msgHeaderText: { flex: 1, gap: 4 },
    msgTitle: { ...typography.body, color: colors.textSecondary, fontWeight: '500' },
    msgTitleUnread: { color: colors.textPrimary, fontWeight: '800' },
    msgPreview: { ...typography.caption, color: colors.textTertiary, lineHeight: 16 },
    msgMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
    msgDate: { ...typography.caption, color: colors.textTertiary },
    chevron: { fontSize: 12, color: colors.textTertiary },
    msgBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
    msgCorpoWrap: { borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, paddingVertical: spacing.md, paddingRight: spacing.md },
    msgCorpo: { ...typography.bodySmall, color: colors.textPrimary, lineHeight: 22 },
    uploadBtn: { minHeight: 52, borderRadius: radius.lg, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
    uploadBtnPressed: { opacity: 0.85 },
    uploadBtnDisabled: { opacity: 0.5 },
    uploadBtnText: { ...typography.button, color: colors.textInverse },
    msgActions: { flexDirection: 'row', gap: spacing.sm },
    msgActionBtn: { minHeight: 40, paddingHorizontal: spacing.lg, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    msgActionText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },

    skeletonInList: { paddingVertical: spacing.sm },
    emptyIcon: { fontSize: 48 },
  });

/**
 * Schermata Messaggi.
 *
 * v4.11 — grafica replicata dall'app Android v4 (MessaggiScreen.kt):
 * - Schede "Messaggi Attivi / Archiviati" in stile TabRow: indicatore
 *   navy da 3px sotto la scheda attiva e bollino rosso dei non letti.
 * - Banner informativo "Comunicazioni ufficiali dello Studio PFC" con
 *   pulsante bordato "Segna letti" (stessa funzione di sempre).
 * - Card messaggio: barra laterale navy se non letto, icona quadrata
 *   colorata per stato (risposto/richiesta file/nuovo/letto), etichetta
 *   "STUDIO PFC • data", pillole di stato e corpo SEMPRE visibile con
 *   "Leggi tutto" (come nell'app v4) + pulsante invio file navy.
 * - Logica INTATTA: caricamento, segna-letti automatici, archiviazione,
 *   upload risposta, polling push, trascina per aggiornare.
 * v4.19: i siti internet scritti dallo studio nel testo dei messaggi sono
 *   CLICCABILI (aprano il browser): si tocca il link e si arriva al sito.
 *   Gli avvisi pubblici invece vivono nel banner sotto la TopBar
 *   (AvvisiBanner) e non finiscono piu' in questa lista, come sul sito.
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
import { Ionicons } from '@expo/vector-icons';
import DocumentPicker, { types } from 'react-native-document-picker';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { spezzaLink } from '@/lib/linkify';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import type { Messaggio } from '@/types/api';
import { shadow, spacing, typography, useColors, type ThemeColors } from '@/theme';

type Tab = 'attivi' | 'archiviati';

const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

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

  function iconaStato(msg: Messaggio): { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
    if (msg.haRisposta) return { icon: 'checkmark-circle', color: colors.success, bg: `${colors.success}26` };
    if (msg.richiedeUpload) return { icon: 'cloud-upload', color: colors.warning, bg: `${colors.warning}26` };
    if (!msg.letto) return { icon: 'mail', color: '#FFFFFF', bg: colors.primary };
    return { icon: 'mail-outline', color: colors.textSecondary, bg: colors.surfaceAlt };
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Schede Attivi / Archiviati con indicatore (TabRow dell'app v4) */}
      <View style={styles.tabsSurface}>
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => {
              haptics.tap();
              setTab('attivi');
            }}
            style={styles.tabBtn}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === 'attivi' }}
          >
            <Text style={[styles.tabLabel, tab === 'attivi' && styles.tabLabelActive]}>Messaggi Attivi</Text>
            {unreadCount > 0 && (
              <View style={styles.tabCount}>
                <Text style={styles.tabCountText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              haptics.tap();
              setTab('archiviati');
            }}
            style={styles.tabBtn}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === 'archiviati' }}
          >
            <Text style={[styles.tabLabel, tab === 'archiviati' && styles.tabLabelActive]}>
              Archiviati ({archiviati.length})
            </Text>
          </Pressable>
        </View>
        <View style={[styles.tabIndicator, tab === 'attivi' ? styles.tabIndicatorLeft : styles.tabIndicatorRight]} />
      </View>

      {/* Banner informativo + "Segna letti" (come l'app v4) */}
      <View style={styles.infoBanner}>
        <Ionicons name="mail" size={19} color={colors.primary} />
        <Text style={styles.infoText}>
          Comunicazioni ufficiali dello Studio PFC. Puoi leggere i dettagli e inviare gli allegati richiesti.
        </Text>
        {tab === 'attivi' && unreadCount > 0 && (
          <Pressable
            onPress={handleSegnaLetti}
            style={({ pressed }) => [styles.segnaLettiBtn, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel="Segna tutti come letti"
          >
            <Ionicons name="checkmark-done" size={14} color={colors.primary} />
            <Text style={styles.segnaLettiText}>Segna letti</Text>
          </Pressable>
        )}
      </View>

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
        renderItem={({ item: msg, index }) => {
          const expanded = expandedId === msg.id;
          const ic = iconaStato(msg);
          const nonLetto = !msg.letto && !msg.archiviato;
          return (
            <Entrata delay={Math.min(60 + index * 50, 400)}>
              <View style={[styles.msgCard, nonLetto && styles.msgCardUnread]}>
                {nonLetto && <View style={styles.unreadBar} />}
                <View style={styles.msgInner}>
                  {/* Testata: icona stato + STUDIO PFC • data + titolo + archivia */}
                  <Pressable
                    onPress={() => {
                      haptics.tap();
                      setExpandedId(expanded ? null : msg.id);
                    }}
                    style={styles.msgHeader}
                    accessibilityLabel="Mostra dettaglio messaggio"
                  >
                    <View style={[styles.msgIcon, { backgroundColor: ic.bg }]}>
                      <Ionicons name={ic.icon} size={21} color={ic.color} />
                    </View>
                    <View style={styles.msgHeaderText}>
                      <View style={styles.msgOverRow}>
                        <Text style={styles.msgStudio}>STUDIO PFC</Text>
                        <Text style={styles.msgOverDot}>•</Text>
                        <Text style={styles.msgDate}>{dataGentile(msg.dataInvio)}</Text>
                      </View>
                      <Text style={[styles.msgTitle, nonLetto && styles.msgTitleUnread]} numberOfLines={2}>
                        {msg.titolo}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => (msg.archiviato ? handleDearchivia(msg.id) : handleArchivia(msg.id))}
                      style={({ pressed }) => [styles.iconAction, pressed && { opacity: 0.6 }]}
                      accessibilityLabel={msg.archiviato ? 'Ripristina messaggio' : 'Archivia messaggio'}
                    >
                      <Ionicons
                        name={msg.archiviato ? 'arrow-undo-outline' : 'archive-outline'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </Pressable>

                  {/* Pillole di stato (come i badge dell'app v4) */}
                  <View style={styles.badgeRow}>
                    {nonLetto && (
                      <View style={[styles.pill, { backgroundColor: `${colors.primary}26` }]}>
                        <Text style={[styles.pillText, { color: colors.primary }]}>Nuovo</Text>
                      </View>
                    )}
                    {msg.richiedeUpload && !msg.haRisposta && (
                      <View style={[styles.pill, { backgroundColor: `${colors.warning}26` }]}>
                        <Ionicons name="cloud-upload" size={11} color={colors.warning} />
                        <Text style={[styles.pillText, { color: colors.warning }]}>Richiesta Documento</Text>
                      </View>
                    )}
                    {msg.haRisposta && (
                      <View style={[styles.pill, { backgroundColor: `${colors.success}26` }]}>
                        <Ionicons name="checkmark" size={12} color={colors.success} />
                        <Text style={[styles.pillText, { color: colors.success }]}>Documento Inviato</Text>
                      </View>
                    )}
                  </View>

                  {/* Corpo SEMPRE visibile, con clamp e "Leggi tutto" (come l'app v4).
                   * v4.19: i siti internet nel testo sono cliccabili (linkify). */}
                  <View style={styles.corpoBox}>
                    <Text style={styles.corpo} numberOfLines={expanded ? undefined : 4}>
                      {spezzaLink(msg.corpo, styles.corpoLink)}
                    </Text>
                    {msg.corpo.length > 140 && (
                      <Pressable
                        onPress={() => setExpandedId(expanded ? null : msg.id)}
                        hitSlop={6}
                        accessibilityLabel={expanded ? 'Mostra meno' : 'Leggi tutto'}
                      >
                        <Text style={styles.leggiTutto}>{expanded ? 'Mostra meno ▲' : 'Leggi tutto ▼'}</Text>
                      </Pressable>
                    )}
                  </View>

                  {/* Allegato dello studio, se presente */}
                  {msg.allegatoNome ? (
                    <View style={styles.allegatoBox}>
                      <Ionicons name="attach" size={15} color={colors.primary} />
                      <Text style={styles.allegatoText} numberOfLines={1}>
                        Allegato dallo Studio: {msg.allegatoNome}
                      </Text>
                    </View>
                  ) : null}

                  {/* Dettagli aperti: invio file + archivia/ripristina */}
                  {expanded && (
                    <View style={styles.actionsWrap}>
                      {msg.richiedeUpload && !msg.haRisposta && (
                        <Pressable
                          onPress={() => handleUpload(msg)}
                          disabled={uploadingId === msg.id}
                          style={({ pressed }) => [
                            styles.uploadBtn,
                            pressed && styles.btnPressed,
                            uploadingId === msg.id && styles.btnDisabled,
                          ]}
                          accessibilityLabel="Carica la risposta"
                        >
                          <Ionicons name="cloud-upload-outline" size={18} color={colors.textInverse} />
                          <Text style={styles.uploadBtnText}>
                            {uploadingId === msg.id ? 'Invio in corso…' : 'Carica la risposta'}
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => (tab === 'attivi' ? handleArchivia(msg.id) : handleDearchivia(msg.id))}
                        style={({ pressed }) => [styles.outlineBtn, pressed && styles.btnPressed]}
                        accessibilityLabel={tab === 'attivi' ? 'Archivia messaggio' : 'Ripristina messaggio'}
                      >
                        <Ionicons
                          name={tab === 'attivi' ? 'archive-outline' : 'arrow-undo-outline'}
                          size={15}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.outlineBtnText}>
                          {tab === 'attivi' ? 'Archivia' : 'Ripristina'}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
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
              icon={
                <Ionicons
                  name={tab === 'attivi' ? 'chatbubble-outline' : 'archive-outline'}
                  size={36}
                  color={colors.primary}
                />
              }
              title={tab === 'attivi' ? 'Nessun messaggio attivo' : 'Nessun messaggio archiviato'}
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

    // Schede in stile TabRow (v4.11)
    tabsSurface: { backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, ...shadow.sm },
    tabsRow: { flexDirection: 'row' },
    tabBtn: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    tabLabel: { ...typography.bodySmall, fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    tabLabelActive: { color: colors.primary, fontWeight: '800' },
    tabCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    tabCountText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
    tabIndicator: { position: 'absolute', bottom: 0, height: 3, width: '50%', backgroundColor: colors.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
    tabIndicatorLeft: { left: 0 },
    tabIndicatorRight: { left: '50%' },

    // Banner informativo (v4.11)
    infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: `${colors.primary}14` },
    infoText: { ...typography.caption, color: colors.textPrimary, flex: 1, lineHeight: 16 },
    segnaLettiBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, borderColor: `${colors.primary}99`, paddingHorizontal: 10, paddingVertical: 5 },
    segnaLettiText: { color: colors.primary, fontSize: 11, fontWeight: '700' },

    list: { flex: 1 },
    listContent: { padding: spacing.lg, gap: 14, paddingBottom: spacing.xxl },
    skeletonInList: { paddingVertical: spacing.sm },

    // Card messaggio (v4.11, stile MessaggioCard dell'app v4)
    msgCard: { flexDirection: 'row', borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.sm },
    msgCardUnread: { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}99`, borderWidth: 1.5 },
    unreadBar: { width: 4, backgroundColor: colors.primary },
    msgInner: { flex: 1, padding: 18, gap: 10 },
    msgHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    msgIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    msgHeaderText: { flex: 1, gap: 2 },
    msgOverRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    msgStudio: { color: colors.primary, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },
    msgOverDot: { color: colors.textTertiary, fontSize: 11 },
    msgDate: { ...typography.caption, color: colors.textSecondary },
    msgTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '500', fontSize: 15.5 },
    msgTitleUnread: { fontWeight: '800' },
    iconAction: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    pillText: { fontSize: 11, fontWeight: '700' },
    corpoBox: { backgroundColor: colors.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14 },
    corpo: { ...typography.bodySmall, color: colors.textPrimary, lineHeight: 21 },
    // v4.19: i link nel corpo del messaggio si Vedono e si toccano (aprono il browser)
    corpoLink: { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
    leggiTutto: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 6 },
    allegatoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 9 },
    allegatoText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600', flex: 1 },
    actionsWrap: { gap: 10 },
    uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, borderRadius: 14, backgroundColor: colors.primary, ...shadow.sm },
    outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 42, borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
    outlineBtnText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
    uploadBtnText: { ...typography.button, color: colors.textInverse },
    btnPressed: { opacity: 0.85 },
    btnDisabled: { opacity: 0.5 },
  });

/**
 * Schermata Attività (registro attività).
 *
 * v4.42 — "File inviato" leggibile: il server attacca al nome del file
 * l'ID interno del messaggio ("scan.pdf (msg: cmd9xk...)"), un codice
 * che al cliente non dice nulla. La pulizia taglia la parentesi col
 * codice e lascia SOLO il nome del file — anche nello storico vecchio,
 * perché avviene alla visualizzazione. Per disposizione del titolare:
 * backend e portale web ZERO tocchi (il server continua a scrivere come
 * sempre, è l'app a pulire).
 * v4.41 — il registro parla la lingua del cliente:
 * - mappa allineata 1:1 ai VERI codici che il server invia al cliente
 *   (CLIENT_ACTIONS di /api/audit/me): l'app mappava 8 codici che il
 *   server non manda mai e non conosceva 5 reali -> su 11 righe, 5
 *   mostravano la pillola col codice grezzo tipo "RINOMINA_FILE";
 * - diciture da 2 parole (il modello sono "Accesso eseguito" e "Logout
 *   manuale"): File scaricato/caricato/inviato/rinominato/eliminato,
 *   Cartella scaricata, Messaggi letti, Accesso effettuato, Accesso
 *   negato, Disconnessione;
 * - dettagli puliti ALLA VISUALIZZAZIONE: il server scrive il percorso
 *   completo ("Documenti/{cliente}/{anno}/{cartella}/{file}") perché
 *   nasce per l'area studio; qui al cliente mostriamo solo l'essenziale
 *   (il nome del file). Pulizia DIFENSIVA: formato non riconosciuto =
 *   mostrato com'è. Così esce pulito anche lo STORICO vecchio, senza
 *   toccare il server;
 * - colori con UNA regola: VERDE = operazione completata, BLU = solo
 *   lettura, GRIGIO = organizzazione (nessun impatto sui file), ROSSO =
 *   attenzione. L'oro resta solo nelle testate (firma del brand); via
 *   le pillole ibride grigie con testo blu.
 * v4.40 — richieste del titolare:
 * - VIA "& audit": l'intestazione dice solo "REGISTRO ATTIVITÀ";
 * - VIA la descrizione "Tutte le consultazioni, download e accessi
 *   registrati con timestamp protetto.";
 * - testata allineata alla FIRMA VISIVA dell'app: hero blu notte ->
 *   blu primario -> blu notte con bordo oro, scatola icona oro e testi
 *   bianchi/oro chiaro — la stessa lingua del Cassetto e dell'Archivio.
 * v4.11 — card attività replicata dall'app Android v4 (AttivitaScreen.kt):
 * - Ogni attività è una card con CERCHIO icona colorato per tipo azione,
 *   pillola etichetta colorata e timestamp allineato a destra.
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
import Svg, { Defs, Rect, LinearGradient, Stop } from 'react-native-svg';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { formatDateAudit } from '@/lib/utils';
import type { AuditEntry } from '@/types/api';
import { shadow, spacing, typography, useColors, type ThemeColors } from '@/theme';

const PAGE_SIZE = 30;

// v4.40: colori firma del brand (validi in entrambi i temi, come nel
// Cassetto e nell'Archivio: stesso hero = chiaramente la stessa app)
const NAVY_NOTTE = '#0A1128';
const NAVY_PRIMARIO = '#003566';
const ORO = '#D4AF37';
const ORO_CHIARO = '#F7E7B4';

/**
 * v4.41: mappa 1:1 con i VERI codici audit che il server invia al
 * cliente (CLIENT_ACTIONS in /api/audit/me). Quattro famiglie con una
 * regola sola: VERDE = operazione completata, BLU = solo lettura,
 * GRIGIO = organizzazione (nessun impatto sui file), ROSSO = attenzione.
 */
function getActionConfig(
  colors: ThemeColors,
): Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> {
  return {
    // — VERDE: operazione completata —
    LOGIN_SUCCESS: { label: 'Accesso effettuato', icon: 'log-in-outline', bg: colors.successSoft, fg: colors.success },
    DOWNLOAD_DOC: { label: 'File scaricato', icon: 'download-outline', bg: colors.successSoft, fg: colors.success },
    DOWNLOAD_CASSETTO: { label: 'File scaricato', icon: 'download-outline', bg: colors.successSoft, fg: colors.success },
    UPLOAD_CASSETTO: { label: 'File caricato', icon: 'cloud-upload-outline', bg: colors.successSoft, fg: colors.success },
    UPLOAD_RISPOSTA: { label: 'File inviato', icon: 'paper-plane-outline', bg: colors.successSoft, fg: colors.success },
    SCARICA_ARCHIVIO: { label: 'Cartella scaricata', icon: 'folder-open-outline', bg: colors.successSoft, fg: colors.success },
    // — BLU: solo lettura —
    LETTO_MESSAGGI: { label: 'Messaggi letti', icon: 'checkmark-done-outline', bg: colors.infoSoft, fg: colors.info },
    // — GRIGIO: organizzazione, nessun impatto sui file —
    LOGOUT: { label: 'Disconnessione', icon: 'log-out-outline', bg: colors.surfaceAlt, fg: colors.textSecondary },
    RINOMINA_FILE: { label: 'File rinominato', icon: 'pencil-outline', bg: colors.surfaceAlt, fg: colors.textSecondary },
    // — ROSSO: attenzione —
    LOGIN_FAILED: { label: 'Accesso negato', icon: 'alert-circle-outline', bg: colors.dangerSoft, fg: colors.danger },
    ELIMINA_FILE_CASSETTO: { label: 'File eliminato', icon: 'trash-outline', bg: colors.dangerSoft, fg: colors.danger },
  };
}

/**
 * v4.42: "File inviato" — il server scrive "nome.pdf (msg: <id interno
 * del messaggio>)" e quel codice non dice nulla al cliente. Via la
 * parentesi col codice, resta SOLO il nome del file (es. "scan.pdf"):
 * valido per lo storico vecchio e per le voci future, il server non si
 * tocca.
 * v4.41: i dettagli nati per l'area studio arrivano al cliente con
 * roba tecnica che non gli serve. Qui si puliscono alla visualizzazione:
 * - "vecchio -> nuovo" (rinomina) -> si tiene solo il nome NUOVO;
 * - percorso "Documenti/{cliente}/{anno}/{cartella}/{file}" -> solo il
 *   nome del file, cioè ciò che sta dopo l'ultima barra;
 * - zip dell'archivio "nome.zip (12 file)" -> solo "12 file";
 * - tutto il resto resta COM'È ("Accesso eseguito", "Logout manuale",
 *   "Password sbagliata"): regola DIFENSIVA, formato non riconosciuto
 *   = non si tocca nulla. Pulendo alla visualizzazione esce pulito
 *   anche lo storico vecchio: il server non si tocca.
 */
function semplificaDettaglio(action: string, detail: string): string {
  let d = detail.trim();
  if (!d) {
    return '';
  }
  // v4.42: risposta inviata = solo il nome del file, via il codice "msg:"
  if (action === 'UPLOAD_RISPOSTA') {
    const senzaMsg = d.replace(/\s*\(msg:[^)]*\)\s*$/i, '').trim();
    if (senzaMsg) {
      d = senzaMsg;
    }
  }
  if (action === 'SCARICA_ARCHIVIO') {
    const m = d.match(/\((\d+\s+file)\)\s*$/i);
    if (m?.[1]) {
      return m[1];
    }
  }
  let testo = d;
  if (testo.includes(' -> ')) {
    const pezzi = testo.split(' -> ');
    testo = pezzi[pezzi.length - 1] ?? testo;
  }
  if (testo.includes('/')) {
    const nome = testo.split('/').pop() ?? '';
    if (nome.trim()) {
      testo = nome;
    }
  }
  const corto = testo.trim();
  return corto || d;
}

export default function AttivitaScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const actionConfig = getActionConfig(colors);

  const getConfig = useCallback(
    (action: string) =>
      actionConfig[action] ?? {
        label: 'Operazione registrata',
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
      {/* v4.40: testata = firma visiva dell'app (hero identico a Cassetto
       * e Archivio): gradiente blu notte -> blu primario -> blu notte,
       * bordo oro, scatola icona oro. Via "& audit", via la descrizione. */}
      <View style={styles.heroWrap}>
        <View style={styles.heroCard}>
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="attivitaHero" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={NAVY_NOTTE} />
                <Stop offset="0.5" stopColor={NAVY_PRIMARIO} />
                <Stop offset="1" stopColor={NAVY_NOTTE} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#attivitaHero)" />
          </Svg>
          <View style={styles.heroInner}>
            <View style={styles.heroIconBox}>
              <Ionicons name="time-outline" size={24} color={ORO} />
            </View>
            <View style={styles.heroTexts}>
              <Text style={styles.heroOverline}>REGISTRO ATTIVITÀ</Text>
              <Text style={styles.heroTitle}>Tracciamento Operazioni</Text>
            </View>
          </View>
        </View>
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
            const dettaglio = semplificaDettaglio(item.action, item.detail);
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
                    {dettaglio ? (
                      <Text style={styles.entryDetail} numberOfLines={2}>
                        {dettaglio}
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
    // v4.40: hero della testata — STESSA lingua del Cassetto (vaultHero)
    // e dell'Archivio: angoli 22, bordo oro 0.4, fondo blu notte, gradiente
    // a 3 fermate, scatola icona oro. Una sola firma per tutta l'app.
    heroWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
    heroCard: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.4)', backgroundColor: NAVY_NOTTE, ...shadow.md },
    heroInner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
    heroIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(212, 175, 55, 0.15)', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.5)', alignItems: 'center', justifyContent: 'center' },
    heroTexts: { flex: 1 },
    heroOverline: { color: ORO_CHIARO, fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
    heroTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 16, marginTop: 2 },
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

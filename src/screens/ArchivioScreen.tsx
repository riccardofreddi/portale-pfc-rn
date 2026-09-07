/**
 * Schermata Archivio — design v2.
 * Gerarchia: Anni → Cartelle → File.
 *
 * Novità v2:
 * - Card di benvenuto NEUTRA (nessun saluto con il nome: l'app è usata anche da
 *   società): titolo "Benvenuto", sottotitolo "Qui trovi l'archivio di {nome}"
 *   che funziona sia per persone sia per aziende, data italiana e statistiche.
 * - Animazioni di ingresso (fade + scivolata) per hero, ricerca e griglia anni;
 *   effetto "schiaccia" al tocco su card-anno e barra di ricerca.
 * - Sfondo hero con "bagliori" soft (nessuna libreria nuova: solo View assolute).
 * - Barra di ricerca staccata dal bordo superiore, più alta, icona ben visibile.
 * - Griglia anni a 2 colonne con card grandi e leggibili.
 * - Pulsante "Aggiorna" rimosso: si usa il trascina-per-aggiornare (RefreshControl).
 * - Ricerca con debounce (300 ms), minimo 2 caratteri, evidenziazione dei termini
 *   trovati, conteggio risultati.
 *
 * Novità v3 (l'archivio diventa un vero "contenitore di file"):
 * - Le righe dei file NON hanno più pulsanti (niente stellina, niente scarica
 *   immediata): un tocco sulla riga apre il DETTAGLIO del file.
 * - Dettaglio file = pannello inferiore con icona, nome, stato, percorso,
 *   data, dimensione e azioni chiare: Anteprima (PDF), Scarica, Preferito.
 * - Anche i risultati della ricerca si aprono nello stesso dettaglio.
 * - Niente più download accidentali: scaricare è sempre una scelta consapevole.
 *
 * Novità v3.1 (cartelle vere, dentro le cartelle):
 * - Fix: le cartelle dell'anno venivano mostrate come "file" (l'app leggeva
 *   campi diversi da quelli del backend) e il dettaglio proponeva "Scarica"
 *   per una cartella: ora le cartelle sono cartelle, con conteggio file.
 * - Fix: dentro una cartella le SOTTOCARTELLE ora appaiono e si aprono
 *   (il server le manda appiattite nei nomi dei file, es. "Sotto/file.pdf",
 *   e l'app non le distingueva). Navigazione a livelli, indietro per livello.
 *
 * Novità v3.2 (apertura e download senza pensieri):
 * - "Apri" è il pulsante principale: i PDF si aprono dentro l'app, gli altri
 *   file con l'app adeguata del telefono. L'anteprima PDF ora usa una copia
 *   locale del file: funziona sempre, non dipende più da cookie/internet.
 * - "Scarica" mostra la percentuale e, finito, il file SI APRE DA SOLO;
 *   la riga diventa subito "scaricato" (pallino verde) senza aspettare.
 * - Fix: i file dentro le sottocartelle non si scaricavano (nome con "/"),
 *   e gli errori di sessione venivano salvati come se fossero file.
 *
 * Novità v3.9 (Condividi ora allega il file DAVVERO):
 * - TROVATO IL DIFETTO: la libreria di condivisione pretende l'indirizzo
 *   del file con "file://" davanti; l'app gli dava l'indirizzo senza e
 *   lei rifiutava: si apriva solo il pannello col testo, senza file.
 *   (Email invece sistema l'indirizzo da sola: per questo funzionava.)
 * - Ora l'indirizzo viene sistemato sempre e nel pannello parte il file
 *   vero, anche col nome giusto (es. "Verbale.pdf").
 * - Se il pannello proprio non si apre, ora lo dice ("Condivisione non
 *   riuscita") invece di fingere tutto normale col solo testo.
 *
 * Novità v3.8 (parole al posto dei simboli):
 * - In alto a destra niente più simboli misteriosi: la spunta ☑ diventa
 *   la scritta "Seleziona"; in selezione compaiono "Tutti" e "Annulla"
 *   al posto dei simboli ✓✓ e ✕.
 * - "Condividi" ora dice "Condividi file" e "Email" dice "Email col
 *   file": si capisce che parte il documento vero, non solo un testo.
 * - La barra in basso durante la selezione dice "Scarica 3 file"
 *   invece di "Scarica (3)".
 *
 * Novità v3.7 (meno rumore, tutto come lo aspetti):
 * - La conferma del download è SOLO la notifica di sistema "Download
 *   completato" di Android, in alto (toccala per aprire il file):
 *   tolta la doppia notifica dell'app, inutile.
 * - "Scarica" NON apre più il file da solo: resti dove sei; il file
 *   è in Download e nella barra di stato.
 *
 * Novità v3.6 (il download si comporta come tutti i download Android):
 * - Finito il download, Android stesso mostra la notifica di sistema
 *   "File scaricato" nella barra di stato, in alto dove c'è l'orologio,
 *   col nome del file. Toccandola il file si apre. Non serve più cercare
 *   la cartella Download a mano: il file è anche nell'app File del
 *   telefono, sezione Download.
 * - Meccanismo standard di Android (DownloadManager, come il browser):
 *   già dentro l'app, funziona SUBITO, senza ricostruire nulla. Se un
 *   telefono rifiuta, tutto prosegue come prima (mai errori in più).
 *
 * Novità v3.5 (l'app fa tutto quello che fa una vera app Android):
 * - Pulsante "Condividi" nel dettaglio: apre il pannello di sistema di
 *   Android (WhatsApp, Gmail, Drive, Telegram...) con il FILE allegato.
 * - Pulsante "Email": apre la posta con il file GIA' allegato, oggetto
 *   e testo pronti: resta solo da scrivere il destinatario e inviare.
 * - Stessa protezione della v3.4 (gate silenzioso): finché l'app non
 *   viene ricostruita, i due pulsanti usano il piano B che funziona
 *   comunque (pannello col nome / posta senza allegato), zero errori.
 *
 * Correzione v3.4 (silenziosa):
 * - La libreria notifiche ora viene caricata SOLO se i 12 moduli nativi
 *   esistono davvero (gate silenzioso in src/lib/notifiche.ts): sparito
 *   l'errore "ExpoPushTokenManager" dai log; tutto il resto invariato.
 *
 * Novità v3.3 (notifica di sistema e pulsanti impossibili da fraintendere):
 * - Download finito = NOTIFICA di Android nella barra di stato, in alto
 *   (dove ci sono ora e batteria), come per tutti i download del telefono
 *   (modulo src/lib/notifiche.ts, completamente protetto: finché il dev
 *   client non include il modulo notifiche, tutto funziona come prima).
 * - Pulsanti del dettaglio IMPILATI e grandi: "Apri il file" in accento e
 *   "Scarica nel telefono" con la BARRA DI AVANZAMENTO animata dentro il
 *   pulsante; finito diventa chiaro che il file è nella cartella Download.
 * - "Torna indietro" ora è un pulsante con la scritta "Indietro" (non solo
 *   una freccia); le righe file mostrano l'icona del tipo (PDF, DOC...) con
 *   un pallino di stato: rosso = nuovo, verde con spunta = scaricato.
 * - Il tasto indietro FISICO del telefono risale le cartelle, chiude il
 *   dettaglio e chiude la ricerca: navigazione come ci si aspetta su Android.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FileIcon, canPreviewFile } from '@/components/FileIcon';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { SkeletonList } from '@/components/Skeleton';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';
import { scaricaInDownload, scaricaInCache, apriConApp } from '@/lib/download';
import { condividiDocumento, inviaDocumentoEmail } from '@/lib/condividi';
import type { Cartella, FileItem, SearchResult } from '@/types/api';
import { radius, shadow, spacing, typography, useColors, type ThemeColors } from '@/theme';

type Step = 'anno' | 'cartella' | 'file';

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

function dataDiOggi(): string {
  const d = new Date();
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
}

function oraDi(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Spezza il nome evidenziando (in accento) le parti che corrispondono alla query. */
function evidenzia(nome: string, query: string, matchStyle: { color: string; fontWeight: '700' }): React.ReactNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [nome];
  const lower = nome.toLowerCase();
  const parti: React.ReactNode[] = [];
  let i = 0;
  for (;;) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      parti.push(nome.slice(i));
      break;
    }
    if (idx > i) parti.push(nome.slice(i, idx));
    parti.push(
      <Text key={`${idx}-${q.length}`} style={matchStyle}>
        {nome.slice(idx, idx + q.length)}
      </Text>,
    );
    i = idx + q.length;
  }
  return parti;
}

/* ============================================================
 * Animazioni (React Native core, nessuna libreria aggiuntiva)
 * ============================================================ */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Entrata: fade + piccola scivolata dal basso. */
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

/** Pressable con effetto "schiaccia" al tocco. */
function ScalablePress({
  onPress,
  onLongPress,
  style,
  accessibilityLabel,
  children,
}: {
  onPress: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.timing(scale, { toValue: 0.96, duration: 110, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityLabel={accessibilityLabel}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

/* ============================================================
 * Dettaglio file (v3) — pannello inferiore con tutte le azioni.
 * Il tocco su una riga NON scarica più: apre questo dettaglio,
 * così si vede sempre cosa si sta per aprire o scaricare.
 * ============================================================ */

const STATO_BADGE: Record<
  string,
  { label: string; variant: 'danger' | 'neutral' | 'success' | 'warning' }
> = {
  nuovo: { label: 'Nuovo', variant: 'danger' },
  visto: { label: 'Visto', variant: 'neutral' },
  scaricato: { label: 'Scaricato', variant: 'success' },
  preferito: { label: 'Preferito', variant: 'warning' },
};

/** Riga della lista archivio: anno, cartella (con conteggio), sottocartella o file. */
type ItemArchivio =
  | { kind: 'anno'; nome: string }
  | { kind: 'cartella'; nome: string; count?: number; nuovi?: number }
  | { kind: 'sottocartella'; nome: string; count: number; nuovi?: number }
  | { kind: 'file'; file: FileItem };

/** Legge un campo numerico accettando i nomi del backend (nFiles/nNuovi) e quelli previsti (count/nuovi). */
function campoNumero(o: Record<string, unknown>, nome1: string, nome2: string): number | undefined {
  const v = o[nome1] ?? o[nome2];
  return typeof v === 'number' ? v : undefined;
}

function DettaglioFileModal({
  file,
  percorso,
  downloading,
  progresso,
  aprendo,
  togglingFav,
  condividendo,
  inviandoEmail,
  onClose,
  onApri,
  onDownload,
  onCondividi,
  onEmail,
  onTogglePreferito,
}: {
  file: FileItem | null;
  percorso?: string;
  downloading: boolean;
  progresso: number | null;
  aprendo: boolean;
  togglingFav: boolean;
  condividendo: boolean;
  inviandoEmail: boolean;
  onClose: () => void;
  onApri: (f: FileItem) => void;
  onDownload: (f: FileItem) => void;
  onCondividi: (f: FileItem) => void;
  onEmail: (f: FileItem) => void;
  onTogglePreferito: (f: FileItem) => void;
}) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const previewabile = file ? canPreviewFile(file.nome) : false;
  const badge = file?.stato ? STATO_BADGE[file.stato] : null;
  // Barra di avanzamento DENTRO il pulsante Scarica (v3.3, RN core).
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fill, {
      toValue: downloading ? (progresso ?? 0) : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [downloading, progresso, fill]);
  const larghezzaFill = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <Modal visible={!!file} onClose={onClose}>
      {file && (
        <View style={styles.detailWrap}>
          {/* Intestazione: icona tipo file + nome + stato */}
          <View style={styles.detailHead}>
            <FileIcon filename={file.nome} size={56} />
            <View style={styles.detailHeadText}>
              <Text style={styles.detailName} numberOfLines={3}>
                {file.nome}
              </Text>
              {(badge || file.isPreferito) && (
                <View style={styles.detailBadgeRow}>
                  {badge && <Badge label={badge.label} variant={badge.variant} />}
                  {file.isPreferito && !badge && <Badge label="Preferito" variant="warning" />}
                </View>
              )}
            </View>
            <Pressable
              onPress={onClose}
              style={styles.detailClose}
              accessibilityLabel="Chiudi dettaglio"
            >
              <Text style={styles.detailCloseText}>✕</Text>
            </Pressable>
          </View>

          {/* Scheda informazioni del file */}
          <View style={styles.detailInfoCard}>
            {percorso ? (
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>📁 Percorso</Text>
                <Text style={styles.detailInfoValue} numberOfLines={2}>
                  {percorso}
                </Text>
              </View>
            ) : null}
            {file.lastModified ? (
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>📅 Data modifica</Text>
                <Text style={styles.detailInfoValue}>{formatDate(file.lastModified)}</Text>
              </View>
            ) : null}
            {file.sizeStr ? (
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>💾 Dimensione</Text>
                <Text style={styles.detailInfoValue}>{file.sizeStr}</Text>
              </View>
            ) : null}
          </View>

          {/* Azioni (v3.3): impilate e grandi, impossibili da fraintendere */}
          <View style={styles.detailActions}>
            <Pressable
              onPress={() => onApri(file)}
              disabled={downloading || aprendo}
              style={({ pressed }) => [
                styles.bigPrimary,
                (downloading || aprendo) && styles.bigDisabled,
                pressed && !downloading && !aprendo && styles.bigPressed,
              ]}
              accessibilityLabel="Apri il file"
            >
              <Text style={styles.bigPrimaryIcon}>👁</Text>
              <Text style={styles.bigPrimaryText}>{aprendo ? 'Apro...' : 'Apri il file'}</Text>
            </Pressable>

            <Pressable
              onPress={() => onDownload(file)}
              disabled={downloading || aprendo}
              style={({ pressed }) => [
                styles.bigDownload,
                downloading && styles.bigDownloadActive,
                pressed && !downloading && !aprendo && styles.bigPressed,
              ]}
              accessibilityLabel={
                downloading ? 'Download in corso' : 'Scarica il file nel telefono'
              }
            >
              <Animated.View
                style={[styles.bigDownloadFill, { width: larghezzaFill }]}
                pointerEvents="none"
              />
              <Text
                style={[styles.bigDownloadText, downloading && styles.bigDownloadTextActive]}
                numberOfLines={1}
              >
                {downloading
                  ? `Scarico... ${progresso ?? 0}%`
                  : file.stato === 'scaricato' || file.stato === 'preferito'
                    ? '⬇ Scarica di nuovo'
                    : '⬇ Scarica nel telefono'}
              </Text>
            </Pressable>

            {/* Condividi ed email (v3.5, scritte chiare dalla v3.8) */}
            <View style={styles.shareRow}>
              <Pressable
                onPress={() => onCondividi(file)}
                disabled={downloading || aprendo || condividendo || inviandoEmail}
                style={({ pressed }) => [
                  styles.shareBtn,
                  (downloading || aprendo || condividendo || inviandoEmail) && styles.bigDisabled,
                  pressed && !condividendo && !inviandoEmail && styles.bigPressed,
                ]}
                accessibilityLabel="Condividi il documento"
              >
                <Text style={styles.shareIcon}>📤</Text>
                <Text style={styles.shareText} numberOfLines={1}>
                  {condividendo ? 'Preparo...' : 'Condividi file'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onEmail(file)}
                disabled={downloading || aprendo || condividendo || inviandoEmail}
                style={({ pressed }) => [
                  styles.shareBtn,
                  (downloading || aprendo || condividendo || inviandoEmail) && styles.bigDisabled,
                  pressed && !condividendo && !inviandoEmail && styles.bigPressed,
                ]}
                accessibilityLabel="Invia il documento per email"
              >
                <Text style={styles.shareIcon}>✉️</Text>
                <Text style={styles.shareText} numberOfLines={1}>
                  {inviandoEmail ? 'Preparo...' : 'Email col file'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.detailHint}>
              {previewabile
                ? 'Si apre dentro l\'app. Con "Scarica" lo conservi nella cartella Download del telefono.'
                : 'Si apre con l\'app adeguata del telefono. Con "Scarica" lo conservi anche in Download.'}
            </Text>
          </View>

          {file.isPreferito !== undefined && (
            <Button
              label={file.isPreferito ? '★ Rimuovi dai preferiti' : '☆ Aggiungi ai preferiti'}
              variant="ghost"
              loading={togglingFav}
              onPress={() => onTogglePreferito(file)}
            />
          )}
        </View>
      )}
    </Modal>
  );
}

/* ============================================================
 * Schermata
 * ============================================================ */

export default function ArchivioScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const user = useAppStore((s) => s.user);
  const anno = useAppStore((s) => s.annoSelezionato);
  const cartella = useAppStore((s) => s.cartellaSelezionata);
  const setAnno = useAppStore((s) => s.setAnno);
  const setCartella = useAppStore((s) => s.setCartella);
  const setPreviewFile = useAppStore((s) => s.setPreviewFile);

  const [anni, setAnni] = useState<string[]>([]);
  const [cartelle, setCartelle] = useState<Cartella[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastLoad, setLastLoad] = useState<Date | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [togglingFav, setTogglingFav] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  // v3.5: condivisione e invio email in corso (chiave del file)
  const [condividendo, setCondividendo] = useState<string | null>(null);
  const [inviandoEmail, setInviandoEmail] = useState<string | null>(null);
  const [detailFile, setDetailFile] = useState<FileItem | null>(null);
  const [detailPercorso, setDetailPercorso] = useState<string | undefined>(undefined);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedFiles = files.filter((f) => selected.has(f.key));

  const searchSeq = useRef(0);

  const step: Step = cartella ? 'file' : anno ? 'cartella' : 'anno';
  const numColumns = step === 'anno' ? 2 : 1;

  // Percorso leggibile per breadcrumb e dettaglio: "2025 › Altro › Sotto"
  const percorsoBello = anno
    ? cartella
      ? `${anno} › ${cartella.split('/').join(' › ')}`
      : anno
    : undefined;

  // Lista normalizzata per la FlatList (fix v3.1):
  // - le cartelle del backend mandano nFiles/nNuovi: prima l'app leggeva solo
  //   count/nuovi e le cartelle venivano mostrate come "file"!
  // - dentro una cartella il backend restituisce anche le SOTTOCARTELLE,
  //   appiattite nei nomi dei file ("Sotto/file.pdf"): qui le separo e le
  //   rendo navigabili come cartelle vere, con conteggio file e "nuovi".
  const items: ItemArchivio[] = useMemo(() => {
    if (step === 'anno') return anni.map((a) => ({ kind: 'anno', nome: a }) as ItemArchivio);
    if (step === 'cartella') {
      return cartelle.map((c) => ({
        kind: 'cartella',
        nome: c.nome,
        count: campoNumero(c, 'count', 'nFiles'),
        nuovi: campoNumero(c, 'nuovi', 'nNuovi'),
      }));
    }
    const sotto = new Map<string, { count: number; nuovi: number }>();
    const diretti: FileItem[] = [];
    for (const f of files) {
      const slash = f.nome.indexOf('/');
      if (slash === -1) {
        diretti.push(f);
      } else {
        const nome = f.nome.slice(0, slash);
        const cur = sotto.get(nome) ?? { count: 0, nuovi: 0 };
        cur.count += 1;
        if (f.stato === 'nuovo') cur.nuovi = (cur.nuovi ?? 0) + 1;
        sotto.set(nome, cur);
      }
    }
    const righeSotto: ItemArchivio[] = [...sotto.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([nome, v]) => ({ kind: 'sottocartella', nome, count: v.count, nuovi: v.nuovi }));
    return [...righeSotto, ...diretti.map((file) => ({ kind: 'file', file }) as ItemArchivio)];
  }, [step, anni, cartelle, files]);

  const nFileDiretti = items.filter((i) => i.kind === 'file').length;

  const nome = (user?.name?.trim() || user?.username || '').trim();
  const nomeBello = nome ? nome.charAt(0).toUpperCase() + nome.slice(1) : '';

  const load = useCallback(
    async (showRefresh = false) => {
      if (!user) return;
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await api.documenti.list({
          username: user.username,
          anno: anno ?? undefined,
          cartella: cartella ?? undefined,
        });
        if (res.anni) setAnni(res.anni.sort((a, b) => b.localeCompare(a)));
        setCartelle(res.cartelle ?? []);
        setFiles(res.files ?? []);
        setLastLoad(new Date());
      } catch (err) {
        toast.error('Errore caricamento', err instanceof Error ? err.message : 'Errore sconosciuto');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, anno, cartella],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Ricerca con debounce: parte dopo 300 ms, solo da 2 caratteri, e ignora
  // le risposte ormai superate da query più recenti (guardia di sequenza).
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const seq = ++searchSeq.current;
      try {
        const res = await api.ricerca.search(q, user?.username);
        if (seq === searchSeq.current) setSearchResults(res.results ?? []);
      } catch {
        if (seq === searchSeq.current) setSearchResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user?.username]);

  async function handleTogglePreferito(file: FileItem) {
    setTogglingFav(file.key);
    haptics.tap();
    try {
      const res = await api.preferiti.toggle(file.key);
      setFiles((prev) =>
        prev.map((f) =>
          f.key === file.key
            ? { ...f, isPreferito: res.isPreferito, stato: res.isPreferito ? 'preferito' : 'visto' }
            : f,
        ),
      );
      setDetailFile((prev) =>
        prev && prev.key === file.key
          ? { ...prev, isPreferito: res.isPreferito, stato: res.isPreferito ? 'preferito' : 'visto' }
          : prev,
      );
      toast.success(res.isPreferito ? 'Aggiunto ai preferiti' : 'Rimosso dai preferiti');
    } catch {
      toast.error('Errore', 'Impossibile aggiornare i preferiti');
    } finally {
      setTogglingFav(null);
    }
  }

  async function handleDownload(file: FileItem) {
    setDownloading(file.key);
    setProgresso(0);
    haptics.impact();
    try {
      await scaricaInDownload(file.key, file.nome, setProgresso);
      setFiles((prev) =>
        prev.map((f) =>
          f.key === file.key && f.stato !== 'preferito' ? { ...f, stato: 'scaricato' } : f,
        ),
      );
      setDetailFile((prev) =>
        prev && prev.key === file.key && prev.stato !== 'preferito'
          ? { ...prev, stato: 'scaricato' }
          : prev,
      );
      haptics.success();
      // v3.7: nessuna apertura automatica e nessuna notifica dell'app.
      // La conferma e' SOLO la notifica di sistema "Download completato"
      // di Android, in alto nella barra di stato (toccala per aprire il
      // file); l'utente resta dove si trova, senza sorprese.
      toast.success('Download completato', 'Il file è in Download e nella barra in alto');
    } catch (err) {
      toast.error('Errore download', err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setDownloading(null);
      setProgresso(null);
    }
  }

  // v3.5: apre il pannello di condivisione di Android con il file (se le
  // librerie native sono attive) oppure con il nome del documento.
  async function handleCondividi(file: FileItem) {
    setCondividendo(file.key);
    haptics.tap();
    try {
      let percorso: string | null = null;
      try {
        percorso = await scaricaInCache(file.key);
      } catch (err) {
        toast.error('Condivisione', err instanceof Error ? err.message : 'Impossibile scaricare');
        return;
      }
      const esito = await condividiDocumento(percorso, file.nome);
      if (esito === 'ok') {
        haptics.success();
        toast.success('Condivisione pronta', "Scegli l'app con cui inviarlo");
      } else if (esito === 'solo-testo') {
        toast.info('Pannello aperto', "Per allegare il FILE serve l'aggiornamento dell'app");
      } else if (esito === 'errore') {
        toast.error('Condivisione', 'Non sono riuscito ad aprire il pannello. Riprova');
      }
    } finally {
      setCondividendo(null);
    }
  }

  // v3.5: apre la posta con il documento gia' allegato (dopo il rebuild);
  // prima di allora apre l'app email con oggetto e testo pronti.
  async function handleEmail(file: FileItem) {
    setInviandoEmail(file.key);
    haptics.tap();
    try {
      let percorso: string | null = null;
      try {
        percorso = await scaricaInCache(file.key);
      } catch (err) {
        toast.error('Email', err instanceof Error ? err.message : 'Impossibile scaricare');
        return;
      }
      const esito = await inviaDocumentoEmail(percorso, file.nome);
      if (esito === 'ok') {
        haptics.success();
        toast.success('Email pronta', 'Aggiungi il destinatario e invia');
      } else if (esito === 'solo-testo') {
        toast.info('Posta aperta', "L'allegato parte dopo l'aggiornamento dell'app");
      } else if (esito === 'niente-email') {
        toast.error('Email', 'Nessuna app di posta configurata sul telefono');
      } else if (esito === 'errore') {
        toast.error('Email', 'Impossibile aprire la posta');
      }
      // 'annullato': l'utente ha chiuso la posta, non e' un errore
    } finally {
      setInviandoEmail(null);
    }
  }

  function apriRicerca() {
    haptics.tap();
    setSearchOpen(true);
  }

  function apriRisultato(item: SearchResult) {
    haptics.tap();
    setDetailPercorso(`${item.anno} › ${item.cartella}`);
    setDetailFile({
      nome: item.nome,
      key: item.key,
      size: item.size,
      sizeStr: item.sizeStr,
      lastModified: null,
    });
  }

  function chiudiDettaglio() {
    setDetailFile(null);
    setDetailPercorso(undefined);
  }

  function chiudiRicerca() {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }

  /** Risale di un livello: da sottocartella a cartella, da cartella ad anni. */
  function tornaSu() {
    haptics.tap();
    if (step === 'file') {
      if (cartella && cartella.includes('/')) {
        setCartella(cartella.slice(0, cartella.lastIndexOf('/')));
      } else {
        setCartella(null);
      }
    } else {
      setAnno(null);
    }
  }

  // Tasto indietro FISICO di Android (v3.3): chiude dettaglio e ricerca e
  // risale le cartelle, come ci si aspetta. All'elenco anni non interferisce
  // (false = comportamento standard). Si riregistra a ogni render con le
  // funzioni sempre aggiornate: nessuna closure stantia.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (detailFile) {
        chiudiDettaglio();
        return true;
      }
      if (searchOpen) {
        chiudiRicerca();
        return true;
      }
      if (selectMode) {
        clearSelection();
        return true;
      }
      if (step === 'file' || step === 'cartella') {
        tornaSu();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  });

  /** Apri (v3.2): i PDF nell'app, gli altri con l'app giusta del telefono. */
  async function apriDocumento(file: FileItem) {
    if (canPreviewFile(file.nome)) {
      haptics.tap();
      chiudiDettaglio();
      setPreviewFile(file);
      return;
    }
    setOpening(file.key);
    haptics.tap();
    try {
      const percorsoLocale = await scaricaInCache(file.key);
      const aperto = await apriConApp(percorsoLocale, file.nome);
      if (!aperto) {
        // Nessuna app per questo tipo di file: lo salvo comunque in Download
        await scaricaInDownload(file.key, file.nome);
        toast.info('File salvato', 'Nessuna app per questo tipo di file: lo trovi in Download');
      }
    } catch (err) {
      toast.error('Errore apertura', err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setOpening(null);
    }
  }

  function toggleSelect(key: string) {
    haptics.tap();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    haptics.tap();
    setSelected(new Set(files.map((f) => f.key)));
  }

  function clearSelection() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function handleBulkDownload() {
    haptics.impact();
    toast.info(`Download di ${selectedFiles.length} file in corso...`);
    let success = 0;
    for (const f of selectedFiles) {
      try {
        await scaricaInDownload(f.key, f.nome);
        success++;
      } catch (err) {
        console.error('[Archivio] bulk download error:', f.nome, err);
      }
    }
    if (success === selectedFiles.length) {
      haptics.success();
      toast.success('Tutti i file scaricati', `${success}/${selectedFiles.length}`);
    } else {
      haptics.warning();
      toast.warning('Download parziale', `${success}/${selectedFiles.length} scaricati`);
    }
    clearSelection();
  }

  async function handleBulkPreferiti() {
    haptics.tap();
    let count = 0;
    for (const f of selectedFiles) {
      try {
        await api.preferiti.toggle(f.key);
        count++;
      } catch (err) {
        console.error('[Archivio] bulk preferiti error:', f.nome, err);
      }
    }
    toast.success('Preferiti aggiornati', `${count} file modificati`);
    load(true);
    clearSelection();
  }

  /* ---------- Vista ricerca dedicata ---------- */

  if (searchOpen) {
    const q = searchQuery.trim();
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.searchHeader}>
          <Pressable
            onPress={chiudiRicerca}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            accessibilityLabel="Chiudi ricerca e torna all'archivio"
          >
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnLabel}>Indietro</Text>
          </Pressable>
          <View style={styles.searchInputWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cerca documenti..."
              placeholderTextColor={colors.textTertiary}
              style={styles.searchInput}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                style={styles.clearBtn}
                accessibilityLabel="Cancella testo"
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        {searching ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : searchResults.length === 0 ? (
          <EmptyState
            icon={<Text style={styles.emptyIcon}>🔍</Text>}
            title={q.length >= 2 ? `Nessun risultato per "${q}"` : 'Cerca documenti'}
            subtitle={q.length >= 2 ? 'Prova con un altro nome o annata' : 'Scrivi almeno 2 lettere del nome del file'}
          />
        ) : (
          <>
            <Text style={styles.resultCount}>
              {searchResults.length === 1 ? '1 risultato' : `${searchResults.length} risultati`} per "{q}"
            </Text>
            <FlatList
              style={styles.list}
              contentContainerStyle={styles.listContent}
              data={searchResults}
              keyExtractor={(item) => item.key}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable onPress={() => apriRisultato(item)}>
                  {({ pressed }) => (
                    <Card style={[styles.row, pressed && styles.rowPressed]}>
                      <FileIcon filename={item.nome} />
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {evidenzia(item.nome, q, styles.matchText)}
                        </Text>
                        <Text style={styles.rowSubtitle} numberOfLines={1}>
                          {item.anno} › {item.cartella}
                          {item.sizeStr ? ` · ${item.sizeStr}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Card>
                  )}
                </Pressable>
              )}
            />
          </>
        )}

        {/* Dettaglio file (v3): anche i risultati della ricerca aprono il dettaglio */}
        <DettaglioFileModal
          file={detailFile}
          percorso={detailPercorso}
          downloading={downloading === detailFile?.key}
          progresso={downloading === detailFile?.key ? progresso : null}
          aprendo={opening === detailFile?.key}
          togglingFav={togglingFav === detailFile?.key}
          condividendo={condividendo === detailFile?.key}
          inviandoEmail={inviandoEmail === detailFile?.key}
          onClose={chiudiDettaglio}
          onApri={apriDocumento}
          onDownload={handleDownload}
          onCondividi={handleCondividi}
          onEmail={handleEmail}
          onTogglePreferito={handleTogglePreferito}
        />
      </SafeAreaView>
    );
  }

  /* ---------- Vista principale ---------- */

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {step !== 'anno' && (
        <View style={styles.toolbar}>
          <Pressable
            onPress={tornaSu}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            accessibilityLabel="Torna indietro"
          >
            <Text style={styles.backBtnArrow}>←</Text>
            <Text style={styles.backBtnLabel}>Indietro</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          {step === 'file' && !selectMode && nFileDiretti > 0 && (
            <Pressable
              onPress={() => {
                haptics.tap();
                setSelectMode(true);
              }}
              style={({ pressed }) => [styles.selectPill, pressed && styles.selectPillPressed]}
              accessibilityLabel="Seleziona"
            >
              <Text style={styles.selectPillText}>Seleziona</Text>
            </Pressable>
          )}
          {selectMode && (
            <>
              <Pressable
                onPress={() => {
                  haptics.tap();
                  selectAll();
                }}
                style={({ pressed }) => [styles.selectPill, pressed && styles.selectPillPressed]}
                accessibilityLabel="Seleziona tutti"
              >
                <Text style={styles.selectPillText}>Tutti</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptics.tap();
                  clearSelection();
                }}
                style={({ pressed }) => [styles.selectPill, pressed && styles.selectPillPressed]}
                accessibilityLabel="Annulla selezione"
              >
                <Text style={styles.selectPillText}>Annulla</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {step !== 'anno' && (
        <View style={styles.breadcrumb}>
          <Text style={styles.crumbText}>{percorsoBello} · v3.9</Text>
        </View>
      )}

      {/* Card di benvenuto: neutra, adatta a persone e società */}
      {step === 'anno' && (
        <Entrata style={styles.heroWrap}>
          <Card style={styles.heroCard} padded={false}>
            <View style={styles.heroAurora1} pointerEvents="none" />
            <View style={styles.heroAurora2} pointerEvents="none" />
            <View style={styles.heroInner}>
              <Text style={styles.heroOverline}>{`Archivio v3.9 · ${dataDiOggi()}`}</Text>
              <Text style={styles.heroTitle}>
                Benvenuto <Text style={styles.heroWave}>👋</Text>
              </Text>
              <Text style={styles.heroSubtitle}>
                {nomeBello
                  ? `Qui trovi l'archivio di ${nomeBello}`
                  : 'Qui trovi tutti i documenti del portale'}
              </Text>
              <View style={styles.heroChips}>
                <View style={styles.heroChip}>
                  <Text style={styles.heroChipText}>
                    📁 {anni.length} {anni.length === 1 ? 'anno' : 'anni'} di archivio
                  </Text>
                </View>
                {lastLoad && (
                  <View style={styles.heroChip}>
                    <Text style={styles.heroChipText}>✓ Aggiornato alle {oraDi(lastLoad)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.heroHint}>Trascina in basso per aggiornare l'archivio</Text>
            </View>
          </Card>
        </Entrata>
      )}

      {/* Barra di ricerca: sempre visibile, ben staccata dai bordi */}
      <Entrata delay={90} style={styles.searchWrap}>
        <ScalablePress onPress={apriRicerca} style={styles.searchBar} accessibilityLabel="Apri ricerca">
          <View style={styles.searchIconBox}>
            <Text style={styles.searchIconBoxText}>🔍</Text>
          </View>
          <Text style={styles.searchBarText}>Cerca nel portale...</Text>
        </ScalablePress>
      </Entrata>

      {step === 'anno' && !loading && anni.length > 0 && (
        <Text style={styles.sectionLabel}>Sfoglia per anno</Text>
      )}

      {loading && !refreshing ? (
        <SkeletonList count={5} height={64} />
      ) : (
        <FlatList<ItemArchivio>
          key={step}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          data={items}
          keyExtractor={(item): string =>
            item.kind === 'file' ? item.file.key : `${item.kind}:${item.nome}`
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={({ item, index }) => {
            if (item.kind === 'anno') {
              return (
                <Entrata delay={Math.min(160 + index * 60, 700)} style={styles.yearCell}>
                  <ScalablePress
                    onPress={() => {
                      haptics.tap();
                      setAnno(item.nome);
                    }}
                  >
                    <Card style={styles.yearCard} padded={false}>
                      <View style={styles.yearCardInner}>
                        <View style={styles.yearIconBox}>
                          <Text style={styles.yearIconBoxText}>📁</Text>
                        </View>
                        <Text style={styles.yearCardTitle}>{item.nome}</Text>
                        <View style={styles.yearCardFoot}>
                          <Text style={styles.yearCardSub}>Apri</Text>
                          <Text style={styles.yearCardArrow}>›</Text>
                        </View>
                      </View>
                    </Card>
                  </ScalablePress>
                </Entrata>
              );
            }
            if (item.kind === 'cartella' || item.kind === 'sottocartella') {
              const subparts = [
                item.count != null ? `${item.count} file` : null,
                item.nuovi ? `${item.nuovi} nuovi` : null,
              ].filter(Boolean);
              return (
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    if (item.kind === 'cartella') setCartella(item.nome);
                    else setCartella(`${cartella}/${item.nome}`);
                  }}
                >
                  {({ pressed }) => (
                    <Card style={[styles.row, pressed && styles.rowPressed]}>
                      <View style={[styles.folderIcon, { backgroundColor: colors.accentSoft }]}>
                        <Text style={styles.folderIconText}>📁</Text>
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={2}>
                          {item.nome}
                        </Text>
                        {subparts.length > 0 && <Text style={styles.rowSubtitle}>{subparts.join(' · ')}</Text>}
                      </View>
                      {item.nuovi ? <Badge label={item.nuovi} variant="danger" /> : null}
                      <Text style={styles.chevron}>›</Text>
                    </Card>
                  )}
                </Pressable>
              );
            }
            const f = item.file;
            const isSelected = selected.has(f.key);
            return (
              <Pressable
                onPress={() => {
                  if (selectMode) toggleSelect(f.key);
                  else {
                    haptics.tap();
                    setDetailPercorso(percorsoBello);
                    setDetailFile(f);
                  }
                }}
                onLongPress={() => {
                  if (!selectMode) {
                    haptics.impact();
                    setSelectMode(true);
                    setSelected(new Set([f.key]));
                  }
                }}
              >
                {({ pressed }) => (
                  <Card
                    style={[styles.row, pressed && styles.rowPressed, selectMode && isSelected && styles.rowSelected]}
                  >
                    {selectMode ? (
                      <View style={styles.checkboxWrap}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                          {isSelected && <Text style={styles.checkboxText}>✓</Text>}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.fileIconWrap}>
                        <FileIcon filename={f.nome} size={40} />
                        {f.stato === 'nuovo' && (
                          <View style={[styles.fileIconMini, { backgroundColor: colors.danger }]} />
                        )}
                        {(f.stato === 'scaricato' || f.stato === 'preferito') && (
                          <View style={[styles.fileIconMini, styles.fileIconMiniOk]}>
                            <Text style={styles.fileIconMiniText}>✓</Text>
                          </View>
                        )}
                      </View>
                    )}
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {f.nome}
                      </Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {f.sizeStr}
                        {f.lastModified ? ` · ${formatDate(f.lastModified)}` : ''}
                      </Text>
                    </View>
                    {!selectMode && <Text style={styles.chevron}>›</Text>}
                  </Card>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<Text style={styles.emptyIcon}>📂</Text>}
              title="Nessun documento trovato"
              subtitle={
                step === 'anno'
                  ? 'Trascina in basso per aggiornare'
                  : 'Trascina in basso per aggiornare la cartella'
              }
            />
          }
          ListFooterComponent={
            step === 'file' && nFileDiretti > 0 ? (
              <Text style={styles.tipText}>
                💡 Tocca un file per vederne i dettagli · tieni premuto per selezionarne più di uno
              </Text>
            ) : null
          }
        />
      )}

      {selectMode && selected.size > 0 && (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkCount}>
            {selected.size} selezionat{selected.size === 1 ? 'o' : 'i'}
          </Text>
          <View style={styles.bulkActions}>
            <Pressable
              onPress={handleBulkPreferiti}
              style={({ pressed }) => [styles.bulkBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.bulkBtnText}>★ Preferiti</Text>
            </Pressable>
            <Pressable
              onPress={handleBulkDownload}
              style={({ pressed }) => [styles.bulkBtn, styles.bulkBtnPrimary, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.bulkBtnPrimaryText}>⬇ Scarica {selected.size} file</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Dettaglio file (v3): si apre al tocco su una riga file */}
      <DettaglioFileModal
        file={detailFile}
        percorso={detailPercorso}
        downloading={downloading === detailFile?.key}
        progresso={downloading === detailFile?.key ? progresso : null}
        aprendo={opening === detailFile?.key}
        togglingFav={togglingFav === detailFile?.key}
        condividendo={condividendo === detailFile?.key}
        inviandoEmail={inviandoEmail === detailFile?.key}
        onClose={chiudiDettaglio}
        onApri={apriDocumento}
        onDownload={handleDownload}
        onCondividi={handleCondividi}
        onEmail={handleEmail}
        onTogglePreferito={handleTogglePreferito}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
    selectPill: { minHeight: 38, paddingHorizontal: 12, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    selectPillPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
    selectPillText: { ...typography.button, fontSize: 13, color: colors.textPrimary },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, height: 40, borderRadius: radius.full, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent },
    backBtnPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
    backBtnArrow: { fontSize: 16, color: colors.accentDark, fontWeight: '800' },
    backBtnLabel: { ...typography.button, color: colors.accentDark, fontSize: 14 },
    breadcrumb: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surfaceAlt },
    crumbText: { ...typography.caption, color: colors.textSecondary },
    list: { flex: 1 },
    listContent: { padding: spacing.lg, gap: spacing.md },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64 },
    rowPressed: { borderColor: colors.accent, transform: [{ scale: 0.98 }] },
    folderIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    folderIconText: { fontSize: 20 },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
    rowSubtitle: { ...typography.caption, color: colors.textSecondary },
    chevron: { fontSize: 22, color: colors.textTertiary, fontWeight: '300' },
    fileIconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    fileIconMini: { position: 'absolute', right: -4, top: -4, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.surface },
    fileIconMiniOk: { backgroundColor: colors.success },
    fileIconMiniText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', lineHeight: 13, textAlign: 'center' },
    emptyIcon: { fontSize: 48 },
    matchText: { color: colors.accent, fontWeight: '700' },
    resultCount: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
    tipText: { ...typography.caption, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.lg },

    // Card di benvenuto (v2)
    heroWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, marginBottom: spacing.xs },
    heroCard: { backgroundColor: colors.surface, borderColor: colors.border, overflow: 'hidden', ...shadow.md },
    heroAurora1: { position: 'absolute', top: -70, right: -50, width: 210, height: 210, borderRadius: 105, backgroundColor: colors.accent, opacity: 0.12 },
    heroAurora2: { position: 'absolute', bottom: -80, left: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: colors.accent, opacity: 0.07 },
    heroInner: { padding: spacing.xl, gap: spacing.sm },
    heroOverline: { ...typography.labelSmall, color: colors.textTertiary, letterSpacing: 1.2 },
    heroTitle: { ...typography.h1, color: colors.textPrimary, marginTop: 2 },
    heroWave: { fontSize: 26 },
    heroSubtitle: { ...typography.body, color: colors.textSecondary },
    heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
    heroChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
    heroChipText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
    heroHint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },

    // Barra di ricerca (v2: staccata dal bordo, piu' alta, icona visibile)
    searchWrap: { marginTop: spacing.lg, marginBottom: spacing.sm, marginHorizontal: spacing.lg },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.sm,
    },
    searchIconBox: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
    searchIconBoxText: { fontSize: 16 },
    searchBarText: { ...typography.body, color: colors.textTertiary },

    // Intestazione sezione anni
    sectionLabel: { ...typography.labelSmall, color: colors.textTertiary, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs, letterSpacing: 1.2 },

    // Griglia anni (v2: card grandi con icona, anno e invito all'apertura)
    gridRow: { gap: spacing.md },
    yearCell: { flex: 1 },
    yearCard: { flex: 1, minHeight: 128 },
    yearCardInner: { flex: 1, alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.lg },
    yearIconBox: { width: 46, height: 46, borderRadius: radius.md + 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
    yearIconBoxText: { fontSize: 22 },
    yearCardTitle: { ...typography.h2, color: colors.textPrimary },
    yearCardFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    yearCardSub: { ...typography.caption, color: colors.accent, fontWeight: '700' },
    yearCardArrow: { fontSize: 16, color: colors.accent, fontWeight: '700', marginTop: -1 },

    // Vista ricerca dedicata
    searchHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44, gap: spacing.sm },
    searchIcon: { fontSize: 14 },
    searchInput: { flex: 1, ...typography.bodySmall, color: colors.textPrimary, paddingVertical: 0 },
    clearBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.border },
    clearBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },

    rowSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    checkboxWrap: { width: 24, alignItems: 'center', justifyContent: 'center' },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
    checkboxText: { color: colors.textInverse, fontSize: 14, fontWeight: '700' },
    bulkBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, shadowColor: colors.primary, shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4 },
    bulkCount: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
    bulkActions: { flexDirection: 'row', gap: spacing.sm },
    bulkBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
    bulkBtnText: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
    bulkBtnPrimary: { backgroundColor: colors.accent },
    bulkBtnPrimaryText: { ...typography.bodySmall, color: colors.textInverse, fontWeight: '700' },

    // Dettaglio file (v3)
    detailWrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg },
    detailHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    detailHeadText: { flex: 1, gap: 6 },
    detailName: { ...typography.h3, color: colors.textPrimary },
    detailBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    detailClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
    detailCloseText: { fontSize: 15, color: colors.textSecondary },
    detailInfoCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
    detailInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    detailInfoLabel: { ...typography.bodySmall, color: colors.textSecondary },
    detailInfoValue: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600', flex: 1, textAlign: 'right' },
    detailActions: { gap: spacing.sm },
    bigPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 58, borderRadius: radius.lg, backgroundColor: colors.accent, ...shadow.md },
    bigPrimaryIcon: { fontSize: 16 },
    bigPrimaryText: { ...typography.button, color: colors.textInverse, fontSize: 16, fontWeight: '800' },
    bigDownload: { overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 58, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.surface },
    bigDownloadActive: { borderColor: colors.accent },
    bigDownloadFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.accentSoft, opacity: 0.9 },
    bigDownloadText: { ...typography.button, color: colors.textPrimary, fontWeight: '700' },
    bigDownloadTextActive: { color: colors.accentDark, fontWeight: '800' },
    bigPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    bigDisabled: { opacity: 0.5 },
    detailHint: { ...typography.caption, color: colors.textTertiary, textAlign: 'center' },
    // v3.5: riga Condividi / Email nel dettaglio
    shareRow: { flexDirection: 'row', gap: spacing.sm },
    shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: 50, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
    shareIcon: { fontSize: 15 },
    shareText: { ...typography.button, color: colors.textPrimary, fontWeight: '700' },
  });

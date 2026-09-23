/**
 * Schermata Cassetto Personale.
 *
 * v4.72 — RISOLTO DEFINITIVAMENTE il mistero dell'anteprima "vecchia":
 * - CAUSA VERA: la copia locale usata dall'anteprima si chiamava solo
 *   pfc_<chiave> e veniva riusata per sempre. Ma il Cassetto dà allo
 *   stesso tipo la STESSA chiave nello stesso anno (es. iban_2026.pdf:
 *   cancelli e ricarichi = chiave identica), quindi dopo Elimina + nuovo
 *   caricamento l'anteprima mostrava il file VECCHIO mentre "Scarica"
 *   (che scarica sempre fresco) dava il file giusto. Ora la cache porta
 *   la VERSIONE del file (lastModified) nel nome: file nuovo = anteprima
 *   nuova. Vale per TUTTO il Cassetto e l'Archivio.
 * - L'IBAN scritto a mano NON vive più sul telefono: al momento del
 *   "Salva" l'app crea un piccolo file di testo e lo carica sul server
 *   con l'upload ESISTENTE (tipo IBAN): diventa iban_<anno>.txt, una cosa
 *   sola nello slot, lista/scarica/elimina/rinomina ESATTAMENTE come
 *   qualsiasi altro documento del Cassetto. Una sola fonte di verità: il
 *   server. Chi aveva l'IBAN scritto con la v4.71 lo trova trasferito sul
 *   server al primo avvio (migrazione automatica, una volta sola).
 * - "Elimina" sull'IBAN cancella il file DAL SERVER (come gli altri
 *   documenti): dopo, lo slot è vuoto e si può riscrivere a mano o
 *   caricare un nuovo file o foto. Niente stato nascosto sul telefono.
 *
 * v4.71 — la scheda IBAN torna semplice e con la memoria in ordine:
 * - Lo slot IBAN contiene UNA cosa sola: un file caricato (che sta sul
 *   server, come tutti i documenti) OPPURE un IBAN scritto a mano
 *   (Intestatario + IBAN, custodito sul telefono in AsyncStorage).
 * - BUG RISOLTO ("mi apre sempre quel file"): prima un file caricato per
 *   prova restava in memoria e l'anteprima continuava ad aprirlo. Ora
 *   l'app NON conserva piu' percorsi locali dei file scelti: dopo il
 *   caricamento il percorso viene buttato e l'anteprima di un file IBAN
 *   passa SEMPRE dal server (chiave del documento). Il vecchio file non
 *   puo' piu' riapparire da solo.
 * - "Elimina" cancella TUTTO in un colpo solo: il file dal server (se
 *   c'e'), l'IBAN scritto a mano (se c'e'), ogni stato interno. Dopo
 *   Elimina lo slot e' di nuovo vuoto: si puo' riscrivere l'IBAN a mano
 *   oppure caricare un nuovo file o foto.
 * - Il modulo di scrittura e il riquadro di lettura sono pannelli DENTRO
 *   la schermata (non Modal di sistema: lezione v4.70 su Android 15).
 *   Si aprono sempre, il contenuto SCORRE sotto la tastiera e i campi
 *   restano raggiungibili ("la pagina deve scorrere").
 *
 * v4.53 — regola "uno slot per tipo" + limite 5MB:
 * - Ogni tipo (QR Code P.IVA, Certificato P.IVA, Visura Camerale, Doc.
 *   Identita, IBAN) si puo' caricare UNA volta sola. Nella scelta del tipo,
 *   quelli gia' presenti appaiono in GRIGIO con la targhetta "già caricato"
 *   e non si possono toccare: per ricaricare, prima si cancella il vecchio.
 * - Il riconoscimento usa il tipo inciso nella chiave lato server
 *   (campo tipoKey restituito da /api/cassetto/list), NON il nome del file:
 *   rinominare non libera piu' lo slot. Il blocco vero resta sul server
 *   (errore 409): qui e' solo comodita' visiva.
 * - Limite Cassetto portato a 5MB (pre-controllo locale, allineato al
 *   server); le altre superfici restano come prima.
 *
 * v4.52 — risolto l'errore al caricamento:
 * - "aggiungi -> tipo -> scegli file -> errore start path null": il
 *   colpevole era il controllo della dimensione, che chiedeva a
 *   react-native-blob-util di leggere il file scelto. Ma Android spesso
 *   consegna un indirizzo "content://..." (scelta fatta da Recenti,
 *   Download o cloud) che quella lettura non sa aprire: tutto si fermava
 *   li' con "failed to stat path `null`..." e il file non saliva mai.
 * - Ora il peso si legge SOLO quando il file e' un vero file del telefono
 *   (file://) e SOLO per avvisare prima; in tutti gli altri casi il file
 *   sale lo stesso e il limite vero lo controlla il server (come fa gia'
 *   la risposta ai messaggi, che ha sempre funzionato).
 *
 * v4.38 — richiesta del titolare:
 * - "in cassetto se faccio scarica non deve finire in Download, deve
 *   lavorare come in archivio": il pulsante "Scarica" ora usa lo STESSO
 *   MOTORE dell'Archivio (scaricaInDownload da lib/download.ts):
 *   percentuale dentro il pulsante, controllo della sessione, NOTIFICA
 *   DI SISTEMA di Android "Download completato" col NOME del file (in
 *   alto, dove c'e' l'orologio: toccala e il documento si apre) e file
 *   registrato nell'app File del telefono, sezione Download. Prima era
 *   un salvataggio muto che mostrava un percorso interno incomprensibile.
 *
 * v4.37 — richieste del titolare:
 * - "invece di Caveau scrivi Archivio": l'hero ora si chiama
 *   "Archivio Documentale" (la tab in basso resta "Cassetto").
 * - VIA la pillola "Anteprima" (il file si apre già tocchandolo, la
 *   pillola era un doppione): al suo posto tre bottoni con la SCRITTA,
 *   uno per azione — "Scarica", "Modifica" (rinomina) ed "Elimina"
 *   (rosso). Niente più icone da indovinare.
 * - Dopo "Scegli file" ora è chiaro DOVE va il file: il pulsante dice
 *   "Scegli file dal telefono" (si apre il selettore di Android, come
 *   sempre) e il messaggio verde dopo il caricamento dice
 *   "«nome.pdf» è ora nel tuo archivio".
 *
 * v4.11 — grafica replicata dall'app Android v4 (CassettoScreen.kt):
 * - Hero "Archivio Documentale": card blu notte con gradiente Midnight →
 *   GeoPrimary → Midnight, bordo oro, lucchetto oro in box soft e pulsante
 *   oro "Aggiungi" (apre lo stesso pannello di sempre).
 * - Card documento: icona tipo file, nome, dimensione · data, linea di
 *   separazione e riga azioni (v4.37: tre bottoni con la scritta
 *   Scarica / Modifica / Elimina al posto della pillola "Anteprima" e
 *   delle icone).
 * - Tolto il pulsante "Aggiorna": si usa il trascina-per-aggiornare
 *   (il caricamento all'apertura resta identico).
 * - Logica INTATTA: caricamento, upload con tipo, download, rinomina,
 *   eliminazione, limite dimensione file.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Pressable,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, Rect, LinearGradient, Stop } from 'react-native-svg';
import DocumentPicker, { types } from 'react-native-document-picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FileIcon } from '@/components/FileIcon';
import { Modal } from '@/components/Modal';
import { confirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/Button';
import { SkeletonList } from '@/components/Skeleton';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { scaricaInDownload, scaricaTesto } from '@/lib/download';
import { formatDate } from '@/lib/utils';
import type { CassettoFile, FileItem } from '@/types/api';
import { shadow, spacing, typography, useColors, type ThemeColors } from '@/theme';

const TIPI_FILE = [
  { value: 'QR Code P.IVA', color: '#059669' },
  { value: 'Certificato P.IVA', color: '#0284c7' },
  { value: 'Visura Camerale', color: '#7c3aed' },
  { value: 'Doc. Identita', color: '#dc2626' },
  { value: 'IBAN', color: '#d97706' },
] as const;

// v4.53: corrispondenza tra le etichette del menu e i "tipoKey" incisi nelle
// chiavi lato server (stessa mappa del portale). Serve per sapere quali slot
// sono gia' occupati leggendo il campo tipoKey di /api/cassetto/list.
const TIPO_KEY_DA_LABEL: Record<string, string> = {
  'QR Code P.IVA': 'qr_code_p_iva',
  'Certificato P.IVA': 'certificato_p_iva',
  'Visura Camerale': 'visura_camerale',
  'Doc. Identita': 'doc_identita',
  'IBAN': 'iban',
};

// v4.53: limite Cassetto 5MB, allineato al server (che resta l'ultima parola:
// il pre-controllo serve solo ad avvisare prima, sui file leggibili).
const CASSETTO_MAX_FILE_SIZE_MB = 5;
const CASSETTO_MAX_FILE_SIZE_BYTES = CASSETTO_MAX_FILE_SIZE_MB * 1024 * 1024;

// v4.72: chiave usata DALLA V4.71 per l'IBAN scritto a mano sul telefono.
// Serve solo alla migrazione una-tantum verso il server; dopo viene
// sempre cancellata. NON è più una fonte di dati.
const CHIAVE_IBAN_MANUALE = 'cassetto.iban.manuale';

// v4.72: i dati dell'IBAN scritto a mano vivono DENTRO un piccolo file di
// testo sul server (iban_<anno>.txt). Il marcatore in prima riga distingue
// i nostri file dai .txt caricati a mano da qualcun altro.
const MARCATORE_IBAN_MANUALE = 'PFC-IBAN-MANUALE';

type IbanDati = { intestatario: string; iban: string; salvatoIl: string };

// v4.72: legge i dati da un file di testo IBAN. Ritorna null se il file
// non è un IBAN scritto a mano (manca il marcatore o mancano i campi).
function parseIbanTesto(testo: string): IbanDati | null {
  if (!testo.includes(MARCATORE_IBAN_MANUALE)) return null;
  const intestatario = testo.match(/^INTESTATARIO:(.*)$/m)?.[1]?.trim() ?? '';
  const iban = testo.match(/^IBAN:(.*)$/m)?.[1]?.trim() ?? '';
  const salvatoIl = testo.match(/^SALVATO:(.*)$/m)?.[1]?.trim() ?? '';
  if (!intestatario || !iban) return null;
  return { intestatario, iban, salvatoIl };
}

// v4.72: la VERSIONE del file (per la cache anteprima sempre fresca).
function versioneDi(file: { lastModified: Date | null }): number | null {
  return file.lastModified ? new Date(file.lastModified).getTime() : null;
}

// v4.74: la struttura delle coordinate bancarie ITALIANE si rispetta
// OVUNQUE (campo, pannello, condivisione): IT + 2 cifre di controllo + CIN
// | ABI (5) | CAB (5) | numero di conto (12) — es. IT92I 98732 83274 997075317158.
// Per gli IBAN esteri restano i gruppi da 4 (standard internazionale).
// Solo estetica: il valore salvato resta quello pulito senza spazi.
function formattaIban(iban: string): string {
  const pulito = iban.replace(/\s+/g, '').toUpperCase();
  if (pulito.startsWith('IT') && pulito.length === 27) {
    return `${pulito.slice(0, 5)} ${pulito.slice(5, 10)} ${pulito.slice(10, 15)} ${pulito.slice(15)}`;
  }
  return pulito.replace(/(.{4})/g, '$1 ').trim();
}

// v4.74: la struttura si vede MENTRE SI SCRIVE: il campo si spazia da solo
// come le app delle banche. Gli spazi non contano: validazione e salvataggio
// li tolgono sempre prima di lavorare (ibanDigitato e salvaIbanManuale).
function raggruppaIbanInput(testo: string): string {
  const pulito = testo.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 34);
  if (pulito.startsWith('IT')) {
    // l'IBAN italiano è SEMPRE 27 caratteri (5+5+5+12): oltre non si scrive
    return [pulito.slice(0, 5), pulito.slice(5, 10), pulito.slice(10, 15), pulito.slice(15, 27)]
      .filter(Boolean)
      .join(' ');
  }
  return pulito.replace(/(.{4})/g, '$1 ').trim();
}

// ===== v4.73: CONTROLLO DELL'IBAN (lo stesso che fanno le banche) =====
// Lunghezza attesa per paese (i principali); per i paesi non in tabella vale
// la regola generale 15-34 caratteri.
const LUNGHEZZE_IBAN: Record<string, number> = {
  IT: 27, SM: 27, VA: 22, AD: 24, AT: 20, BE: 16, CH: 21, CY: 28,
  CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FR: 27, GB: 22,
  GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, LI: 21, LT: 20, LU: 20,
  LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24,
  SE: 24, SI: 19, SK: 24,
};

// MOD-97 (ISO 7064): sposta i primi 4 caratteri in coda, converte le
// lettere in numeri (A=10 ... Z=35) e calcola il resto a blocchi (niente
// BigInt: Hermes in release non ce l'ha affidabile). Il resto deve fare 1.
function ibanChecksumValido(iban: string): boolean {
  const riarrangiato = iban.slice(4) + iban.slice(0, 4);
  let resto = 0;
  for (const ch of riarrangiato) {
    const codice = ch.charCodeAt(0);
    if (codice >= 48 && codice <= 57) {
      resto = (resto * 10 + (codice - 48)) % 97;
    } else if (codice >= 65 && codice <= 90) {
      resto = (resto * 100 + (codice - 55)) % 97;
    } else {
      return false;
    }
  }
  return resto === 1;
}

// Controllo completo: struttura (paese + 2 cifre + BBAN), lunghezza del
// paese e checksum. "motivo" spiega SEMPRE cosa non torna (o che e' ok).
function validaIban(iban: string): { ok: boolean; motivo: string } {
  if (!/^[A-Z]{2}/.test(iban)) {
    return { ok: false, motivo: "L'IBAN deve iniziare con il paese (es. IT)" };
  }
  const paese = iban.slice(0, 2);
  const attesa = LUNGHEZZE_IBAN[paese];
  if (attesa && iban.length !== attesa) {
    return { ok: false, motivo: `Per ${paese} l'IBAN è di ${attesa} caratteri (ora ${iban.length})` };
  }
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) {
    return { ok: false, motivo: 'Caratteri non validi: solo lettere e numeri, dopo il paese 2 cifre di controllo' };
  }
  if (!attesa && (iban.length < 15 || iban.length > 34)) {
    return { ok: false, motivo: `Lunghezza non valida per ${paese} (tra 15 e 34 caratteri)` };
  }
  if (!ibanChecksumValido(iban)) {
    return { ok: false, motivo: "Il codice di controllo non torna: c'è un carattere sbagliato" };
  }
  return { ok: true, motivo: `IBAN ${paese} corretto (${iban.length} caratteri)` };
}

// Colori firma del brand (validi in entrambi i temi, come nell'app v4)
const NAVY_NOTTE = '#0A1128';
const NAVY_PRIMARIO = '#003566';
const ORO = '#D4AF37';
const ORO_CHIARO = '#F7E7B4';

export default function CassettoScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const setPreviewFile = useAppStore((s) => s.setPreviewFile);
  // v4.74: il nome dell'account serve per precompilare l'intestatario dell'IBAN
  const user = useAppStore((s) => s.user);
  const [files, setFiles] = useState<CassettoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [renaming, setRenaming] = useState<CassettoFile | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // v4.38: stato del download in corso (chiave del file + percentuale),
  // come in Archivio: il pulsante mostra l'avanzamento invece di restare
  // muto finche' arriva la notifica di sistema.
  const [scaricando, setScaricando] = useState<string | null>(null);
  const [percento, setPercento] = useState(0);

  // v4.72: pannello IBAN aperto: 'view' = lettura, 'edit' = scrittura,
  // null = nessun pannello. I DATI non stanno più qui: stanno sul server
  // (il file .txt dello slot IBAN); ibanDettaglio è solo la lettura corrente.
  const [ibanPannello, setIbanPannello] = useState<'view' | 'edit' | null>(null);
  const [ibanIntestatario, setIbanIntestatario] = useState('');
  const [ibanValore, setIbanValore] = useState('');
  const [ibanDettaglio, setIbanDettaglio] = useState<IbanDati | null>(null);
  const [ibanLeggendo, setIbanLeggendo] = useState(false);
  const [salvandoIban, setSalvandoIban] = useState(false);
  // v4.72: migrazione una-tantum del vecchio IBAN scritto a mano (v4.71).
  const [migrazioneFatta, setMigrazioneFatta] = useState(false);

  // v4.53: slot gia' occupati, dedotti dal campo tipoKey che il server mette
  // su ogni file (null per file non riconoscibili, che non occupano slot).
  const tipiOccupati = new Set(files.map((f) => f.tipoKey).filter((t): t is string => !!t));

  // v4.72: lo slot IBAN è SEMPRE il file sul server (tipoKey 'iban').
  // Un .txt creato dall'app = IBAN scritto a mano; un pdf/foto = documento.
  // UNA sola fonte di verità: il server (lista, scarica, elimina, rinomina
  // identici a qualsiasi altro documento del Cassetto).
  const fileIban = files.find((f) => f.tipoKey === 'iban') ?? null;
  const ibanManualeServer =
    fileIban && fileIban.nome.toLowerCase().endsWith('.txt') ? fileIban : null;
  // i documenti normali in lista; l'IBAN scritto a mano ha la SUA scheda
  const fileVisibili = files.filter(
    (f) => !(f.tipoKey === 'iban' && f.nome.toLowerCase().endsWith('.txt')),
  );

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.cassetto.list();
      setFiles(res.files);
    } catch (err) {
      toast.error('Errore', err instanceof Error ? err.message : 'Errore caricamento');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // v4.72 (migrazione una-tantum): chi aveva scritto l'IBAN a mano nella
  // v4.71 lo aveva custodito SUL TELEFONO (AsyncStorage). Da questa versione
  // l'IBAN vive sul server come gli altri documenti: al primo avvio lo
  // carichiamo sul server (se lo slot è libero) e cancelliamo SEMPRE la
  // copia dal telefono: nessun vecchio dato può più riaffiorare da solo.
  useEffect(() => {
    if (loading || migrazioneFatta) return;
    setMigrazioneFatta(true);
    (async () => {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(CHIAVE_IBAN_MANUALE);
      } catch {
        return;
      }
      if (!raw) return;
      await AsyncStorage.removeItem(CHIAVE_IBAN_MANUALE).catch(() => {});
      try {
        const dato = JSON.parse(raw) as Partial<IbanDati>;
        if (!dato || typeof dato.iban !== 'string' || !dato.iban.trim()) return;
        if (typeof dato.intestatario !== 'string' || !dato.intestatario.trim()) return;
        // slot occupato (un file IBAN è già sul server): il server vince
        if (files.some((f) => f.tipoKey === 'iban')) return;
        await caricaIbanManualeSuServer(dato.intestatario, dato.iban);
        toast.info(
          'IBAN trasferito sul server',
          "Ora l'IBAN scritto a mano sta nel Cassetto, come gli altri documenti",
        );
        load(true);
      } catch {
        // migrazione non riuscita: si può sempre riscrivere l'IBAN
      }
    })();
  }, [loading, files, migrazioneFatta, load]);

  // v4.71: il tasto Indietro di Android chiude il pannello IBAN invece di
  // uscire dalla schermata (stesso comportamento dei Modal di sistema).
  useEffect(() => {
    if (!ibanPannello) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setIbanPannello(null);
      return true;
    });
    return () => sub.remove();
  }, [ibanPannello]);

  async function handleUpload() {
    if (!selectedTipo) return;
    try {
      const picked = await DocumentPicker.pick({ type: [types.allFiles], allowMultiSelection: false });
      const doc = picked[0];
      if (!doc) return;
      // v4.52: il controllo della dimensione NON deve piu' poter bloccare
      // il caricamento. Prima si leggeva il peso chiedendo il percorso del
      // file a react-native-blob-util: ma Android spesso consegna un
      // indirizzo "content://..." (scelta fatta da Recenti, Download o
      // cloud) che quella lettura non sa aprire: si fermava tutto con
      // l'errore "failed to stat path `null`..." e il file non saliva.
      // Ora il peso si legge SOLO se e' un vero file del telefono (file://)
      // e SOLO per avvisare prima; in tutti gli altri casi il file sale lo
      // stesso e il limite vero lo controlla il server (come fa gia' la
      // risposta ai messaggi, che ha sempre funzionato).
      if (doc.uri.startsWith('file://')) {
        try {
          const stat = await ReactNativeBlobUtil.fs.stat(doc.uri.replace('file://', ''));
          if (stat && typeof stat.size === 'number' && stat.size > CASSETTO_MAX_FILE_SIZE_BYTES) {
            toast.error('File troppo grande', `Massimo ${CASSETTO_MAX_FILE_SIZE_MB}MB`);
            return;
          }
        } catch {
          // peso non leggibile: si prosegue, il limite lo guarda il server
        }
      }
      setUploading(true);
      haptics.impact();
      const fd = new FormData();
      fd.append('file', { uri: doc.uri, type: doc.type ?? 'application/octet-stream', name: doc.name } as unknown as Blob);
      fd.append('tipo', selectedTipo);
      await api.cassetto.upload(fd);
      // v4.72: NESSUNA gestione speciale per l'IBAN: lo slot è gestito dal
      // server come tutti gli altri tipi (una cosa sola per tipo). Né percorsi
      // locali né copie nascoste: l'anteprima rilegge sempre dal server.
      // v4.37: feedback CHIARO — dove va il file? Nel tuo archivio, col nome.
      toast.success('Documento caricato', `"${doc.name}" è ora nel tuo archivio`);
      setUploadOpen(false);
      setSelectedTipo(null);
      load(true);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) return;
      toast.error('Errore upload', err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setUploading(false);
    }
  }

  // v4.38: lo Scarica del Cassetto lavora ESATTAMENTE come in Archivio:
  // stesso motore (scaricaInDownload) — nome file sicuro, controllo della
  // sessione (401/403 -> messaggio chiaro), percentuale nel pulsante —
  // e stessa conferma: la NOTIFICA DI SISTEMA di Android "Download
  // completato" col nome del file, in alto nella barra di stato (toccala
  // per aprire il documento); il file risulta anche nell'app File del
  // telefono, sezione Download. Prima era un salvataggio muto col percorso
  // interno a video e senza registrazione nel sistema: il file "spariva"
  // nella cartella Download senza dire nulla.
  async function handleDownload(file: CassettoFile) {
    if (scaricando) return; // un download alla volta, come in Archivio
    setScaricando(file.key);
    setPercento(0);
    haptics.impact();
    try {
      await scaricaInDownload(file.key, file.nome, setPercento);
      haptics.success();
      toast.success('Download completato', 'Il file è in Download e nella barra in alto');
    } catch (err) {
      toast.error('Errore download', err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setScaricando(null);
      setPercento(0);
    }
  }

  function handleDelete(file: CassettoFile) {
    confirmDialog({
      title: 'Elimina documento',
      message: `Sei sicuro di voler eliminare "${file.nome}"? L'azione non può essere annullata.`,
      confirmText: 'Elimina',
      destructive: true,
      onConfirm: async () => {
        haptics.error();
        try {
          await api.cassetto.delete(file.key);
          setFiles((prev) => prev.filter((f) => f.key !== file.key));
          toast.success('File eliminato');
        } catch (err) {
          toast.error('Errore', err instanceof Error ? err.message : 'Errore eliminazione');
        }
      },
    });
  }

  async function handleRenameSubmit() {
    if (!renaming || !renameValue.trim()) return;
    haptics.tap();
    try {
      await api.cassetto.rename(renaming.key, renameValue.trim());
      setFiles((prev) => prev.map((f) => (f.key === renaming.key ? { ...f, nome: renameValue.trim() } : f)));
      toast.success('File rinominato');
      setRenaming(null);
      setRenameValue('');
    } catch (err) {
      toast.error('Errore', err instanceof Error ? err.message : 'Errore rinomina');
    }
  }

  // ===== v4.72: slot IBAN scritto a mano — VIVE SUL SERVER =====

  // Crea il piccolo file di testo (intestatario + IBAN) e lo carica sul
  // server con l'upload ESISTENTE del Cassetto (tipo IBAN): dal server
  // arriva come iban_<anno>.txt, e da quel momento è un file come gli
  // altri: lista, anteprima, elimina e rinomina funzionano uguale.
  async function caricaIbanManualeSuServer(intestatario: string, iban: string): Promise<void> {
    const contenuto = [
      MARCATORE_IBAN_MANUALE,
      `INTESTATARIO: ${intestatario}`,
      `IBAN: ${iban}`,
      `SALVATO: ${new Date().toISOString()}`,
      '',
    ].join('\n');
    const percorso = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/pfc-iban-manuale.txt`;
    await ReactNativeBlobUtil.fs.writeFile(percorso, contenuto, 'utf8');
    try {
      const fd = new FormData();
      fd.append('file', {
        uri: `file://${percorso}`,
        type: 'text/plain',
        name: 'IBAN.txt',
      } as unknown as Blob);
      fd.append('tipo', 'IBAN');
      await api.cassetto.upload(fd);
    } finally {
      // il file temporaneo non serve più: VIA subito (niente residui)
      await ReactNativeBlobUtil.fs.unlink(percorso).catch(() => {});
    }
  }

  function apriIbanView() {
    if (!ibanManualeServer) return;
    haptics.tap();
    setIbanPannello('view');
    leggiIbanDalServer();
  }

  // Legge il file di testo DAL SERVER (cache a versioni: dopo ogni
  // modifica la rilettura è fresca) e riempie il pannello di lettura.
  async function leggiIbanDalServer(): Promise<void> {
    if (!ibanManualeServer) return;
    setIbanLeggendo(true);
    try {
      const testo = await scaricaTesto(ibanManualeServer.key, versioneDi(ibanManualeServer));
      const dato = parseIbanTesto(testo);
      if (!dato) {
        toast.error('Errore', "Il file IBAN non è leggibile: eliminalo e riscrivi l'IBAN");
        setIbanPannello(null);
        return;
      }
      setIbanDettaglio(dato);
    } catch (err) {
      toast.error('Errore', err instanceof Error ? err.message : "Impossibile leggere l'IBAN dal server");
      setIbanPannello(null);
    } finally {
      setIbanLeggendo(false);
    }
  }

  async function apriIbanEdit() {
    // precompila i campi con quello che c'è (leggendo dal server se serve);
    // con lo slot vuoto apre il modulo pulito per un IBAN nuovo
    let dato = ibanDettaglio;
    if (!dato && ibanManualeServer) {
      try {
        const testo = await scaricaTesto(ibanManualeServer.key, versioneDi(ibanManualeServer));
        dato = parseIbanTesto(testo);
      } catch {
        dato = null;
      }
    }
    // v4.74: senza dati salvati l'intestatario parte GIÀ COL NOME
    // dell'account (chiaro e corretto; si può sempre correggere);
    // l'IBAN si mostra subito nella struttura con gli spazi
    setIbanIntestatario(dato?.intestatario ?? (user?.name ?? ''));
    setIbanValore(dato?.iban ? raggruppaIbanInput(dato.iban) : '');
    setIbanPannello('edit');
  }

  // v4.73: CONDIVIDI l'IBAN con il menu di condivisione di Android
  // (WhatsApp, email, SMS, copia...). Se il dettaglio non è ancora in
  // memoria lo rilegge fresco dal server prima di condividere.
  async function condividiIban() {
    if (!ibanManualeServer) return;
    haptics.tap();
    let dato = ibanDettaglio;
    if (!dato) {
      try {
        const testo = await scaricaTesto(ibanManualeServer.key, versioneDi(ibanManualeServer));
        dato = parseIbanTesto(testo);
      } catch {
        dato = null;
      }
    }
    if (!dato) {
      toast.error('Errore', "Non sono riuscito a leggere l'IBAN da condividere");
      return;
    }
    try {
      // v4.74: il testo che esce deve far capire a TUTTI: titolo, nome e
      // IBAN nella struttura italiana (IT92I 98732 83274 997075317158)
      await Share.share({
        message: `Coordinate bancarie\n\nIntestatario: ${dato.intestatario}\nIBAN: ${formattaIban(dato.iban)}`,
      });
    } catch {
      // l'utente ha chiuso il menu di condivisione: nessun errore da mostrare
    }
  }

  async function salvaIbanManuale() {
    const intestatario = ibanIntestatario.trim();
    const iban = ibanValore.trim().toUpperCase().replace(/\s+/g, '');
    if (!intestatario || !iban || salvandoIban) return;
    // v4.73: CONTROLLO DELL'IBAN prima di salvare (struttura + lunghezza +
    // checksum MOD-97): un IBAN sbagliato non può più finire sul server
    const esitoIban = validaIban(iban);
    if (!esitoIban.ok) {
      haptics.error();
      toast.error('IBAN non valido', esitoIban.motivo);
      return;
    }
    haptics.impact();
    setSalvandoIban(true);
    try {
      // una cosa sola nello slot: se c'era già un file IBAN (di solito il
      // .txt dell'IBAN scritto prima), prima lo cancella DAL SERVER
      if (fileIban) {
        await api.cassetto.delete(fileIban.key).catch(() => {});
      }
      await caricaIbanManualeSuServer(intestatario, iban);
      setIbanDettaglio(null);
      toast.success('IBAN salvato', 'Il tuo IBAN è aggiornato');
      setIbanPannello(null);
      load(true);
    } catch (err) {
      toast.error('Errore', err instanceof Error ? err.message : "Non è stato possibile salvare l'IBAN");
    } finally {
      setSalvandoIban(false);
    }
  }

  // "Elimina" cancella il file IBAN DAL SERVER (è un file come gli altri):
  // dopo, lo slot è VUOTO anche per il server — si può riscrivere l'IBAN a
  // mano oppure caricare un nuovo file o foto. Nessuna copia nascosta sul
  // telefono: niente può più riaffiorare da solo.
  function eliminaIbanTutto() {
    if (!fileIban) return;
    confirmDialog({
      title: 'Elimina IBAN',
      // v4.74: dicitura professionale — al cliente il server non interessa
      message: "L'IBAN verrà eliminato. Potrai riscriverlo in qualsiasi momento.",
      confirmText: 'Elimina',
      destructive: true,
      onConfirm: async () => {
        haptics.error();
        setIbanPannello(null);
        setIbanDettaglio(null);
        try {
          await api.cassetto.delete(fileIban.key);
          setFiles((prev) => prev.filter((f) => f.key !== fileIban.key));
          toast.success('IBAN eliminato', 'Puoi riscriverlo quando vuoi');
        } catch (err) {
          toast.error('Errore', err instanceof Error ? err.message : 'Errore eliminazione');
        }
      },
    });
  }

  function apriAnteprima(file: CassettoFile) {
    setPreviewFile({
      nome: file.nome,
      key: file.key,
      size: file.size,
      sizeStr: file.sizeStr,
      lastModified: file.lastModified,
      stato: 'visto',
      isPreferito: false,
    } as FileItem);
  }

  // v4.73: controllo LIVE dell'IBAN mentre lo scrivi (riga sotto il campo):
  // verde quando struttura, lunghezza e checksum tornano tutti.
  const ibanDigitato = ibanValore.trim().toUpperCase().replace(/\s+/g, '');
  let ibanLive: { testo: string; tipo: 'ok' | 'incompleto' | 'errore' } | null = null;
  if (ibanDigitato.length > 0) {
    if (ibanDigitato.length < 15) {
      ibanLive = { testo: `Incompleto: ${ibanDigitato.length} caratteri scritti (minimo 15)`, tipo: 'incompleto' };
    } else {
      const esitoLive = validaIban(ibanDigitato);
      ibanLive = esitoLive.ok
        ? { testo: `✓ ${esitoLive.motivo}`, tipo: 'ok' }
        : { testo: esitoLive.motivo, tipo: 'errore' };
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.listContentWrap}>
        {/* Hero "Archivio Documentale" (come la Vault Hero Card dell'app v4) */}
        <View style={styles.vaultHero}>
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="cassettoVault" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={NAVY_NOTTE} />
                <Stop offset="0.5" stopColor={NAVY_PRIMARIO} />
                <Stop offset="1" stopColor={NAVY_NOTTE} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#cassettoVault)" />
          </Svg>
          <View style={styles.vaultInner}>
            <View style={styles.vaultLeft}>
              <View style={styles.vaultLockBox}>
                <Ionicons name="lock-closed" size={24} color={ORO} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.vaultOverline}>CASSETTO RISERVATO</Text>
                <Text style={styles.vaultTitle}>Archivio Documentale</Text>
                <Text style={styles.vaultSubtitle}>
                  {files.length} document{files.length === 1 ? 'o' : 'i'} archiviat{files.length === 1 ? 'o' : 'i'} con cifratura
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setUploadOpen(true)}
              style={({ pressed }) => [styles.vaultAdd, pressed && { opacity: 0.85 }]}
              accessibilityLabel="Carica documento"
            >
              <Ionicons name="add" size={17} color={NAVY_NOTTE} />
              <Text style={styles.vaultAddText}>Aggiungi</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {loading && !refreshing ? (
        <SkeletonList count={4} height={88} />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={fileVisibili}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={
            // v4.72: la scheda IBAN scritto a mano è la scheda del SUO file
            // sul server (.txt dello slot IBAN). Un file IBAN caricato
            // (pdf/foto) invece compare come documento normale nella lista.
            ibanManualeServer ? (
              <Card style={styles.fileCard} padded={false}>
                <Pressable onPress={apriIbanView} accessibilityLabel="Apri IBAN">
                  {({ pressed }) => (
                    <View style={[styles.fileTop, pressed && { opacity: 0.8 }]}>
                      <View style={styles.ibanIconBox}>
                        <Ionicons name="wallet-outline" size={22} color={ORO} />
                      </View>
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>IBAN</Text>
                        {/* v4.74: via la scritta "Scritto a mano" — resta la data */}
                        <Text style={styles.fileMeta} numberOfLines={1}>
                          {formatDate(ibanManualeServer.lastModified)}
                        </Text>
                      </View>
                    </View>
                  )}
                </Pressable>
                <View style={styles.divider} />
                {/* v4.74: la scheda IBAN ha GLI STESSI bottoni delle altre
                 * schede del Cassetto, su una riga sola e mai a capo:
                 * Scarica | Modifica | Elimina. Condividi sta DENTRO,
                 * aprendo la scheda (come l'anteprima degli altri file). */}
                <View style={styles.fileActionsRow}>
                  <Pressable
                    onPress={() => handleDownload(ibanManualeServer)}
                    disabled={scaricando !== null}
                    style={({ pressed }) => [styles.actionPill, pressed && { opacity: 0.8 }]}
                    accessibilityLabel="Scarica IBAN"
                  >
                    <Ionicons name="download-outline" size={15} color={colors.primary} />
                    <Text style={styles.actionPillText} numberOfLines={1} allowFontScaling={false}>
                      {scaricando === ibanManualeServer.key ? `Scarica... ${percento}%` : 'Scarica'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={apriIbanEdit}
                    style={({ pressed }) => [styles.actionPill, pressed && { opacity: 0.8 }]}
                    accessibilityLabel="Modifica IBAN"
                  >
                    <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                    <Text style={styles.actionPillText} numberOfLines={1} allowFontScaling={false}>Modifica</Text>
                  </Pressable>
                  <Pressable
                    onPress={eliminaIbanTutto}
                    style={({ pressed }) => [styles.actionPill, styles.actionPillDanger, pressed && { opacity: 0.8 }]}
                    accessibilityLabel="Elimina IBAN"
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                    <Text style={[styles.actionPillText, styles.actionPillTextDanger]} numberOfLines={1} allowFontScaling={false}>Elimina</Text>
                  </Pressable>
                </View>
              </Card>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />}
          renderItem={({ item: file }) => (
            <Card style={styles.fileCard} padded={false}>
              <Pressable onPress={() => apriAnteprima(file)} accessibilityLabel="Apri documento">
                {({ pressed }) => (
                  <View style={[styles.fileTop, pressed && { opacity: 0.8 }]}>
                    <FileIcon filename={file.nome} size={44} />
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>{file.nome}</Text>
                      <Text style={styles.fileMeta} numberOfLines={1}>
                        {file.sizeStr}{file.lastModified ? `  ·  ${formatDate(file.lastModified)}` : ''}
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>
              <View style={styles.divider} />
              {/* v4.37: VIA la pillola "Anteprima" (il file si apre già
               * tocchandolo) e VIA le icone da indovinare: tre bottoni con
               * la scritta, uno per azione — Scarica, Modifica (rinomina)
               * ed Elimina (rosso). */}
              <View style={styles.fileActionsRow}>
                <Pressable
                  onPress={() => handleDownload(file)}
                  disabled={scaricando !== null}
                  style={({ pressed }) => [styles.actionPill, pressed && { opacity: 0.8 }]}
                  accessibilityLabel="Scarica"
                >
                  <Ionicons name="download-outline" size={15} color={colors.primary} />
                  {/* v4.38: durante il download il pulsante mostra la
                   * percentuale, come la barra di avanzamento di Archivio. */}
                  <Text style={styles.actionPillText} numberOfLines={1} allowFontScaling={false}>{scaricando === file.key ? `Scarica... ${percento}%` : 'Scarica'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setRenaming(file);
                    setRenameValue(file.nome);
                  }}
                  style={({ pressed }) => [styles.actionPill, pressed && { opacity: 0.8 }]}
                  accessibilityLabel="Modifica"
                >
                  <Ionicons name="pencil-outline" size={15} color={colors.primary} />
                  <Text style={styles.actionPillText} numberOfLines={1} allowFontScaling={false}>Modifica</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(file)}
                  style={({ pressed }) => [styles.actionPill, styles.actionPillDanger, pressed && { opacity: 0.8 }]}
                  accessibilityLabel="Elimina"
                >
                  <Ionicons name="trash-outline" size={15} color={colors.danger} />
                  <Text style={[styles.actionPillText, styles.actionPillTextDanger]} numberOfLines={1} allowFontScaling={false}>Elimina</Text>
                </Pressable>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="folder-open-outline" size={36} color={colors.primary} />}
              title="Nessun documento trovato"
              subtitle="Tocca «Aggiungi» per caricare i tuoi documenti personali"
            />
          }
        />
      )}

      <Modal visible={uploadOpen} onClose={() => setUploadOpen(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Carica documento</Text>
          <Text style={styles.modalSubtitle}>Seleziona il tipo di documento:</Text>
          {/* v4.53: i tipi gia' caricati restano visibili ma in grigio, con la
           * targhetta "già caricato" e il tocco spento: per ricaricare, prima
           * si cancella quello esistente (regola "uno slot per tipo"). */}
          <Text style={styles.modalRule}>
            Ogni tipo si può caricare una volta sola: per sostituirlo, cancella prima quello esistente.
          </Text>
          <View style={styles.tipiList}>
            {TIPI_FILE.map((tipo) => {
              const tipoKey = TIPO_KEY_DA_LABEL[tipo.value];
              // v4.72: lo slot è occupato SOLO se il server ha già un file di
              // quel tipo (l'IBAN scritto a mano incluso: ora vive sul server,
              // è un file come gli altri). Nessuna eccezione, nessuna memoria
              // nascosta: quello che dice il server è quello che si vede.
              const occupato = !!tipoKey && tipiOccupati.has(tipoKey);
              return (
                <Pressable
                  key={tipo.value}
                  onPress={() => setSelectedTipo(tipo.value)}
                  disabled={occupato}
                  style={[
                    styles.tipoRow,
                    selectedTipo === tipo.value && styles.tipoRowActive,
                    occupato && styles.tipoRowDisabled,
                  ]}
                >
                  {/* Radio come nell'app v4 (AddCassettoDialog) */}
                  <View style={[styles.radio, selectedTipo === tipo.value && styles.radioSelected]}>
                    {selectedTipo === tipo.value && <View style={styles.radioDot} />}
                  </View>
                  <Text
                    style={[
                      styles.tipoLabel,
                      selectedTipo === tipo.value && styles.tipoLabelActive,
                      occupato && styles.tipoLabelDisabled,
                    ]}
                  >
                    {tipo.value}
                  </Text>
                  {occupato && (
                    <View style={styles.slotBadge}>
                      <Text style={styles.slotBadgeText}>già caricato</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          {selectedTipo && (
            <Button
              label={uploading ? '⏳ Caricamento...' : 'Scegli file dal telefono'}
              onPress={handleUpload}
              loading={uploading}
              style={styles.uploadCtaBtn}
            />
          )}
          {/* v4.74: "scrivi a mano" SOTTO il pulsante principale: la scelta
           * del file da telefono resta quella in evidenza */}
          {selectedTipo === 'IBAN' && (
            <Pressable
              onPress={() => {
                setUploadOpen(false);
                setSelectedTipo(null);
                // l'intestatario parte già col nome dell'account
                setIbanIntestatario(user?.name ?? '');
                setIbanValore('');
                setIbanDettaglio(null);
                setIbanPannello('edit');
              }}
              style={({ pressed }) => [styles.scriviIbanBtn, pressed && { opacity: 0.85 }]}
              accessibilityLabel="Scrivi l'IBAN a mano"
            >
              <Ionicons name="pencil-outline" size={15} color={ORO} />
              <Text style={styles.scriviIbanTesto}>Oppure scrivi l'IBAN a mano</Text>
            </Pressable>
          )}
        </View>
      </Modal>

      <Modal visible={!!renaming} onClose={() => setRenaming(null)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Rinomina documento</Text>
          <TextInput
            value={renameValue}
            onChangeText={setRenameValue}
            style={styles.renameInput}
            autoFocus
            onSubmitEditing={handleRenameSubmit}
          />
          <View style={styles.renameActions}>
            <Pressable onPress={() => setRenaming(null)} style={styles.renameCancelBtn}>
              <Text style={styles.renameCancelText}>Annulla</Text>
            </Pressable>
            <Button label="Salva" onPress={handleRenameSubmit} disabled={!renameValue.trim()} size="md" />
          </View>
        </View>
      </Modal>

      {/* ===== v4.71: pannelli IBAN DENTRO la schermata =====
       * Lezione v4.70 (Android 15): niente Modal di sistema per l'IBAN.
       * Pannello montato SOLO quando aperto (mai sempre attivo: un overlay
       * permanente arrivava a bloccare tutti i tocchi). Il contenuto e' in
       * ScrollView: la pagina scorre e i campi restano raggiungibili anche
       * con la tastiera aperta. */}
      {ibanPannello && (
        <View style={styles.overlayFill}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIbanPannello(null)}
            accessibilityLabel="Chiudi pannello IBAN"
            accessibilityRole="button"
          />
          <View style={styles.overlaySheet}>
            <ScrollView
              style={styles.overlayScroll}
              contentContainerStyle={styles.overlayContent}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {ibanPannello === 'view' && ibanManualeServer && (
                <>
                  <Text style={styles.modalTitle}>IBAN</Text>
                  {/* v4.74: dentro la scheda, come nell'anteprima degli altri
                   * file, in ALTO i DUE pulsanti che servono: Scarica e
                   * Condividi. Niente spiegazioni: solo i dati. */}
                  <View style={styles.overlayAzioni}>
                    <Button
                      label={scaricando === ibanManualeServer.key ? `Scarica... ${percento}%` : 'Scarica'}
                      onPress={() => handleDownload(ibanManualeServer)}
                      disabled={scaricando !== null}
                      size="md"
                      style={styles.flex}
                    />
                    <Button
                      label="Condividi"
                      onPress={condividiIban}
                      variant="secondary"
                      size="md"
                      style={styles.flex}
                    />
                  </View>
                  {ibanLeggendo || !ibanDettaglio ? (
                    <View style={styles.ibanLeggendoBox}>
                      <ActivityIndicator size="small" color={colors.accent} />
                      <Text style={styles.ibanLeggendoTesto}>Un attimo, lo sto aprendo...</Text>
                    </View>
                  ) : (
                    <View style={styles.ibanDettaglioBox}>
                      <Text style={styles.ibanDettaglioEtichetta}>Intestatario</Text>
                      <Text style={styles.ibanDettaglioValore}>{ibanDettaglio.intestatario}</Text>
                      <Text style={[styles.ibanDettaglioEtichetta, styles.ibanDettaglioEtichettaSotto]}>IBAN</Text>
                      <Text style={[styles.ibanDettaglioValore, styles.ibanDettaglioIban]}>{formattaIban(ibanDettaglio.iban)}</Text>
                    </View>
                  )}
                </>
              )}
              {ibanPannello === 'edit' && (
                <>
                  <Text style={styles.modalTitle}>{ibanManualeServer ? 'Modifica IBAN' : 'Scrivi il tuo IBAN'}</Text>
                  <Text style={styles.modalSubtitle}>Chi è l'intestatario del conto?</Text>
                  <TextInput
                    value={ibanIntestatario}
                    onChangeText={setIbanIntestatario}
                    style={styles.renameInput}
                    placeholder="Intestatario (es. Mario Rossi)"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                    maxLength={80}
                  />
                  <Text style={styles.modalSubtitle}>Scrivi il tuo IBAN</Text>
                  <TextInput
                    value={ibanValore}
                    onChangeText={(t) => setIbanValore(raggruppaIbanInput(t))}
                    style={[styles.renameInput, styles.ibanInput]}
                    placeholder="IT92I 98732 83274 997075317158"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={42}
                  />
                  {ibanLive && (
                    <Text
                      style={[
                        styles.ibanLiveTesto,
                        ibanLive.tipo === 'ok' && styles.ibanLiveOk,
                        ibanLive.tipo === 'errore' && styles.ibanLiveErrore,
                      ]}
                    >
                      {ibanLive.testo}
                    </Text>
                  )}
                  <View style={styles.overlayAzioni}>
                    <Pressable
                      onPress={() => setIbanPannello(null)}
                      style={({ pressed }) => [styles.renameCancelBtn, pressed && { opacity: 0.8 }]}
                      accessibilityLabel="Annulla"
                    >
                      <Text style={styles.renameCancelText}>Annulla</Text>
                    </Pressable>
                    <Button
                      label={salvandoIban ? '⏳ Salvo...' : 'Salva IBAN'}
                      onPress={salvaIbanManuale}
                      disabled={!ibanIntestatario.trim() || !ibanValore.trim() || salvandoIban}
                      loading={salvandoIban}
                      size="md"
                    />
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    listContentWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
    // Hero Archivio (v4.11)
    vaultHero: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.4)', backgroundColor: NAVY_NOTTE, ...shadow.md },
    vaultInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, padding: 18 },
    vaultLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    vaultLockBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(212, 175, 55, 0.15)', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.5)', alignItems: 'center', justifyContent: 'center' },
    vaultOverline: { color: ORO_CHIARO, fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
    vaultTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 16, marginTop: 2 },
    vaultSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },
    vaultAdd: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ORO, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
    vaultAddText: { color: NAVY_NOTTE, fontWeight: '700', fontSize: 13 },
    list: { flex: 1 },
    listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: 14 },
    // Card documento (v4.11)
    fileCard: { borderRadius: 18 },
    fileTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    fileInfo: { flex: 1, gap: 2 },
    fileName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    fileMeta: { ...typography.caption, color: colors.textSecondary },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: 16 },
    // v4.37: tre bottoni con la scritta (Scarica / Modifica / Elimina)
    fileActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
    actionPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingVertical: 9 },
    actionPillText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
    actionPillDanger: { backgroundColor: colors.dangerSoft },
    actionPillTextDanger: { color: colors.danger },
    modalContent: { padding: spacing.xl, gap: spacing.md },
    modalTitle: { ...typography.h4, color: colors.textPrimary, fontWeight: '700' },
    modalSubtitle: { ...typography.bodySmall, color: colors.textSecondary },
    // v4.53: riga della regola "uno slot per tipo" + stili tipo occupato
    modalRule: { ...typography.bodySmall, color: colors.textTertiary, marginTop: spacing.xs, marginBottom: spacing.xs },
    tipoRowDisabled: { opacity: 0.45 },
    tipoLabelDisabled: { color: colors.textTertiary },
    slotBadge: {
      backgroundColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    slotBadgeText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
    tipiList: { gap: spacing.xs },
    tipoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: 10 },
    tipoRowActive: { backgroundColor: colors.accentSoft },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    radioSelected: { borderColor: colors.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    tipoLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
    tipoLabelActive: { color: colors.accentDark, fontWeight: '600' },
    uploadCtaBtn: { marginTop: spacing.sm },
    renameInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.body, color: colors.textPrimary, backgroundColor: colors.surfaceAlt },
    renameActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.md },
    renameCancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    renameCancelText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '500' },
    // ===== v4.71: pannello IBAN dentro la schermata + scheda IBAN =====
    overlayFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, backgroundColor: 'rgba(4, 10, 24, 0.62)', justifyContent: 'flex-end' },
    overlaySheet: { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%', paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
    overlayScroll: { flexGrow: 0 },
    overlayContent: { paddingHorizontal: spacing.xl, gap: spacing.md },
    // v4.74: overlayAzioni è usata anche in ALTO nel pannello IBAN (Scarica + Condividi)
    overlayAzioni: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.xs },
    ibanIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(212, 175, 55, 0.15)', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.45)', alignItems: 'center', justifyContent: 'center' },
    // v4.72: pulsante "scrivi a mano" nel modal di upload + lettura dal server
    scriviIbanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.45)', backgroundColor: 'rgba(212, 175, 55, 0.10)', borderRadius: 999, paddingVertical: 9, marginTop: spacing.sm },
    scriviIbanTesto: { color: ORO, fontWeight: '700', fontSize: 12 },
    ibanLeggendoBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
    ibanLeggendoTesto: { ...typography.bodySmall, color: colors.textSecondary },
    ibanDettaglioBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surfaceAlt, padding: spacing.lg, gap: 2 },
    ibanDettaglioEtichetta: { ...typography.caption, color: colors.textTertiary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
    ibanDettaglioEtichettaSotto: { marginTop: spacing.md },
    ibanDettaglioValore: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    ibanDettaglioIban: { fontFamily: 'monospace', fontSize: 15, letterSpacing: 0.5 },
    ibanInput: { letterSpacing: 1 },
    // v4.73: controllo live dell'IBAN + pulsante Condividi
    ibanLiveTesto: { ...typography.caption, color: colors.textTertiary, marginTop: -spacing.xs },
    ibanLiveOk: { color: colors.success, fontWeight: '700' },
    ibanLiveErrore: { color: colors.danger, fontWeight: '600' },
  });

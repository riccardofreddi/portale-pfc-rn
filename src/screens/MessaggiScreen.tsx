/**
 * Schermata Messaggi.
 *
 * v4.50 — il "Nuovo" decide il titolare, non il rientro nella tab:
 * - la fotografia dei NUOVI NON si azzera piu' uscendo e rientrando nella
 *   tab (prima il titolare: "sono dovuto andare in una altra tab e rientrare
 *   per vedere che era letto"): la targhetta "Nuovo" e la pillola oro con
 *   il contatore restano finche' l'utente non preme la pillola oro
 *   "Segna tutti letti";
 * - "quando rispondi togli nuovo": caricata la risposta, la targhetta
 *   "Nuovo" sparisce da quella scheda (vince il verde "Documento Inviato")
 *   ed esce dal contatore della pillola oro;
 * - igiene della fotografia a ogni caricamento: escono da chi e' stato
 *   risposto o archiviato, cosi' il contatore non conta mai messaggi
 *   gia' chiusi;
 * - Logica INTATTA: segna-letti automatico all'ingresso (il pallino rosso
 *   del tab si spegne sempre, come da v4.5), archiviazione, push, refresh.
 *
 * v4.49 — la tab prende la firma dell'app e i pulsanti si VEDONO (richieste
 * del titolare: "deve essere sempre visibile carica la risposta e archivio
 * perché non si capisce che bisogna cliccare sopra il messaggio" + "quando è
 * nuovo è troppo scuro" + "sarebbe opportuno una piccola intestazione come
 * in cassetto e registro attività"):
 * - INTESTAZIONE piccola come nelle altre schede: hero blu notte con
 *   gradiente a 3 fermate (stesso del Cassetto, Archivio e Registro),
 *   scatola icona oro con la bolla di chat, scritta oro "MESSAGGI" e
 *   titolo bianco "Posta riservata" (idea del titolare, al posto di
 *   "Comunicazioni dallo Studio" che duplicava la striscia oro della home);
 *   costruito ESATTAMENTE come l'hero del Cassetto: disegno esatto senza
 *   sbordi e nessuna animazione sulla scheda (la lezione della riga
 *   nera dell'Archivio, applicata prima che nasca un problema);
 * - messaggio NUOVO meno SCURO: il tondo dell'icona da navy PIENO
 *   (quasi nero) va a TINTA navy soft con la lettera navy — la stessa
 *   lingua delle icone verde/ambra. La distinzione nuovo/letto resta
 *   netta: fondo della scheda tinto, titolo in grassetto, pillola
 *   rossa "Nuovo", lettera navy contro lettera oro dei letti;
 * - "Carica la risposta" e "Archivia/Ripristina" sono SEMPRE visibili
 *   sotto ogni messaggio (prima si scoprivano solo al tocco): niente
 *   più azioni nascoste. Il tocco sulla testata ora serve solo ad
 *   aprire/chiudere il testo; l'iconcina archivia in alto a destra esce
 *   (doppione: il pulsante sotto è sempre lì);
 * - Logica INTATTA: caricamento, fotografia NUOVI, segna-letti,
 *   archiviazione, upload risposta, push, pull-to-refresh.
 *
 * v4.11 — grafica replicata dall'app Android v4 (MessaggiScreen.kt):
 * - Schede "Messaggi Attivi / Archiviati" in stile TabRow: indicatore
 *   navy da 3px sotto la scheda attiva e bollino rosso dei non letti.
 * - Sopra la lista: pillola oro "Segna tutti letti" (dal v4.23; prima
 *   c'era un banner informativo fisso con il vecchio pulsante bordato).
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
 * v4.23: Messaggi raffinati (richiesta del titolare):
 * - VIA il vecchio banner grigio informativo in alto: la lista respira e
 *   c'e' piu' spazio per i messaggi veri;
 * - "Segna tutti letti" diventa una pillola ORO sopra la lista, visibile
 *   SOLO quando ci sono messaggi non letti;
 * - grafica allineata alla Bacheca: nome studio in oro, pill "Nuovo"
 *   ROSSA come quella della Bacheca, link e "Leggi tutto" in oro,
 *   bordo della scheda non letta piu' morbido, allegato in tinta oro;
 * - Logica INTATTA: caricamento, segna-letti (automatici e manuali),
 *   archiviazione, upload risposta, push, pull-to-refresh.
 * v4.24: i NUOVI si vedono davvero (stesso schema della Bacheca):
 * - entrando nella tab TUTTO viene segnato letto (come dalla v4.5) ma
 *   prima scatta una "fotografia" di chi era non letto: quei messaggi
 *   continuano a mostrare il pill rosso "Nuovo", la barra navy, il titolo
 *   in grassetto e il bordo in evidenza finche' l'utente non preme la
 *   pillola oro "Segna tutti letti (n)";
 * - il pill oro mostra quante novita' ci sono;
 * - un messaggio che arriva mentre guardi la tab entra nella fotografia.
 * v4.25: grafica che si vede SEMPRE, anche con tutti i messaggi letti
 * (richiesta del titolare: "la tab deve migliorare, non solo i non letti"):
 * - schede Attivi/Archiviati: dal TabRow con barra navy sotto a SEGMENT
 *   CONTROL a pillola (stesso stile dei chip degli anni nell'Archivio):
 *   contenitore grigio chiaro, scheda attiva navy con testo bianco;
 *   il bollino rosso dei non letti resta sul chip "Messaggi Attivi";
 * - icona di stato: da quadrato a CERCHIO; i messaggi letti prendono la
 *   tinta ORO (accentSoft + mail-outline oro) come la Bacheca, i non letti
 *   restano navy pieno con icona bianca, risposto verde, richiesta ambra;
 * - "STUDIO PFC" in maiuscoletto piu' spaziato (lettering da etichetta);
 * - schede con ombra piu' morbida e profonda (shadow.md) come la Bacheca;
 * - "Carica la risposta" diventa una pillola piena navy con ombra piu'
 *   marcata; Archivia/Ripristino restano pillola bordata;
 * - Logica INTATTA: caricamento, fotografia NUOVI, segna-letti,
 *   archiviazione, upload risposta, push, pull-to-refresh.
 * v4.26: richieste del titolare dopo la prova sul telefono:
 * - VIA il messaggio scritto DUE volte: lo studio a volte ripete il
 *   titolo all'inizio del testo, quindi in scheda si vedeva il titolo
 *   sopra e lo stesso testo ancora nel riquadro sotto. Ora se il corpo
 *   INIZIA con il titolo (e poi un separatore), il doppione viene tolto
 *   SOLO dalla visualizzazione (pulisciCorpo): "Avviso" non taglia
 *   "Avvisiamo che...", e se non c'e' doppione non cambia nulla;
 * - icona delle LETTERE piu' bella: nella barra in basso la tab Messaggi
 *   porta la busta (mail/mail-outline, al posto della bolla di chat);
 *   nelle schede il messaggio nuovo usa la busta col pallino
 *   (mail-unread-outline) e i letti la busta APERTA in oro
 *   (mail-open-outline): si capisce al colpo d'occhio chi e' da leggere;
 * v4.27: la LETTERA va ovunque (richiesta del titolare: "la lettera bella
 *   la voglio a sinistra vicino STUDIO PFC al posto della nuvola"):
 *   anche le richieste documento portano la busta (in ambra); il colore
 *   dice lo stato, la forma resta sempre la lettera. E la scheda si APRE
 *   BENE al primo colpo: via i difetti di disegno Android che facevano
 *   la scheda storta finche' non si usciva e si rientrava nella tab
 *   (lista che taglia i pezzi + ombra del bottone dentro la scheda +
 *   testo che si ri-allinea male quando si apre);
 * - grafica SEMPRE quella dell'app: stessi colori oro/navy, stesse
 *   tonalita' soft dei badge, stesse ombre della Bacheca;
 * v4.28: la scheda e' PULITA e BELLA sin dall'inizio (richieste del
 *   titolare dopo la prova v4.27 sul telefono):
 * - VIA il contorno grigio intorno alle schede: era l'ombra Android
 *   (elevation) che, unita all'animazione d'ingresso, disegnava un
 *   alone storto finche' non si usciva e si rientrava nella tab. Ora
 *   la scheda si definisce col bordo netto, zero ombre: nitida SEMPRE,
 *   al primo disegno;
 * - la scheda NON si "espande" piu' in posto: resta compatta (chi ha
 *   scritto, quando, il titolo e le pillole di stato) e al TOCCO apre
 *   il testo SOTTO, per intero: via il "Leggi tutto" che allungava la
 *   scheda a blocchi e il testo tagliato a 4 righe. Tocchi di nuovo =
 *   si richiude;
 * - freccina in alto a destra che dice lo stato (giu' = chiusa,
 *   su = aperta), accanto all'archivio di sempre;
 * - anche la pill "Richiesta Documento" porta la LETTERA (via l'ultima
 *   nuvoletta della scheda; la nuvola di caricamento resta solo sul
 *   bottone "Carica la risposta", dove vuol dire proprio "invia file");
 * - Logica INTATTA: caricamento, fotografia NUOVI, segna-letti,
 *   archiviazione, upload risposta, push, pull-to-refresh.
 * v4.40: la data NON tocca piu' le icone (richiesta del titolare: "si
 *   sovrappone l'icona per espansione e per archivio con la data"):
 * - la data esce dalla riga "STUDIO PFC • data" e va su una SUA riga
 *   sotto il titolo: ha tutto lo spazio che vuole, a qualsiasi larghezza
 *   di schermo e con qualsiasi dimensione testo del telefono;
 * - le due icone (apri/chiudi + archivia) stanno in una capsula grigia
 *   morbida in alto a destra: UN gruppo chiaro, separato dal testo, che
 *   non puo' piu' sovrapporsi a niente;
 * - mesi brevi nella data lunga ("15 set 2026 alle 14:32");
 * - Logica INTATTA: caricamento, fotografia NUOVI, segna-letti,
 *   archiviazione, upload risposta, push, pull-to-refresh.
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
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, Rect, LinearGradient, Stop } from 'react-native-svg';
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

// v4.49: colori firma del brand per l'hero dell'intestazione (validi in
// entrambi i temi, come nel Cassetto, Archivio e Registro: stesso hero =
// chiaramente la stessa app).
const NAVY_NOTTE = '#0A1128';
const NAVY_PRIMARIO = '#003566';
const ORO = '#D4AF37';
const ORO_CHIARO = '#F7E7B4';

// v4.52: sigillo dell'INTERFACCIA (parte JS): cambia a ogni release e viaggia
// col codice, non col build. Nella tacca si legge "v1.64.0 - js464": se vedi
// js464 il codice nuovo sta girando davvero; se leggi js463 il Metro sta
// servendo ancora il codice di prima (ricarica con r) o la build non si e'
// aggiornata.
const CODICE_INTERFACCIA = 464;

type Tab = 'attivi' | 'archiviati';

// v4.40: mesi brevi ("15 set 2026 alle 14:32"): la riga della data
// respira anche sugli schermi stretti e con i testi ingranditi.
const MESI = [
  'gen', 'feb', 'mar', 'apr', 'mag', 'giu',
  'lug', 'ago', 'set', 'ott', 'nov', 'dic',
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

/** v4.26: il messaggio era scritto DUE volte (titolo sopra + testo sotto):
 * lo studio a volte ripete il titolo all'inizio del corpo. Qui togliamo
 * il doppione SOLO dalla visualizzazione; il testo vero nel database resta
 * intatto.
 * v4.31: sul messaggio vero del titolare la vecchia regola non bastava
 * (confronto troppo severo). Ora la pulizia tollera le differenze reali:
 * 1) la PRIMA RIGA del corpo coincide col titolo (spazi multipli,
 *    maiuscole, "Studio PFC:" davanti, punteggiatura in fondo) => salta
 *    l'intera prima riga;
 * 2) il corpo INIZIA col titolo (spazi interni liberi) seguito da un
 *    separatore (spazio, a-capo, punteggiatura) => salta quel pezzo;
 * "Avviso" NON taglia "Avvisiamo che..." (serve il confine di parola) e
 * senza doppione non cambia nulla.
 * v4.35: il titolo a volte e' scritto DUE volte (riga 1 e riga 2, anche
 * con "Studio PFC:" davanti): la pulizia ora RIPETE il taglio fino a 3
 * volte, cosi' spariscono anche i doppioni doppi.
 * v4.36: VIA la SECONDA duplicazione vista dal titolare ("quando clicco
 * sul messaggio si apre e mi fa rivedere il messaggio che gia' sta
 * sopra"): due casi che la pulizia non copriva —
 * 1) il corpo IDENTICO al titolo (messaggi brevi): il box sotto
 *    ripeteva pari pari la riga della testata => ora il corpo pulito
 *    diventa vuoto e il box non si mostra proprio;
 * 2) il MESSAGGIO INTERO scritto DUE volte di fila (prima meta' del
 *    testo identica alla seconda): ora viene riconosciuto e resta solo
 *    la prima copia.
 * In piu' norma() ora considera uguali anche i trattini diversi
 * (–, —, -) cosi' il taglio del titolo funziona anche quando lo studio
 * scrive il titolo nel corpo con un trattino diverso. */

/* v4.36 (2): messaggio intero scritto DUE volte di fila. Confronta la
 * prima meta' del testo con la seconda (attorno alla meta' esatta, con
 * un margine di 40 caratteri per punteggiature e spazi diversi): se una
 * copia coincide con l'altra, resta solo la PRIMA. Il confronto usa la
 * stessa normalizzazione del taglio del titolo, quindi tollera spazi,
 * maiuscole, punteggiatura, trattini e "Studio PFC:" davanti. */
function tagliaMessaggioDoppio(c: string, norma: (s: string) => string): string {
  const compatto = c.replace(/\s+/g, ' ').trim();
  const len = compatto.length;
  // sotto 24 caratteri non c'e' spazio per un doppione credibile
  if (len < 24) return c;
  const meta = Math.round(len / 2);
  for (let taglio = meta + 40; taglio >= meta - 40 && taglio >= 8; taglio--) {
    const prima = compatto.slice(0, taglio).trim();
    const seconda = compatto.slice(taglio).trim();
    if (prima.length < 12 || seconda.length < 12) continue;
    if (norma(prima) === norma(seconda)) return prima;
  }
  return c;
}

function pulisciCorpo(corpo: string, titolo: string): string {
  const t = titolo.trim();
  if (!t) return corpo;
  let c = corpo.trimStart();
  // Normalizza una riga per il confronto: spazi tutti uguali, minuscole,
  // via "Studio PFC:" iniziale e punteggiatura finale
  const norma = (s: string) =>
    s
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/^studio pfc\s*[:\-–—•]\s*/, '')
      .replace(/[–—‑]/g, '-') // v4.36: trattini diversi = stesso testo
      .replace(/[\s:;.,\-–—]+$/, '');
  // v4.35: fino a 3 tagli (il titolo puo' essere ripetuto piu' volte)
  // v4.36: ma PRIMA il taglio del MESSAGGIO INTERO scritto due volte di fila
  // (anche con il titolo dentro entrambe le copie): confronta le due meta'
  // del testo e resta la prima copia. Va fatto PRIMA dei tagli del titolo:
  // se il titolo della prima copia venisse tagliato subito, le due meta'
  // non sarebbero piu' simmetriche e il doppione intero non si vedrebbe.
  const senzaDoppioIntero = tagliaMessaggioDoppio(c, norma);
  const doppioIntero = senzaDoppioIntero !== c;
  c = senzaDoppioIntero;
  let cambiato = false;
  for (let giro = 0; giro < 3; giro++) {
    // 1) prima riga coincidente col titolo => salta l'intera prima riga
    const fineRiga = c.indexOf('\n');
    const primaRiga = fineRiga === -1 ? c : c.slice(0, fineRiga);
    if (primaRiga.trim() && norma(primaRiga) === norma(t)) {
      const resto = fineRiga === -1 ? '' : c.slice(fineRiga + 1).replace(/^\s+/, '');
      if (resto.trim().length > 0) {
        c = resto;
        cambiato = true;
        continue;
      }
    }
    // 2) il corpo inizia col titolo (spazi interni liberi) + separatore
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const m = c.match(new RegExp(`^${esc}[\\s:;.,\\-–—]+`, 'i'));
    if (m) {
      const resto = c.slice(m[0].length).trimStart();
      if (resto.length > 0) {
        c = resto;
        cambiato = true;
        continue;
      }
    }
    break;
  }
  // v4.36: se dopo i tagli e' rimasto SOLO il titolo (il corpo era
  // identico alla testata): il box sotto ripeterebbe la riga gia' visibile
  // sopra => corpo vuoto (il box non si mostra piu', vedi il rendering).
  if (c.trim() && norma(c) === norma(t)) return '';
  // se e' stata tolta una ripetizione (messaggio intero o titolo) resta il
  // testo pulito; se non e' cambiato NIENTE resta il corpo originale.
  return doppioIntero || cambiato ? c : corpo;
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
  // v4.24: la "fotografia" dei NUOVI presa all'apertura della tab (come la
  // Bacheca): il segna-letti automatico non spegne piu' le novita' a schermo.
  // v4.50: la fotografia NON si azzera piu' rientrando nella tab (la
  // schermata e' una tab screen e resta montata: lo stato sopravvive al
  // cambio tab). Il "Nuovo" si spegne SOLO con la pillola oro oppure
  // rispondendo al messaggio: decide il titolare, non il rientro.
  const [nuoviIds, setNuoviIds] = useState<string[]>([]);

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
        // v4.24: chi e' non letto entra nella fotografia dei NUOVI
        // (merge: un messaggio appena arrivato mentre guardi la tab
        // si aggiunge a quelli fotografati all'apertura).
        // v4.50: igiene della fotografia: chi nel frattempo e' stato
        // risposto (haRisposta) o archiviato ESCE dalla fotografia, cosi'
        // il "Nuovo" e il contatore della pillola oro non contano mai
        // messaggi gia' chiusi.
        const nuoviAdesso = res.messaggi.filter((m) => !m.letto && !m.archiviato);
        const ancoraValidi = new Set(
          res.messaggi.filter((m) => !m.archiviato && !m.haRisposta).map((m) => m.id),
        );
        setNuoviIds((prev) => {
          const uniti = new Set([...prev, ...nuoviAdesso.map((m) => m.id)]);
          return Array.from(uniti).filter((id) => ancoraValidi.has(id));
        });
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
    // v4.24: prima carichiamo (cosi' vediamo chi era non letto), POI
    // segniamo tutto letto: il pallino rosso del tab si pulisce.
    // v4.50: la fotografia dei NUOVI NON viene piu' azzerata qui: uscire e
    // rientrare nella tab non spegne piu' il "Nuovo". La targhetta si spegne
    // SOLO con la pillola oro "Segna tutti letti" o rispondendo al messaggio.
    (async () => {
      await load();
      await segnaLettiSilenzioso();
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
          await load(); // v4.24: prima la fotografia, poi il segna-letti
          await segnaLettiSilenzioso();
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
      // v4.24: la pillola oro chiude anche la fotografia dei NUOVI
      setNuoviIds([]);
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
      // v4.50: "quando rispondi togli nuovo": risposto = la targhetta
      // "Nuovo" sparisce da quella scheda ed esce dal contatore
      // della pillola oro (vince il verde "Documento Inviato").
      setNuoviIds((prev) => prev.filter((id) => id !== msg.id));
      toast.success('File inviato con successo');
    } catch (err) {
      if (DocumentPicker.isCancel(err)) return;
      toast.error('Errore upload', err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setUploadingId(null);
    }
  }

  function iconaStato(msg: Messaggio, eNuovo: boolean): { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
    // v4.27: la LETTERA e' l'icona di tutti i messaggi ("la lettera bella
    // la voglio a sinistra vicino STUDIO PFC al posto della nuvola"):
    // la forma non cambia piu', e' il COLORE a dire lo stato:
    //   verde  = gia' risposto (spunta: azione fatta)
    //   navy   = nuovo, da leggere
    //   ambra  = richiesta documento da sistemare (prima c'era la nuvola)
    //   oro    = letto e archiviato nella memoria
    // v4.49: il NUOVO non e' piu' un tondo navy PIENO (il titolare: "quando
    // e' nuovo e' troppo scuro"): tinta navy soft + lettera navy, la stessa
    // lingua soft di verde/ambra. Resta ben distinto dal letto (oro) e
    // reggono la segnalazione fondo tinto + titolo grassetto + pill rossa.
    if (msg.haRisposta) return { icon: 'checkmark-circle', color: colors.success, bg: `${colors.success}26` };
    if (eNuovo) return { icon: 'mail-unread-outline', color: colors.primary, bg: `${colors.primary}1A` };
    // v4.27: richiesta documento = busta AMBRA (via la nuvola)
    if (msg.richiedeUpload) return { icon: 'mail-unread-outline', color: colors.warning, bg: `${colors.warning}26` };
    // v4.25: i messaggi letti prendono la tinta ORO della Bacheca (era grigio)
    return { icon: 'mail-open-outline', color: colors.accentDark, bg: colors.accentSoft };
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* v4.49: intestazione piccola come nel Cassetto e nel Registro attività
       * (richiesta del titolare): STESSA costruzione dell'hero del Cassetto —
       * gradiente a 3 fermate, disegno esatto senza sbordi, NESSUNA animazione
       * sulla scheda (la lezione della riga nera dell'Archivio). Scritta oro
       * "MESSAGGI" e titolo "Posta riservata" scelto dal titolare (via il
       * doppione con "Comunicazioni dello Studio" della home). */}
      <View style={styles.heroWrap}>
        <View style={styles.heroCard}>
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="messaggiHero" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={NAVY_NOTTE} />
                <Stop offset="0.5" stopColor={NAVY_PRIMARIO} />
                <Stop offset="1" stopColor={NAVY_NOTTE} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#messaggiHero)" />
          </Svg>
          <View style={styles.heroInner}>
            <View style={styles.heroIconBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={ORO} />
            </View>
            <View style={styles.heroTexts}>
              <Text style={styles.heroOverline}>MESSAGGI</Text>
              <Text style={styles.heroTitle}>Posta riservata</Text>
            </View>
          </View>
        </View>
      </View>

      {/* v4.25: schede Attivi/Archiviati a segment control a pillola
          (stesso linguaggio dei chip degli anni nell'Archivio v4.12) */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabsPill}>
          <Pressable
            onPress={() => {
              haptics.tap();
              setTab('attivi');
            }}
            style={[styles.tabBtn, tab === 'attivi' && styles.tabBtnActive]}
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
            style={[styles.tabBtn, tab === 'archiviati' && styles.tabBtnActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === 'archiviati' }}
          >
            <Text style={[styles.tabLabel, tab === 'archiviati' && styles.tabLabelActive]}>
              Archiviati ({archiviati.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* v4.29: tacca di versione sotto le linguette: chi dice la verita' su
       * quale build sta girando davvero sul telefono (anti "non vedo le
       * modifiche": o vedi v1.30.0, oppure il build nuovo non e' partito).
       * v4.30: c'e' anche il sigillo JS: se leggi js430 il codice nuovo e'
       * caricato anche a caldo, senza reinstallare nulla. */}
      <Text style={styles.versioneTag}>
        v{Constants.expoConfig?.version ?? '?'} · js{CODICE_INTERFACCIA}
      </Text>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={loading && !refreshing ? [] : displayList}
        keyExtractor={(item) => item.id}
        // v4.27: la scheda si APRE BENE al primo colpo. Su Android la lista
        // di default "taglia" i pezzi fuori schermo (removeClippedSubviews):
        // con le schede animate questo taglia disegna le card storte finche'
        // non esci e rientri nella tab. Lista corta => lo spegniamo e la
        // scheda si disegna sempre intera e dritta.
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        /* v4.24: pillola oro con il CONTAGGIO delle novita', sparisce quando le chiudi */
        ListHeaderComponent={
          tab === 'attivi' && nuoviIds.length > 0 ? (
            <View style={styles.lettiRiga}>
              <Pressable
                onPress={handleSegnaLetti}
                style={({ pressed }) => [styles.segnaLettiPill, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
                accessibilityLabel="Segna tutti come letti"
              >
                <Ionicons name="checkmark-done" size={13} color={colors.accentDark} />
                <Text style={styles.segnaLettiPillText}>Segna tutti letti ({nuoviIds.length})</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item: msg, index }) => {
          const expanded = expandedId === msg.id;
          // v4.24: "Nuovo" = non letto ORA oppure era nella fotografia
          // (il segna-letti automatico non spegne la segnalazione finche'
          // l'utente non la chiude).
          // v4.50: chi ha gia' una risposta non puo' essere "Nuovo" anche se
          // resta in fotografia (doppio stato): vince il verde "inviato".
          const eNuovo =
            !msg.archiviato && !msg.haRisposta && (!msg.letto || nuoviIds.includes(msg.id));
          const ic = iconaStato(msg, eNuovo);
          // v4.26: il corpo mostrato non ripete il titolo (via il doppione)
          const corpoMostrato = pulisciCorpo(msg.corpo, msg.titolo);
          return (
            <Entrata delay={Math.min(60 + index * 50, 400)}>
              <View style={[styles.msgCard, eNuovo && styles.msgCardUnread]}>
                <View style={styles.msgInner}>
                  {/* Testata: icona stato + STUDIO PFC + titolo + data (v4.40);
                   * v4.49: il tocco ora serve SOLO ad aprire/chiudere il testo */}
                  <Pressable
                    onPress={() => {
                      haptics.tap();
                      setExpandedId(expanded ? null : msg.id);
                    }}
                    style={styles.msgHeader}
                    accessibilityLabel="Apri o chiudi il messaggio"
                  >
                    <View style={[styles.msgIcon, { backgroundColor: ic.bg }]}>
                      <Ionicons name={ic.icon} size={20} color={ic.color} />
                    </View>
                    <View style={styles.msgHeaderText}>
                      <Text style={styles.msgStudio}>STUDIO PFC</Text>
                      <Text style={[styles.msgTitle, eNuovo && styles.msgTitleUnread]} numberOfLines={2}>
                        {msg.titolo}
                      </Text>
                      {/* v4.40: la data sta da sola, sotto il titolo: tutta
                       * visibile, mai sotto le icone (prima la riga
                       * "STUDIO PFC • data" sbordava sulla freccia e
                       * sull'archivio). */}
                      <Text style={styles.msgDate}>{dataGentile(msg.dataInvio)}</Text>
                    </View>
                    <View style={styles.headerActions}>
                      {/* v4.28: freccina che indica l'apertura (il tocco sulla
                       * testata apre il testo sotto): giu' = chiusa, su = aperta.
                       * v4.49: l'iconcina archivia esce dalla capsula (era il
                       * doppione del pulsante "Archivia" che ora sta SEMPRE
                       * visibile sotto ogni messaggio): la capsula resta con la
                       * sola freccia e il titolo respira. */}
                      <View style={styles.chevWrap}>
                        <Ionicons
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.textTertiary}
                        />
                      </View>
                    </View>
                  </Pressable>

                  {/* Pillole di stato (come i badge dell'app v4) */}
                  <View style={styles.badgeRow}>
                    {eNuovo && (
                      <View style={[styles.pill, { backgroundColor: colors.dangerSoft }]}>
                        <Text style={[styles.pillText, { color: colors.danger }]}>Nuovo</Text>
                      </View>
                    )}
                    {msg.richiedeUpload && !msg.haRisposta && (
                      <View style={[styles.pill, { backgroundColor: `${colors.warning}26` }]}>
                        {/* v4.28: anche nella pill c'e' la LETTERA (via l'ultima nuvoletta) */}
                        <Ionicons name="mail-unread-outline" size={12} color={colors.warning} />
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

                  {/* v4.28: al TOCCO la scheda apre SOTTO il testo, per intero:
                   * niente piu' corpo sempre visibile tagliato a 4 righe con il
                   * "Leggi tutto" che allunga la scheda in posto. La scheda
                   * chiusa resta compatta; aperta mostra TUTTO il messaggio.
                   * v4.19: i siti internet nel testo sono cliccabili (linkify).
                   * v4.49: dentro il blocco restano SOLO testo e allegato —
                   * le azioni escono e si vedono sempre, sotto. */}
                  {expanded && (
                    <>
                      {/* v4.36: se il corpo pulito e' VUOTO (era identico al
                       * titolo) il box non si mostra proprio: niente riga
                       * ripetuta sotto la testata. */}
                      {corpoMostrato.trim().length > 0 && (
                        <View style={styles.corpoBox}>
                          <Text style={styles.corpo}>
                            {spezzaLink(corpoMostrato, styles.corpoLink)}
                          </Text>
                        </View>
                      )}

                      {/* Allegato dello studio, se presente */}
                      {msg.allegatoNome ? (
                        <View style={styles.allegatoBox}>
                          <Ionicons name="attach" size={15} color={colors.accentDark} />
                          <Text style={styles.allegatoText} numberOfLines={1}>
                            Allegato dallo Studio: {msg.allegatoNome}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  )}

                  {/* v4.49: AZIONI SEMPRE VISIBILI (richiesta del titolare:
                   * "deve essere sempre visibile carica la risposta e archivio
                   * perché non si capisce che bisogna cliccare sopra il
                   * messaggio"). Prima stavano dentro il blocco del tocco e
                   * si scoprivano solo aprendo la scheda. Logica invariata:
                   * "Carica la risposta" compare solo sulle richieste
                   * documento senza risposta; "Archivia/Ripristina" segue il
                   * tab attivo. */}
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

    // v4.25: segment control a pillola (come i chip degli anni dell'Archivio)
    tabsWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
    tabsPill: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: colors.border },
    tabBtn: { flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 999 },
    tabBtnActive: { backgroundColor: colors.primary, ...shadow.sm },
    tabLabel: { ...typography.bodySmall, fontSize: 13.5, color: colors.textSecondary, fontWeight: '600' },
    tabLabelActive: { color: colors.textInverse, fontWeight: '800' },
    tabCount: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    tabCountText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

    // v4.23: pillola oro "Segna tutti letti" (al posto del vecchio banner)
    lettiRiga: { flexDirection: 'row', justifyContent: 'flex-end' },
    segnaLettiPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, borderWidth: 1, borderColor: `${colors.accent}99`, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 6 },
    segnaLettiPillText: { color: colors.accentDark, fontSize: 12, fontWeight: '800' },

    list: { flex: 1 },
    listContent: { padding: spacing.lg, gap: 14, paddingBottom: spacing.xxl },
    skeletonInList: { paddingVertical: spacing.sm },
    // v4.29: tacca di versione: piccola, discreta, sempre veritiera (letta dalla config)
    versioneTag: { textAlign: 'center', fontSize: 11, color: colors.textTertiary, paddingBottom: spacing.xs, letterSpacing: 0.3 },

    // v4.49 — Hero dell'intestazione: STESSA firma di Cassetto (vaultHero),
    // Archivio (heroNavy) e Registro attività (heroCard): angoli 22, bordo
    // oro 0.4, fondo blu notte, gradiente a 3 fermate, scatola icona oro.
    // Stessa costruzione del Cassetto: disegno ESATTO senza sbordi e nessuna
    // animazione sulla scheda (lezione della riga nera dell'Archivio).
    heroWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    heroCard: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.4)', backgroundColor: NAVY_NOTTE, ...shadow.md },
    heroInner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
    heroIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(212, 175, 55, 0.15)', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.5)', alignItems: 'center', justifyContent: 'center' },
    heroTexts: { flex: 1 },
    heroOverline: { color: ORO_CHIARO, fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
    heroTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 16, marginTop: 2 },

    // Card messaggio (v4.11, stile MessaggioCard dell'app v4)
    // v4.28: VIA l'ombra (era shadow.md): l'elevation Android unita
    // all'animazione d'ingresso disegnava il contorno grigio storto che
    // si sistemava solo uscendo e rientrando nella tab.
    // v4.31: VIA anche il CONTORNO (il bordo grigio attorno a tutta la
    // scheda, piu' spesso sui nuovi, che il titolare non vuole): le schede
    // si definiscono col fondo e con lo spazio; i nuovi si riconoscono dal
    // fondo leggermente tinto, dal titolo in grassetto e dalla pillola
    // "Nuovo" (nessun contorno perimetrale, nessuna barra laterale).
    msgCard: { flexDirection: 'row', borderRadius: 20, backgroundColor: colors.surface, overflow: 'hidden' },
    msgCardUnread: { backgroundColor: `${colors.primary}0D` },
    msgInner: { flex: 1, padding: 18, gap: 12 },
    msgHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    msgIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    msgHeaderText: { flex: 1, gap: 2 },
    // v4.25: lettering da etichetta (maiuscoletto piu' spaziato)
    msgStudio: { color: colors.accentDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
    // v4.40: data su riga propria sotto il titolo (prima stava accanto a
    // "STUDIO PFC" e sbordava fino a toccare le icone in alto a destra);
    // tinta meta' discreta, come le date dell'Attivita.
    msgDate: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },
    msgTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '500', fontSize: 15.5 },
    msgTitleUnread: { fontWeight: '800' },
    // v4.49: l'iconAction (archivia nella capsula) e' STATO RIMOSSO: il
    // pulsante "Archivia/Ripristina" ora sta sempre visibile sotto ogni
    // messaggio e la capsula in alto porta solo la freccia d'apertura.
    // v4.28: freccina d'apertura accanto all'archivio
    // v4.40: le due icone in una capsula morbida = UN gruppo netto e
    // staccato dal testo; marginTop 4 la centra contro l'icona tonda da
    // 40; flexShrink 0: mai schiacciate dal testo.
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 3, height: 32, marginTop: 4, flexShrink: 0 },
    chevWrap: { width: 26, height: 32, alignItems: 'center', justifyContent: 'center' },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    pillText: { fontSize: 11, fontWeight: '700' },
    // v4.31: VIA il bordo anche dal riquadro del testo (il contorno grigio
    // interno): il testo si stacca dal fondo senza cornici.
    corpoBox: { backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 14 },
    corpo: { ...typography.bodySmall, color: colors.textPrimary, lineHeight: 21 },
    // v4.19: i link nel corpo del messaggio si Vedono e si toccano (aprono il browser)
    // v4.23: link in oro, stessa lingua della Bacheca
    corpoLink: { color: colors.accentDark, fontWeight: '700', textDecorationLine: 'underline' },
    // v4.23: allegato dello Studio in tinta oro (come la Bacheca)
    allegatoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accentSoft, borderRadius: 12, borderWidth: 1, borderColor: `${colors.accent}55`, paddingHorizontal: 12, paddingVertical: 9 },
    allegatoText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600', flex: 1 },
    actionsWrap: { gap: 10 },
    // v4.25: "Carica la risposta" a pillola piena
    // v4.27: VIA l'ombra del bottone: un'ombra dentro una scheda che si
    // apre fa disegnare ad Android il bottone storto finche' non si
    // rientra nella tab. La pillola resta identica, solo piu' affidabile.
    uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 999, backgroundColor: colors.primary },
    outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 42, borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
    outlineBtnText: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
    uploadBtnText: { ...typography.button, color: colors.textInverse },
    btnPressed: { opacity: 0.85 },
    btnDisabled: { opacity: 0.5 },
  });

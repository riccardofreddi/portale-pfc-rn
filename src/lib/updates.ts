/**
 * Controllo aggiornamenti app tramite GitHub Releases.
 *
 * La CI pubblica ogni build APK su una release con tag "latest-apk"
 * e scrive la versione nel body come "**Versione:** X.Y.Z".
 * L'app confronta quella versione con la propria e, se esce una
 * nuova build, propone di aprire la pagina delle release su GitHub.
 *
 * v4.86 - AGGIORNAMENTO GUIDATO: se esce una versione piu' recente
 * dell'app, all'avvio compare il dialog non chiudibile con il solo
 * bottone "Aggiorna ora" (apre il download dell'APK nel browser).
 * Il confronto resta qui dentro: al cliente non viene mostrato
 * nessun numero di versione. Se il controllo fallisce (rete assente,
 * GitHub irraggiungibile) non succede nulla: si riprova al prossimo
 * avvio.
 *
 * v4.91 - FIX "Aggiorna ora" che ricompariva sempre: due motivi.
 * 1) La cache del controllo (10 minuti) non ricordava PER QUALE
 *    versione dell'app era la risposta: aggiornata l'app, il vecchio
 *    esito "aggiornamento disponibile" restava valido ancora qualche
 *    minuto e il dialog ricompariva anche a aggiornamento riuscito.
 *    Ora la cache porta la versione dell'app e viene scartata se
 *    non coincide con quella installata sul telefono.
 * 2) Il download parte sempre dallo stesso URL (il tag latest-apk):
 *    browser e rete possono rispondere con la copia VECCHIA che
 *    hanno in cache e far installare di nuovo la versione di prima.
 *    Ora l'URL porta "?t=<tempo>" che rende ogni download unico.
 *
 * v4.93 - "AGGIORNA ORA" ORA CHIUSE IL PANNELLO E NON RICOMPARA.
 * Prima il dialog restava aperto anche dopo il tocco (tornando dal
 * browser era ancora li') e a ogni avvio successivo ricompariva finche'
 * l'install non riusciva: il cliente restava intrappolato. Ora quando
 * l'utente preme "Aggiorna ora" l'app RICORDA la richiesta ( AsyncStorage,
 * chiave pfc-update-ack-v1: "gia' chiesto di andare alla versione X")
 * e chiude il pannello: si continua a usare l'app mentre l'APK scarica.
 * All'avvio il dialog compare SOLO se la release trovata e' DIVERSA da
 * quella gia' chiesta: stessa release => piu' dialog; release NUOVA =>
 * torna a comparire, come giusto.
 */
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';

export const GITHUB_REPO = 'riccardofreddi/portale-pfc-rn';

const RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/latest-apk`;
const RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPO}/releases`;

/**
 * Versione corrente dell'app: letta DIRETTAMENTE dalla build nativa
 * (PackageInfo.versionName) via expo-application, che e' gia compilato
 * nell'APK da sempre (dipendenza di altri moduli expo, autolink in
 * settings.gradle).
 *
 * v4.88 - FIX "Nuova versione disponibile" a ogni avvio: prima la
 * versione si leggeva da expo-constants, ma nelle build release
 * (android/ nel repo, niente manifest incorporato) Constants.expoConfig
 * vale null e Constants.nativeApplicationVersion non esiste piu' nel
 * suo codice (rimossa a favore di expo-application): l'app finiva sul
 * ripiego 1.0.0 e QUALUNQUE release su GitHub sembrava sempre piu'
 * nuova. Ora la versione e' quella vera del telefono: il dialog esce
 * solo quando esce davvero una versione piu' recente.
 */
export const APP_VERSION: string =
  Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0';

/** Sigillo dell'interfaccia JS: cambia a ogni release e viaggia
 *  col codice, non col build (segue il versionCode: 493 = versionCode
 *  93). Unica fonte: la tacca di versione, ora in Impostazioni. */
export const CODICE_INTERFACCIA = 493;

interface ReleaseInfo {
  version: string | null;
  publishedAt: string;
  htmlUrl: string;
}

async function fetchLatestRelease(): Promise<ReleaseInfo> {
  const res = await fetch(RELEASE_API_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'Nessuna release pubblicata (o repo non pubblica)'
        : `Errore GitHub ${res.status}`,
    );
  }
  const data = (await res.json()) as {
    body?: string;
    published_at?: string;
    html_url?: string;
  };
  // La CI scrive la versione nel body: "**Versione:** X.Y.Z"
  const match = /\*\*Versione:\*\*\s*([0-9][^\s*)]*)/.exec(data.body ?? '');
  return {
    version: match?.[1] ?? null,
    publishedAt: data.published_at ?? '',
    htmlUrl: data.html_url ?? RELEASES_PAGE_URL,
  };
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export type UpdateCheckResult =
  | { status: 'up-to-date'; current: string; latest: string | null }
  | { status: 'available'; current: string; latest: string; url: string };

// ==== v4.93: memoria dell'"Aggiorna ora" gia' chiesto ==================

/** Il rimando resta per sempre (nessuna scadenza): finche' su GitHub
 *  non esce una release DIVERSA da quella gia' chiesta, il dialog non
 *  torna a disturbare. E' la richiesta del titolare: "una volta che e'
 *  stato fatto Aggiorna ora non deve piu' riaprirsi". */
const ACK_KEY = 'pfc-update-ack-v1';

interface AckAggiornamento {
  /** Quando e' stato premuto il bottone. */
  t: number;
  /** La versione dell'ultima release per cui l'utente ha gia' premuto
   *  "Aggiorna ora" (la versione che GitHub proponeva in quel momento). */
  verso: string;
}

/** v4.93: registra che l'utente ha premuto "Aggiorna ora" mentre GitHub
 *  proponeva la versione `verso`. Silenzioso: se lo storage fallisce,
 *  al peggio il dialog ricompara come prima della modifica. */
export async function segnaAggiornamentoChiesto(verso: string): Promise<void> {
  try {
    const ack: AckAggiornamento = { t: Date.now(), verso };
    await AsyncStorage.setItem(ACK_KEY, JSON.stringify(ack));
  } catch {
    // storage indisponibile: non blocca nulla
  }
}

async function leggiAckAggiornamento(): Promise<AckAggiornamento | null> {
  try {
    const raw = await AsyncStorage.getItem(ACK_KEY);
    if (!raw) return null;
    const ack = JSON.parse(raw) as Partial<AckAggiornamento> | null;
    if (ack && typeof ack.verso === 'string' && ack.verso) return ack as AckAggiornamento;
  } catch {
    // ack illeggibile: come se non ci fosse
  }
  return null;
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const rel = await fetchLatestRelease();
  const latest = rel.version;
  if (latest && compareVersions(latest, APP_VERSION) > 0) {
    return {
      status: 'available',
      current: APP_VERSION,
      latest,
      url: rel.htmlUrl,
    };
  }
  return { status: 'up-to-date', current: APP_VERSION, latest };
}

/** Apre la pagina delle release su GitHub (browser di sistema). */
export function openReleasesPage(url?: string): void {
  void Linking.openURL(url ?? RELEASES_PAGE_URL);
}

// ==== v4.86: aggiornamento guidato ==================================

/** Download diretto dell'APK dell'ultima release (URL stabile del tag). */
const APK_URL = `https://github.com/${GITHUB_REPO}/releases/download/latest-apk/app-release.apk`;

/** Apre il download diretto dell'APK (browser di sistema, poi install). */
export function apriDownloadAggiornamento(): void {
  // v4.91: "?t=..." in coda all'URL. L'indirizzo del tag e' sempre lo
  // stesso, quindi il browser puo' rispondere con l'APK VECCHIO che ha
  // in cache: l'aggiornamento sembra riuscito ma il telefono resta
  // sulla versione di prima (sospetto: e' capitato con la 1.87.3).
  // Con "?t" ogni download e' unico, il browser non puo' usare la cache.
  void Linking.openURL(`${APK_URL}?t=${Date.now()}`);
}

// Cache del controllo (anti-martello sulla API di GitHub): se abbiamo
// gia' controllato negli ultimi 10 minuti riusiamo il risultato, cosi'
// riaperture ravvicinate dell'app non fanno richieste a ripetizione.
// v4.88: chiave nuova per ignorare le vecchie cache che dicevano
// "aggiornamento disponibile" per colpa della versione letta male.
// v4.91: la risposta in cache vale solo per la versione che l'ha
// prodotta (campo v): dopo un aggiornamento si ricontrolla di nuovo.
const CACHE_KEY = 'pfc-update-check-v2';
const CACHE_MS = 10 * 60 * 1000;

interface CacheControllo {
  t: number;
  disponibile: boolean;
  /** v4.91: la versione dell'app per cui la risposta e' valida. Dopo
   *  un aggiornamento la versione cambia e una cache scritta dalla
   *  versione prima NON deve piu' valere: e' il motivo per cui il
   *  dialog "Aggiorna ora" ricompariva per fino a 10 minuti anche
   *  dopo aver installato con successo la nuova versione. */
  v?: string;
  /** v4.93: la versione proposta da GitHub al momento del controllo.
   *  Serve per applicare il filtro "gia' chiesto" anche sugli esiti
   *  in cache. Le cache scritte prima della v4.93 non ce l'hanno:
   *  in quel caso si ricontrolla la rete. */
  latest?: string | null;
}

/**
 * Controllo all'avvio (v4.86): true se su GitHub esiste una versione
 * piu' recente della propria. Con cache di 10 minuti contro richieste
 * ravvicinate. Silenzioso: qualsiasi errore (rete assente, GitHub
 * giu', storage illeggibile) vale false e non rompe nulla; si riprova
 * al prossimo avvio.
 *
 * v4.93: ritorna anche la versione trovata (`latest`) cosi' App puo'
 * segnare l'ack quando l'utente preme "Aggiorna ora". E SOPRATTUTTO
 * applica il filtro dell'ack: se l'unica release disponibile e' quella
 * per cui l'utente ha gia' premuto "Aggiorna ora", il dialog NON torna
 * (daFare: false) anche se GitHub continua a proportela. Il filtro
 * viene applicato DOPO la cache: anche un esito in cache non puo'
 * far riaprire il dialog di una release gia' chiesta.
 */
export async function aggiornamentoDisponibileAllAvvio(): Promise<{
  daFare: boolean;
  latest: string | null;
}> {
  let disponibile = false;
  let latest: string | null = null;

  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const cache = JSON.parse(raw) as Partial<CacheControllo> | null;
      if (
        cache &&
        typeof cache.t === 'number' &&
        typeof cache.disponibile === 'boolean' &&
        cache.v === APP_VERSION && // v4.91: esiti di un'altra versione non valgono
        Date.now() - cache.t < CACHE_MS
      ) {
        disponibile = cache.disponibile;
        latest = typeof cache.latest === 'string' ? cache.latest : null;
      }
    }
  } catch {
    // cache illeggibile: prosegui col controllo di rete
  }

  // Cache assente, scaduta o di un'altra versione: chiedi a GitHub.
  if (latest === null && !disponibile) {
    try {
      const res = await checkForUpdates();
      disponibile = res.status === 'available';
      latest = res.latest;
      try {
        const cache: CacheControllo = {
          t: Date.now(),
          disponibile,
          v: APP_VERSION,
          latest,
        };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      } catch {
        // storage indisponibile: non blocca il risultato
      }
    } catch {
      // rete assente / GitHub giu': silenzio, si riprova al prossimo avvio
      return { daFare: false, latest: null };
    }
  }

  // v4.93: filtro "gia' chiesto". Applicato anche agli esiti in cache:
  // l'ack vale piu' della cache (dura sempre, la cache 10 minuti).
  if (disponibile && latest) {
    const ack = await leggiAckAggiornamento();
    if (ack && ack.verso === latest) {
      return { daFare: false, latest };
    }
  }

  return { daFare: disponibile, latest };
}

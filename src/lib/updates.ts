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
 *
 * v4.100 - L'AGGIORNAMENTO FA TUTTO DA SOLO. Prima "Aggiorna ora"
 * apriva il BROWSER: l'APK scaricava li', poi il cliente doveva cercare
 * la notifica, toccare il file e solo dopo arrivava la conferma di
 * Android: troppi passaggi. Ora il download avviene DENTRO l'app
 * (react-native-blob-util, con percentuale visibile sul bottone) e a
 * fine download l'app apre DA SOLA l'installer di Android: l'unico
 * tocco che resta al cliente e' la conferma di sistema "Aggiorna app?"
 * (non eliminabile: e' la sicurezza di Android). Il meccanismo nativo
 * e' lo stesso di apriConApp (lib/download.ts), gia' in produzione per
 * i PDF; il permesso REQUEST_INSTALL_PACKAGES e' nell'AndroidManifest.
 * La memoria dell'ack v4.93 e' RIMOSSA di proposito: finche' la release
 * proposta e' piu' nuova dell'app installata, il pannello riparte a
 * ogni avvio. Se il cliente annulla l'installer, al prossimo avvio
 * l'aggiornamento si ripresenta: tutti devono finire sull'ultima
 * versione (richiesta del titolare: "il cliente non deve fare nulla").
 * L'APK gia' scaricato per la release proposta resta in cache: al
 * secondo tentativo l'installer apre SUBITO, senza riscaricare 100 MB
 * (chiave pfc-apk-pronto-v1).
 *
 * v4.102 - IL CONTROLLO CHE NON PUO' PIU' MANCARE. La prova dal vivo
 * con la 1.88.4 non e' partita: il telefono non ha mostrato il
 * pannello. Due difetti, uno di pagina e uno di rete.
 * 1) PAGINA (App.tsx): il controllo viveva SOLO all'avvio a freddo;
 *    se l'app era in background e veniva RIAPERTA, il controllo non
 *    ripartiva e il pannello non compariva mai finche' l'app non
 *    veniva chiusa davvero. Sistemato in App.tsx: il controllo riparte
 *    anche al ritorno sull'app.
 * 2) RETE (qui): il check parlava SOLO con l'API di GitHub
 *    (api.github.com), che senza autenticazione ha un tetto di 60
 *    richieste ORARIE PER INDIRIZZO IP. Su rete mobile l'indirizzo e'
 *    condiviso fra tante persone: spesso e' gia' esaurito (HTTP 403)
 *    e il check moriva in silenzio anche se la release c'era.
 *    Rimedio: la CI pubblica ora accanto all'APK anche un file di
 *    testo con la sola versione (versione.txt: "1.88.5" e basta);
 *    l'app lo legge dalla via DOWNLOAD di GitHub, che NON ha il tetto
 *    dell'API. L'API resta come ripiego (e per le release piu' vecchie
 *    che non hanno il file).
 */
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import ReactNativeBlobUtil from 'react-native-blob-util';

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
 *  col codice, non col build (segue il versionCode: 4101 = versionCode
 *  100). Unica fonte: la tacca di versione, ora in Impostazioni. */
export const CODICE_INTERFACCIA = 4106;

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

// ==== v4.102: la via del FILE, senza il tetto dell'API ===============

/** Il file di testo pubblicato dalla CI accanto all'APK: contiene la
 *  sola versione ("1.88.5", un rigo). Serve l'appendice "?t=" perche'
 *  l'indirizzo e' sempre lo stesso e la rete potrebbe rispondere con
 *  la copia vecchia in cache (stesso difetto dell'APK, v4.91). */
const VERSIONE_TXT_URL = `https://github.com/${GITHUB_REPO}/releases/download/latest-apk/versione.txt`;

/** Legge la versione dal file (via download, senza rate limit).
 *  null se il file non c'e' (release vecchie), la rete manca o la
 *  risposta non e' una versione: il chiamante passa al ripiego API. */
async function leggiVersioneDaFile(): Promise<string | null> {
  try {
    const res = await fetch(`${VERSIONE_TXT_URL}?t=${Date.now()}`, {
      headers: { Accept: 'text/plain' },
    });
    if (!res.ok) return null;
    const testo = (await res.text()).trim();
    // Solo cifre e punti: una pagina d'errore HTML non deve mai
    // passare per versione
    return /^[0-9]+(\.[0-9]+)*$/.test(testo) ? testo : null;
  } catch {
    return null;
  }
}

/** Trova l'ultima release pubblicata. Prima la via del file (robusta,
 *  senza tetto di richieste); se quella non risponde, il ripiego API
 *  di sempre (che pero' puo' colare contro il tetto dei 60/ora). */
async function trovaUltimaRelease(): Promise<ReleaseInfo> {
  const viaFile = await leggiVersioneDaFile();
  if (viaFile) {
    return {
      version: viaFile,
      publishedAt: '',
      htmlUrl: RELEASES_PAGE_URL,
    };
  }
  return fetchLatestRelease();
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

// ==== v4.100: il download dentro l'app e l'installer automatico =======

/** Percorso FISSO dell'APK in cache: sovrascritto a ogni download
 *  (l'unlink preventivo evita di ritrovare un file a meta' da un
 *  tentativo interrotto, stessa prudenza di condividi.ts). La cache
 *  e' coperta dal FileProvider della libreria (cache-path), quello
 *  stesso che gia' serve apriConApp. Compiuto PIGRO: fs.dirs tocca il
 *  modulo nativo e non deve essere interrogato durante l'import del
 *  modulo (stessa prudenza di download.ts, che lo usa solo dentro le
 *  funzioni). */
function percorsoApkCache(): string {
  return `${ReactNativeBlobUtil.fs.dirs.CacheDir}/pfc_aggiornamento.apk`;
}

/** Memoria dell'APK gia' scaricato per una release: se il cliente ha
 *  annullato l'installer e riprova, l'installer apre SUBITO senza
 *  riscaricare ~100 MB. La voce vale solo se il file c'e' ancora
 *  (Android puo' svuotare la cache quando vuole). */
const APK_PRONTO_KEY = 'pfc-apk-pronto-v1';

interface ApkPronto {
  /** La release per cui l'APK e' stato scaricato. */
  verso: string;
  /** Il percorso del file in cache. */
  path: string;
}

async function leggiApkPronto(verso: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(APK_PRONTO_KEY);
    if (!raw) return null;
    const meta = JSON.parse(raw) as Partial<ApkPronto> | null;
    if (
      meta &&
      meta.verso === verso &&
      typeof meta.path === 'string' &&
      (await ReactNativeBlobUtil.fs.exists(meta.path))
    ) {
      return meta.path;
    }
  } catch {
    // memoria illeggibile o file sparito: si riscarica
  }
  return null;
}

/**
 * v4.100: scarica l'APK dell'ultima release DENTRO l'app (cache) e
 * ritorna il percorso. onProgress riceve la percentuale (0-100) se la
 * rete comunica la dimensione del file, altrimenti non viene chiamato
 * e l'interfaccia resta sul "Scaricamento..." senza numero. L'URL e'
 * lo stesso del browser (con "?t=" anti-cache, v4.91); eventuali
 * errori HTTP lasciano la cache pulita.
 */
export async function scaricaAggiornamentoAPK(
  onProgress?: (percento: number) => void,
): Promise<string> {
  const destinazione = percorsoApkCache();
  await ReactNativeBlobUtil.fs.unlink(destinazione).catch(() => {});
  const task = ReactNativeBlobUtil.config({ path: destinazione }).fetch(
    'GET',
    `${APK_URL}?t=${Date.now()}`,
  );
  if (onProgress) {
    task.progress((received: number | string, total: number | string) => {
      const tot = Number(total);
      if (tot > 0) {
        onProgress(Math.min(100, Math.round((Number(received) / tot) * 100)));
      }
    });
  }
  const res = await task;
  const status = res.info().status;
  if (status < 200 || status >= 300) {
    await ReactNativeBlobUtil.fs.unlink(destinazione).catch(() => {});
    throw new Error(`Errore del server (HTTP ${status})`);
  }
  return res.path();
}

/**
 * v4.100: apre l'installer di Android sull'APK scaricato. Da qui e'
 * Android a parlare al cliente: la sua conferma "Aggiorna app?" e'
 * l'unico tocco rimasto (e' la sicurezza del sistema, non si toglie).
 * Stessa via di apriConApp, in produzione da sempre per i PDF.
 */
export async function apriInstallerAPK(percorso: string): Promise<void> {
  await ReactNativeBlobUtil.android.actionViewIntent(
    percorso,
    'application/vnd.android.package-archive',
  );
}

/**
 * v4.100: l'orchestrazione completa chiamata dal pannello. Se l'APK
 * per questa release e' gia' in cache lo riusa (installer subito),
 * altrimenti scarica (con percentuale) e poi apre l'installer. Se una
 * parte fallisce l'errore sale al chiamante: il pannello passa a
 * "Riprova" e, come ultima spiaggia, resta il download dal browser.
 */
export async function eseguiAggiornamento(
  verso: string,
  onProgress?: (percento: number) => void,
): Promise<void> {
  const giaPronto = await leggiApkPronto(verso);
  if (giaPronto) {
    await apriInstallerAPK(giaPronto);
    return;
  }
  const percorso = await scaricaAggiornamentoAPK(onProgress);
  try {
    await AsyncStorage.setItem(
      APK_PRONTO_KEY,
      JSON.stringify({ verso, path: percorso } satisfies ApkPronto),
    );
  } catch {
    // memoria piena: la prossima volta si riscarica, nulla si rompe
  }
  await apriInstallerAPK(percorso);
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const rel = await trovaUltimaRelease();
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
 * v4.93: ritorna anche la versione trovata (`latest`) per il pannello.
 *
 * v4.100: il filtro dell'ack e' RIMOSSO: finche' la release proposta
 * e' piu' nuova dell'app installata, `daFare` resta true a ogni
 * avvio. Se il cliente annulla l'installer, l'aggiornamento si
 * ripresenta al prossimo avvio: tutti devono finire sull'ultima
 * versione. (Le vecchie voci pfc-update-ack-v1 restano in storage
 * ma non vengono piu' lette: nessun danno.)
 *
 * v4.104: parametro `saltaCache`. Al RITORNO sull'app (App.tsx) la
 * cache si SALTA e si chiede la versione VERA: con i soli freni da 10
 * minuti (soglia + cache) riaprendo l'app prima dei dieci minuti il
 * controllo non partiva affatto e la release nuova restava invisibile
 * - la prova dal vivo e' andata vuota proprio cosi'. La via del file
 * (versione.txt) non ha il tetto di richieste dell'API, quindi si puo'
 * permettere un controllo a ogni riapertura vera; il freno contro i
 * passaggi rapidi app/schermo e' il timer di 60 secondi in App.tsx.
 * All'AVVIO la cache resta (zero rumore col bootstrap, riaperture
 * ravvicinate non chiedono nulla).
 */
export async function aggiornamentoDisponibileAllAvvio(
  saltaCache = false,
): Promise<{
  daFare: boolean;
  latest: string | null;
}> {
  let disponibile = false;
  let latest: string | null = null;

  if (!saltaCache) {
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
  }

  // Cache assente, scaduta, di un'altra versione o SALTATA (v4.104):
  // chiedi a GitHub.
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

  // v4.100: nessun filtro "gia' chiesto": se c'e' una release piu'
  // nuova dell'app installata, il pannello riparte. Da qui il "fa
  // tutto da solo": annullare l'installer non disarma l'aggiornamento.
  return { daFare: disponibile, latest };
}

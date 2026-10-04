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
 *  col codice, non col build (segue il versionCode: 490 = versionCode
 *  90). Unica fonte: la tacca di versione, ora in Impostazioni. */
export const CODICE_INTERFACCIA = 490;

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
  void Linking.openURL(APK_URL);
}

// Cache del controllo (anti-martello sulla API di GitHub): se abbiamo
// gia' controllato negli ultimi 10 minuti riusiamo il risultato, cosi'
// riaperture ravvicinate dell'app non fanno richieste a ripetizione.
// v4.88: chiave nuova per ignorare le vecchie cache che dicevano
// "aggiornamento disponibile" per colpa della versione letta male.
const CACHE_KEY = 'pfc-update-check-v2';
const CACHE_MS = 10 * 60 * 1000;

interface CacheControllo {
  t: number;
  disponibile: boolean;
}

/**
 * Controllo all'avvio (v4.86): true se su GitHub esiste una versione
 * piu' recente della propria. Con cache di 10 minuti contro richieste
 * ravvicinate. Silenzioso: qualsiasi errore (rete assente, GitHub
 * giu', storage illeggibile) vale false e non rompe nulla; si riprova
 * al prossimo avvio.
 */
export async function aggiornamentoDisponibileAllAvvio(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const cache = JSON.parse(raw) as Partial<CacheControllo> | null;
      if (
        cache &&
        typeof cache.t === 'number' &&
        typeof cache.disponibile === 'boolean' &&
        Date.now() - cache.t < CACHE_MS
      ) {
        return cache.disponibile;
      }
    }
  } catch {
    // cache illeggibile: prosegui col controllo di rete
  }
  try {
    const res = await checkForUpdates();
    const disponibile = res.status === 'available';
    try {
      const cache: CacheControllo = { t: Date.now(), disponibile };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // storage indisponibile: non blocca il risultato
    }
    return disponibile;
  } catch {
    return false;
  }
}

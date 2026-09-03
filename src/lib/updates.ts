/**
 * Controllo aggiornamenti app tramite GitHub Releases.
 *
 * La CI pubblica ogni build APK su una release con tag "latest-apk"
 * e scrive la versione nel body come "**Versione:** X.Y.Z".
 * L'app confronta quella versione con la propria e, se esce una
 * nuova build, propone di aprire la pagina delle release su GitHub.
 */
import { Linking } from 'react-native';
import Constants from 'expo-constants';

export const GITHUB_REPO = 'riccardofreddi/portale-pfc-rn';

const RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/latest-apk`;
const RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPO}/releases`;

/** Versione corrente dell'app (da app.json / build nativa). */
export const APP_VERSION: string =
  Constants.expoConfig?.version ?? Constants.nativeApplicationVersion ?? '1.0.0';

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

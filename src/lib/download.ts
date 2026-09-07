/**
 * Helper di download e apertura file (v3.7).
 * - scaricaInDownload: salva il file nella cartella Download del telefono
 * - avvisaSistemaScaricato: registra il file nel sistema Android e manda
 *   la NOTIFICA DI SISTEMA "Download completato" nella barra di stato
 *   (dove c'e' l'orologio), come per tutti i download del telefono. La
 *   notifica mostra il nome del file e toccandola il file si apre; il
 *   file risulta anche nell'app File del telefono, sezione Download.
 * - scaricaInCache: copia il file in una cartella temporanea (per aprirlo
 *   dentro l'app, es. anteprima PDF) riusando quello gia' scaricato
 * - apriConApp: apre un file con l'app adeguata del telefono
 *
 * Tutti i download controllano lo stato HTTP: se la sessione e' scaduta
 * restituiscono un errore CHIARO invece di salvare una pagina di errore
 * come se fosse il file. Inoltre usano sempre un nome file sicuro
 * (senza cartelle o caratteri vietati): prima i file dentro le
 * sottocartelle non si scaricavano affatto.
 */
import ReactNativeBlobUtil from 'react-native-blob-util';
import { api } from '@/api/client';

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  txt: 'text/plain',
  csv: 'text/csv',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
};

/** Tipo MIME per aprire il file con l'app giusta. */
export function tipoMime(nome: string): string {
  const ext = nome.split('.').pop()?.toLowerCase() ?? '';
  return MIME[ext] ?? 'application/octet-stream';
}

/** Nome file sicuro: solo il nome base, senza percorsi o caratteri vietati. */
export function nomeFileSicuro(nome: string): string {
  const base = nome.split('/').pop() ?? nome;
  const pulito = base.replace(/[\\:*?"<>|]/g, '_').trim();
  return pulito || 'documento';
}

async function fetchConControllo(
  url: string,
  cookie: string,
  path: string,
  onProgress?: (percento: number) => void,
): Promise<string> {
  const task = ReactNativeBlobUtil.config({ path, fileCache: true }).fetch('GET', url, {
    Cookie: cookie,
  });
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
  if (status === 401 || status === 403) {
    await ReactNativeBlobUtil.fs.unlink(path).catch(() => {});
    throw new Error("Sessione scaduta: rientra nell'app e riprova");
  }
  if (status < 200 || status >= 300) {
    await ReactNativeBlobUtil.fs.unlink(path).catch(() => {});
    throw new Error(`Errore del server (HTTP ${status})`);
  }
  return res.path();
}

/**
 * Registra il file nel sistema Android e manda la notifica di sistema
 * "Download completato" nella barra di stato (dove c'e' l'orologio),
 * come per tutti i download del telefono. La notifica mostra il nome
 * del file; toccandola il file si apre e il file risulta anche nell'app
 * File del telefono, sezione Download. Nessuna altra notifica: l'app
 * non ne manda di proprie (v3.7). Usa il DownloadManager di Android
 * (stesso meccanismo del browser): il modulo nativo e' gia' dentro
 * l'app, non serve ricostruire nulla. Se qualche telefono rifiuta,
 * non e' un errore: ritorna false e il download resta valido.
 */
export async function avvisaSistemaScaricato(
  path: string,
  nome: string,
): Promise<boolean> {
  try {
    await ReactNativeBlobUtil.android.addCompleteDownload({
      title: 'Download completato',
      description: nomeFileSicuro(nome),
      mime: tipoMime(nome),
      path,
      showNotification: true,
    });
    return true;
  } catch {
    return false;
  }
}

/** Scarica il file nella cartella Download del telefono. Ritorna il percorso. */
export async function scaricaInDownload(
  key: string,
  nome: string,
  onProgress?: (percento: number) => void,
): Promise<string> {
  const cookie = await api.documenti.sessionCookieHeader();
  const url = api.documenti.downloadUrl(key);
  const path = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${nomeFileSicuro(nome)}`;
  const salvato = await fetchConControllo(url, cookie, path, onProgress);
  // v3.7: la notifica di sistema "Download completato" in alto + file
  // registrato nell'app File del telefono (sezione Download). Mai un
  // errore in piu': se il sistema rifiuta si prosegue come prima.
  await avvisaSistemaScaricato(salvato, nome);
  return salvato;
}

/**
 * Copia il file in cache (nome stabile: se gia' presente non lo riscarica).
 * Usa l'URL di anteprima, che segna anche il documento come "visto".
 */
export async function scaricaInCache(key: string): Promise<string> {
  const cookie = await api.documenti.sessionCookieHeader();
  const nomeCache = `pfc_${key}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${nomeCache}`;
  const giaPresente = await ReactNativeBlobUtil.fs.exists(path).catch(() => false);
  if (giaPresente) return path;
  const url = api.documenti.previewUrl(key);
  return fetchConControllo(url, cookie, path);
}

/** Apre un file locale con l'app adeguata del telefono. Ritorna true se ok. */
export async function apriConApp(path: string, nome: string): Promise<boolean> {
  try {
    await ReactNativeBlobUtil.android.actionViewIntent(path, tipoMime(nome));
    return true;
  } catch {
    return false;
  }
}

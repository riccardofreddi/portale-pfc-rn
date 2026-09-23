/**
 * Helper di download e apertura file (v3.7, riparazione v4.17).
 * - scaricaInDownload: salva il file nella cartella Download del telefono
 * - avvisaSistemaScaricato: registra il file nel sistema Android e manda
 *   la NOTIFICA DI SISTEMA "Download completato" nella barra di stato
 *   (dove c'e' l'orologio), come per tutti i download del telefono.
 *   v4.16: il TITOLO della notifica e' il NOME DEL FILE (prima era la
 *   scritta generica "Download completato", e Android usava quella come
 *   nome visibile del file: il cliente non capiva quale documento fosse).
 * - scaricaInCache: copia il file in una cartella temporanea (per aprirlo
 *   dentro l'app, es. anteprima PDF) riusando quello gia' scaricato
 * - scaricaInCacheConRiparazione + riparaChiaveMorta (v4.17): se un file
 *   non esiste piu' al suo percorso (404: spostato, rinominato o
 *   ricaricato nello studio) l'app lo CERCA a GRADI — ancora al suo
 *   posto (riprova), con lo stesso nome, con un nome simile — apre
 *   quello vivo e, se era un preferito, SPOSTA la stellina sul
 *   percorso nuovo: i preferiti si aggiustano da soli, senza errori.
 * - apriConApp: apre un file con l'app adeguata del telefono
 *
 * Tutti i download controllano lo stato HTTP: se la sessione e' scaduta
 * restituiscono un errore CHIARO invece di salvare una pagina di errore
 * come se fosse il file. Inoltre usano sempre un nome file sicuro
 * (senza cartelle o caratteri vietati): prima i file dentro le
 * sottocartelle non si scaricavano affatto.
 */
import { DeviceEventEmitter } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { api } from '@/api/client';
import type { SearchResult } from '@/types/api';

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
    // v4.16: il titolo della notifica e il nome mostrato dall'app File
    // di Android sono il NOME VERO del file (prima c'era la scritta
    // generica "Download completato" e il file si apriva chiamandosi
    // cosi': impossibile capire quale documento fosse). La descrizione
    // resta breve e fissa, come la firma dell'app.
    await ReactNativeBlobUtil.android.addCompleteDownload({
      title: nomeFileSicuro(nome),
      description: 'Scaricato dal Portale PFC',
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
 * Copia il file in cache per l'anteprima.
 *
 * v4.72 - FIX "l'anteprima mi apre sempre il vecchio file": prima la copia
 * locale si chiamava solo pfc_<key> e veniva riusata PER SEMPRE se esisteva.
 * Ma il Cassetto riusa la STESSA chiave per lo stesso tipo nello stesso anno
 * (es. iban_2026.pdf: cancelli e ricarichi = chiave identica), quindi dopo
 * un Elimina + nuovo caricamento l'anteprima continuava a mostrare il file
 * VECCHIO benché il server avesse gia' il nuovo (e "Scarica" invece era
 * sempre giusto, perché scarica fresco ogni volta). Ora la copia in cache
 * porta nella parte finale del nome la VERSIONE del file (il suo
 * lastModified, che cambia a ogni ricaricamento): file nuovo = nome cache
 * nuovo = riscaricato fresco. Le vecchie copie restano in cache ma non
 * vengono più usate (nessun rischio, nessuna pulizia necessaria).
 * Usa l'URL di anteprima, che segna anche il documento come "visto".
 */
export async function scaricaInCache(
  key: string,
  versione?: string | number | null,
): Promise<string> {
  const cookie = await api.documenti.sessionCookieHeader();
  const suffisso = versione !== undefined && versione !== null ? `_${versione}` : '';
  const nomeCache = `pfc_${key}${suffisso}`.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${nomeCache}`;
  const giaPresente = await ReactNativeBlobUtil.fs.exists(path).catch(() => false);
  if (giaPresente) return path;
  const url = api.documenti.previewUrl(key);
  return fetchConControllo(url, cookie, path);
}

/**
 * v4.72: scarica un file di TESTO dal server e ne ritorna il contenuto.
 * Serve alla scheda IBAN scritto a mano (che ora vive sul server come un
 * piccolo file .txt, esattamente come gli altri documenti del Cassetto):
 * stessa sessione, stessi controlli HTTP, stessa cache a versioni di
 * scaricaInCache (la rilettura dopo una modifica e' sempre fresca).
 */
export async function scaricaTesto(
  key: string,
  versione?: string | number | null,
): Promise<string> {
  const percorso = await scaricaInCache(key, versione);
  return ReactNativeBlobUtil.fs.readFile(percorso, 'utf8');
}

/* ============================================================
 * v4.17 — Auto-riparazione dei file "smarriti" (404), a 3 livelli
 *
 * Il server conserva i preferiti con il percorso del file COM'ERA
 * quando l'hai aggiunto. Se lo studio sposta, rinomina o ricarica
 * il documento, il percorso vecchio non esiste piu' e il server
 * risponde 404. La cura procede per GRADI, finche' qualcosa funziona:
 *  1) STESSA CHIAVE: la ricerca trova il file ancora al suo posto
 *     (il 404 era un inciampo momentaneo del server) => si riprova
 *     subito la stessa chiave;
 *  2) NOME ESATTO: il file vive in un'altra cartella con lo stesso
 *     nome => si apre quello e, se era un preferito, la stellina
 *     si sposta sul percorso nuovo;
 *  3) NOME SIMILE: il nome e' cambiato un po' (la ricerca del server
 *     accosta i pezzi del nome) => si apre il migliore e un avviso
 *     dice chiaramente quale file e' stato aperto.
 * Solo se il file e' davvero sparito da ogni angolo dell'archivio
 * compare la schermata "Documento non trovato" con i comandi per
 * cercarlo nella ricerca e toglierlo dai preferiti.
 * ============================================================ */

/** Esito della riparazione: la chiave viva trovata (null se il file
 * e' sparito), il grado con cui l'abbiamo trovata, se la chiave
 * morta era tra i preferiti (per il tasto "Rimuovi dai preferiti")
 * e se la ricerca ha risposto (se NO non sappiamo se il file esiste:
 * niente schermata "smarrito", meglio il classico Riprova). */
export interface EsitoRiparazione {
  chiave: string | null;
  tipo: 'stessa' | 'esatta' | 'simile' | null;
  eraPreferito: boolean;
  ricercaOk?: boolean;
}

/** Sceglie il file vivo da usare al posto di una chiave morta (404).
 * Funzione PURA (facile da testare), a gradi:
 *  - 'stessa': la ricerca ha trovato il file ANCORA al suo percorso
 *    (il 404 era momentaneo) => vale la pena riprovare quello;
 *  - 'esatta': stesso nome (a meno di maiuscole/spazi), prima nello
 *    STESSO ANNO (se il file e' stato spostato dentro l'anno e'
 *    quasi sicuro quello);
 *  - 'simile': nessun nome identico: la ricerca del server ha GIA'
 *    accoppiato i pezzi del nome, prendo il miglior risultato
 *    (stesso anno prima, poi punteggio della ricerca). */
export function sceglieChiaveViva(
  chiaveMorta: string,
  nome: string,
  risultati: SearchResult[],
): { chiave: string; tipo: 'stessa' | 'esatta' | 'simile' } | null {
  // Grado 1: il file esiste ANCORA al suo posto (la ricerca elenca
  // gli oggetti vivi di R2): si riprova la stessa chiave.
  if (risultati.some((r) => r.key === chiaveMorta)) {
    return { chiave: chiaveMorta, tipo: 'stessa' };
  }
  // Anno della chiave morta: Documenti/<utente>/<anno>/...
  const pezzi = chiaveMorta.split('/');
  const annoMorto = pezzi.length >= 3 ? pezzi[2] : '';
  const stessoAnno = (k: string): boolean => {
    const p = k.split('/');
    return p.length >= 3 && p[2] === annoMorto;
  };
  // Grado 2: nome ESATTO (a meno di maiuscole e spazi ai lati).
  const nomeBasso = nome.trim().toLowerCase();
  const esatti = risultati.filter(
    (r) => (r.nome ?? '').trim().toLowerCase() === nomeBasso,
  );
  if (esatti.length > 0) {
    const stessoAnnoPrima = esatti.filter((r) => stessoAnno(r.key));
    const lista = stessoAnnoPrima.length > 0 ? stessoAnnoPrima : esatti;
    return { chiave: lista[0]!.key, tipo: 'esatta' };
  }
  // Grado 3: nome SIMILE (la ricerca accosta i pezzi del nome):
  // stesso anno prima, poi l'ordine di punteggio gia' dato dal server.
  if (risultati.length > 0) {
    const stessoAnnoPrima = risultati.filter((r) => stessoAnno(r.key));
    const lista = stessoAnnoPrima.length > 0 ? stessoAnnoPrima : risultati;
    return { chiave: lista[0]!.key, tipo: 'simile' };
  }
  return null;
}

/** Cerca il file vivo che sostituisce una chiave morta (404) e, se era
 * un preferito, SPOSTA la stellina sulla chiave nuova (solo se cambia
 * davvero: se il file e' ancora al suo posto non si tocca nulla).
 * Ritorna l'esito completo; chiave null = file sparito ovunque. */
export async function riparaChiaveMorta(
  chiaveMorta: string,
  nome: string,
): Promise<EsitoRiparazione> {
  let risultati: SearchResult[] = [];
  let eraPreferito = false;
  try {
    // Ricerca e lista preferiti in parallelo: la lista serve a sapere
    // se la stellina va spostata (e per il tasto "Rimuovi dai preferiti").
    const [res, prefs] = await Promise.all([
      api.ricerca.search(nome),
      api.preferiti.list().catch(() => null),
    ]);
    risultati = res.results ?? [];
    eraPreferito = prefs?.preferiti?.includes(chiaveMorta) ?? false;
  } catch {
    // rete giu' o sessione scaduta: la ricerca non ha risposto, quindi
    // NON sappiamo se il file esiste ancora: ricercaOk=false lo dice a
    // scaricaInCacheConRiparazione, che ripropone l'errore originale.
    return { chiave: null, tipo: null, eraPreferito: false, ricercaOk: false };
  }
  const trovato = sceglieChiaveViva(chiaveMorta, nome, risultati);
  if (!trovato) return { chiave: null, tipo: null, eraPreferito, ricercaOk: true };
  // Se la chiave morta era un preferito e il percorso e' CAMBIATO,
  // sposto la stellina sul file vivo.
  if (eraPreferito && trovato.chiave !== chiaveMorta) {
    try {
      await api.preferiti.toggle(chiaveMorta); // via il morto
      await api.preferiti.toggle(trovato.chiave); // aggiunto il vivo
      // Archivio ricarica il conteggio e la lista dei preferiti.
      DeviceEventEmitter.emit('pfc-preferiti-riparati', {
        chiaveMorta,
        chiaveViva: trovato.chiave,
      });
    } catch {
      // La stellina si sistema al prossimo giro: l'apertura non si blocca.
    }
  }
  return { chiave: trovato.chiave, tipo: trovato.tipo, eraPreferito, ricercaOk: true };
}

/** scaricaInCache con riparazione automatica a gradi: se il file non
 * esiste piu' al suo percorso (404) lo CERCA nell'archivio e scarica
 * QUELLO. Ritorna anche la chiave effettivamente usata, se c'e' stata
 * una riparazione e il suo grado (per dire all'utente cosa e' stato
 * aperto). Se il file e' sparito ovunque l'errore e' CHIARO e porta
 * i flag (smarrito/eraPreferito) per la schermata di aiuto.
 * v4.72: `versione` (lastModified del file) rende la cache sempre fresca
 * quando il file viene ricaricato con la stessa chiave (Cassetto). */
export async function scaricaInCacheConRiparazione(
  key: string,
  nome: string,
  versione?: string | number | null,
): Promise<{
  percorso: string;
  key: string;
  riparato: boolean;
  tipoRiparazione?: 'stessa' | 'esatta' | 'simile';
}> {
  try {
    const percorso = await scaricaInCache(key, versione);
    return { percorso, key, riparato: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (!/HTTP 404/.test(msg)) throw err; // altri errori: passthrough
    const esito = await riparaChiaveMorta(key, nome);
    if (!esito.chiave) {
      // Ricerca senza risposta (rete giu'): non sappiamo niente di piu',
      // ripropone l'errore originale col suo Riprova (puo' funzionare).
      if (!esito.ricercaOk) throw err;
      // Il file non c'e' piu' da nessuna parte: errore CHIARO (niente
      // "HTTP 404" criptico) con i flag per la schermata di aiuto.
      const chiaro = new Error(
        'Documento non più presente nell\'archivio: lo studio lo ha spostato o eliminato.',
      ) as Error & { smarrito?: boolean; eraPreferito?: boolean };
      chiaro.smarrito = true;
      chiaro.eraPreferito = esito.eraPreferito;
      throw chiaro;
    }
    if (esito.tipo === 'stessa') {
      // Grado 1: il file e' ANCORA al suo posto, il 404 era momentaneo:
      // si riprova la stessa chiave, senza toccare la stellina.
      const percorso = await scaricaInCache(key, versione);
      return { percorso, key, riparato: false, tipoRiparazione: 'stessa' };
    }
    // Gradi 2-3: il file vive altrove (o con nome un po' diverso).
    const percorso = await scaricaInCache(esito.chiave, versione);
    return {
      percorso,
      key: esito.chiave,
      riparato: true,
      tipoRiparazione: esito.tipo ?? undefined,
    };
  }
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

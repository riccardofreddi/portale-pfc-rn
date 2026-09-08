/**
 * Deep-link parser per URL notifiche.
 *
 * Formati URL gestiti (compatibili con il backend v2):
 *   /                              → home (no navigazione specifica)
 *   /?tab=messaggi                 → tab Messaggi
 *   /?tab=archivio                 → tab Archivio
 *   /?tab=archivio&anno=2024       → tab Archivio + anno selezionato
 *   /?tab=archivio&anno=2024&cartella=F24  → tab Archivio + anno + cartella
 *   /?tab=archivio&anno=2024&cartella=F24&documento=F24.pdf
 *                                  → tab Archivio + cartella + FILE APERTO (v4.6)
 *   /?tab=cassetto                 → tab Cassetto
 *   /?tab=attivita                 → tab Attività
 *
 * v4.6: il campo documento contiene il nome del file DENTRO la cartella
 * (uguale a come l'Archivio elenca i file: "nome.pdf" o "Sotto/nome.pdf"
 * per le sottocartelle). Arriva dai promemoria locali di scadenza e dalle
 * righe della campanella; per le push del server che non lo portano lo
 * ricava da solo il risolutore in AppNavigator (vedi resolveScadenza).
 */

import type { ClienteTab } from '@/store/auth';

export interface DeepLinkTarget {
  tab?: ClienteTab;
  anno?: string;
  cartella?: string;
  /** v4.6: nome del file da aprire dentro anno/cartella (deep-link al documento). */
  documento?: string;
  /** v4.6: la notifica riguarda una scadenza (serve al risolutore del file). */
  origineScadenza?: boolean;
  /** Se true, apri anche il pannello notifiche */
  openNotifiche?: boolean;
}

export function parseDeepLink(url: string | undefined | null): DeepLinkTarget | null {
  if (!url || url === '/' || url === '') return null;

  try {
    // Gestisce sia URL assoluti che path relativi
    const urlObj = url.startsWith('http')
      ? new URL(url)
      : new URL(url, 'https://placeholder.com');
    const params = urlObj.searchParams;

    const tab = params.get('tab') as ClienteTab | null;
    const anno = params.get('anno') ?? undefined;
    const cartella = params.get('cartella') ?? undefined;
    const documento = params.get('documento') ?? undefined;
    const openNotif = params.get('notif') === '1';

    if (!tab && !anno && !cartella && !documento && !openNotif) return null;

    return {
      tab: tab ?? undefined,
      anno,
      cartella,
      documento,
      openNotifiche: openNotif,
    };
  } catch {
    return null;
  }
}

/**
 * v4.6: da un percorso file completo del backend ("Documenti/<utente>/<anno>/
 * <cartella>[/<sottocartella>]/<file>") estrae anno, cartella e documento
 * per il deep-link all'Archivio. Il "documento" è tutto ciò che viene dopo
 * anno/cartella: l'Archivio elenca i file delle sottocartelle proprio come
 * "Sotto/file.pdf", quindi il match resta esatto anche con le sottocartelle.
 * Ritorna null se il percorso non è riconoscibile.
 */
export function partiFilePath(
  filePath: string,
): { anno: string; cartella: string; documento: string } | null {
  const parti = filePath.split('/');
  // [0]=Documenti [1]=<utente> [2]=<anno> [3]=<cartella> [4..]=file(+sottocartelle)
  const anno = parti[2];
  const cartella = parti[3];
  const documento = parti.slice(4).join('/');
  if (!anno || !cartella || !documento) return null;
  return { anno, cartella, documento };
}

/**
 * v4.6: tra le scadenze del cliente sceglie il documento da aprire per una
 * notifica che porta solo anno+cartella (le push scadenza del server). La
 * scelta cade sulla scadenza NON pagata piu' vicina in quella cartella:
 * e' quella che ha generato l'avviso. Ritorna il nome del documento
 * (es. "F24.pdf" o "Sotto/F24.pdf") oppure null se non trova niente di
 * utile (in quel caso l'app resta sulla cartella, che e' comunque utile).
 *
 * Nota: le date sono stringhe ISO ("2026-09-15T00:00:00.000Z"): l'ordine
 * alfabetico coincide con l'ordine cronologico, quindi basta sort().
 */
export function scegliScadenza(
  scadenze: Array<{
    filePath: string;
    pagata: boolean;
    dataScadenza: string;
  }>,
  anno: string,
  cartella: string,
): string | null {
  const inCartella = scadenze
    .filter((s) => {
      if (s.pagata) return false;
      const parti = partiFilePath(s.filePath);
      return parti?.anno === anno && parti?.cartella === cartella;
    })
    .sort((a, b) => a.dataScadenza.localeCompare(b.dataScadenza));
  const prima = inCartella[0];
  if (!prima) return null;
  return partiFilePath(prima.filePath)?.documento ?? null;
}

/**
 * v4.7: dallo stato (annidato) del navigatore ricava il nome della schermata
 * VISIBILE, scendendo stack -> tab finché c'e' uno stato interno. Serve al
 * mirror "navigatore -> store" di AppNavigator: l'app cosi' sa sempre in che
 * tab si trova davvero l'utente, anche quando cambia tab a mano dalla barra
 * in basso (regola "sei gia' in Messaggi = letto" e badge sempre coerenti).
 *
 * La forma e' minima di proposito (index + routes con nome e stato opzionale):
 * funziona con qualsiasi versione di React Navigation e resta facile da
 * testare fuori dall'app.
 */
export function schermataVisibile(
  stato:
    | {
        index: number;
        routes: ReadonlyArray<{ name: string; state?: unknown }>;
      }
    | undefined
    | null,
): string | undefined {
  if (!stato) return undefined;
  let corrente = stato;
  for (;;) {
    const attiva = corrente.routes[corrente.index];
    const interno = attiva?.state as
      | { index: number; routes: ReadonlyArray<{ name: string; state?: unknown }> }
      | undefined
      | null;
    if (!interno) return attiva?.name;
    corrente = interno;
  }
}
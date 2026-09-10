/**
 * Promemoria scadenze LOCALI (v4.3) — la rete di sicurezza che NON dipende
 * dal server.
 *
 * IL PROBLEMA RISOLTO:
 * finora gli avvisi di scadenza partivano SOLO dal server (cron notturno
 * di Vercel alle 02:07 o quando lo studio carica il documento). La
 * diagnostica reale (database di produzione, settembre 2026) ha mostrato
 * che:
 *   1. il cron notturno NON riesce a autenticarsi (CRON_SECRET mancante
 *      su Vercel: la route risponde 401 a ogni esecuzione) -> le push
 *      notturne non sono MAI partite;
 *   2. anche se partissero, il telefono a quell'ora e' in "riposo
 *      profondo" (Doze) e spesso non le mostra;
 *   3. il server segna la push "inviata" al PRIMO tentativo e non
 *      ritenta mai piu': una push persa e' persa per sempre.
 * Risultato: con l'app APERTA gli avvisi arrivano (per questo "dentro
 * app funziona"), a app CHIUSA mai.
 *
 * LA SOLUZIONE (questo modulo):
 * l'app SCARICA le sue scadenze imminenti e le SCHEDULA nell'orologio
 * interno di Android (Alarm Manager con allarmi esatti). Gli orologi
 * interni scattano da soli anche se l'app resta chiusa per giorni:
 * Android li tiene vivi per noi (sopravvivono anche al riavvio del
 * telefono, permesso RECEIVE_BOOT_COMPLETED gia' incluso).
 *
 * Come funziona:
 * - a ogni avvio dell'app e quando l'utente torna sull'app, chiamiamo
 *   aggiornaPromemoriaScadenze() (vedi App.tsx);
 * - cancelliamo i promemoria vecchi e ricreiamo quelli attuali: se una
 *   scadenza e' stata PAGATA il suo promemoria sparisce, se ne e'
 *   arrivata una nuova viene aggiunta;
 * - ogni promemoria scatta alle 08:30 del GIORNO della scadenza con il
 *   testo "Scade OGGI: ...", il momento piu' importante;
 * - se quel momento e' gia' passato (es. l'utente apre l'app alle 10
 *   del giorno di scadenza e nessun promemoria era ancora partito)
 *   mostriamo l'avviso SUBITO, meglio di niente;
 * - toccando l'avviso l'app si apre SUL DOCUMENTO in scadenza (v4.6:
 *   cartella + anteprima del file; prima solo la cartella).
 *
 * Sicurezza: identica al resto delle notifiche (gate v3.4: se i 12 pezzi
 * nativi non ci sono, non si carica niente e non compare nessun errore;
 * nessuna chiamata lancia eccezioni non gestite).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/api/client';
import {
  caricaModuloNotifiche,
  preparaNotifiche,
} from '@/lib/notifiche';
import { partiFilePath } from '@/lib/deeplink';

/** Prefisso dell'identificativo dei promemoria scadenze (per cancellarli). */
const PREFISSO_ID = 'pfc-scad-';

/**
 * v4.12 — Interruttore dei promemoria (l'interuttore nelle Impostazioni).
 * La scelta resta SUL TELEFONO (AsyncStorage, chiave dedicata): nessuna
 * modifica al server. Default = ATTIVO, cioe' esattamente il comportamento
 * di sempre per chi non tocca nulla.
 */
const CHIAVE_ATTIVO = '@pfc/promemoria-scadenze-attivi';
let cacheAttivo: boolean | null = null;

/** Legge l'interruttore (default ATTIVO se mai toccato o se lo storage fallisce). */
export async function promemoriaAttivi(): Promise<boolean> {
  if (cacheAttivo !== null) return cacheAttivo;
  try {
    const valore = await AsyncStorage.getItem(CHIAVE_ATTIVO);
    cacheAttivo = valore !== '0';
  } catch {
    cacheAttivo = true;
  }
  return cacheAttivo;
}

/** Salva l'interruttore e applicalo SUBITO (la prossima sincronizzazione esegue). */
export async function setPromemoriaAttivi(attivo: boolean): Promise<void> {
  cacheAttivo = attivo;
  try {
    await AsyncStorage.setItem(CHIAVE_ATTIVO, attivo ? '1' : '0');
  } catch {
    // storage non disponibile: resta valido finche' l'app e' aperta
  }
}

/** Canale degli avvisi del portale (creato da preparaNotifiche, importanza alta). */
const CANALE = 'pfc-alerts-v2';

/** Ora del promemoria mattutino: 08:30 del giorno di scadenza. */
const ORA_PROMEMORIA = 8;
const MINUTI_PROMEMORIA = 30;

/**
 * Estrae anno, cartella e DOCUMENTO dal percorso del file
 * ("Documenti/<utente>/<anno>/<cartella>[/<sotto>]/<file>") e costruisce
 * il deep-link all'archivio.
 *
 * v4.6: nell'URL entra anche il nome del file (&documento=...): toccando
 * il promemoria l'app ora si apre DIRETTAMENTE sul documento in scadenza
 * (anteprima PDF o app del telefono), non solo sulla cartella. Il risolutore
 * dell'Archivio riconosce il parametro e apre il file appena caricata la
 * cartella (vedi ArchivioScreen).
 */
function urlDaFilePath(filePath: string): string | undefined {
  const parti = partiFilePath(filePath);
  if (parti) {
    return (
      `/?tab=archivio&anno=${encodeURIComponent(parti.anno)}` +
      `&cartella=${encodeURIComponent(parti.cartella)}` +
      `&documento=${encodeURIComponent(parti.documento)}`
    );
  }
  // Percorso non riconoscibile: fallback alla sola cartella (come v4.3)
  const sezioni = filePath.split('/');
  const anno = sezioni[2];
  const cartella = sezioni[3];
  if (anno && cartella) {
    return `/?tab=archivio&anno=${encodeURIComponent(anno)}&cartella=${encodeURIComponent(cartella)}`;
  }
  return undefined;
}

/** Converte una data ISO in Date; null se non valida. */
function dataDaIso(iso: string): Date | null {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Sincronizza i promemoria scadenze con lo stato del server.
 * Ritorna il numero di promemoria schedulati (0 = niente da ricordare
 * oppure notifiche non ancora attive: in entrambi i casi nessun errore).
 */
export async function aggiornaPromemoriaScadenze(): Promise<number> {
  try {
    // Gate silenzioso + permessi + canale (idempotente).
    const Notifications = await caricaModuloNotifiche();
    if (!Notifications) return 0;
    if (!(await preparaNotifiche())) return 0;

    // v4.12 — Se l'interruttore nelle Impostazioni e' SPENTO: cancella i
    // promemoria gia' in orologio e non schedularne di nuovi. Cosi' lo
    // spegnimento ha effetto IMMEDIATO (non aspetta la prossima apertura).
    if (!(await promemoriaAttivi())) {
      const presenti = await Notifications.getAllScheduledNotificationsAsync();
      for (const notifica of presenti) {
        if (notifica.identifier.startsWith(PREFISSO_ID)) {
          await Notifications.cancelScheduledNotificationAsync(notifica.identifier).catch(
            () => {},
          );
        }
      }
      console.log('[SCADENZE-LOCALI] promemoria SPENTI da Impostazioni: 0 schedulati');
      return 0;
    }

    // 1) Scarichiamo PRIMA le scadenze imminenti dal server: solo se la
    //    lettura riesce tocchiamo i promemoria gia' schedulati (v4.4).
    //    Prima era il contrario: si cancellava tutto e POI si chiedeva la
    //    lista; se la lettura falliva (rete giu', sessione chiusa) i
    //    promemoria restavano cancellati e persi. Cosi' un problema di
    //    rete NON tocca i promemoria gia' in orologio.
    const { scadenze } = await api.scadenze.list();

    // 2) Cancelliamo TUTTI i vecchi promemoria scadenze: la
    // rischedulazione pulita e' la garantia che una scadenza pagata
    // sparisce subito dai promemoria.
    const giaSchedulati = await Notifications.getAllScheduledNotificationsAsync();
    for (const notifica of giaSchedulati) {
      if (notifica.identifier.startsWith(PREFISSO_ID)) {
        await Notifications.cancelScheduledNotificationAsync(notifica.identifier).catch(
          () => {},
        );
      }
    }

    // 3) Un promemoria per scadenza: alle 08:30 del giorno stesso.
    const adesso = new Date();
    let numero = 0;
    for (const scadenza of scadenze) {
      if (scadenza.pagata) continue;
      const scade = dataDaIso(scadenza.dataScadenza);
      if (!scade) continue;

      const quando = new Date(
        scade.getFullYear(),
        scade.getMonth(),
        scade.getDate(),
        ORA_PROMEMORIA,
        MINUTI_PROMEMORIA,
        0,
        0,
      );

      const url = urlDaFilePath(scadenza.filePath);
      const dati = url ? { url } : {};
      const contenuto = {
        title: '⏰ Scadenza oggi',
        body: `"${scadenza.titolo}" scade OGGI (${scade.toLocaleDateString('it-IT')}). Aprilo dall'archivio.`,
        data: dati,
      };
      const identifier = PREFISSO_ID + scadenza.id;

      if (quando.getTime() > adesso.getTime()) {
        // Caso normale: promemoria programmato alle 08:30 del giorno
        // di scadenza (allarme esatto di Android: arriva anche a app
        // chiusa, schermo spento e telefono in risparmio energetico).
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: contenuto,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            year: quando.getFullYear(),
            month: quando.getMonth() + 1,
            day: quando.getDate(),
            hour: ORA_PROMEMORIA,
            minute: MINUTI_PROMEMORIA,
            channelId: CANALE,
            repeats: false,
          },
        });
        numero++;
      } else {
        // Il momento e' gia' passato ma la scadenza e' ancora valida
        // (il server non la darebbe piu' a lista dopo mezzanotte):
        // avviso SUBITO, che e' meglio di niente.
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: contenuto,
          trigger: null,
        });
        numero++;
      }
    }

    console.log('[SCADENZE-LOCALI] promemoria schedulati:', numero);
    return numero;
  } catch {
    // Qualunque problema (offline, endpoint, storage): resta tutto come
    // prima, i promemoria si aggiornano alla prossima apertura.
    return 0;
  }
}

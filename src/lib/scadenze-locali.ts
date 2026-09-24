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
 *
 * v4.57 — CONTRODOPPIONI. Questa sincronizzazione gira al login e a OGNI
 * ritorno sull'app: se le 08:30 del giorno di scadenza erano gia' passate,
 * l'avviso "SUBITO" veniva ripetuto a ogni sync (fino a 1 ogni 30 minuti,
 * per tutto il giorno: il doppione reale del 21/9/2026). Da oggi ogni
 * avviso per il giorno X viene erogato UNA SOLA VOLTA: quando programmiamo
 * la sveglia delle 08:30 (o mandiamo l'avviso immediato) lasciamo un
 * SEGNALE su AsyncStorage; le sync successive dello stesso giorno vedono
 * il segno e si fermano. Il segno resta sul telefono: ogni dispositivo
 * controlla se stesso, che e' esattamente cio' che serve (la sveglia e'
 * locale a ogni telefono).
 *
 * v4.75 — IL BUCO CHIUSO (caso reale del 24/9/2026). Il segnale v4.57 era
 * un pezzo unico: "sveglia programmata" e "avviso erogato" erano la STESSA
 * cosa. Ma Android puo' PERDERE la sveglia in risparmio batteria (Doze):
 * alle 8:30 non arriva nulla, e quando l'utente apre l'app la sync vede
 * "sveglia programmata" e tace: silenzio totale per tutto il giorno, senza
 * nessuna via di recupero. Da oggi i due stati sono SEPARATI:
 *   - ARMATO  = la sveglia delle 08:30 e' stata programmata (speriamo);
 *   - EROGATO = l'utente ha AVUTO l'avviso (sveglia visibile nel vassoio
 *     oppure avviso immediato mandato adesso).
 * Solo EROGATO blocca. Se l'app si apre dopo le 08:30 e il segnale dice
 * ARMATO ma non EROGATO, guardiamo il VASSOIO: se la notifica della sveglia
 * e' li' (l'allarme e' scattato) la lasciamo stare e segnamo erogato; se
 * NON c'e' (allarme perso) l'avviso esce SUBITO, una volta sola. Il buco
 * del 24/9 non potra' piu' ripetersi: a app aperta non esiste piu' nessun
 * percorso che finisce in silenzio.
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
 * v4.57 — Segnale "avviso gia' erogato" su AsyncStorage. Chiave = prefisso
 * + id scadenza, valore = giorno (YYYY-MM-DD locale) per cui la sveglia
 * delle 08:30 e' stata programmata oppure l'avviso immediato e' gia' stato
 * mandato. E' il controdoppione: le sync successive dello stesso giorno
 * trovano il segno e non ripetono l'avviso.
 *
 * v4.75: ora questo segnale ha significato SOLO "sveglia programmata"
 * (ARMATO). Il vero blocco anti-doppione e' PREFISSO_EROGATO, che resta
 * scritto solo quando l'utente ha AVUTO l'avviso.
 */
const PREFISSO_ARMATO = '@pfc/prom-scad-armato/';

/**
 * v4.75 — Segnale "avviso AVUTO dall'utente" su AsyncStorage. Valore =
 * giorno (YYYY-MM-DD locale) in cui l'avviso e' stato erogato (sveglia
 * trovata nel vassoio oppure avviso immediato mandato). E' l'unico stato
 * che blocca le sync successive: massimo UN avviso al giorno per scadenza,
 * ma mai piu' silenzio dopo un allarme perso.
 */
const PREFISSO_EROGATO = '@pfc/prom-scad-erogato/';

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

/** v4.57 — Giorno locale "YYYY-MM-DD" di una Date (chiave del segnale). */
function giornoIso(d: Date): string {
  const mese = String(d.getMonth() + 1).padStart(2, '0');
  const giorno = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mese}-${giorno}`;
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
      // v4.57/v4.75: chiavi dei segnali anti-doppione per QUESTA scadenza.
      const chiaveArmato = PREFISSO_ARMATO + scadenza.id;
      const chiaveErogato = PREFISSO_EROGATO + scadenza.id;
      const giorno = giornoIso(scade);

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
        // v4.57: segnala "sveglia armata per questo giorno".
        // v4.75: questo segnale NON e' piu' un blocco: se la sveglia verra'
        // persa, la rete di sicurezza del ramo qui sotto la ripara. Armiamo
        // solo se l'avviso non e' gia' stato EROGATO oggi (difensivo).
        const giaErogato = await AsyncStorage.getItem(chiaveErogato).catch(
          () => null,
        );
        if (giaErogato !== giorno) {
          await AsyncStorage.setItem(chiaveArmato, giorno).catch(() => {});
        }
        numero++;
      } else {
        // v4.75 — IL BUCO CHIUSO. Il momento e' gia' passato ma la scadenza
        // e' ancora valida (il server non la darebbe piu' a lista dopo
        // mezzanotte). Prima: un solo segnale per "programmato" ed "erogato",
        // quindi una sveglia PERSA silenziava anche l'avviso di recupero.
        // Ora:
        //   1. avviso gia' EROGATO oggi -> vero doppione, ci fermiamo;
        //   2. sveglia ARMATA e notifica ancora NEL VASSOIO -> l'allarme ha
        //      scattato e l'utente ce l'ha davanti: nessun nuovo avviso,
        //      segna erogato;
        //   3. altrimenti (allarme perso, o nessun segno) -> avviso
        //      immediato SUBITO, una volta sola, e segna erogato.
        const giaErogato = await AsyncStorage.getItem(chiaveErogato).catch(
          () => null,
        );
        if (giaErogato === giorno) {
          console.log(
            '[SCADENZE-LOCALI] avviso gia erogato oggi per',
            scadenza.titolo,
            ': salto',
          );
          continue;
        }

        // Il vassoio dice se la sveglia e' SCATTATA (notifica presente).
        // API mancante o errore = non sappiamo: comportamento sicuro,
        // l'avviso immediato esce comunque (mai piu' il silenzio totale).
        let svegliaNelVassoio = false;
        try {
          if (
            Notifications.getPresentedNotificationsAsync &&
            typeof Notifications.getPresentedNotificationsAsync === 'function'
          ) {
            const presentate = await Notifications.getPresentedNotificationsAsync();
            svegliaNelVassoio = presentate.some(
              (n: { request?: { identifier?: string } }) =>
                n?.request?.identifier === identifier,
            );
          }
        } catch {
          // Vassoio non leggibile: prosegui con l'avviso immediato.
        }

        if (svegliaNelVassoio) {
          // L'allarme e' scattato: l'avviso e' gia' davanti all'utente.
          await AsyncStorage.setItem(chiaveErogato, giorno).catch(() => {});
          console.log(
            '[SCADENZE-LOCALI] sveglia scattata nel vassoio per',
            scadenza.titolo,
            ': nessun doppione',
          );
          continue;
        }

        // Allarme perso (o mai armato): avviso immediato SUBITO.
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: contenuto,
          trigger: null,
        });
        await AsyncStorage.setItem(chiaveErogato, giorno).catch(() => {});
        numero++;
      }
    }

    // v4.57 — Pulizia dei segnali vecchi: le scadenze pagate o passate non
    // sono piu' nella lista del server, i loro segnali non servono piu'.
    // v4.75: la pulizia ora copre ENTRAMBI i segnali (armato + erogato).
    try {
      const validi = new Set(
        scadenze
          .filter((s) => !s.pagata && dataDaIso(s.dataScadenza))
          .map((s) => s.id),
      );
      const tutte = await AsyncStorage.getAllKeys();
      const daTogliere = tutte.filter((k) => {
        const id =
          k.startsWith(PREFISSO_ARMATO)
            ? k.slice(PREFISSO_ARMATO.length)
            : k.startsWith(PREFISSO_EROGATO)
              ? k.slice(PREFISSO_EROGATO.length)
              : null;
        return id !== null && !validi.has(id);
      });
      if (daTogliere.length > 0) await AsyncStorage.multiRemove(daTogliere);
    } catch {
      // Storage indisponibile: la pulizia riprovera' alla prossima sync.
    }

    console.log('[SCADENZE-LOCALI] promemoria schedulati:', numero);
    return numero;
  } catch {
    // Qualunque problema (offline, endpoint, storage): resta tutto come
    // prima, i promemoria si aggiornano alla prossima apertura.
    return 0;
  }
}

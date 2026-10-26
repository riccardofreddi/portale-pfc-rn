/**
 * Portale PFC RN — Notifiche push native (FCM). (v4.0)
 *
 * Stack:
 * - @react-native-firebase/messaging — SDK nativo Firebase, push vere (no proxy)
 * - @react-native-firebase/app — inizializzazione (legge google-services.json)
 *
 * Flusso:
 * 1. registerPushForCurrentUser() — richiesta permessi + registrazione token
 * 2. messaging().getToken() → POST /api/push/fcm (backend registra token↔user)
 * 3. onMessage (foreground) → NOTIFICA LOCALE visibile nella barra di stato
 *    (v4.0: prima il messaggio finiva solo nei log e il cliente non
 *    vedeva niente con l'app aperta)
 * 4. onNotificationOpenedApp (background tap) → navigazione alla schermata
 * 5. tocco sugli avvisi locali → stessa navigazione (deep-link)
 * 6. v4.20: il tap sulla push di un AVVISO PUBBLICO ("Nuovo avviso dallo
 *    studio") apre direttamente la Bacheca delle Comunicazioni (evento
 *    'pfc-apri-bacheca' ascoltato da AvvisiBanner)
 *
 * v4.13 — L'INTERRUTTORE "Notifiche" delle Impostazioni comanda TUTTO:
 * se è SPENTO, il telefono NON si (ri)registra al server né ora, né al
 * prossimo avvio, né quando FCM rinnova il token. Così lo spegnimento
 * resta tale finché il cliente non riaccende (prima la registrazione
 * al login avrebbe riagganciato il telefono alle notifiche ignorando
 * la scelta). L'accensione avviene dall'Impostazioni, che chiama di
 * nuovo registerPushForCurrentUser().
 *
 * v4.51 — AUTO-RIPARAZIONE SILENZIOSA: finora il token arrivava al
 * server SOLO al login o all'interruttore. Se Google rinnovava il
 * token (disinstallazione, pulizia, aggiornamento, a volte a distanza
 * di mesi) il server restava sull'indirizzo vecchio e le notifiche
 * sparivano finché il cliente non rifaceva il login. Ora l'app si
 * ri-presenta al server DA SOLA: all'avvio con sessione valida e a
 * ogni ritorno in primo piano (max 1 volta ogni 10 minuti), senza
 * mai mostrare prompt né schermate (riRegistraPushSilenziosa).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { DeviceEventEmitter, Platform } from 'react-native';
import { api } from '@/api/client';
import { parseDeepLink, type DeepLinkTarget } from '@/lib/deeplink';
import { useAppStore } from '@/store/auth';
// v4.121: entra assicuraPermessoNotifiche (il permesso è UNO per tutta
// l'app, chiesto con finestra sola e mutex condiviso — vedi notifiche.ts).
import {
  assicuraPermessoNotifiche,
  mostraAvvisoLocale,
  sulToccoNotifica,
  togliNotifica,
} from '@/lib/notifiche';
import {
  promemoriaAttivi,
  segnaPushScadenzaOggiEroga,
  segnaSvegliaVistaDaNotifica,
} from '@/lib/scadenze-locali';
import { toast } from '@/components/Toaster';

/**
 * v4.6: costruisce il deep-link target dall'url della notifica, aggiungendo
 * il marcatore "origineScadenza" quando la notifica riguarda una scadenza
 * (campo "tipo" nel data della push del server). Il risolutore dell'Archivio
 * usera' quel marcatore per individuare e aprire il FILE in scadenza: le
 * push scadenza del server portano solo anno+cartella, senza il nome file.
 */
function targetDaDati(
  url: unknown,
  tipo: unknown,
): DeepLinkTarget | null {
  const target = parseDeepLink(typeof url === 'string' ? url : undefined);
  if (!target) return null;
  // v4.76: anche la push dedicata "Scade OGGI" del server (v4.75b) porta
  // tipo 'scadenza_oggi': prima solo 'scadenza' veniva riconosciuto e il
  // tocco su quella push apriva la cartella senza risolvere il file.
  if (tipo === 'scadenza' || tipo === 'scadenza_oggi') target.origineScadenza = true;
  return target;
}

export const pushState = {
  registered: false,
  token: '',
  error: '',
};

/**
 * v4.112: DEREGISTRAZIONE PENDENTE. Prima, spegnendo le notifiche mentre il
 * telefono era OFFLINE, l'uscita dal registro del server NON avveniva (il
 * token era perso dalla memoria dell'app e la chiamata falliva ingoiata):
 * le push continuavano ad arrivare a interruttore spento. Ora il "da
 * deregistrare" resta su DISCO e riRegistraPushSilenziosa lo completa
 * appena la rete torna. Chiave e helper sono in questo modulo.
 */
const FCM_DEREGISTRAZIONE_KEY = 'pfc_fcm_deregistrazione_pendente';

async function segnaDeregistrazionePendente(): Promise<void> {
  try {
    await AsyncStorage.setItem(FCM_DEREGISTRAZIONE_KEY, '1');
  } catch {
    // storage pieno/indisponibile: si riproverà al prossimo spegnimento
  }
}

/** v4.112: l'utente ha RIACCHIUSO le notifiche: l'eventuale promemoria di
 * deregistrazione non ha più senso (il telefono deve stare nel registro). */
export async function annullaDeregistrazionePendente(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FCM_DEREGISTRAZIONE_KEY);
  } catch {
    // come sopra: senza danni, il consumo sa anche riconoscere il caso
  }
}

/** v4.112: token FCM con RISERVA: lo stato in memoria si perde al riavvio
 * dell'app, quindi se non c'è lo chiede a Firebase (il permesso esiste
 * già se il telefono era registrato; senza rete fallisce -> ''). */
async function tokenConRiserva(): Promise<string> {
  if (pushState.token) return pushState.token;
  try {
    return (await messaging().getToken()) || '';
  } catch {
    return '';
  }
}

/**
 * v4.112: spegne le push sul server per conto dell'interruttore Impostazioni.
 * Ritorna true se il telefono è USCITO dal registro del server ADESSO; false
 * se non è riuscito (offline / token non ottenibile): in quel caso resta il
 * promemoria persistente e la deregistrazione si completerà da sola.
 */
export async function deregistraPushDaServer(): Promise<boolean> {
  const token = await tokenConRiserva();
  if (token) {
    try {
      await api.push.fcmUnregister(token);
      await annullaDeregistrazionePendente();
      pushState.registered = false;
      return true;
    } catch {
      // offline o server irraggiungibile: si marca e si riprova da soli
    }
  }
  await segnaDeregistrazionePendente();
  pushState.registered = false;
  return false;
}

/**
 * v4.20: la push di un AVVISO PUBBLICO dello studio e' riconoscibile.
 * v4.118: prima si cercava la stringa "Nuovo avviso" nel TITOLO: cambiare
 * il testo sul server rompeva in silenzio l'apertura della Bacheca. Ora
 * il server mette TIPO 'avviso' nel data della push (api/avvisi) e quello
 * fa fede; il titolo resta solo come riconoscimento di riserva per le
 * push vecchie ancora in giro (già consegnate / server non aggiornato).
 */
function eAvvisoPubblico(
  dati: Record<string, unknown>,
  titoloDiRiserva?: unknown,
): boolean {
  if (dati.tipo === 'avviso') return true;
  const titolo = dati.title ?? titoloDiRiserva;
  return String(titolo ?? '').includes('Nuovo avviso');
}

/**
 * v4.20: segnala "apri la Bacheca" a chi ascolta (AvvisiBanner). Il flag
 * copre l'avvio FREDDO: se l'app parte proprio dal tap sulla push, la
 * Bacheca non e' ancora montata quando l'evento vola; il flag resta acceso
 * e la Bacheca lo consuma appena e' pronta (prendiTapAvvisoPendente).
 */
let tapAvvisoPendente = false;

export function prendiTapAvvisoPendente(): boolean {
  const presente = tapAvvisoPendente;
  tapAvvisoPendente = false;
  return presente;
}

function segnalaTapAvviso(): void {
  tapAvvisoPendente = true;
  DeviceEventEmitter.emit('pfc-apri-bacheca');
}

/**
 * v4.118: quando l'ultima registrazione al server è RIUSCITA (epoch ms).
 * La usano insieme registerPushForCurrentUser (login, interruttore) e
 * riRegistraPushSilenziosa (avvio/foreground): chi registra con successo
 * alza il freno per entrambe. Serve perché al login manuale partivano
 * DUE registrazioni in fila (quella sonora di LoginScreen e quella
 * silenziosa dell'effetto sull'utente in App.tsx) e all'avvio con
 * sessione ripristinata anche la chiamata del bootstrap duplicava
 * quella dell'effetto: due POST identici al server, ogni volta.
 */
let ultimaRegistrazioneRiuscita = 0;
const FREQ_REGISTRAZIONE = 10 * 60 * 1000;

/**
 * v4.51: il listener di rinnovo del token si attacca UNA SOLA VOLTA per
 * tutta la vita dell'app. Prima ogni chiamata a registerPushForCurrentUser
 * (login, interruttore, e ora anche avvio/foreground) ne aggiungeva un
 * altro: dopo qualche giorno lo stesso rinnovo veniva gestito 3-4 volte
 * da listener duplicati (innocui ma sprecone di chiamate al server).
 */
let listenerRinnovoAttaccato = false;
function attaccaListenerRinnovoToken(): void {
  if (listenerRinnovoAttaccato) return;
  listenerRinnovoAttaccato = true;
  messaging().onTokenRefresh(async (newToken) => {
    // v4.13: anche il rinnovo del token rispetta l'interruttore
    if (!(await promemoriaAttivi())) {
      console.log('[PUSH] token rinnovato ma notifiche SPENTE: non inviato');
      return;
    }
    pushState.token = newToken;
    try {
      const device = Platform.OS === 'ios' ? 'iOS' : 'Android';
      await api.push.fcmRegister(newToken, device);
      console.log('[PUSH] token refreshed e re-inviato');
    } catch (err) {
      console.error('[PUSH] errore refresh token:', err);
    }
  });
}

/**
 * v4.124 — MUTEX DELLE REGISTRAZIONI (in ENTRAMBE le direzioni). Il login
 * sonoro e la riparazione silenziosa NON devono mai correre in parallelo:
 * due POST identici al server a pochi ms di distanza. Chi arriva mentre
 * un'altra registrazione è in volo la ASPETTA e si ferma: il suo esito
 * copre anche questo giro. (Il freno v4.118 agiva solo DOPO, sui giri
 * successivi, e soltanto verso la silenziosa: il caso silenzioso già in
 * volo + login sonoro restava scoperto.)
 */
let registrazioneInCorso: Promise<boolean> | null = null;

/**
 * Registra il device per le push FCM. Da chiamare dopo il login.
 * v4.112: ritorna TRUE solo se il telefono è davvero registrato al server:
 * chi mostra un messaggio all'utente può ora dire la verità (prima il
 * chiamante fingeva tutto ok anche con permesso negato o rete giù).
 */
export function registerPushForCurrentUser(): Promise<boolean> {
  if (!registrazioneInCorso) {
    registrazioneInCorso = registraPushInterno().finally(() => {
      registrazioneInCorso = null;
    });
  }
  return registrazioneInCorso;
}

async function registraPushInterno(): Promise<boolean> {
  try {
    // v4.13: interruttore "Notifiche" SPENTO => nessuna registrazione.
    // (Rende la scelta del cliente stabile anche ai successivi login.)
    if (!(await promemoriaAttivi())) {
      console.log('[PUSH] notifiche SPENTE da Impostazioni: registrazione saltata');
      return false;
    }

    // v4.121: UNA SOLA finestra "Consenti notifiche". Prima qui il permesso
    // si chiedeva con Firebase E, quasi nello stesso istante, la sync delle
    // scadenze lo richiedeva con expo (preparaNotifiche -> requestPermissions):
    // su Android 13+ due richieste POST_NOTIFICATIONS ravvicinate possono
    // farne ignorare una e registrare l'esito come negato anche quando
    // l'utente aveva detto sì (il permesso sembrava perso finché non lo
    // ridava a mano). Ora si passa dal MUTEX condiviso di notifiche.ts: il
    // secondo chiamante aspetta l'esito della prima finestra, senza aprirne
    // altre. Firebase legge lo stesso stato del sistema: nessun controllo
    // in più necessario qui.
    if (!(await assicuraPermessoNotifiche())) {
      pushState.error = 'Permesso notifiche negato';
      console.log('[PUSH] permesso negato');
      return false;
    }

    const token = await messaging().getToken();
    if (!token) {
      // v4.112: Firebase ha risposto SENZA token: registrare '' sarebbe
      // registrare nessun indirizzo (e il catch qui sotto lo nascondeva).
      pushState.error = 'Token di notifica non disponibile';
      console.error('[PUSH] getToken ha restituito un token vuoto');
      return false;
    }
    pushState.token = token;
    pushState.error = '';

    const device = Platform.OS === 'ios' ? 'iOS' : 'Android';
    await api.push.fcmRegister(token, device);
    pushState.registered = true;
    console.log('[PUSH] token registrato:', token.slice(0, 20) + '...');

    // v4.51: listener di rinnovo attaccato una sola volta (vedi sopra)
    attaccaListenerRinnovoToken();
    // v4.118: registrazione riuscita = freno alzato anche per quella
    // silenziosa (niente doppione immediata dal percorso [user]).
    ultimaRegistrazioneRiuscita = Date.now();
    return true;
  } catch (err) {
    pushState.error = err instanceof Error ? err.message : String(err);
    console.error('[PUSH] errore registrazione:', err);
    return false;
  }
}

/**
 * v4.51 — AUTO-RIPARAZIONE SILENZIOSA.
 * Ri-presenta il token al server SENZA mai chiedere nulla all'utente:
 * - niente prompt di permessi: usa getPermissions (solo lettura), non
 *   requestPermission — se il permesso non era già concesso esce in
 *   silenzio e non compare NESSUNA schermata;
 * - se l'interruttore "Notifiche" è SPENTO non fa nulla (v4.13);
 * - ogni errore viene ingoiato: riproverà alla prossima apertura.
 *
 * Chiamata da App.tsx (effetto sull'utente): (1) al login/ripristino
 * sessione, (2) ogni volta che l'app torna in primo piano (throttle
 * 10 minuti). v4.118: la chiamata duplicata del bootstrap è stata
 * TOLTA, e qui dentro un secondo freno (ultimaRegistrazioneRiuscita)
 * evita il doppione col login manuale di LoginScreen. Se Google rinnova il
 * token mentre l'app è chiusa, alla riapertura il server si aggiorna
 * da solo e le notifiche ripartono senza che il cliente tocchi niente.
 */
export async function riRegistraPushSilenziosa(): Promise<void> {
  // v4.124 — MUTEX BIDIREZIONALE: se una registrazione è GIÀ in volo (login
  // sonoro, interruttore, o un giro precedente di questa stessa funzione),
  // si aspetta il suo esito e basta: nessun secondo POST in parallelo.
  if (registrazioneInCorso) {
    await registrazioneInCorso.catch(() => false);
    return;
  }
  registrazioneInCorso = riRegistraInterna().finally(() => {
    registrazioneInCorso = null;
  });
  await registrazioneInCorso.catch(() => false);
}

async function riRegistraInterna(): Promise<boolean> {
  try {
    // v4.112: PRIMA DI TUTTO, la deregistrazione pendente (interruttore
    // spento mentre il telefono era offline): il server ha ancora il token
    // e le push continuerebbero. Con l'interruttore ACCESO il flag non ha
    // senso (il telefono deve stare nel registro) e viene semplicemente
    // tolto; con l'interruttore SPENTO si completa l'uscita dal registro
    // e la ri-registrazione non parte affatto.
    const attivi = await promemoriaAttivi();
    const pendente = await AsyncStorage.getItem(FCM_DEREGISTRAZIONE_KEY).catch(() => null);
    if (!attivi) {
      if (pendente) {
        const token = await tokenConRiserva();
        if (!token) {
          console.log('[PUSH] deregistrazione pendente rimandata (token non ottenibile, rete giù?)');
          return false; // si riprova al prossimo avvio/foreground
        }
        try {
          await api.push.fcmUnregister(token);
          await AsyncStorage.removeItem(FCM_DEREGISTRAZIONE_KEY).catch(() => {});
          pushState.registered = false;
          console.log('[PUSH] deregistrazione pendente COMPLETATA (spegnimento fatto offline)');
        } catch {
          console.log('[PUSH] deregistrazione pendente rimandata (server non raggiungibile)');
          return false;
        }
      }
      console.log('[PUSH] auto-riparazione saltata (notifiche SPENTE)');
      return false;
    }
    if (pendente) {
      await AsyncStorage.removeItem(FCM_DEREGISTRAZIONE_KEY).catch(() => {});
    }

    // v4.118: FRENO ANTI-DOPPIONI. Se una registrazione è riuscita da
    // meno di 10 minuti (login sonoro, interruttore riattivato, o una
    // passata precedente di QUESTA funzione), non si ripete: la rimozione
    // della chiamata duplicata del bootstrap in App.tsx copre l'avvio,
    // questo copre il login manuale e i ritorni ravvicinati.
    if (Date.now() - ultimaRegistrazioneRiuscita < FREQ_REGISTRAZIONE) {
      console.log('[PUSH] auto-riparazione saltata (registrato da pochi minuti)');
      return false;
    }

    const perm = await messaging().hasPermission();
    const giaAutorizzato =
      perm === messaging.AuthorizationStatus.AUTHORIZED ||
      perm === messaging.AuthorizationStatus.PROVISIONAL;
    if (!giaAutorizzato) {
      console.log(
        '[PUSH] auto-riparazione saltata (permesso non concesso, nessun prompt)',
      );
      return false;
    }
    const token = await messaging().getToken();
    if (!token) {
      // v4.112: senza token la registrazione al server è inutile: niente
      // chiamata con indirizzo vuoto. Il prossimo giro riproverà.
      console.log('[PUSH] auto-riparazione saltata (getToken vuoto)');
      return false;
    }
    // v4.118: il listener di rinnovo del token prima era agganciato SOLO
    // dalla registrazione sonora (registerPushForCurrentUser): con la
    // sessione ripristinata all'avvio partiva solo questa funzione, e il
    // rinnovo del token durante la vita dell'app arrivava al server solo
    // al prossimo foreground (fino a 10 minuti di ritardo).
    attaccaListenerRinnovoToken();
    const device = Platform.OS === 'ios' ? 'iOS' : 'Android';
    await api.push.fcmRegister(token, device);
    pushState.token = token;
    pushState.registered = true;
    pushState.error = '';
    ultimaRegistrazioneRiuscita = Date.now();
    console.log('[PUSH] auto-riparazione OK:', token.slice(0, 20) + '...');
    return true;
  } catch (err) {
    // Silenzioso di proposito: il prossimo avvio/foreground riproverà.
    console.log('[PUSH] auto-riparazione fallita, si riprova più tardi:', err);
    return false;
  }
}

/**
 * Installa i listener per messaggi in foreground e tap su notifiche.
 * Idempotente.
 */
let listenersAttached = false;
export function setupPushListeners(
  onNotificationTap?: (target: DeepLinkTarget | null) => void,
): () => void {
  if (listenersAttached) return () => {};
  listenersAttached = true;

  // Foreground: messaggio ricevuto a app aperta.
  // v4.0: FIX - il vecchio codice lo scriveva solo nei LOG (il cliente
  // non vedeva NIENTE). Con l'app aperta Android non mostra da solo le
  // push FCM: la publichiamo noi come notifica locale nella barra di
  // stato (dove c'e' l'orologio), canale "Avvisi del portale". Se le
  // notifiche non sono attive su questa copia, resta solo il log come
  // prima (nessun errore).
  const unsub1 = messaging().onMessage(async (remoteMessage) => {
    const notifica = remoteMessage.notification;
    const datiMsg = remoteMessage.data ?? {};
    const title = String(notifica?.title ?? datiMsg.title ?? 'Portale PFC');
    const body = String(notifica?.body ?? datiMsg.body ?? '');
    const urlRaw = datiMsg.url;
    const url = typeof urlRaw === 'string' ? urlRaw : '';
    const tipoRaw = datiMsg.tipo;
    const tipo = typeof tipoRaw === 'string' ? tipoRaw : '';
    const idRaw = datiMsg.id;
    const idNotifica = typeof idRaw === 'string' ? idRaw : '';

    // v4.118: con l'INTERRUTTORE SPENTO (o deregistrazione pendente mentre
    // il telefono era offline) può ancora arrivare una push residua: il
    // cliente la ha esplicitamente negate, quindi niente avviso in barra
    // e niente toast. L'evento resta: la campanella sul server esiste e
    // i badge devono restare veritieri.
    if (!(await promemoriaAttivi())) {
      console.log('[PUSH] foreground con notifiche SPENTE: solo badge:', title);
      DeviceEventEmitter.emit('pfc-push-ricevuta', { url, title });
      return;
    }

    // v4.118 (regola unica, parte client): se arriva a app APERTA la push
    // "Scade OGGI" del server, la sveglia locale delle 08:30 dello stesso
    // documento non serve più: viene segnata erogata e TOGLIATA
    // dall'orologio di Android, così il cliente non riceve due volte lo
    // stesso avviso. Silenzioso: se non c'era nessuna sveglia di oggi
    // non cambia nulla. (Il caso push a app CHIUSA + sveglia resta:
    // chiudere quello richiede una regola lato server.)
    if (tipo === 'scadenza_oggi') {
      const scadenzaIdRaw = datiMsg.scadenzaId;
      if (typeof scadenzaIdRaw === 'string' && scadenzaIdRaw) {
        void segnaPushScadenzaOggiEroga(scadenzaIdRaw);
      }
    }

    // v4.6: nell'avviso locale entriamo anche il tipo, cosi' se il cliente
    // lo TOCCA sappiamo che e' una scadenza e possiamo aprire il file.
    // v4.118: entra anche l'ID DELLA CAMPANELLA sul server: serve al
    // pulsante "Segna come letto" (vedi sulToccoNotifica) per segnare
    // SOLO questa notifica invece di tutta la campanella.
    const datiAvviso: Record<string, string> = {};
    if (url) datiAvviso.url = url;
    if (tipo) datiAvviso.tipo = tipo;
    if (idNotifica) datiAvviso.id = idNotifica;
    // v4.20: se e' la push di un avviso pubblico, il titolo viaggia anche
    // nei dati: al tocco sull'avviso locale la Bacheca si apre da sola.
    if (eAvvisoPubblico(datiMsg as Record<string, unknown>, title)) {
      datiAvviso.title = title;
    }
    // v4.124 — Se stai già guardando la tab dei MESSAGGI, niente banner di
    // sistema per un messaggio che sta per comparire nella lista che hai
    // davanti: la lista si aggiorna da sola (evento qui sotto) e il banner
    // di sistema risultava il doppione. Le altre push (documenti, scadenze:
    // url diverso) si comportano come sempre.
    const tabAttiva = useAppStore.getState().clienteTab;
    if (url.includes('tab=messaggi') && tabAttiva === 'messaggi') {
      DeviceEventEmitter.emit('pfc-push-ricevuta', { url, title });
      return;
    }
    const mostrata = await mostraAvvisoLocale(
      title,
      body,
      Object.keys(datiAvviso).length > 0 ? datiAvviso : undefined,
    );
    if (mostrata) {
      console.log('[PUSH] avviso mostrato a app aperta:', title);
    } else {
      console.log('[PUSH] foreground (notifiche non attive):', title, '-', body);
    }

    // v4.5: con l'app aperta il cliente deve VEDERE l'arrivo SUBITO.
    // v4.118: UN SOLO AVVISO. Se l'avviso di sistema è riuscito (barra di
    // stato + popup heads-up), il toast in-app era la copia identica
    // impilata sopra: resta il toast SOLO come ripiego quando la
    // notifica non è possibile (permesso negato, moduli mancanti).
    // L'evento interno resta sempre: chi lo ascolta (App.tsx per i
    // badge, MessaggiScreen per la lista) si aggiorna in tempo reale.
    if (!mostrata) {
      toast.info(title, body);
    }
    DeviceEventEmitter.emit('pfc-push-ricevuta', { url, title });
  });

  // Background/quit: tap su notifica che apre l'app
  // v4.116: l'unsubscribe si SALVA e si stacca nel cleanup: prima il
  // listener restava attaccato dopo lo smontaggio (a ogni rimontaggio
  // se ne aggiungeva uno e un tap poteva essere gestito piu' volte).
  const unsub2 = messaging().onNotificationOpenedApp((remoteMessage) => {
    const dati = remoteMessage?.data ?? {};
    console.log(
      '[PUSH] tap notifica (background):',
      String(dati.url ?? ''),
    );
    // v4.20: tap sulla push di un avviso pubblico => Bacheca (il titolo sta
    // nel data, con la notification del messaggio come seconda possibilita')
    if (eAvvisoPubblico(dati as Record<string, unknown>, remoteMessage?.notification?.title)) {
      segnalaTapAvviso();
    }
    const target = targetDaDati(dati.url, dati.tipo);
    onNotificationTap?.(target);
  });

  // Tap su notifica che ha aperto l'app da cold start
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        const dati = remoteMessage.data ?? {};
        console.log(
          '[PUSH] tap notifica (cold start):',
          String(dati.url ?? ''),
        );
        // v4.20: avvio FREDDO dal tap sulla push di un avviso pubblico:
        // il flag resta acceso e la Bacheca lo consuma appena montata.
        if (
          eAvvisoPubblico(dati as Record<string, unknown>, remoteMessage.notification?.title)
        ) {
          segnalaTapAvviso();
        }
        const target = targetDaDati(dati.url, dati.tipo);
        if (target) onNotificationTap?.(target);
      }
    });

  // v4.0: tocco su un avviso LOCALE dell'app (mostrato a app aperta):
  // stessa navigazione delle push di sistema (deep-link al documento).
  // v4.6: legge anche il tipo ("scadenza") per il risolutore del file.
  // v4.54: se il tocco e' il PULSANTE "Segna come letto" (come sulla web
  // app), NON naviga: segna la notifica come letta sul server, aggiorna
  // la campanella all'istante (evento di sempre) e toglie l'avviso dalla
  // barra di stato. Il pulsante "Apri" invece fa la stessa cosa del
  // tocco sul corpo: naviga al contenuto giusto.
  // v4.118: il pulsante segna SOLO la notifica toccata (id server nel
  // data della push). Prima chiamava segnaLette() senza id: sparivano
  // TUTTE le non lette della campanella, anche quelle mai viste. Se il
  // server non ha mandato l'id (push vecchia), non tocchiamo niente:
  // l'avviso sparisce dalla barra e basta (mai più campanella azzerata).
  const staccaTocco = sulToccoNotifica((dati, azione, notifId) => {
    // v4.76: il tocco su una sveglia scadenze e' la prova che l'utente l'ha
    // vista: segna EROGATO cosi' la sync non ripete l'avviso (serve da quando
    // il server consegna la scadenza in lista per tutto il giorno stesso).
    // Silenzioso e filtrato: identifier non pfc-scad-* = non fa nulla.
    void segnaSvegliaVistaDaNotifica(notifId);
    if (azione === 'segna_lette') {
      const idCampanella = typeof dati.id === 'string' ? dati.id : '';
      if (idCampanella) {
        api.notifiche
          .segnaLetta(idCampanella)
          .then(() => toast.success('Notifica segnata come letta'))
          .catch(() => {});
      }
      if (notifId) void togliNotifica(notifId);
      DeviceEventEmitter.emit('pfc-push-ricevuta', { url: '', title: '' });
      return;
    }
    // v4.20: tocco sull'avviso LOCALE di un avviso pubblico => Bacheca
    if (eAvvisoPubblico(dati)) segnalaTapAvviso();
    const target = targetDaDati(dati.url, dati.tipo);
    onNotificationTap?.(target);
  });

  return () => {
    unsub1();
    unsub2();
    staccaTocco();
    listenersAttached = false;
  };
}

/*
 * v4.4 - RIMOSSA DI PROPOSITO la vecchia unregisterPush() che al logout
 * cancellava il token FCM dal backend. Quello era il motivo per cui, una
 * volta premuto "Esci dall'account", il telefono non riceveva piu' NIENTE:
 * il server perdeva l'indirizzo del dispositivo e nessuna notifica poteva
 * piu' essere consegnata (ne' documenti, ne' messaggi, ne' scadenze).
 *
 * Da v4.4 il logout NON tocca piu' il registro delle notifiche: il
 * telefono resta agganciato all'ultimo account con cui ha fatto login,
 * esattamente come WhatsApp. Le conseguenze sono volute e sicure:
 * - logout => le notifiche CONTINUANO ad arrivare (richiesta esplicita
 *   del titolare: il cliente deve vedere le scadenze anche se esce);
 * - se sullo stesso telefono entra un ALTRO cliente, il backend riassocia
 *   da solo il token al nuovo utente (upsert in POST /api/push/fcm);
 * - se l'app viene DISINSTALLATA, FCM rifiuta l'invio
 *   (messaging/registration-token-not-registered) e il backend ripulisce
 *   il token da solo: nessun dato resta appeso a un telefono morto.
 *
 * Resta solo un reset dello stato INTERNO all'app (per il prossimo
 * login), che non tocca il registro sul server.
 */
export function resetStatoPushLocale(): void {
  pushState.registered = false;
  pushState.token = '';
  pushState.error = '';
  // v4.124: al logout il NUOVO account non eredita il freno "registrato da
  // pochi minuti" dell'account vecchio (prima: A registrato alle T0, logout,
  // B entra entro 10 minuti, registrazione sonora fallita per rete = quella
  // silenziosa frenata fino a T0+10: B senza notifiche e senza spiegazioni).
  // Il mutex viene pure rilasciato: nessuna registrazione dell'account
  // vecchio deve coprire quella del nuovo.
  ultimaRegistrazioneRiuscita = 0;
  registrazioneInCorso = null;
}
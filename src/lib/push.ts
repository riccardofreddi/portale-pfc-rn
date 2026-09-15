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

import messaging from '@react-native-firebase/messaging';
import { DeviceEventEmitter, Platform } from 'react-native';
import { api } from '@/api/client';
import { parseDeepLink, type DeepLinkTarget } from '@/lib/deeplink';
import { mostraAvvisoLocale, sulToccoNotifica } from '@/lib/notifiche';
import { promemoriaAttivi } from '@/lib/scadenze-locali';
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
  if (tipo === 'scadenza') target.origineScadenza = true;
  return target;
}

export const pushState = {
  registered: false,
  token: '',
  error: '',
};

/**
 * v4.20: la push di un AVVISO PUBBLICO dello studio e' riconoscibile dal
 * titolo: il server la manda con title "Nuovo avviso dallo studio"
 * (duplicato anche nel data payload, vedi lib/fcm.ts del backend). Il suo
 * url e' "/" che il deep-link scarta: invece di non fare NIENTE come fino
 * alla v4.19, ora il tap apre direttamente la Bacheca delle Comunicazioni.
 */
function eAvvisoPubblico(titolo: unknown): boolean {
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
 * Registra il device per le push FCM. Da chiamare dopo il login.
 */
export async function registerPushForCurrentUser(): Promise<void> {
  try {
    // v4.13: interruttore "Notifiche" SPENTO => nessuna registrazione.
    // (Rende la scelta del cliente stabile anche ai successivi login.)
    if (!(await promemoriaAttivi())) {
      console.log('[PUSH] notifiche SPENTE da Impostazioni: registrazione saltata');
      return;
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      pushState.error = 'Permesso notifiche negato';
      console.log('[PUSH] permesso negato');
      return;
    }

    const token = await messaging().getToken();
    pushState.token = token;
    pushState.error = '';

    const device = Platform.OS === 'ios' ? 'iOS' : 'Android';
    await api.push.fcmRegister(token, device);
    pushState.registered = true;
    console.log('[PUSH] token registrato:', token.slice(0, 20) + '...');

    // v4.51: listener di rinnovo attaccato una sola volta (vedi sopra)
    attaccaListenerRinnovoToken();
  } catch (err) {
    pushState.error = err instanceof Error ? err.message : String(err);
    console.error('[PUSH] errore registrazione:', err);
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
 * Chiamata da App.tsx in due momenti: (1) all'avvio, quando il
 * bootstrap ripristina una sessione valida; (2) ogni volta che l'app
 * torna in primo piano (throttle 10 minuti). Se Google rinnova il
 * token mentre l'app è chiusa, alla riapertura il server si aggiorna
 * da solo e le notifiche ripartono senza che il cliente tocchi niente.
 */
export async function riRegistraPushSilenziosa(): Promise<void> {
  try {
    if (!(await promemoriaAttivi())) {
      console.log('[PUSH] auto-riparazione saltata (notifiche SPENTE)');
      return;
    }
    const perm = await messaging().hasPermission();
    const giaAutorizzato =
      perm === messaging.AuthorizationStatus.AUTHORIZED ||
      perm === messaging.AuthorizationStatus.PROVISIONAL;
    if (!giaAutorizzato) {
      console.log(
        '[PUSH] auto-riparazione saltata (permesso non concesso, nessun prompt)',
      );
      return;
    }
    const token = await messaging().getToken();
    const device = Platform.OS === 'ios' ? 'iOS' : 'Android';
    await api.push.fcmRegister(token, device);
    pushState.token = token;
    pushState.registered = true;
    pushState.error = '';
    console.log('[PUSH] auto-riparazione OK:', token.slice(0, 20) + '...');
  } catch (err) {
    // Silenzioso di proposito: il prossimo avvio/foreground riproverà.
    console.log('[PUSH] auto-riparazione fallita, si riprova più tardi:', err);
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
    // v4.6: nell'avviso locale entriamo anche il tipo, cosi' se il cliente
    // lo TOCCA sappiamo che e' una scadenza e possiamo aprire il file.
    const datiAvviso: Record<string, string> = {};
    if (url) datiAvviso.url = url;
    if (tipo) datiAvviso.tipo = tipo;
    // v4.20: se e' la push di un avviso pubblico, il titolo viaggia anche
    // nei dati: al tocco sull'avviso locale la Bacheca si apre da sola.
    if (eAvvisoPubblico(title)) datiAvviso.title = title;
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
    // (1) avviso in-app a schermo (il sistema con app aperta puo' restare
    // silenzioso, quindi aggiungiamo il toast sempre); (2) evento interno:
    // chi lo ascolta (App.tsx per i badge, MessaggiScreen per la lista)
    // si aggiorna in tempo reale, senza aspettare il polling dei 30 secondi.
    toast.info(title, body);
    DeviceEventEmitter.emit('pfc-push-ricevuta', { url, title });
  });

  // Background/quit: tap su notifica che apre l'app
  messaging().onNotificationOpenedApp((remoteMessage) => {
    const dati = remoteMessage?.data ?? {};
    console.log(
      '[PUSH] tap notifica (background):',
      String(dati.url ?? ''),
    );
    // v4.20: tap sulla push di un avviso pubblico => Bacheca (il titolo sta
    // nel data, con la notification del messaggio come seconda possibilita')
    if (eAvvisoPubblico(dati.title ?? remoteMessage?.notification?.title)) {
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
          eAvvisoPubblico(dati.title ?? remoteMessage.notification?.title)
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
  const staccaTocco = sulToccoNotifica((dati) => {
    // v4.20: tocco sull'avviso LOCALE di un avviso pubblico => Bacheca
    if (eAvvisoPubblico(dati.title)) segnalaTapAvviso();
    const target = targetDaDati(dati.url, dati.tipo);
    onNotificationTap?.(target);
  });

  return () => {
    unsub1();
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
}
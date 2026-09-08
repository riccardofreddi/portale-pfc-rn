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
 */

import messaging from '@react-native-firebase/messaging';
import { DeviceEventEmitter, Platform } from 'react-native';
import { api } from '@/api/client';
import { parseDeepLink, type DeepLinkTarget } from '@/lib/deeplink';
import { mostraAvvisoLocale, sulToccoNotifica } from '@/lib/notifiche';
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
 * Registra il device per le push FCM. Da chiamare dopo il login.
 */
export async function registerPushForCurrentUser(): Promise<void> {
  try {
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

    messaging().onTokenRefresh(async (newToken) => {
      pushState.token = newToken;
      try {
        await api.push.fcmRegister(newToken, device);
        console.log('[PUSH] token refreshed e re-inviato');
      } catch (err) {
        console.error('[PUSH] errore refresh token:', err);
      }
    });
  } catch (err) {
    pushState.error = err instanceof Error ? err.message : String(err);
    console.error('[PUSH] errore registrazione:', err);
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
        const target = targetDaDati(dati.url, dati.tipo);
        if (target) onNotificationTap?.(target);
      }
    });

  // v4.0: tocco su un avviso LOCALE dell'app (mostrato a app aperta):
  // stessa navigazione delle push di sistema (deep-link al documento).
  // v4.6: legge anche il tipo ("scadenza") per il risolutore del file.
  const staccaTocco = sulToccoNotifica((dati) => {
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
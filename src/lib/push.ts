/**
 * Portale PFC RN — Notifiche push native (FCM).
 *
 * Stack:
 * - @react-native-firebase/messaging — SDK nativo Firebase, push vere (no proxy)
 * - @react-native-firebase/app — inizializzazione (legge google-services.json)
 *
 * Flusso:
 * 1. registerPushForCurrentUser() — richiesta permessi + registrazione token
 * 2. messaging().getToken() → POST /api/push/fcm (backend registra token↔user)
 * 3. onMessage (foreground) → notifica locale con notifee o alert
 * 4. onNotificationOpenedApp (background tap) → navigazione alla schermata
 */

import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { api } from '@/api/client';
import { parseDeepLink, type DeepLinkTarget } from '@/lib/deeplink';

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
  const unsub1 = messaging().onMessage(async (remoteMessage) => {
    console.log('[PUSH] foreground message:', remoteMessage.messageId);
    const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'Portale PFC';
    const body = remoteMessage.notification?.body || remoteMessage.data?.body || '';
    console.log(`[PUSH] foreground: ${title} - ${body}`);
  });

  // Background/quit: tap su notifica che apre l'app
  messaging().onNotificationOpenedApp((remoteMessage) => {
    const url = remoteMessage?.data?.url as string | undefined;
    console.log('[PUSH] tap notifica (background):', url);
    const target = parseDeepLink(url);
    onNotificationTap?.(target);
  });

  // Tap su notifica che ha aperto l'app da cold start
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        const url = remoteMessage.data?.url as string | undefined;
        console.log('[PUSH] tap notifica (cold start):', url);
        const target = parseDeepLink(url);
        if (target) onNotificationTap?.(target);
      }
    });

  return () => {
    unsub1();
    listenersAttached = false;
  };
}

/** Rimuove il token dal backend (logout). */
export async function unregisterPush(): Promise<void> {
  try {
    if (pushState.token) {
      await api.push.fcmUnregister(pushState.token).catch(() => {});
    }
    pushState.registered = false;
    pushState.token = '';
    pushState.error = '';
  } catch (err) {
    console.error('[PUSH] errore unregister:', err);
  }
}
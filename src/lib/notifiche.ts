/**
 * Notifiche di sistema (v3.4 - versione silenziosa).
 *
 * Quando un download finisce, l'app publica una notifica VERA di Android:
 * compare nella barra di stato, in alto (dove ci sono ora e batteria),
 * con l'icona dell'app e resta nel pannello notifiche - come i download
 * di Chrome e di tutte le app.
 *
 * PERCHE' NELLA v3.3 SI VEDEVA UN ERRORE NEI LOG ("Cannot find native
 * module 'ExpoPushTokenManager'"): il codice JavaScript della libreria
 * notifiche, appena viene caricato, chiede immediatamente 12 moduli
 * NATIVI che devono essere compilati DENTRO l'app. Se il dev client in
 * uso e' stato costruito prima, quei pezzi non ci sono ancora: il
 * caricamento fallisce e l'errore finisce nei log anche se protetto.
 *
 * SOLUZIONE v3.4 (gate silenzioso): PRIMA di caricare il codice della
 * libreria verifichiamo con requireOptionalNativeModule (che restituisce
 * null senza lanciare errori) se tutti i 12 pezzi nativi esistono.
 * Se manca anche uno solo, NON carichiamo proprio il codice: zero errori,
 * zero log, zero crash - l'app resta identica a prima e i download
 * continuano a funzionare con il toast classico. Dopo la ricostruzione
 * del dev client (una volta sola) i 12 pezzi ci sono tutti: il gate si
 * apre da solo e le notifiche vere si attivano senza altre modifiche.
 *
 * Perche' e' sicuro: la lista dei 12 nomi e' verificata 1 a 1 sia sul
 * lato JavaScript (requireNativeModule nei file .native.js) sia sul
 * lato nativo (annotazioni Name() nelle classi Kotlin): dopo il rebuild
 * tutti e 12 risultano registrati, quindi il gate si apre sempre.
 *
 * Attivazione definitiva (una volta sola): ricostruire il dev client
 * dopo `npm install` - vedi istruzioni consegnate a parte.
 */
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type ModuloNotifiche = typeof import('expo-notifications');

/**
 * I 12 moduli nativi che la libreria notifiche richiede APPENA viene
 * caricata (a livello di modulo, quindi prima di ogni nostra chiamata).
 * Nomi verificati sui due lati: JS (file .native.js) e Kotlin (Name()).
 */
const MODULI_NATIVI_RICHIESTI = [
  'ExpoNotificationsEmitter',
  'ExpoNotificationsHandlerModule',
  'ExpoNotificationPermissionsModule',
  'ExpoNotificationPresenter',
  'ExpoNotificationScheduler',
  'ExpoNotificationChannelManager',
  'ExpoNotificationChannelGroupManager',
  'ExpoNotificationCategoriesModule',
  'ExpoBadgeModule',
  'ExpoPushTokenManager',
  'NotificationsServerRegistrationModule',
  'ExpoBackgroundNotificationTasksModule',
] as const;

/**
 * Gate silenzioso: true solo se TUTTI i pezzi nativi esistono.
 * requireOptionalNativeModule restituisce null senza errori se il
 * modulo manca; non scrive nulla nei log.
 */
function moduliNativiPresenti(): boolean {
  if (Platform.OS !== 'android') {
    return false;
  }
  try {
    for (const nome of MODULI_NATIVI_RICHIESTI) {
      if (!requireOptionalNativeModule(nome)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

let gestorePronto = false;
let permessoChiesto = false;

/** Carica il modulo solo se i pezzi nativi ci sono tutti; null altrimenti. */
async function caricaModulo(): Promise<ModuloNotifiche | null> {
  try {
    // GATE v3.4: senza i 12 pezzi nativi non si carica nemmeno il codice
    // JS della libreria - cosi' l'errore "ExpoPushTokenManager" non puo'
    // piu' comparire in nessun log.
    if (!moduliNativiPresenti()) {
      return null;
    }
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

/**
 * Prepara tutto il necessario (gestore, permesso, canale "Download").
 * Idempotente: si puo' chiamare a ogni download senza sprechi.
 * Ritorna true se le notifiche sono realmente disponibili.
 */
export async function preparaNotifiche(): Promise<boolean> {
  try {
    const Notifications = await caricaModulo();
    if (!Notifications) return false;

    if (!gestorePronto) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      gestorePronto = true;
    }

    if (!permessoChiesto) {
      permessoChiesto = true;
      const stato = await Notifications.getPermissionsAsync();
      if (!stato.granted) {
        // Su Android 13+ apre la finestra di sistema "Consenti notifiche"
        // una volta sola: serve per vedere le notifiche in alto.
        const dopo = await Notifications.requestPermissionsAsync();
        if (!dopo.granted) return false;
      }
    }

    // Canale Android: categoria "Download" nelle impostazioni notifiche.
    await Notifications.setNotificationChannelAsync('download', {
      name: 'Download di documenti',
      importance: Notifications.AndroidImportance.HIGH,
    });
    return true;
  } catch {
    // Dev client senza i moduli nativi (ricostruzione non ancora fatta).
    return false;
  }
}

/**
 * Publica la notifica "file scaricato" nella barra di stato.
 * Ritorna true se la notifica e' stata davvero creata, false se le
 * notifiche non sono ancora attive (o il permesso e' stato negato).
 */
export async function notificaDownload(titolo: string, corpo: string): Promise<boolean> {
  try {
    if (!(await preparaNotifiche())) return false;
    const Notifications = await caricaModulo();
    if (!Notifications) return false;
    await Notifications.scheduleNotificationAsync({
      content: { title: titolo, body: corpo },
      trigger: null, // subito
    });
    return true;
  } catch {
    return false;
  }
}

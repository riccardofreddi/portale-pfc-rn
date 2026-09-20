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
 *
 * Novita' v4.0 (gli avvisi del server si VEDONO anche a app aperta):
 * - canale Android "pfc-alerts-v2" ("Avvisi del portale"): e' il canale
 *   che il server usa per le push FCM (nuovi documenti, messaggi,
 *   scadenze): creato dentro l'app perche' Android lo raggruppi bene
 *   e lo trovi nelle impostazioni notifiche dell'app.
 * - mostraAvvisoLocale(): quando arriva una push CON L'APP APERTA,
 *   Android non mostra da solo niente: lo publichiamo noi come notifica
 *   locale nella barra di stato (prima il messaggio finiva solo nei log
 *   e al cliente non arrivava nulla).
 * - sulToccoNotifica(): se il cliente tocca l'avviso, l'app si apre
 *   esattamente sul documento/messaggio giusto (deep-link).
 *
 * Novita' v4.2 (arrivi IMMEDIATI, via il secondo di attesa):
 * - mostraAvvisoLocale ora pubblica la notifica SUBITO (trigger null):
 *   prima c'era un timer di 1 secondo per agganciare il canale giusto.
 *   Verificato nel codice Kotlin della libreria (BaseNotificationBuilder):
 *   le notifiche immediate finiscono nel canale di riserva
 *   "expo_notifications_fallback_notification_channel", che la libreria
 *   crea con IMPORTANCE_HIGH, vibrazione e badge: STESSO effetto a
 *   schermo (popup in alto, suono, vibrazione) ma ZERO attesa.
 * - Il canale "pfc-alerts-v2" resta creato: serve alle push del server
 *   quando l'app e' CHIUSA (e' Android a mostrarle, col canale che il
 *   server indica nel messaggio).
 *
 * Novita' v4.3 (promemoria scadenze che arrivano ANCHE a app chiusa):
 * - esposto caricaModuloNotifiche(): il nuovo modulo scadenze-locali.ts
 *   usa lo STESSO gate silenzioso (12 pezzi nativi) per schedulare i
 *   promemoria di scadenza nell'orologio interno di Android (Alarm
 *   Manager esatti), che scattano anche se l'app e' chiusa da giorni.
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
let categoriaPronta = false;

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
 * v4.3: accesso al modulo notifiche PER IL GATE (usato da scadenze-locali.ts
 * per schedulare i promemoria di scadenza). Stessa regola: se i pezzi
 * nativi non ci sono, ritorna null senza alcun errore nei log.
 */
export async function caricaModuloNotifiche(): Promise<ModuloNotifiche | null> {
  return caricaModulo();
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

    // v4.0: canale degli AVVISI del portale. Il server (push FCM di
    // nuovi documenti, messaggi e scadenze) usa proprio questo id:
    // creandolo dentro l'app, le push di sistema cadono nel canale
    // giusto e sono ben visibili (importanza alta = compaiono anche
    // a schermo spento con il popup).
    await Notifications.setNotificationChannelAsync('pfc-alerts-v2', {
      name: 'Avvisi del portale',
      description: 'Nuovi documenti, messaggi e scadenze dello studio',
      importance: Notifications.AndroidImportance.HIGH,
    });

    // v4.54: categoria degli avvisi CON PULSANTI, come sulla web app
    // ("Apri" e "Segna come letto"). La categoria si registra UNA volta:
    // le notifiche la citano con categoryIdentifier (mostraAvvisoLocale)
    // e Android disegna i due pulsanti sotto il testo dell'avviso.
    // Il tocco del corpo dell'avviso resta quello di sempre: apre l'app
    // sul documento/messaggio giusto (deep-link di sulToccoNotifica).
    if (!categoriaPronta) {
      try {
        await Notifications.setNotificationCategoryAsync('pfc-avviso', [
          {
            identifier: 'apri',
            buttonTitle: 'Apri',
            options: { opensAppToForeground: true },
          },
          {
            identifier: 'segna_lette',
            buttonTitle: 'Segna come letto',
            // NON porta l'app davanti: l'avviso locale nasce solo a app
            // APERTA, quindi l'azione arriva al listener in silenzio (l'app
            // e' gia' in mano al cliente). Il lavoro vero lo fa push.ts.
            options: { opensAppToForeground: false },
          },
        ]);
        categoriaPronta = true;
      } catch {
        // Categoria non disponibile: le notifiche restano senza pulsanti,
        // tutto il resto funziona come prima (tocco = deep-link).
      }
    }
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

/**
 * v4.0: publica un AVVISO del portale (nuovo documento, messaggio,
 * scadenza) nella barra di stato, per gli arrivi mentre l'app e' APERTA
 * (a app chiusa e' Android che mostra da solo le push del server).
 * In "dati" si puo' passare { url: '...' } per aprire il punto giusto
 * dell'app quando l'avviso viene toccato (vedi sulToccoNotifica).
 * Ritorna true se l'avviso e' stato davvero creato.
 */
export async function mostraAvvisoLocale(
  titolo: string,
  corpo: string,
  dati?: Record<string, string>,
): Promise<boolean> {
  try {
    if (!(await preparaNotifiche())) return false;
    const Notifications = await caricaModulo();
    if (!Notifications) return false;
    await Notifications.scheduleNotificationAsync({
      // v4.54: categoryIdentifier aggancia la categoria "pfc-avviso"
      // (i pulsanti "Apri" e "Segna come letto"). Se la categoria non
      // fosse registrata, Android semplicemente non disegna i pulsanti.
      content: {
        title: titolo,
        body: corpo,
        data: dati ?? {},
        categoryIdentifier: 'pfc-avviso',
      },
      // v4.2: SUBITO. La libreria non permette il canale nelle richieste
      // immediate, ma le manda nel suo canale di riserva che e' gia'
      // IMPORTANCE_HIGH (popup, vibrazione, badge: verificato nel sorgente
      // Kotlin BaseNotificationBuilder.kt). Il canale "pfc-alerts-v2"
      // resta per le push a app CHIUSA (che mostra Android da solo).
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * v4.0: chiama la funzione quando il cliente TOCCA un avviso locale
 * dell'app (anche a app chiusa, se l'avviso l'ha aperta). Passa i dati
 * dell'avviso (es. { url: '/?tab=archivio&anno=...' }) cosi' l'app si
 * apre esattamente sul documento o messaggio giusto. Ritorna la
 * funzione per staccare l'ascolto. Se le notifiche non sono attive
 * (pezzi nativi mancanti) non ascolta nulla e non rompe niente.
 */
export function sulToccoNotifica(
  // v4.54: cb riceve anche azione (identificativo del PULSANTE toccato:
  // 'apri', 'segna_lette', o il default del tocco sul corpo) e l'id della
  // notifica (per toglierla dalla barra di stato, es. dopo "Segna come letto").
  cb: (dati: Record<string, unknown>, azione?: string, notifId?: string) => void,
): () => void {
  let stacca: (() => void) | null = null;
  caricaModulo()
    .then((Notifications) => {
      if (!Notifications) return;
      const sub = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const dati = response.notification.request.content.data ?? {};
          cb(
            dati as Record<string, unknown>,
            response.actionIdentifier,
            response.notification.request.identifier,
          );
        },
      );
      stacca = () => sub.remove();
      // Avvio "freddo": se l'app era CHIUSA e il cliente ha aperto
      // toccando l'avviso, lo intercettiamo qui (una sola volta).
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (!response) return;
          const dati = response.notification.request.content.data ?? {};
          cb(
            dati as Record<string, unknown>,
            response.actionIdentifier,
            response.notification.request.identifier,
          );
        })
        .catch(() => {});
    })
    .catch(() => {});
  return () => {
    if (stacca) stacca();
  };
}

/**
 * v4.54: toglie dalla barra di stato la notifica con questo id. Serve al
 * pulsante "Segna come letto": la notifica sparisce subito, come sul web
 * (dove il service worker la chiude dopo l'azione). Silenziosa: se le
 * notifiche non sono attive non fa nulla e non rompe niente.
 */
export async function togliNotifica(id: string): Promise<boolean> {
  try {
    if (!id) return false;
    const Notifications = await caricaModulo();
    if (!Notifications) return false;
    await Notifications.dismissNotificationAsync(id);
    return true;
  } catch {
    return false;
  }
}

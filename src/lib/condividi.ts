/**
 * Condivisione e invio email (v3.5).
 *
 * Porta l'app al livello delle altre app Android:
 * - "Condividi": apre il pannello di sistema di Android (quello di Chrome
 *   e WhatsApp) con il FILE VERO allegato: il cliente puo' mandarlo su
 *   WhatsApp, Gmail, Drive, Telegram e tutte le app che ha sul telefono.
 * - "Email": apre la sua app di posta con il file GIA' allegato, oggetto
 *   e testo pronti: deve solo scrivere il destinatario e inviare.
 *
 * STESSA SICUREZZA DELLA v3.4 (gate silenzioso): le due librerie
 * (expo-sharing, expo-mail-composer) chiedono pezzi nativi che devono
 * essere costruiti DENTRO l'app, come la libreria notifiche. Prima di
 * caricarle verifichiamo con requireOptionalNativeModule (restituisce
 * null senza errori e senza log) se esistono. Se non ci sono ancora,
 * NON si carica nessun codice: nessun errore, nessun log. E ogni
 * funzione ha un PIANO B che funziona gia' oggi:
 * - Condividi -> pannello di sistema con il NOME del documento
 * - Email     -> apre l'app di posta con oggetto e testo (senza allegato)
 * Dopo la ricostruzione del dev client (la STESSA che attiva le
 * notifiche) parte automaticamente la versione completa: file allegato.
 *
 * Nomi nativi verificati sui due lati: Kotlin (Name("ExpoSharing"),
 * Name("ExpoMailComposer")) e JS (requireNativeModule nei file build).
 */
import { Linking, Platform, Share } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { tipoMime } from '@/lib/download';

type ModuloSharing = typeof import('expo-sharing');
type ModuloMail = typeof import('expo-mail-composer');

/** Carica expo-sharing solo se il pezzo nativo "ExpoSharing" esiste. */
async function caricaSharing(): Promise<ModuloSharing | null> {
  try {
    if (Platform.OS !== 'android') return null;
    if (!requireOptionalNativeModule('ExpoSharing')) return null;
    return await import('expo-sharing');
  } catch {
    return null;
  }
}

/** Carica expo-mail-composer solo se il pezzo nativo "ExpoMailComposer" esiste. */
async function caricaMail(): Promise<ModuloMail | null> {
  try {
    if (Platform.OS !== 'android') return null;
    if (!requireOptionalNativeModule('ExpoMailComposer')) return null;
    return await import('expo-mail-composer');
  } catch {
    return null;
  }
}

export type EsitoCondivisione = 'ok' | 'solo-testo' | 'errore';

/**
 * Apre il pannello di condivisione di Android. Con "percorso" (file gia'
 * scaricato) condivide il FILE allegato; senza, o se le librerie non sono
 * ancora attive, condivide il nome del documento come testo.
 */
export async function condividiDocumento(
  percorso: string | null,
  nome: string,
): Promise<EsitoCondivisione> {
  if (percorso) {
    const Sharing = await caricaSharing();
    if (Sharing) {
      try {
        const disponibile = await Sharing.isAvailableAsync();
        if (disponibile) {
          await Sharing.shareAsync(percorso, {
            mimeType: tipoMime(nome),
            dialogTitle: 'Condividi il documento',
          });
          return 'ok';
        }
      } catch {
        // Se il pannello non si e' aperto si prosegue col piano B qui sotto.
      }
    }
  }
  try {
    await Share.share({
      title: nome,
      message: `Documento dal Portale PFC: ${nome}`,
    });
    return 'solo-testo';
  } catch {
    // L'utente ha chiuso il pannello di sistema: non e' un errore da mostrare.
    return 'errore';
  }
}

export type EsitoEmail = 'ok' | 'solo-testo' | 'annullato' | 'niente-email' | 'errore';

/**
 * Apre l'app di posta con oggetto, testo e (quando attive le librerie)
 * il file gia' allegato: al cliente resta solo da scrivere il
 * destinatario e premere Invia.
 */
export async function inviaDocumentoEmail(
  percorso: string | null,
  nome: string,
): Promise<EsitoEmail> {
  if (percorso) {
    const Mail = await caricaMail();
    if (Mail) {
      try {
        const disponibile = await Mail.isAvailableAsync();
        if (disponibile) {
          const esito = await Mail.composeAsync({
            subject: `Documento: ${nome}`,
            body: 'Documento scaricato dal Portale PFC.',
            attachments: [percorso],
          });
          if (esito.status === 'cancelled') return 'annullato';
          return 'ok'; // 'sent' oppure 'saved' (bozza salvata): in entrambi i casi ok
        }
        return 'niente-email';
      } catch {
        return 'errore';
      }
    }
  }
  try {
    const oggetto = encodeURIComponent(`Documento: ${nome}`);
    const corpo = encodeURIComponent(
      'Documento scaricato dal Portale PFC. Per allegare il file usa "Condividi" nell\'app.',
    );
    await Linking.openURL(`mailto:?subject=${oggetto}&body=${corpo}`);
    return 'solo-testo';
  } catch {
    return 'niente-email';
  }
}

/**
 * Condivisione e invio email (v3.9).
 *
 * - "Condividi": apre il pannello di sistema di Android (quello di Chrome
 *   e WhatsApp) con il FILE VERO allegato: il cliente puo' mandarlo su
 *   WhatsApp, Gmail, Drive, Telegram e tutte le app che ha sul telefono.
 * - "Email": apre la sua app di posta con il file GIA' allegato, oggetto
 *   e testo pronti: deve solo scrivere il destinatario e inviare.
 *
 * FIX v3.9 (perche' "Condividi" non allegava il file mentre Email si'):
 * - la libreria di condivisione di Expo pretende l'indirizzo del file
 *   col prefisso "file://" davanti (visto nel suo sorgente Android:
 *   senza prefisso risponde "Only local file URLs are supported" e
 *   rifiuta). Il download pero' consegna l'indirizzo SENZA prefisso:
 *   per questo la condivisione vera falliva sempre e si apriva il
 *   pannello di soccorso col solo testo.
 * - la posta elettronica invece accetta l'indirizzo cosi' com'e' e lo
 *   sistema da sola: per questo Email funzionava e Condividi no.
 * - Ora l'indirizzo viene sistemato prima di ogni condivisione e il
 *   file da condividere viene copiato col NOME VERO del documento
 *   (es. "Verbale.pdf" invece del nome tecnico interno "pfc_..."):
 *   chi lo riceve vede subito di che documento si tratta.
 * - Se anche dopo la sistemazione il pannello non si apre, ora l'app
 *   lo DICE ("Condivisione non riuscita. Riprova") invece di fingere
 *   tutto normale aprendo il pannello col solo testo.
 *
 * STESSA SICUREZZA DELLA v3.5 (gate silenzioso): le due librerie
 * (expo-sharing, expo-mail-composer) chiedono pezzi nativi che devono
 * essere costruiti DENTRO l'app. Prima di caricarle verifichiamo con
 * requireOptionalNativeModule (restituisce null senza errori e senza
 * log) se esistono. Se non ci sono (vecchie copie dell'app), NON si
 * carica nessun codice: nessun errore, nessun log. E ogni funzione ha
 * un PIANO B che funziona anche li':
 * - Condividi -> pannello di sistema con il NOME del documento (testo)
 * - Email     -> apre l'app di posta con oggetto e testo (senza allegato)
 *
 * Nomi nativi verificati sui due lati: Kotlin (Name("ExpoSharing"),
 * Name("ExpoMailComposer")) e JS (requireNativeModule nei file build).
 */
import { Linking, Platform, Share } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { nomeFileSicuro, tipoMime } from '@/lib/download';

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

/** Aggiunge il prefisso "file://" che la libreria di condivisione pretende. */
function conPrefissoFile(percorso: string): string {
  return percorso.startsWith('file://') ? percorso : `file://${percorso}`;
}

/**
 * Prepara il file da condividere: una copia in cache col NOME VERO del
 * documento (es. "Verbale.pdf"). Chi riceve il file vede il nome giusto
 * invece di un nome tecnico interno. Se la copia non riesce si usa
 * comunque l'originale: l'importante e' che il file parta.
 */
async function preparaFileCondivisibile(
  percorso: string,
  nome: string,
): Promise<string> {
  try {
    const cartella = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/condividi`;
    const destinazione = `${cartella}/${nomeFileSicuro(nome)}`;
    const cartellaGiaPresente = await ReactNativeBlobUtil.fs
      .exists(cartella)
      .catch(() => false);
    if (!cartellaGiaPresente) {
      await ReactNativeBlobUtil.fs.mkdir(cartella);
    }
    await ReactNativeBlobUtil.fs.unlink(destinazione).catch(() => {});
    const copiato = await ReactNativeBlobUtil.fs.cp(percorso, destinazione);
    return copiato ? destinazione : percorso;
  } catch {
    // La copia col nome bello e' un vezzo: se non riesce parte l'originale.
    return percorso;
  }
}

export type EsitoCondivisione = 'ok' | 'solo-testo' | 'errore';

/**
 * Piano B (solo per le vecchie copie dell'app senza la libreria nativa):
 * pannello di sistema col NOME del documento come testo, senza file.
 */
async function condividiSoloTesto(nome: string): Promise<EsitoCondivisione> {
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

/**
 * Apre il pannello di condivisione di Android con il FILE VERO allegato
 * (dal v3.9, con l'indirizzo sistemato come la libreria pretende).
 * Il piano B col solo testo resta solo per le vecchie copie dell'app
 * che non hanno ancora la libreria dentro.
 */
export async function condividiDocumento(
  percorso: string | null,
  nome: string,
): Promise<EsitoCondivisione> {
  const Sharing = await caricaSharing();
  if (!Sharing || !percorso) {
    return condividiSoloTesto(nome);
  }
  try {
    const disponibile = await Sharing.isAvailableAsync();
    if (!disponibile) {
      return condividiSoloTesto(nome);
    }
    // FIX v3.9: prefisso "file://" obbligatorio (senza la libreria
    // rifiutava e non allegava niente) + copia col nome vero del file.
    const file = conPrefissoFile(await preparaFileCondivisibile(percorso, nome));
    await Sharing.shareAsync(file, {
      mimeType: tipoMime(nome),
      dialogTitle: 'Condividi il documento',
    });
    return 'ok';
  } catch {
    // v3.9: la libreria c'e' ma il pannello non si e' aperto: e' un
    // problema VERO e va detto, non nascosto col finto piano B.
    return 'errore';
  }
}

export type EsitoEmail = 'ok' | 'solo-testo' | 'annullato' | 'niente-email' | 'errore';

/**
 * Apre l'app di posta con oggetto, testo e il file gia' allegato: al
 * cliente resta solo da scrivere il destinatario e premere Invia.
 * (v3.9: INTOCCATA - questa funzione gia' funzionava, la libreria della
 * posta sistema l'indirizzo del file da sola.)
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

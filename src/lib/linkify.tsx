/**
 * Portale PFC — Link cliccabili nel testo (v4.19).
 *
 * Quando lo studio scrive un sito internet dentro un messaggio o un avviso
 * ("visita www.studio.it" o "https://agenziaentrate.gov.it"), il cliente si
 * aspetta di poterci toccare sopra e arrivare al sito. Qui spezziamo il
 * testo in pezzi: i pezzi normali restano testo semplice (ereditano lo stile
 * del <Text> padre), gli indirizzi diventano <Text> toccabili che aprono il
 * browser del telefono (Linking.openURL).
 *
 * Usato da:
 * - AvvisiBanner (avvisi pubblici dello studio, sotto la TopBar)
 * - MessaggiScreen (corpo dei messaggi privati)
 */

import React from 'react';
import { Linking, Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

/** http://..., https://..., www.... oppure anche i domini scritti senza
 *  www ("studios.it", "agenziaentrate.gov.it/istanze"): v4.90. Prima la
 *  regex vedeva solo i link con www o http(s) davanti, quindi i siti
 *  scritti senza restavano testo semplice, non cliccabile. La lista dei
 *  suffissi (TLD) evita falsi positivi su numeri e nomi di file
 *  ("1.87.2", "documento.pdf"). Fermati al primo spazio. */
const MOTIVO_LINK =
  /(https?:\/\/[^\s]+|www\.[^\s]+|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:it|com|net|org|eu|io|gov|edu|info|biz|co|uk|fr|de|es|ch|us|nl|pt|me|xyz|online|site|shop|app|store)(?:\/[^\s]*)?)/gi;

/** Punteggiatura che spesso chiude la frase e NON fa parte del link. */
const CODA_LINK = '.,;:!?)]}>\'"';

/**
 * Stacca dal link la punteggiatura finale ("...vai su https://x.it." ->
 * link "https://x.it" + punto che resta testo normale). Il link rimane
 * valido anche quando lo studio scrive la frase con il punto finale.
 */
function pulisciLink(linkGrezzo: string): { url: string; coda: string } {
  let url = linkGrezzo;
  let coda = '';
  for (;;) {
    const ultima = url[url.length - 1];
    if (ultima === undefined || !CODA_LINK.includes(ultima)) break;
    coda = ultima + coda;
    url = url.slice(0, -1);
  }
  return { url, coda };
}

/**
 * Apre il link nel browser. "www...." diventa "https://www....".
 * Se il telefono rifiuta l'apertura (niente browser ecc.) resta silenzioso:
 * non vale la pena mandare errori a schermo per un link.
 */
export function apriLink(url: string): void {
  const destinazione =
    url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`;
  Linking.openURL(destinazione).catch(() => {
    // silenzioso: nessun crash se non c'e' un browser disponibile
  });
}

/**
 * Spezza il testo in nodi React: stringhe normali (ereditano lo stile del
 * padre) e link cliccabili (con lo stile "link" passato da chi lo usa).
 *
 * Uso:  <Text style={styles.corpo}>{spezzaLink(msg.corpo, styles.corpoLink)}</Text>
 */
export function spezzaLink(
  testo: string,
  stileLink: StyleProp<TextStyle>,
): React.ReactNode[] {
  const pezzi: React.ReactNode[] = [];
  if (!testo) return pezzi;

  const re = new RegExp(MOTIVO_LINK.source, 'gi');
  let ultimo = 0;
  let chiave = 0;
  let trovato: RegExpExecArray | null;

  while ((trovato = re.exec(testo)) !== null) {
    // v4.90: niente link dentro parole piu' lunghe o email. Se il
    // carattere subito prima del match e' una lettera, un numero, @,
    // punto, trattino o slash, il pezzo fa parte di qualcos'altro
    // ("nome@studio.it"): il match salta e la ricerca riparte dal
    // carattere dopo. Vale anche per i "www." subito dopo una @.
    const prima = trovato.index > 0 ? (testo[trovato.index - 1] ?? '') : '';
    const grezzo = trovato[0];
    const nudo = !/^https?:\/\//i.test(grezzo) && !/^www\./i.test(grezzo);
    if (prima === '@' || (nudo && /[A-Za-z0-9._\/-]/.test(prima))) {
      re.lastIndex = trovato.index + 1;
      continue;
    }
    // Testo normale PRIMA del link (come stringa: eredita lo stile padre)
    if (trovato.index > ultimo) {
      pezzi.push(testo.slice(ultimo, trovato.index));
    }
    const { url, coda } = pulisciLink(trovato[0]);
    if (!url) {
      // Estremo raro (solo punteggiatura): resta testo semplice
      pezzi.push(trovato[0]);
    } else {
      pezzi.push(
        <Text
          key={`link-${chiave++}`}
          style={stileLink}
          onPress={() => apriLink(url)}
          accessibilityRole="link"
          accessibilityLabel={`Apri il sito ${url}`}
        >
          {url}
        </Text>,
      );
      if (coda) pezzi.push(coda);
    }
    ultimo = trovato.index + trovato[0].length;
  }

  // Coda finale dopo l'ultimo link
  if (ultimo < testo.length) pezzi.push(testo.slice(ultimo));
  return pezzi;
}

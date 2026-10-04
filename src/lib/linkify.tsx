/**
 * Portale PFC - Link cliccabili nel testo (v4.19).
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
 *
 * v4.92 - ADDIO TOCCO MUTO: due strade per aprire il sito.
 * 1) apriLink non tace piu': se il telefono rifiuta l'apertura (niente
 *    browser, errore Android...) compare un avviso a schermo con il
 *    motivo. Prima l'errore veniva inghiottito e il link sembrava
 *    "morto" anche quando il tocco arrivava fino a qui.
 * 2) TestoConLink: il testo che contiene un sito viene avvolto in un
 *    Pressable di riserva: se il tocco sul pezzo-link non parte (sul
 *    tocco del testo annidato alcuni telefoni Android fanno i capricci),
 *    il sito si apre comunque. I testi senza siti restano come prima.
 */

import React from 'react';
import { Alert, Linking, Pressable, Text } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

/** http://..., https://..., www.... oppure anche i domini scritti senza
 *  www ("studios.it", "agenziaentrate.gov.it/istanze"): v4.90. Prima la
 *  regex vedeva solo i link con www o http(s) davanti, quindi i siti
 *  scritti senza restavano testo semplice, non cliccabile. La lista dei
 *  suffissi (TLD) evita falsi positivi su numeri e nomi di file
 *  ("1.87.2", "documento.pdf"). Fermati al primo spazio. */
const MOTIVO_LINK =
  /(https?:\/\/[^\s]+|www\.[^\s]+|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:it|com|net|org|eu|io|gov|edu|info|biz|co|uk|fr|de|es|ch|us|nl|pt|me|xyz|online|site|shop|app|store)(?:\/[^\s]*)?)/gi;

/** Punteggiatura che spesso chiude la frase e NON fa parte del link. */
const CODA_LINK = '.,;:!?)]}>"';

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

/** v4.92: il carattere subito prima del match fa parte di qualcos'altro
 *  (email, parola piu' lunga)? Allora il match va ignorato. E' la regola
 *  della v4.90, qui estratta per riusarla anche in primoLink. */
function matchDaIgnorare(testo: string, trovato: RegExpExecArray): boolean {
  const prima = trovato.index > 0 ? (testo[trovato.index - 1] ?? '') : '';
  const grezzo = trovato[0];
  const nudo = !/^https?:\/\//i.test(grezzo) && !/^www\./i.test(grezzo);
  return prima === '@' || (nudo && /[A-Za-z0-9._\/-]/.test(prima));
}

/**
 * Apre il link nel browser. "www...." e i domini nudi diventano
 * "https://...".
 *
 * v4.92: se il telefono rifiuta l'apertura, compare un avviso con il
 * motivo invece del silenzio: un link che non parte non si puo' piu'
 * confondere con un tocco che non arriva.
 */
export function apriLink(url: string): void {
  const pulito = url.trim();
  const destinazione = /^https?:\/\//i.test(pulito)
    ? pulito
    : `https://${pulito}`;
  Linking.openURL(destinazione).catch((errore: unknown) => {
    const motivo = errore instanceof Error ? errore.message : String(errore);
    Alert.alert(
      'Non riesco ad aprire il link',
      `${destinazione}\n\nMotivo: ${motivo}`,
    );
  });
}

/** v4.92: il PRIMO sito riconosciuto nel testo (o null). E' la materia
 *  prima della strada di riserva di TestoConLink. */
function primoLink(testo: string): string | null {
  if (!testo) return null;
  const re = new RegExp(MOTIVO_LINK.source, 'gi');
  let trovato: RegExpExecArray | null;
  while ((trovato = re.exec(testo)) !== null) {
    if (matchDaIgnorare(testo, trovato)) {
      re.lastIndex = trovato.index + 1;
      continue;
    }
    const { url } = pulisciLink(trovato[0]);
    if (url) return url;
  }
  return null;
}

/**
 * Spezza il testo in nodi React: stringhe normali (ereditano lo stile del
 * padre) e link cliccabili (con lo stile "link" passato da chi lo usa).
 *
 * Uso diretto (senza riserva):  <Text>{spezzaLink(t, st.link)}</Text>
 * Uso con la strada di riserva: <TestoConLink ... />
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
    // v4.90: niente link dentro parole piu' lunghe o email (matchDaIgnorare)
    if (matchDaIgnorare(testo, trovato)) {
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
      // v4.92: via accessibilityRole/accessibilityLabel: restano solo le
      // proprieta' che servono al tocco (stile + onPress): una variabile
      // in meno nella catena del tocco del testo annidato.
      pezzi.push(
        <Text
          key={`link-${chiave++}`}
          style={stileLink}
          onPress={() => apriLink(url)}
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

/**
 * v4.92: il testo con dentro un sito, con la STRADA DI RISERVA.
 *
 * Il pezzo-link resta un <Text onPress> (strada normale); intorno al
 * testo c'e' un Pressable che apre il primo sito trovato: se il tocco
 * del testo annidato non parte su qualche telefono, il sito si apre
 * comunque toccando il testo. Nei testi SENZA siti il Pressable resta
 * inerte (niente onPress): zero cambi per tutti gli altri testi.
 */
export function TestoConLink({
  testo,
  stileTesto,
  stileLink,
  stilePremuto,
}: {
  testo: string;
  stileTesto: StyleProp<TextStyle>;
  stileLink: StyleProp<TextStyle>;
  stilePremuto?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const link = primoLink(testo);
  return (
    <Pressable
      onPress={link ? () => apriLink(link) : undefined}
      style={({ pressed }) =>
        link && pressed && stilePremuto ? stilePremuto : undefined
      }
    >
      <Text style={stileTesto}>{spezzaLink(testo, stileLink)}</Text>
    </Pressable>
  );
}

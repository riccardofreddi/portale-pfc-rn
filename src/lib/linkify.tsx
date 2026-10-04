/**
 * Portale PFC - Link cliccabili nel testo (v4.19).
 *
 * Quando lo studio scrive un sito internet dentro un messaggio o un avviso
 * ("visita www.studio.it" o "https://agenziaentrate.gov.it"), il cliente si
 * aspetta di poterci toccare sopra e arrivare al sito. Qui spezziamo il
 * testo in pezzi: i pezzi normali restano testo semplice (ereditano lo stile
 * del <Text> padre), gli indirizzi diventano pezzi evidenziati (oro,
 * sottolineato) e il tocco apre il browser del telefono (Linking.openURL).
 *
 * Usato da:
 * - AvvisiBanner (avvisi pubblici dello studio, sotto la TopBar)
 * - MessaggiScreen (corpo dei messaggi privati)
 *
 * Storia del tocco:
 * - v4.19: i pezzi-link erano <Text onPress> annidati: sul vecchio motore
 *   funzionavano, sulla NUOVA architettura (Fabric, attiva in questa app)
 *   il tocco del testo annidato e' la strada fragile: su parecchi telefoni
 *   il tocco arriva ma l' onPress non parte.
 * - v4.90: siti riconosciuti anche senza www davanti.
 * - v4.92: aggiunto un Pressable di riserva attorno al testo. Peccato che
 *   sul tocco CADUTO ESATTAMENTE sul link vinca comunque il pezzo annidato
 *   (il piu' interno vince la competizione del tocco) e se il suo onPress
 *   non parte il link resta morto: e' il caso visto dal titolare ("nei
 *   messaggi privati non mi fa cliccare il link").
 * - v4.93: ADDIO COMPETIZIONE. Un testo toccabile SOLO: il corpo intero.
 *   I pezzi-link restano evidenziati (stile) ma SENZA onPress proprio:
 *   qualsiasi tocco (o pressa lunga) sul testo apre il sito, passando dal
 *   tocco del <Text> REALE, la stessa strada solidale dei bottoni di tutta
 *   l'app (niente piu' nodi virtuali che si contendono il tocco). Nei
 *   messaggi con piu' siti si apre il primo: e' la stessa regola che la
 *   v4.92 usava come riserva, qui diventa la strada principale. I testi
 *   senza siti restano testo semplice, identici a prima.
 *
 * Nota tecnica: il rilevamento link NATIVO di Android (dataDetectorType)
 * non esiste sulla nuova architettura, quindi la strada "natale" non e'
 * disponibile: il tocco unico del Text reale e' la piu' affidabile.
 */

import React, { useState } from 'react';
import { Alert, Linking, Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

/** http://..., https://..., www.... oppure anche i domini scritti senza
 *  www ("studios.it", "agenziaentrate.gov.it/istanze"): v4.90. Prima la
 *  regex vedeva solo i link con www o http(s) davanti, quindi i siti
 *  scritti senza restavano testo semplice, non cliccabile. La lista dei
 *  suffissi (TLD) evita falsi positivi su numeri e nomi di file
 *  ("1.87.2", "documento.pdf"). Fermati al primo spazio.
 *
 *  v4.93: lista TLD allargata. Il cliente non deve perdere un link per
 *  colpa di un suffisso mancante: entrano i paesi toccati dallo studio
 *  (sm, va, at, fr...), i domini di settore (pec non esiste, ma studio,
 *  finance, tax, legal...), i moderni (cloud, tech, digital...) e le
 *  regioni italiane che hanno un proprio dominio (lazio, sicilia...). */
const MOTIVO_LINK =
  /(https?:\/\/[^\s]+|www\.[^\s]+|\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:it|com|net|org|eu|io|gov|edu|info|biz|co|uk|fr|de|es|ch|us|nl|pt|me|xyz|online|site|shop|app|store|at|be|sm|va|ie|mt|lu|mc|ad|se|no|fi|dk|is|pl|cz|sk|hu|ro|bg|gr|tr|ru|ua|si|hr|ee|lv|lt|cy|al|rs|ba|mk|ca|mx|br|ar|cl|pe|au|nz|jp|kr|cn|in|za|ae|il|ai|tv|fm|mobi|tel|aero|asia|cat|int|jobs|pro|coop|name|cloud|tech|digital|studio|finance|agency|company|group|solutions|services|support|systems|expert|consulting|email|link|page|blog|news|tips|tools|top|work|zone|live|life|world|club|fun|game|games|vip|icu|website|space|network|media|design|dev|guru|capital|partners|legal|law|accountant|accountants|tax|money|bank|insurance|abruzzo|calabria|campania|friuli|lazio|liguria|lombardia|marche|molise|piemonte|puglia|sardegna|sicilia|toscana|trentino|umbria|veneto|romagna|emilia)(?![a-z0-9-])(?:\/[^\s]*)?)/gi;

/** Punteggiatura che spesso chiude la frase e NON fa parte del link.
 *  v4.93: entrano anche gli apostrofi e le virgolette tipografiche. */
const CODA_LINK = '.,;:!?)]}>"\'’”';

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

/** Il carattere subito prima del match fa parte di qualcos'altro
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

/** Il PRIMO sito riconosciuto nel testo (o null): e' il sito che apre il
 *  tocco del testo intero (v4.93). Con la stessa regex e gli stessi filtri
 *  di spezzaLink: se qui non c'e' sito, l'evidenziazione non ne trova. */
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
 * Spezza il testo in nodi React: stringhe normali e pezzi-link EVIDENZIATI
 * (v4.93: solo stile, SENZA onPress: il tocco lo gestisce il <Text> padre
 * in TestoConLink, unico toccabile del testo). Se il testo non contiene
 * siti il risultato e' il testo stesso, identico a prima.
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
      // v4.93: il pezzo-link e' SOLO evidenziazione (stile): nessun onPress
      // qui dentro. Il tocco lo prende il Text padre (vedi TestoConLink):
      // un solo toccabile, zero competizioni, zero tocchi muti.
      pezzi.push(
        <Text key={`link-${chiave++}`} style={stileLink}>
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
 * Il testo con dentro un sito, TOCCABILE IN UN SOLO PUNTO (v4.93).
 *
 * Se il testo contiene almeno un sito, tutto il testo diventa toccabile
 * (onPress + pressa lunga come rete di sicurezza) e qualunque tocco apre
 * il primo sito trovato. Il feedback "premuto" (stilePremuto, di solito
 * una leggera trasparenza) e' gestito qui con onPressIn/onPressOut, come
 * faceva il Pressable della v4.92 ma senza il suo costo: niente nodo che
 * compete per il tocco con i pezzi di testo. Nei testi SENZA siti nulla
 * cambia: testo semplice, non toccabile, identico a prima.
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
  stilePremuto?: StyleProp<TextStyle>;
}): React.ReactElement {
  // Hook PRIMA di ogni uscita condizionale: regola dei React hooks.
  const [premuto, setPremuto] = useState(false);
  const link = primoLink(testo);

  if (!link) {
    // Nessun sito: testo semplice (i pezzi non esisterebbero comunque)
    return <Text style={stileTesto}>{testo}</Text>;
  }

  return (
    <Text
      style={[stileTesto, premuto && stilePremuto ? stilePremuto : null]}
      suppressHighlighting
      onPress={() => apriLink(link)}
      onLongPress={() => apriLink(link)}
      onPressIn={() => setPremuto(true)}
      onPressOut={() => setPremuto(false)}
    >
      {spezzaLink(testo, stileLink)}
    </Text>
  );
}

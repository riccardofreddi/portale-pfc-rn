/**
 * lib/iban — v4.66, richiesta del titolare: nel Cassetto il cliente deve
 * poter SCRIVERE il proprio IBAN invece di dover caricare per forza un file.
 *
 * Cosa fa questo modulo:
 * - pulizia e formattazione dell'IBAN mentre si scrive (gruppetti di 4,
 *   maiuscole automatiche, spazi e simboli tolti da soli: si puo' incollare
 *   direttamente il codice copiato dall'home banking);
 * - controllo VERO dell'IBAN italiano: formato IT + 2 cifre di controllo +
 *   23 caratteri (27 in tutto) e verifica completa di controllo (standard
 *   ISO 7064, modulo 97): un codice sbagliato non diventa mai un documento;
 * - generazione del file "IBAN.pdf" DENTRO il telefono, senza librerie
 *   nuove e senza toccare il server: un PDF A4 minimo con SOLO
 *   "Intestatario: <nome>" e "IBAN: <codice>".
 *   v4.66 — dettaglio voluto dal titolare: il file e' SPOGLIO, niente nome
 *   dello studio, niente logo, niente date o "dichiarazioni": lo studio non
 *   si assume la responsabilita' di cio' che il cliente scrive. Il file
 *   sale nel Cassetto con l'endpoint di sempre (api.cassetto.upload), quindi
 *   appare in lista, si apre nell'anteprima, si scarica e si condivide come
 *   qualsiasi documento, e occupa lo slot "IBAN" con la stessa regola
 *   "uno slot per tipo" (gia' occupato -> grigio "gia' caricato").
 *
 * Nota tecnica: il PDF e' costruito a mano in ASCII (operatori base,
 * Helvetica di serie dei lettori PDF). La stessa logica e' stata validata
 * fuori dall'app: il file esce identico byte per byte al prototipo
 * verificato con un lettore PDF indipendente.
 */

const ALFABETO_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/* Nota: da qui in fondo le regole "no-bitwise" sono spente DI PROPOSITO:
 * la codifica base64 e il taglio dei byte sono operazioni sui bit per
 * definizione (spostamenti e maschere), non sono codice oscuro. */
/* eslint-disable no-bitwise */

/** Toglie spazi, trattini, punti e qualsiasi cosa non sia lettera o cifra;
 * porta tutto in maiuscolo. "it60 x054-2811" -> "IT60X0542811". */
export function pulisciIban(testo: string): string {
  return testo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/** Formattazione per la videata: gruppetti di 4 separati da spazio, massimo 27
 * caratteri utili. Si applica a ogni battuta, cosi' il codice si legge
 * come nell'home banking. */
export function formattaIban(testo: string): string {
  const pulito = pulisciIban(testo).slice(0, 27);
  return pulito.replace(/(.{4})/g, '$1 ').trim();
}

/** Controllo VERO dell'IBAN italiano: forma giusta E sequenza di controllo
 * giusta (ISO 7064 / modulo 97, lo stesso algoritmo delle banche).
 * Ritorna true solo se il codice puo' esistere davvero. */
export function ibanValido(iban: string): boolean {
  const pulito = pulisciIban(iban);
  // IBAN italiano: IT + 2 cifre di controllo + 23 caratteri alfanumerici = 27
  if (!/^IT\d{2}[A-Z0-9]{23}$/.test(pulito)) {return false;}
  // Standard: le prime 4 posizioni vanno in fondo, le lettere diventano
  // numeri (A=10 ... Z=35) e il grande numero che ne esce, diviso 97,
  // deve dare resto 1.
  const ribaltato = pulito.slice(4) + pulito.slice(0, 4);
  let resto = 0;
  for (const c of ribaltato) {
    let valore: number;
    if (c >= '0' && c <= '9') {valore = c.charCodeAt(0) - 48;}
    else if (c >= 'A' && c <= 'Z') {valore = c.charCodeAt(0) - 55;}
    else {return false;}
    // le lettere pesano due cifre: si moltiplica per 100 invece che per 10
    resto = (resto * (valore > 9 ? 100 : 10) + valore) % 97;
  }
  return resto === 1;
}

/** Toglie le lettere accentate per il PDF (che viaggia in ASCII puro):
 * "Niccolo'" -> "NICCOLO". */
function rimuoviAccenti(testo: string): string {
  return testo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Le regole di scrittura del testo dentro un PDF: backslash e parentesi
 * vanno protette, altrimenti rompono il documento. */
function pdfEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Base64 fatto a mano (niente dipendenze): prende i byte e li impacchetta
 * 6 alla volta, con il riempimento "=" quando l'ultima terna e' incompleta. */
function base64DaByte(byte: number[]): string {
  let out = '';
  for (let i = 0; i < byte.length; i += 3) {
    const b1 = byte[i] ?? 0;
    const b2 = byte[i + 1];
    const b3 = byte[i + 2];
    out += ALFABETO_B64[b1 >> 2];
    out += b2 === undefined ? ALFABETO_B64[(b1 & 3) << 4] : ALFABETO_B64[((b1 & 3) << 4) | (b2 >> 4)];
    out += b2 === undefined ? '=' : (b3 === undefined ? ALFABETO_B64[(b2 & 15) << 2] : ALFABETO_B64[((b2 & 15) << 2) | (b3 >> 6)]);
    out += b3 === undefined ? '=' : ALFABETO_B64[b3 & 63];
  }
  return out;
}

/** Crea il file "IBAN.pdf" MINIMO richiesto dal titolare: foglio bianco A4,
 * solo due righe nere — "Intestatario: ..." e "IBAN: ...". Nessun riferimento
 * allo studio (niente nome, logo, colori, date): il documento non dichiara
 * niente, registra soltanto le coordinate scritte dal cliente.
 * Ritorna il contenuto in base64, pronto per essere scritto in cache e
 * caricato con api.cassetto.upload. */
export function generaPdfIbanMinimo(intestatario: string, iban: string): string {
  const intest = rimuoviAccenti(intestatario).toUpperCase();
  const gruppi = formattaIban(iban);

  // Pagina A4 in "punti" (72 per pollice): 595 x 842.
  const W = 595;
  const H = 842;
  const ops = [
    // foglio bianco
    '1 1 1 rg 0 0 ' + W + ' ' + H + ' re f',
    // le due righe richieste, testo nero
    'BT /F1 14 Tf 0 0 0 rg 70 ' + (H - 200) + ' Td (Intestatario: ' + pdfEscape(intest) + ') Tj ET',
    'BT /F1 14 Tf 0 0 0 rg 70 ' + (H - 240) + ' Td (IBAN: ' + pdfEscape(gruppi) + ') Tj ET',
  ];
  const content = ops.join('\n');

  // Struttura minima del PDF: catalogo, pagine, la pagina, il font di serie
  // Helvetica e il "flusso" di contenuto scritto sopra.
  const objs = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '5 0 obj\n<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n',
  ];

  // Il PDF richiede la tabella degli indirizzi (xref) con la posizione ESATTA
  // di ogni pezzo: la calibriamo mentre scriviamo.
  let pdf = '%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n';
  const offsets: number[] = [];
  for (const o of objs) {
    offsets.push(pdf.length);
    pdf += o;
  }
  const xrefPos = pdf.length;
  let xref = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  for (const off of offsets) {xref += String(off).padStart(10, '0') + ' 00000 n \n';}
  xref += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF\n';
  pdf += xref;

  // Da testo a byte (i 4 caratteri della firma binaria sono sopra i 127:
  // qui ogni carattere vale esattamente un byte) e poi in base64.
  const byte: number[] = [];
  for (let i = 0; i < pdf.length; i++) {byte.push(pdf.charCodeAt(i) & 0xff);}
  return base64DaByte(byte);
}

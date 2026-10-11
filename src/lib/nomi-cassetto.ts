/**
 * Nomi del Cassetto: pulizia del PREFISSO TECNICO (v4.111).
 *
 * v4.109 (in CassettoScreen) / v4.111 (lib condivisa):
 * il server incide TIPO e ANNO nella chiave del Cassetto
 * ({tipoKey}_{anno}[_{nomeutente}].{ext}; vedi cassetto/rename/route.ts:
 * la rinomina ricostruisce SEMPRE il prefisso per la regola "uno slot
 * per tipo"). Quel prefisso e' tecnico: NON deve mai arrivare all'utente.
 *
 * nomeVisibile toglie "{tipoKey}_{anno}_" quando esiste la parte col nome
 * scelto dall'utente; i file MAI rinominati ("altro_2026.pdf", senza parte
 * utente) restano com'erano: si puliscono al primo cambio nome.
 *
 * v4.111: la funzione esce da CassettoScreen per servire anche il
 * REGISTRO ATTIVITA': la voce di rinomina del Cassetto arriva dal server
 * come chiavi tecniche ("altro_2026.pdf -> altro_2026_bilancio.pdf",
 * logAudit in cassetto/rename/route.ts) e al cliente appariva il prefisso
 * davanti al nome nuovo — sembrava il file vecchio con la rinomina
 * incollata dopo. Nel registro si vede solo "bilancio.pdf".
 */

const RE_PREFISSO_TECNICO =
  /^(qr_code_p_iva|certificato_p_iva|visura_camerale|doc_identita|iban|altro)_(\d{4})(?:_(.+))?(\.[^.]*)$/;

export function nomeVisibile(nome: string): string {
  const m = nome.match(RE_PREFISSO_TECNICO);
  if (m && m[3]) return `${m[3]}${m[4]}`;
  return nome;
}

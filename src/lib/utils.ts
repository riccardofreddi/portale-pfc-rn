/**
 * Utility functions per date e formatting.
 */

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export { MAX_FILE_SIZE_BYTES };
export const MAX_FILE_SIZE_MB = 50;

/** Formatta una data in formato italiano: "30 ago 2024" */
export function formatDate(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Formatta una data con ora: "30 ago 2024, 14:30" */
export function formatDateAudit(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Tempo relativo: "2 ore fa", "ieri", "3 giorni fa" */
export function timeAgo(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = now - d.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);

  if (sec < 60) return 'adesso';
  if (min < 60) return `${min} min fa`;
  if (hour < 24) return `${hour} ${hour === 1 ? 'ora' : 'ore'} fa`;
  if (day < 7) return `${day} ${day === 1 ? 'giorno' : 'giorni'} fa`;
  return formatDate(d);
}

/** Iniziali di un nome: "Mario Rossi" -> "MR" */
export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts[parts.length - 1]?.[0] ?? '';
  return (first + last).toUpperCase();
}

/**
 * v4.20: data "gentile" per la Bacheca delle Comunicazioni:
 * "Oggi · 09:15", "Ieri · 17:40", "12 set · 11:20".
 * I nomi dei mesi sono scritti a mano (niente dipendenza dal locale del
 * telefono): la data esce sempre in italiano su ogni device.
 */
export function dataGentile(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const adesso = new Date();
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
  if (d.toDateString() === adesso.toDateString()) return `Oggi · ${hhmm}`;
  const ieri = new Date(adesso);
  ieri.setDate(adesso.getDate() - 1);
  if (d.toDateString() === ieri.toDateString()) return `Ieri · ${hhmm}`;
  const MESI = [
    'gen',
    'feb',
    'mar',
    'apr',
    'mag',
    'giu',
    'lug',
    'ago',
    'set',
    'ott',
    'nov',
    'dic',
  ];
  const mese = MESI[d.getMonth()] ?? '';
  return `${d.getDate()} ${mese} · ${hhmm}`;
}
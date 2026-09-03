/**
 * Deep-link parser per URL notifiche.
 *
 * Formati URL gestiti (compatibili con il backend v2):
 *   /                              → home (no navigazione specifica)
 *   /?tab=messaggi                 → tab Messaggi
 *   /?tab=archivio                 → tab Archivio
 *   /?tab=archivio&anno=2024       → tab Archivio + anno selezionato
 *   /?tab=archivio&anno=2024&cartella=F24  → tab Archivio + anno + cartella
 *   /?tab=cassetto                 → tab Cassetto
 *   /?tab=attivita                 → tab Attività
 */

import type { ClienteTab } from '@/store/auth';

export interface DeepLinkTarget {
  tab?: ClienteTab;
  anno?: string;
  cartella?: string;
  /** Se true, apri anche il pannello notifiche */
  openNotifiche?: boolean;
}

export function parseDeepLink(url: string | undefined | null): DeepLinkTarget | null {
  if (!url || url === '/' || url === '') return null;

  try {
    // Gestisce sia URL assoluti che path relativi
    const urlObj = url.startsWith('http')
      ? new URL(url)
      : new URL(url, 'https://placeholder.com');
    const params = urlObj.searchParams;

    const tab = params.get('tab') as ClienteTab | null;
    const anno = params.get('anno') ?? undefined;
    const cartella = params.get('cartella') ?? undefined;
    const openNotif = params.get('notif') === '1';

    if (!tab && !anno && !cartella && !openNotif) return null;

    return {
      tab: tab ?? undefined,
      anno,
      cartella,
      openNotifiche: openNotif,
    };
  } catch {
    return null;
  }
}
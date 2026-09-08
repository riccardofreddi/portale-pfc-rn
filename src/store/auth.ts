/**
 * Store globale dell'app.
 * Gestisce auth + stato UI + badge contatori + deep-link pendenti.
 */

import { create } from 'zustand';
import type { DeepLinkTarget } from '@/lib/deeplink';
import type { FileItem, User } from '@/types/api';

export type ClienteTab = 'archivio' | 'messaggi' | 'cassetto' | 'attivita';

/**
 * v4.6: documento da aprire in automatico nell'Archivio (deep-link da una
 * notifica di scadenza). Arriva dal tap sulla notifica (promemoria locale,
 * push del server o riga della campanella); l'Archivio lo consuma appena
 * ha caricato la cartella giusta e poi lo azzera.
 */
export interface PendingDocumento {
  anno: string;
  cartella: string;
  documento: string;
}

interface AppState {
  // === Auth ===
  user: User | null;
  loadingUser: boolean;
  setUser: (u: User | null) => void;
  setLoadingUser: (b: boolean) => void;

  // === Navigation ===
  clienteTab: ClienteTab;
  setClienteTab: (t: ClienteTab) => void;

  // === Archivio ===
  annoSelezionato: string | null;
  cartellaSelezionata: string | null;
  setAnno: (a: string | null) => void;
  setCartella: (c: string | null) => void;

  // === Preview PDF ===
  previewFile: FileItem | null;
  setPreviewFile: (f: FileItem | null) => void;

  // === v4.6: documento da aprire da una notifica (deep-link) ===
  pendingDocumento: PendingDocumento | null;
  setPendingDocumento: (d: PendingDocumento | null) => void;

  // === Badge contatori ===
  nNotifiche: number;
  setNNotifiche: (n: number) => void;
  nMessaggiNonLetti: number;
  setNMessaggiNonLetti: (n: number) => void;

  // === Pannelli modali ===
  showNotifPanel: boolean;
  setShowNotifPanel: (b: boolean) => void;
  settingsOpen: boolean;
  setSettingsOpen: (b: boolean) => void;

  // === Deep-link pendente ===
  pendingDeepLink: DeepLinkTarget | null;
  setPendingDeepLink: (t: DeepLinkTarget | null) => void;

  // === Reset globale ===
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  loadingUser: true,
  setUser: (u) =>
    set((s) => {
      if (s.user?.username !== u?.username) {
        return {
          user: u,
          loadingUser: false,
          annoSelezionato: null,
          cartellaSelezionata: null,
          previewFile: null,
          pendingDocumento: null,
          nNotifiche: 0,
          nMessaggiNonLetti: 0,
          showNotifPanel: false,
          settingsOpen: false,
          clienteTab: 'archivio',
          // v4.7: NON cancellare il deep-link pendente. Quando l'app parte
          // da una notifica toccata a telefono chiuso, il tap arriva PRIMA
          // della verifica della sessione (getInitialNotification e' locale
          // e veloce, api.auth.me() passa dalla rete): se qui lo azzerassimo,
          // l'app si aprirebbe senza portare l'utente nel contenuto giusto.
          // Lo teniamo e lo consumera' la tab bar appena montata; a fine
          // consumazione viene pulito dal consumatore del deep-link.
          pendingDeepLink: s.pendingDeepLink,
        };
      }
      return { user: u };
    }),
  setLoadingUser: (b) => set({ loadingUser: b }),

  // Navigation
  clienteTab: 'archivio',
  setClienteTab: (t) => set({ clienteTab: t }),

  // Archivio
  annoSelezionato: null,
  cartellaSelezionata: null,
  setAnno: (a) => set({ annoSelezionato: a, cartellaSelezionata: null }),
  setCartella: (c) => set({ cartellaSelezionata: c }),

  // Preview
  previewFile: null,
  setPreviewFile: (f) => set({ previewFile: f }),

  // v4.6: documento da aprire da notifica
  pendingDocumento: null,
  setPendingDocumento: (d) => set({ pendingDocumento: d }),

  // Badge
  nNotifiche: 0,
  setNNotifiche: (n) => set({ nNotifiche: n }),
  nMessaggiNonLetti: 0,
  setNMessaggiNonLetti: (n) => set({ nMessaggiNonLetti: n }),

  // Modali
  showNotifPanel: false,
  setShowNotifPanel: (b) => set({ showNotifPanel: b }),
  settingsOpen: false,
  setSettingsOpen: (b) => set({ settingsOpen: b }),

  // Deep-link
  pendingDeepLink: null,
  setPendingDeepLink: (t) => set({ pendingDeepLink: t }),

  // Reset
  reset: () =>
    set({
      user: null,
      loadingUser: false,
      annoSelezionato: null,
      cartellaSelezionata: null,
      previewFile: null,
      pendingDocumento: null,
      nNotifiche: 0,
      nMessaggiNonLetti: 0,
      showNotifPanel: false,
      settingsOpen: false,
      pendingDeepLink: null,
      clienteTab: 'archivio',
    }),
}));
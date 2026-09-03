/**
 * Store globale dell'app.
 * Gestisce auth + stato UI + badge contatori + deep-link pendenti.
 */

import { create } from 'zustand';
import type { DeepLinkTarget } from '@/lib/deeplink';
import type { FileItem, User } from '@/types/api';

export type ClienteTab = 'archivio' | 'messaggi' | 'cassetto' | 'attivita';

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
          nNotifiche: 0,
          nMessaggiNonLetti: 0,
          showNotifPanel: false,
          settingsOpen: false,
          pendingDeepLink: null,
          clienteTab: 'archivio',
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
      nNotifiche: 0,
      nMessaggiNonLetti: 0,
      showNotifPanel: false,
      settingsOpen: false,
      pendingDeepLink: null,
      clienteTab: 'archivio',
    }),
}));
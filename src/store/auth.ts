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

  // === v4.83: rivedere la guida introduttiva (card GUIDA in Impostazioni) ===
  introRipassoOpen: boolean;
  setIntroRipassoOpen: (b: boolean) => void;

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
        // v4.7: NON cancellare il deep-link pendente QUANDO L'APP PARTE DA
        // UN TAP SU NOTIFICA: il tap arriva PRIMA della verifica della
        // sessione (getInitialNotification e' locale e veloce,
        // api.auth.me() passa dalla rete): da nessun utente a utente
        // collegato e' il percorso freddo, e lì il deep-link va tenuto.
        //
        // v4.118 — MA in ogni ALTRO cambio d'account (logout, altro
        // cliente che entra) il deep-link pendente è l'indirizzo del
        // vecchio account: portare il nuovo cliente in anno/cartella
        // del precedente è una fuga di dati (per quanto piccola). Se
        // c'era già un utente collegato, l'indirizzo va BUTTATO.
        const avvioFreddo = s.user === null;
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
          introRipassoOpen: false,
          clienteTab: 'archivio',
          pendingDeepLink: avvioFreddo ? s.pendingDeepLink : null,
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

  // v4.83: il ripasso della intro (dalla card GUIDA di Impostazioni) e'
  // gestito da AppNavigator, che apre OnboardingScreen SOPRA a tutto
  // senza smontare l'app: al termine il cliente riprende da dov'era.
  introRipassoOpen: false,
  setIntroRipassoOpen: (b) => set({ introRipassoOpen: b }),

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
      introRipassoOpen: false,
      pendingDeepLink: null,
      clienteTab: 'archivio',
    }),
}));
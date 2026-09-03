/**
 * Tipi condivisi per l'API del backend PFC v2.
 * Rispecchiano i contratti di portale-pfc-v2.vercel.app/api/*.
 */

export type UserRole = 'admin' | 'client';

export interface User {
  username: string;
  name: string;
  role: UserRole;
  exemptMaintenance?: boolean;
}

// === Documenti / Archivio ===

export type StatoFile = 'preferito' | 'nuovo' | 'visto' | 'scaricato';

export interface FileItem {
  nome: string;
  key: string;
  size: number;
  sizeStr: string;
  lastModified: Date | null;
  stato?: StatoFile;
  isPreferito?: boolean;
}

export interface Cartella {
  nome: string;
  count?: number;
  nuovi?: number;
  hasScadenza?: boolean;
  scadenzaPagata?: boolean;
  scadenzaData?: string | null;
  [k: string]: unknown;
}

export interface ListResponse {
  anni?: string[];
  cartelle?: Cartella[];
  files?: FileItem[];
  r2NotConfigured?: boolean;
  error?: string;
}

export interface SearchResult {
  nome: string;
  key: string;
  anno: string;
  cartella: string;
  size: number;
  sizeStr: string;
  score: number;
}

// === Messaggi ===

export interface Messaggio {
  id: string;
  titolo: string;
  corpo: string;
  dataInvio: string;
  letto: boolean;
  archiviato: boolean;
  richiedeUpload: boolean;
  uploadDescrizione?: string;
  haRisposta: boolean;
  allegatoNome?: string;
}

// === Cassetto ===

export interface CassettoFile {
  nome: string;
  key: string;
  size: number;
  sizeStr: string;
  lastModified: Date | null;
}

// === Notifiche ===

export type TipoNotifica =
  | 'documento_nuovo'
  | 'messaggio'
  | 'avviso'
  | 'richiesta_upload'
  | 'scadenza'
  | 'upload_confermato';

export interface Notifica {
  id: string;
  tipo: TipoNotifica | string;
  titolo: string;
  corpo?: string;
  letta: boolean;
  dataCreazione: string;
  year?: string;
  folder?: string;
}

// === Audit ===

export interface AuditEntry {
  id: string;
  ts: string;
  action: string;
  detail: string;
}

// === Auth ===

export interface LoginResponse {
  ok: boolean;
  user?: unknown;
  error?: string;
}

export interface MeResponse {
  user: User | null;
}

// === Push ===

export interface FcmStatusResponse {
  fcmEnabled: boolean;
  serverProjectId: string | null;
  userTokens: number;
}

export interface FcmTestResponse {
  ok: boolean;
  msg?: string;
  sent?: number;
  tokenCount?: number;
}

// === Preferiti ===

export interface PreferitoToggleResponse {
  ok: boolean;
  isPreferito: boolean;
}
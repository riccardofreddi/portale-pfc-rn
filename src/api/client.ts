/**
 * API client per il backend PFC v2.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AuditEntry,
  CassettoFile,
  FcmStatusResponse,
  FcmTestResponse,
  ListResponse,
  LoginResponse,
  MeResponse,
  Messaggio,
  Notifica,
  PreferitoToggleResponse,
  SearchResult,
  User,
} from '@/types/api';

const API_BASE_URL = 'https://portale-pfc-v2.vercel.app';
const SESSION_COOKIE_KEY = 'pfc_session_cookie';

let cachedSessionCookie: string | null = null;

async function getSessionCookie(): Promise<string | null> {
  if (cachedSessionCookie) return cachedSessionCookie;
  try {
    const v = await AsyncStorage.getItem(SESSION_COOKIE_KEY);
    cachedSessionCookie = v;
    return v;
  } catch {
    return null;
  }
}

async function setSessionCookie(value: string | null): Promise<void> {
  cachedSessionCookie = value;
  try {
    if (value) {
      await AsyncStorage.setItem(SESSION_COOKIE_KEY, value);
    } else {
      await AsyncStorage.removeItem(SESSION_COOKIE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

interface ApiFetchOptions extends RequestInit {
  auth?: boolean;
}

async function apiFetch<T = unknown>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const { auth = true, headers: customHeaders, ...rest } = opts;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(rest.body && !(rest.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(customHeaders as Record<string, string>),
  };

  const cookie = await getSessionCookie();
  if (cookie && auth) {
    headers.Cookie = cookie;
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...rest,
    headers,
    credentials: 'include',
  });

  if (path === '/api/auth/login' && res.ok) {
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const match = /pfc_session=([^;]+)/.exec(setCookie);
      if (match) {
        await setSessionCookie(`pfc_session=${match[1]}`);
      }
    }
  }

  if (res.status === 401 && auth) {
    await setSessionCookie(null);
  }

  const data = (await res.json().catch(() => ({}))) as unknown;

  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? `Errore ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}

export const api = {
  auth: {
    async login(username: string, password: string): Promise<LoginResponse> {
      return apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        auth: false,
      });
    },

    async me(): Promise<MeResponse> {
      return apiFetch<MeResponse>('/api/auth/me');
    },

    async logout(): Promise<void> {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      } finally {
        await setSessionCookie(null);
      }
    },
  },

  documenti: {
    async list(params: {
      username: string;
      anno?: string;
      cartella?: string;
    }): Promise<ListResponse> {
      const p: string[] = ['username=' + encodeURIComponent(params.username)];
      if (params.anno) p.push('anno=' + encodeURIComponent(params.anno));
      if (params.cartella) p.push('cartella=' + encodeURIComponent(params.cartella));
      return apiFetch<ListResponse>('/api/documenti/list?' + p.join('&'));
    },

    downloadUrl(key: string): string {
      return `${API_BASE_URL}/api/documenti/download?key=${encodeURIComponent(key)}`;
    },

    previewUrl(key: string): string {
      return `${API_BASE_URL}/api/documenti/preview?key=${encodeURIComponent(key)}`;
    },

    async sessionCookieHeader(): Promise<string> {
      const cookie = await getSessionCookie();
      return cookie ?? '';
    },
  },

  preferiti: {
    async list(): Promise<{ preferiti: string[] }> {
      return apiFetch<{ preferiti: string[] }>('/api/preferiti');
    },

    async toggle(filePath: string): Promise<PreferitoToggleResponse> {
      return apiFetch<PreferitoToggleResponse>('/api/preferiti', {
        method: 'POST',
        body: JSON.stringify({ filePath }),
      });
    },
  },

  ricerca: {
    async search(q: string, username?: string): Promise<{ results: SearchResult[] }> {
      const p: string[] = ['q=' + encodeURIComponent(q)];
      if (username) p.push('username=' + encodeURIComponent(username));
      return apiFetch<{ results: SearchResult[] }>('/api/ricerca?' + p.join('&'));
    },
  },

  messaggi: {
    async list(username: string): Promise<{ messaggi: Messaggio[] }> {
      const res = await apiFetch<{ messaggi: Array<Record<string, unknown>> }>(
        '/api/messaggi?username=' + encodeURIComponent(username),
      );
      const mapped: Messaggio[] = (res.messaggi ?? []).map((m) => {
        const testo = String(m.text ?? '');
        const titolo = (testo.split('\n')[0] ?? '').trim().slice(0, 80) || 'Messaggio';
        const archiviato =
          Array.isArray(m.archivedByClient) &&
          (m.archivedByClient as unknown[]).length > 0;
        return {
          id: String(m.id ?? ''),
          titolo,
          corpo: testo,
          dataInvio: String(m.timestamp ?? ''),
          letto: Boolean(m.read),
          archiviato,
          richiedeUpload: Boolean(m.requiresUpload),
          haRisposta: Boolean(m.uploadReceived),
        };
      });
      return { messaggi: mapped };
    },

    async segnaLetti(): Promise<void> {
      await apiFetch('/api/messaggi?action=segna_letti', { method: 'PATCH' });
    },

    async archivia(id: string): Promise<void> {
      await apiFetch('/api/messaggi?id=' + id + '&action=archivia', { method: 'PATCH' });
    },

    async dearchivia(id: string): Promise<void> {
      await apiFetch('/api/messaggi?id=' + id + '&action=dearchivia', { method: 'PATCH' });
    },
  },

  risposte: {
    async upload(formData: FormData): Promise<{ ok: boolean; key: string; nome: string }> {
      return apiFetch<{ ok: boolean; key: string; nome: string }>(
        '/api/risposte/upload',
        { method: 'POST', body: formData },
      );
    },
  },

  cassetto: {
    async list(): Promise<{ files: CassettoFile[] }> {
      const res = await apiFetch<{ files: Array<Record<string, unknown>> }>(
        '/api/cassetto/list',
      );
      const mapped: CassettoFile[] = (res.files ?? []).map((f) => ({
        nome: String(f.nome ?? ''),
        key: String(f.key ?? ''),
        size: Number(f.size ?? 0),
        sizeStr: String(f.sizeStr ?? ''),
        lastModified: f.lastModified ? new Date(String(f.lastModified)) : null,
      }));
      return { files: mapped };
    },

    async upload(formData: FormData): Promise<{ ok: boolean; key: string; nome: string }> {
      return apiFetch<{ ok: boolean; key: string; nome: string }>(
        '/api/cassetto/upload',
        { method: 'POST', body: formData },
      );
    },

    async delete(key: string): Promise<{ ok: boolean }> {
      return apiFetch<{ ok: boolean }>('/api/cassetto/delete', {
        method: 'POST',
        body: JSON.stringify({ key }),
      });
    },

    async rename(key: string, newName: string): Promise<{ ok: boolean; newKey: string; newName: string }> {
      return apiFetch<{ ok: boolean; newKey: string; newName: string }>(
        '/api/cassetto/rename',
        { method: 'POST', body: JSON.stringify({ key, newName }) },
      );
    },
  },

  notifiche: {
    async list(): Promise<{ notifiche: Notifica[] }> {
      const res = await apiFetch<{ notifiche: Array<Record<string, unknown>> }>(
        '/api/notifiche',
      );
      const mapped: Notifica[] = (res.notifiche ?? []).map((n) => ({
        id: String(n.id ?? ''),
        tipo: String(n.type ?? ''),
        titolo: String(n.text ?? ''),
        corpo: String(n.detail ?? ''),
        letta: Boolean(n.read),
        dataCreazione: String(n.ts ?? ''),
        year: n.year ? String(n.year) : undefined,
        folder: n.folder ? String(n.folder) : undefined,
      }));
      return { notifiche: mapped };
    },

    async segnaLette(tipi?: string[], year?: string, folder?: string): Promise<void> {
      const p: string[] = ['action=segna_lette'];
      if (tipi && tipi.length) p.push('tipi=' + encodeURIComponent(tipi.join(',')));
      if (year) p.push('year=' + encodeURIComponent(year));
      if (folder) p.push('folder=' + encodeURIComponent(folder));
      await apiFetch('/api/notifiche?' + p.join('&'), { method: 'POST' });
    },

    async segnaLetta(id: string): Promise<void> {
      await apiFetch('/api/notifiche?action=segna_lette&id=' + encodeURIComponent(id), {
        method: 'POST',
      });
    },

    async pulisciLette(): Promise<void> {
      await apiFetch('/api/notifiche?action=pulisci_lette', { method: 'POST' });
    },

    async pulisciTutte(): Promise<void> {
      await apiFetch('/api/notifiche?action=pulisci_tutte', { method: 'POST' });
    },
  },

  audit: {
    async meList(limit?: number): Promise<{ logs: AuditEntry[] }> {
      const q = limit ? '?limit=' + limit : '';
      return apiFetch<{ logs: AuditEntry[] }>('/api/audit/me' + q);
    },
  },

  push: {
    async fcmRegister(token: string, device: string): Promise<void> {
      await apiFetch('/api/push/fcm', {
        method: 'POST',
        body: JSON.stringify({ token, device }),
      });
    },

    async fcmUnregister(token: string): Promise<void> {
      await apiFetch('/api/push/fcm', {
        method: 'DELETE',
        body: JSON.stringify({ token }),
      });
    },

    async fcmTest(): Promise<FcmTestResponse> {
      return apiFetch<FcmTestResponse>('/api/push/fcm/test', { method: 'POST' });
    },

    async fcmStatus(): Promise<FcmStatusResponse> {
      return apiFetch<FcmStatusResponse>('/api/push/fcm/status');
    },
  },

  setup: {
    async setup(): Promise<unknown> {
      return apiFetch('/api/setup');
    },
  },
};

export const __internal = { getSessionCookie, setSessionCookie, API_BASE_URL };
export type ApiUser = User;
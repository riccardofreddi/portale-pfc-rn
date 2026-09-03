/**
 * Root App component.
 *
 * 1. Bootstrap: check sessione persistente (cookie salvato in AsyncStorage)
 * 2. Setup push listeners → imposta pendingDeepLink nel store
 * 3. Polling notifiche + messaggi non letti ogni 30s
 * 4. Render NavigationContainer + Toaster globale
 */
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { setupPushListeners } from '@/lib/push';
import { AppNavigator } from '@/navigation/AppNavigator';
import { Toaster } from '@/components/Toaster';
import { ThemeProvider } from '@/theme/ThemeContext';

export default function App() {
  const setUser = useAppStore((s) => s.setUser);
  const setLoadingUser = useAppStore((s) => s.setLoadingUser);
  const setPendingDeepLink = useAppStore((s) => s.setPendingDeepLink);
  const user = useAppStore((s) => s.user);
  const setNNotifiche = useAppStore((s) => s.setNNotifiche);
  const setNMessaggiNonLetti = useAppStore((s) => s.setNMessaggiNonLetti);

  // Bootstrap: verifica sessione persistente
  useEffect(() => {
    async function bootstrap() {
      try {
        const me = await api.auth.me();
        if (me.user && me.user.role === 'client') {
          setUser(me.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    }
    bootstrap();
  }, [setUser, setLoadingUser]);

  // Push listeners → impostano pendingDeepLink nel store
  useEffect(() => {
    const unsub = setupPushListeners((target) => {
      console.log('[App] tap notifica, target:', target);
      setPendingDeepLink(target);
    });
    return unsub;
  }, [setPendingDeepLink]);

  // Polling notifiche + messaggi non letti ogni 30s (quando l'utente è loggato)
  useEffect(() => {
    if (!user) return;
    const username = user.username;

    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const notifRes = await api.notifiche.list();
        if (cancelled) return;
        const unreadNotif = notifRes.notifiche.filter((n) => !n.letta).length;
        setNNotifiche(unreadNotif);

        const msgRes = await api.messaggi.list(username);
        if (cancelled) return;
        const unreadMsg = msgRes.messaggi.filter(
          (m) => !m.letto && !m.archiviato,
        ).length;
        setNMessaggiNonLetti(unreadMsg);
      } catch {
        // silent
      }
    }

    poll();
    const interval = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, setNNotifiche, setNMessaggiNonLetti]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
        <Toaster />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

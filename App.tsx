/**
 * Root App component.
 *
 * 1. Bootstrap: check sessione persistente (cookie salvato in AsyncStorage)
 * 2. Setup push listeners → imposta pendingDeepLink nel store
 * 3. Polling notifiche + messaggi non letti ogni 30s
 * 4. Render NavigationContainer + Toaster globale
 * 5. v4.3: promemoria scadenze LOCALI (arrivano anche a app chiusa)
 */
import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { setupPushListeners } from '@/lib/push';
import { aggiornaPromemoriaScadenze } from '@/lib/scadenze-locali';
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

  // v4.3: promemoria scadenze LOCALI. Al login e ogni volta che l'utente
  // torna sull'app (max 1 volta ogni 30 minuti) riallineiamo i promemoria
  // all'orologio interno di Android: scattano anche a app CHIUSA. Se una
  // scadenza e' stata pagata il suo promemoria sparisce, se ne e' arrivata
  // una nuova viene aggiunta. Tutto silenzioso: se qualcosa fallisce
  // semplicemente si riprova alla prossima apertura.
  const ultimaSyncScadenze = useRef(0);
  useEffect(() => {
    if (!user) return;

    const sincronizza = () => {
      const ora = Date.now();
      if (ora - ultimaSyncScadenze.current < 30 * 60 * 1000) return;
      ultimaSyncScadenze.current = ora;
      aggiornaPromemoriaScadenze();
    };

    // Al login: sync immediata (prima volta: nessun limite).
    ultimaSyncScadenze.current = 0;
    sincronizza();

    // Al ritorno sull'app: sync se sono passati almeno 30 minuti.
    const sub = AppState.addEventListener('change', (stato) => {
      if (stato === 'active') sincronizza();
    });
    return () => sub.remove();
  }, [user]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
        <Toaster />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

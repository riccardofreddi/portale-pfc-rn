/**
 * Root App component.
 *
 * 1. Bootstrap: check sessione persistente (cookie salvato in AsyncStorage)
 * 2. Setup push listeners → imposta pendingDeepLink nel store
 * 3. Polling notifiche + messaggi non letti ogni 30s
 * 4. Render NavigationContainer + Toaster globale
 * 5. v4.3: promemoria scadenze LOCALI (arrivano anche a app chiusa)
 * 6. v4.5: i badge si aggiornano SUBITO quando arriva una push (a app
 *    aperta) e quando si torna sull'app, senza aspettare il polling
 */
import React, { useEffect, useRef } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { riRegistraPushSilenziosa, setupPushListeners } from '@/lib/push';
import { aggiornaPromemoriaScadenze } from '@/lib/scadenze-locali';
import { preparaNotifiche } from '@/lib/notifiche';
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
      // v4.58: creo SUBITO i canali Android (tra cui pfc-alerts-v2) cosi'
      // anche la prima push del server, arrivata quando l'app e' appena
      // stata chiusa, suona con il canale giusto (alta importanza).
      void preparaNotifiche();
      try {
        const me = await api.auth.me();
        if (me.user && me.user.role === 'client') {
          setUser(me.user);
          // v4.51: sessione ripristinata => l'app si ri-presenta al server
          // da sola (token FCM aggiornato, zero prompt, zero schermate).
          // Prima questo avveniva SOLO al login: se Google rinnovava il
          // token tra due login, il server busava alla porta vecchia e le
          // notifiche sparivano. Non blocca il bootstrap: vola e basta.
          void riRegistraPushSilenziosa();
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
  // v4.5: pollRef rende poll richiamabile anche da fuori (eventi push e
  // ritorno sull'app) senza dover ricreare i listener.
  const pollRef = useRef<() => Promise<void>>(async () => {});
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

    pollRef.current = poll;
    poll();
    const interval = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, setNNotifiche, setNMessaggiNonLetti]);

  // v4.5: notifica push ricevuta con l'app aperta => badge aggiornati
  // IMMEDIATAMENTE (campanella e tab Messaggi), non dopo 30 secondi.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('pfc-push-ricevuta', () => {
      pollRef.current();
    });
    return () => sub.remove();
  }, []);

  // v4.5: ritorno sull'app (era in background) => lista e badge freschi
  // subito (e MessaggiScreen ricarica da sola): niente piu' "trascinare
  // in giu' per ricaricare" per vedere un messaggio arrivato fuori app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (stato) => {
      if (stato === 'active') {
        pollRef.current();
        DeviceEventEmitter.emit('pfc-app-risentita');
      }
    });
    return () => sub.remove();
  }, []);

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

  // v4.51: auto-riparazione notifiche. Al login e a ogni ritorno sull'app
  // (max 1 volta ogni 10 minuti) l'app ridice al server "l'indirizzo di
  // questo telefono e' questo". Silenziosa: se il permesso non c'e' gia',
  // non chiede nulla; se l'interruttore Notifiche e' spento non fa nulla;
  // se la chiamata fallisce riprovera' alla prossima apertura. E' la
  // copertura del caso "Google rinnova il token mentre l'app e' chiusa":
  // alla riapertura il server si aggiorna da solo, senza tocchi.
  const ultimaRiRegistrazione = useRef(0);
  useEffect(() => {
    if (!user) return;

    const riprova = () => {
      const ora = Date.now();
      if (ora - ultimaRiRegistrazione.current < 10 * 60 * 1000) return;
      ultimaRiRegistrazione.current = ora;
      void riRegistraPushSilenziosa();
    };

    // Al login: subito (se il permesso e' gia' dato, sistema l'indirizzo
    // anche quando LoginScreen sta ancora mostrando la richiesta).
    ultimaRiRegistrazione.current = 0;
    riprova();

    // Al ritorno sull'app: ri-registrazione se sono passati 10 minuti.
    const sub = AppState.addEventListener('change', (stato) => {
      if (stato === 'active') riprova();
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

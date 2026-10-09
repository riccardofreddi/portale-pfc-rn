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
import React, { useEffect, useRef, useState } from 'react';
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
import { aggiornamentoDisponibileAllAvvio } from '@/lib/updates';
import { AggiornamentoModal } from '@/screens/AggiornamentoModal';

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

  // v4.87: sblocco biometrico. Quando l'app torna in primo piano dopo
  // almeno 60 secondi in background (anche solo con lo schermo bloccato)
  // emette l'evento "pfc-app-rilock": il navigator, se c'e' una sessione
  // e una biometria configurata, ri-chiede impronta o volto. Entro 60
  // secondi non arriva nessun evento: l'app si riapre com'era.
  const sfondoDa = useRef(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (stato) => {
      if (stato === 'background' || stato === 'inactive') {
        sfondoDa.current = Date.now();
        return;
      }
      if (
        stato === 'active' &&
        sfondoDa.current > 0 &&
        Date.now() - sfondoDa.current >= 60_000
      ) {
        sfondoDa.current = 0;
        DeviceEventEmitter.emit('pfc-app-rilock');
      }
    });
    return () => sub.remove();
  }, []);

  // v4.86: aggiornamento guidato. A ogni avvio (con utente collegato,
  // dopo una piccola pausa per non fare rumore col resto del bootstrap)
  // l'app chiede a GitHub Releases se esiste una versione piu' recente:
  // se c'e', compare il dialog non chiudibile che porta al download
  // dell'APK. Qualsiasi errore resta silenzioso: nessun dialog e si
  // riprova al prossimo avvio. Il controllo non parte dal login: solo
  // con la sessione ripristinata (l'aggiornamento resta fuori dal login).
  //
  // v4.93: qui teniamo la versione proposta (versioneLatest) da passare
  // al modal e chiudiamo il dialog quando l'utente preme il bottone
  // (onAggiora): l'app resta subito utilizzabile.
  //
  // v4.100: il dialog si ripresenta a ogni avvio finche' la release
  // proposta e' piu' nuova dell'app installata (nessuna memoria v4.93:
  // se il cliente annulla l'installer, l'aggiornamento riparte). Dal
  // bottone in poi e' tutto automatico: download dentro l'app con
  // percentuale e apertura da sola dell'installer di Android; al
  // cliente resta solo la conferma di sistema "Aggiorna app?".
  //
  // v4.102: il controllo riparte ANCHE al RITORNO sull'app, non solo
  // all'avvio a freddo. Prima viveva solo nel useEffect su user: se
  // l'app restava in background (il caso piu' comune: Android la tiene
  // viva per ore) e veniva riaperta, il controllo NON ripartiva e il
  // pannello non compariva mai finche' l'app non veniva chiusa per
  // davvero - e' cosi' che la prova della 1.88.4 e' andata vuota.
  // Se il pannello e' gia' aperto, riaprirlo non fa nulla.
  //
  // v4.104: al ritorno il controllo e' SUBITO e SENZA cache (saltaCache:
  // via del file senza tetto di richieste): i doppi freni da 10 minuti
  // (soglia + cache) facevano si' che riaprendo l'app prima dei dieci
  // minuti niente partisse e la prova dal vivo sembrasse fallita. Ora
  // il freno e' solo un minuto contro i passaggi rapidi app/schermo.
  //
  // v4.106: il pannello compare UNA VOLTA PER VERSIONE in questa
  // sessione (releasePropostaRef). Il ritorno dal background non riapre
  // mai il pannello gia' visto: lo stesso riconoscimento del dito
  // genera lui stesso un passaggio background/primo piano (il prompt
  // biometrico e' un overlay di sistema) e con la regola v4.104 il
  // pannello saltava fuori in mezzo al lavoro, e di nuovo a ogni
  // rientro, finche' l'installazione non era finita. Una release
  // DIVERSA da quella gia' proposta (vera novita' pubblicata mentre
  // l'app era in background) riapre il pannello come sempre. Se il
  // cliente annulla l'installer, la proposta riparte al prossimo avvio
  // vero dell'app: nuova sessione, memoria azzerata.
  const [aggiornamentoOpen, setAggiornamentoOpen] = useState(false);
  const [versioneLatest, setVersioneLatest] = useState<string | null>(null);
  const ultimoControlloAgg = useRef(0);
  // v4.106: la versione per cui il pannello e' gia' comparso in questa
  // sessione (null = nessuna ancora). In memoria, NON su disco: chiusa
  // l'app (o finito l'aggiornamento) la proposta riparte legittimamente.
  const releasePropostaRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancellato = false;

    const eseguiControllo = (saltaCache = false) => {
      ultimoControlloAgg.current = Date.now();
      void (async () => {
        try {
          const { daFare, latest } =
            await aggiornamentoDisponibileAllAvvio(saltaCache);
          if (!cancellato && daFare) {
            // v4.106: stessa versione gia' proposta in sessione = il
            // pannello NON si ripropone (il check resta mutato). Prima
            // comparsa (o versione nuova) = si mostra e si registra.
            if (releasePropostaRef.current === latest) return;
            releasePropostaRef.current = latest;
            setVersioneLatest(latest);
            setAggiornamentoOpen(true);
          }
        } catch {
          // silenzio: si riprova al prossimo avvio o ritorno sull'app
        }
      })();
    };

    // All'avvio: dopo una piccola pausa per non fare rumore col resto
    // del bootstrap. Con la cache del controllo (10 min) come freno.
    const timer = setTimeout(() => eseguiControllo(), 8_000);

    // Al ritorno sull'app (era in background): v4.104 - SI CONTROLLA
    // SUBITO, saltando la cache, se dal precedente controllo e' passata
    // almeno un MINUTO (il freno serve solo per i passaggi rapidi
    // app/schermo, non per i ritorni veri). Prima (v4.102) qui c'era la
    // stessa finestra della cache (10 min) E il controllo la rispettava:
    // doppi freni - riaprendo prima dei dieci minuti il controllo non
    // partiva affatto e la release nuova restava invisibile. Ora la
    // richiesta va diretta al file versione.txt (senza tetto dell'API):
    // una richiesta leggerissima per riapertura, e il pannello compare
    // appena una release esce, comunque sia tornati sull'app.
    // v4.106: il check qui resta (e' lui che scopre la release nuova),
    // ma la comparsa del pannello la decide releasePropostaRef: stessa
    // versione gia' vista in sessione = nessun pannello, per nessun
    // motivo (rientro vero, dito, cambio app e ritorno...).
    const sub = AppState.addEventListener('change', (stato) => {
      if (
        stato === 'active' &&
        Date.now() - ultimoControlloAgg.current >= 60_000
      ) {
        eseguiControllo(true);
      }
    });

    return () => {
      cancellato = true;
      clearTimeout(timer);
      sub.remove();
    };
  }, [user]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
        <Toaster />
        <AggiornamentoModal
          visible={aggiornamentoOpen}
          versioneLatest={versioneLatest}
          onAggiora={() => setAggiornamentoOpen(false)}
        />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

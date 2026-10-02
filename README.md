# Portale PFC - l'app Android dei clienti

App riservata ai clienti dello Studio PFC: documenti, messaggi e scadenze in un unico posto, con notifiche che aprono subito il contenuto giusto.

- Per i clienti: tutto lo studio in tasca, in un'app semplice
- Per lo studio: un canale sicuro e tracciato verso ogni cliente
- Per chi guarda la repo: tutto il codice dell'app, con rilasci automatici

---

## Cosa fa l'app, in breve

**Archivio documenti** — i documenti dello studio organizzati per anno e cartella. Ricerca globale, anteprima PDF integrata, preferiti (si sistemano da soli se un file viene spostato), download e condivisione, selezione multipla. L'archivio si aggiorna da solo quando arrivano novità.

**Messaggi** — le comunicazioni riservate dello studio, con risposta anche allegando file. I messaggi nuovi restano segnati finché non li leggi.

**Cassetto personale** — il piccolo archivio privato del cliente: QR P.IVA, certificato P.IVA, visura, documento d'identità, IBAN. Un solo slot per tipo, per restare in ordine.

**Attività** — il registro di cosa è successo e quando, scritto in italiano semplice.

**Notifiche intelligenti** — le scadenze e le novità arrivano come notifiche push e il tocco apre direttamente il documento giusto, anche a app chiusa. Un solo interruttore in Impostazioni: acceso, tutto arriva; spento, non arriva più niente.

**Avvisi dello studio** — sempre visibili sotto la barra in alto, aggiornati in tempo reale.

**Guida introduttiva** — si vede al primo avvio e si può rivedere quando si vuole da Impostazioni, con "Rivedi la guida introduttiva".

**Impostazioni essenziali** — profilo, notifiche, tema chiaro o scuro, uscita dall'account. Niente tecnicismi.

---

## Come si aggiorna l'app (il ciclo che usiamo)

1. Lo studio chiede una modifica o segnala un problema
2. L'assistente prepara un blocco PowerShell autoverificante
3. Il blocco applica la modifica sul PC e compila l'app via USB: il telefono la prova subito
4. Se il test convince, un secondo blocco pubblica su GitHub
5. La CI di GitHub controlla il codice, compila l'APK e la pubblica nella pagina **Releases**, sezione `latest-apk`
6. I clienti installano l'APK nuova sovrascrivendo la vecchia: login e impostazioni restano al loro posto

L'app non è sugli store: si installa dall'APK della release. È una scelta voluta: nessuna attesa, nessuna pubblicazione pubblica.

---

## Versione attuale

**v4.85** (1.85.0) — guida introduttiva a tutto schermo su richiesta, manutenzione a tutto schermo con controllo ogni 10 secondi, esenzioni che valgono subito, niente ricariche visibili.

Ultime pubblicazioni:

| Versione | Novità principale |
|---|---|
| v4.85 | Guida su richiesta + manutenzione a tutto schermo (10 secondi), senza ricariche |
| v4.82 | Il messaggio privato si legge sempre intero, senza tocchi |
| v4.81 | La pillola "Documenti Nuovi" apre la lista dei soli documenti nuovi |

---

## Installare l'app sul telefono

1. Apri la pagina **Releases** della repo
2. Scarica `app-release.apk` dalla release `latest-apk`
3. Installala: sovrascrive la versione precedente e mantiene login e impostazioni

L'app avvisa da sola quando esce una versione nuova: il controllo gira in automatico sulle release di GitHub.

---

## Come è fatto il progetto

```
src/
  screens/      le schermate (Archivio, Messaggi, Cassetto, Attività...)
  navigation/   navigazione e modali globali (guida, manutenzione)
  api/          il cliente delle API (sessione a cookie)
  store/        la memoria condivisa dell'app
  lib/          notifiche, download, scadenze, utilità
  theme/        i colori (blu notte e oro champagne)
android/        il progetto nativo che compila l'APK
```

Tecnologie: React Native 0.76 con Expo SDK 52, TypeScript, Zustand, Firebase Cloud Messaging per le notifiche.

Il **backend e il sito web** vivono in un'altra repo (`portale-pfc-v2`, su Vercel): qui dentro c'è solo l'app.

---

## Regole d'oro

- **Si pubblica solo dopo il test del titolare**: GitHub riceve versioni già provate sul telefono
- **Il backend non si tocca da questa repo**: l'app parla col server solo tramite API
- **Nessun segreto nella repo**: il file Firebase `google-services.json` non è qui (la CI lo ricrea da un segreto di GitHub)
- **Ogni versione ha il suo numero**: la tacca di versione in Impostazioni dice sempre quale build gira davvero sul telefono

---

## Problemi comuni

| Problema | Cosa fare |
|---|---|
| Non arrivano le notifiche | Impostazioni: l'interruttore "Ricevi gli avvisi dello studio" deve essere acceso (pillola verde) |
| Un documento non si apre | Chiudi e riapri l'app, poi riprova; se persiste, scrivi allo studio |
| Voglio reinstallare | Scarica l'ultima APK da Releases e installala: login e dati restano |
| La versione a schermo è vecchia | L'APK nuova non è ancora installata: scaricala da Releases |

---

## Licenza

Progetto a uso interno dello Studio PFC — tutti i diritti riservati.

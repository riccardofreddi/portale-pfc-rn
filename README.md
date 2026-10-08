<div align="center">

# 📱 Portale Studio

**L'app Android dei clienti dello Studio PFC**

Documenti, messaggi e scadenze in un unico posto — con notifiche che aprono
subito il contenuto giusto, anche a telefono bloccato.

![CI](https://github.com/riccardofreddi/portale-pfc-rn/actions/workflows/ci.yml/badge.svg)
![Versione](https://img.shields.io/badge/versione-1.88.4-1E3A5F)
![Piattaforma](https://img.shields.io/badge/Android-APK%20diretto-3DDC84?logo=android&logoColor=white)

</div>

> **Per i clienti** — tutto lo studio in tasca, in un'app semplice
> **Per lo studio** — un canale sicuro e tracciato verso ogni cliente
> **Per chi guarda la repo** — tutto il codice dell'app, con rilasci automatici
> e un aggiornamento che sul telefono fa praticamente tutto da solo

---

## ✨ Cosa fa l'app

| Funzione | A parole semplici |
|---|---|
| **Archivio documenti** | I documenti dello studio organizzati per anno e cartella: ricerca globale, anteprima PDF integrata, preferiti (si sistemano da soli se un file viene spostato), download e condivisione col nome vero del file, selezione multipla. L'archivio si aggiorna da solo quando arrivano novità. |
| **Messaggi** | Le comunicazioni riservate dello studio, con risposta anche allegando file. I messaggi nuovi restano segnati finché non li leggi. |
| **Cassetto personale** | Il piccolo archivio privato del cliente: QR P.IVA, certificato P.IVA, visura, documento d'identità, IBAN. Un solo slot per tipo, per restare in ordine. |
| **Attività** | Il registro di cosa è successo e quando, scritto in italiano semplice. |
| **Notifiche intelligenti** | Scadenze e novità arrivano come notifiche push e il tocco apre direttamente il documento giusto, anche a app chiusa. Un solo interruttore in Impostazioni: acceso, tutto arriva; spento, non arriva più niente. |
| **Avvisi dello studio** | Sempre visibili sotto la barra in alto, aggiornati in tempo reale. |
| **Cancelletto biometrico** | L'app si riapre solo con l'impronta (o il volto) del cliente. Nessun dato biometrico salvato nell'app, nessuno inviato in rete: tutto resta nel telefono. |
| **Tema chiaro o scuro** | Si cambia da Impostazioni, con un interruttore. Colori dello studio: blu notte e oro champagne. |
| **Guida introduttiva** | Si vede al primo avvio e si può rivedere quando si vuole da Impostazioni. |
| **Aggiornamento automatico** | L'app si aggiorna da sola, quasi: la spiega la prossima sezione. |

---

## 🔄 L'app si aggiorna da sola (quasi)

Quando esce una versione nuova, **il cliente tocca due volte in tutto** — e una
è la conferma di Android:

1. All'avvio dell'app (dopo qualche secondo) compare da solo il pannello
   **"Nuova versione disponibile"**
2. Si tocca **"Aggiorna ora"**: l'APK scarica **dentro l'app**, con la
   percentuale visibile sul bottone
3. Finito il download, **l'installer di Android si apre da solo**: niente
   browser, niente notifiche da cercare, niente file da andare a prendere
4. Resta un'ultima conferma di sistema, **"Aggiorna app? → OK"**: è la
   sicurezza di Android, nessuna app può evitarla

Buono a sapersi:

- **Ho annullato l'installer?** Nessun problema: al prossimo avvio il pannello
  riparte da solo, finché l'app non è aggiornata
- **Ho già scaricato l'APK e poi ho chiuso?** Al tocco successivo l'installer
  apre subito: il file non si riscarica
- **La rete fa i capricci?** Il bottone diventa "Riprova" e sotto c'è sempre
  la vecchia via di emergenza: "Scarica dal browser"
- **La prima volta**, Android può chiedere di autorizzare l'app con
  l'interruttore "Installa app sconosciute": si accende, si torna indietro e
  si tocca di nuovo "Aggiorna ora". Da lì in poi, mai più
- **Login e impostazioni restano al loro posto** a ogni aggiornamento

---

## ⬇️ Installare l'app (prima volta)

1. Apri la pagina **Releases** di questa repo
2. Scarica `app-release.apk` dalla release `latest-apk`
3. Installala: se era già presente una versione, la sovrascrive mantenendo
   login e dati

L'app **non è sugli store**: è una scelta voluta. Nessuna attesa di
pubblicazione, nessuna pagina pubblica: l'APK arriva solo dalla repo dello
studio e il telefono si aggiorna da lì, da solo.

---

## 🏭 Il ciclo di una modifica (come nasce una versione)

1. Lo studio chiede una modifica o segnala un problema
2. L'assistente prepara un blocco PowerShell autoverificante (patch con
   checksum, applicata con `git am --3way`)
3. Il blocco applica la modifica sul PC e compila l'app via USB: il telefono
   la prova subito
4. Se il test convince, si spinge su GitHub
5. La CI di GitHub verifica il codice (TypeScript + lint), compila l'APK di
   release e la pubblica nella pagina **Releases**, sezione `latest-apk`
   (di solito 15–17 minuti)
6. Da lì in poi i telefoni si aggiornano da soli: sezione 🔄 qui sopra

---

## 🔢 Come si legge il numero di versione

Ogni versione ha tre nomi che dicono la stessa cosa:

| Dove la vedi | Esempio | Cosa indica |
|---|---|---|
| Tacca in **Impostazioni** | `1.88.4 / js4101` | La versione che gira davvero sul telefono |
| Pagina **Releases** | `Versione: 1.88.4` | L'ultima APK pubblicata |
| Messaggio di commit | `v4.101` | Il numero progressivo delle versioni |

La corrispondenza è fissa: **v4.101 ↔ build 101 ↔ js4101 ↔ 1.88.4**.
La versione tecnica sale di spuntino (`1.88.3 → 1.88.4`); quando la coda
arriva a 9 rotola (`1.88.9 → 1.89.0`).

---

## 🏷️ Versione attuale

**v4.101** (1.88.4) — questo README, riscritto per tutti. Nessun cambiamento
per i clienti: la release serve anche da **prova dal vivo
dell'aggiornamento automatico** introdotto con la v4.100.

Ultime pubblicazioni:

| Versione | Novità principale |
|---|---|
| v4.101 | README rifatto; prova dal vivo dell'aggiornamento automatico |
| v4.100 | L'aggiornamento fa tutto da solo: download in-app con percentuale e installer che si apre da solo |
| v4.99 | La condivisione porta il nome vero del file (niente più ".bin") |
| v4.98 | Il tema scuro torna leggibile (scritte azzurre su fondo notte) |
| v4.97 | Le pillole diventano leggibili e i caricamenti diventano verde-acqua |

---

## 🧱 Come è fatto il progetto

```
src/
  screens/      le schermate (Archivio, Messaggi, Cassetto, Attività...)
  navigation/   navigazione, cancelletto biometrico, modali globali
  api/          il cliente delle API (sessione a cookie)
  store/        la memoria condivisa dell'app (Zustand)
  lib/          aggiornamenti, notifiche, download, condivisione, biometria
  theme/        i colori del tema chiaro e scuro
  components/   elementi riutilizzabili (banner, toast, pillole...)
android/        il progetto nativo che compila l'APK
scripts/        script di supporto (versione, rilasci)
.github/        la CI: verifica, compilazione e pubblicazione
```

**Tecnologie:** React Native 0.76 con Expo SDK 52, TypeScript, Zustand,
react-native-pdf (anteprima), react-native-blob-util (download e file),
react-native-biometrics (cancelletto), Firebase Cloud Messaging (notifiche).

Il **backend e il sito web** vivono in un'altra repo (`portale-pfc-v2`, su
Vercel): qui dentro c'è solo l'app, che parla col server tramite API.

---

## 📜 Regole d'oro

- **Si pubblica solo dopo il test del titolare**: GitHub riceve versioni già
  provate sul telefono
- **Il backend non si tocca da questa repo**: l'app parla col server solo
  tramite API
- **Nessun segreto nella repo**: il file Firebase `google-services.json` non
  è qui (la CI lo ricrea da un segreto di GitHub)
- **Ogni versione ha il suo numero**: la tacca in Impostazioni dice sempre
  quale build gira davvero sul telefono — se la tacca e la release
  coincidono, l'aggiornamento è andato
- **Il cliente non si deve mai trovare in un vicolo cieco**: ogni schermata
  delicata (aggiornamento, download, biometria) ha sempre una via di ritorno

---

## 🛟 Problemi comuni

| Problema | Cosa fare |
|---|---|
| Non arrivano le notifiche | Impostazioni: l'interruttore "Ricevi gli avvisi dello studio" deve essere acceso (pillola verde) |
| Il pannello "Nuova versione disponibile" non compare | Serve internet e qualche secondo dall'avvio, con l'account collegato: chiudi e riapri l'app e attendi |
| Android chiede "Installa app sconosciute" | Succede solo la prima volta: accendi l'interruttore per l'app, torna indietro e tocca di nuovo "Aggiorna ora" |
| Ho annullato l'aggiornamento | Nessun problema: al prossimo avvio il pannello riparte da solo |
| Un documento non si apre | Chiudi e riapri l'app, poi riprova; se persiste, scrivi allo studio |
| Voglio reinstallare | Scarica l'ultima APK da Releases e installala: login e dati restano al loro posto |
| La versione a schermo è vecchia | Confronta la tacca in Impostazioni con la pagina Releases; se non coincidono, lascia che l'app si aggiorni da sola |

---

## Licenza

Progetto a uso interno dello Studio PFC — tutti i diritti riservati.

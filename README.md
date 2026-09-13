<div align="center">

# 📱 Portale PFC Mobile

**L'app Android riservata ai clienti dello studio.**
Documenti, messaggi, scadenze e notifiche — sempre aggiornati, in un unico posto.

![CI](https://github.com/riccardofreddi/portale-pfc-rn/actions/workflows/ci.yml/badge.svg)
![Versione](https://img.shields.io/badge/versione-1.33.0%20%2F%20build%2033-1B2A4A?logo=android&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB?logo=react&logoColor=black)
![Expo SDK](https://img.shields.io/badge/Expo%20SDK-52-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![Piattaforma](https://img.shields.io/badge/piattaforma-Android-3DDC84?logo=android&logoColor=white)

</div>

---

## 📖 Indice

- [✨ Funzionalità](#-funzionalità)
- [🛠 Tecnologie](#-tecnologie)
- [🧭 Come funziona](#-come-funziona)
- [🚀 Sviluppo locale](#-sviluppo-locale)
- [📲 Installare l'app sul telefono](#-installare-lapp-sul-telefono)
- [🤖 CI/CD automatica](#-cicd-automatica)
- [📂 Struttura del progetto](#-struttura-del-progetto)
- [🔢 Versioni](#-versioni)
- [🔒 Sicurezza e privacy](#-sicurezza-e-privacy)
- [🧯 Risoluzione problemi](#-risoluzione-problemi)

---

## ✨ Funzionalità

### 📁 Archivio documenti

I documenti dello studio sono organizzati per **anno → cartella → file**. Gli anni stanno nei chip in alto (sempre uno selezionato, di default il più recente) e la lista mostra subito le cartelle: nessun passaggio inutile. La ricerca è globale e trova un documento da qualunque punto dell'app. Ogni file si apre in un'**anteprima PDF integrata** e può essere segnato come preferito, scaricato sul telefono o condiviso. Il pulsante oro **«I miei preferiti»** apre il pannello con tutti i preferiti di ogni anno e, se lo studio sposta o rinomina un documento, l'app lo ritrova da sola — stellina compresa.

- Ricerca globale tra tutti i documenti
- Preferiti e download singoli
- **Selezione multipla**: download e preferiti in blocco
- **Auto-aggiornamento silenzioso**: l'archivio si aggiorna da solo all'ingresso nella scheda e quando arriva una notifica, senza "trascina in basso" e senza interrompere ciò che stai guardando

### 💬 Messaggi

Le comunicazioni dallo studio arrivano nella scheda Messaggi, con la possibilità di rispondere allegando file e di archiviare i thread conclusi. La campanella in alto si aggiorna da sola e si pulisce quando i contenuti vengono letti.

### 🗂 Cassetto personale

Uno spazio privato per i documenti del cliente: caricamento, download, rinomina ed eliminazione di file personali (QR P.IVA, visure, IBAN e simili), sempre disponibili su ogni dispositivo.

### 📋 Attività

Il registro delle operazioni svolte: ogni azione rilevante lascia traccia, in ordine cronologico, così il cliente ha sempre sott'occhio cosa è successo e quando.

### 🔔 Notifiche intelligenti

Le notifiche sono il cuore del portale e funzionano su due binari:

- **Push dal server** (Firebase Cloud Messaging, canale dedicato): avvisi di nuovi documenti, messaggi e scadenze
- **Promemoria locale delle scadenze**: una rete di sicurezza dell'app stessa, che ricorda la scadenza il giorno stesso

Il tocco su una notifica apre **direttamente il contenuto giusto** — il documento, il messaggio o la scadenza — anche se l'app era chiusa. In Impostazioni c'è **un solo interruttore**: acceso, tutto arriva come da logica; spento, il telefono viene tolto dal registro e non arriva più nulla, nemmeno a app chiusa. Una pillola di stato mostra sempre la situazione: **Attivo** (verde) o **Non attivo** (ambra).

### ⚙️ Impostazioni essenziali

Il pannello delle impostazioni mostra solo ciò che serve: il profilo con le iniziali e lo stato ("Cliente Attivo"), l'interruttore delle notifiche con la sua pillola di stato, i promemoria delle scadenze, il tema e l'uscita dall'account con conferma. Niente dati tecnici, niente pulsanti di diagnostica.

### 🎨 Grafica "Midnight Sapphire & Champagne Gold"

Un design system dedicato: blu notte come primario, oro champagne come accento, supporto **tema chiaro, scuro e di sistema** (persistente). Icone vettoriali, feedback aptici e skeleton di caricamento su tutte le schede.

---

## 🛠 Tecnologie

| Area | Tecnologia |
|---|---|
| Framework | React Native 0.76 · Expo SDK 52 (dev-client) |
| Linguaggio | TypeScript 5.6 |
| Stato | Zustand 5 |
| Navigazione | React Navigation 7 (bottom tabs + stack + modali globali) |
| Notifiche push | Firebase Cloud Messaging (`@react-native-firebase/messaging`) |
| Notifiche locali | expo-notifications (promemoria scadenze) |
| Documenti | react-native-pdf · react-native-blob-util · expo-file-system · expo-sharing |
| Extra | biometria, feedback aptico, document picker, mail composer, react-native-svg |
| Grafica | Design system dedicato, light + dark mode |
| Backend | `portale-pfc-v2` (Vercel + Prisma) — repository separato |

---

## 🧭 Come funziona

L'app è il **client Android** del portale: si collega al backend (`portale-pfc-v2`, su Vercel) tramite un client API con sessione a cookie. Il backend è il depositario della logica: gli utenti, i documenti, i messaggi e — soprattutto — **le scadenze**.

Le scadenze funzionano così: in admin si sceglie l'anticipo in giorni per ogni scadenza; il server controlla ogni giorno e invia la notifica push quando mancano pochi giorni, **ritentando finché non risulta consegnata**; solo negli ultimi due giorni, se la push non è arrivata, parte una email di cortesia (una volta sola). L'app aggiunge la rete di sicurezza del promemoria locale il giorno stesso della scadenza.

```mermaid
flowchart LR
    A[Admin imposta la scadenza] --> B[Il server controlla ogni giorno]
    B --> C[Push FCM sul telefono]
    B --> D[Email di cortesia se la push non arriva]
    C --> E[Il cliente tocca la notifica]
    E --> F[L app apre il contenuto giusto - anche a app chiusa]
```

---

## 🚀 Sviluppo locale

### Requisiti

- Node.js ≥ 20
- JDK 17 · Android SDK 34 (Android Studio)
- Un device fisico con USB debugging (consigliato) o un emulatore
- `google-services.json` del progetto Firebase **portale-pfc-v3** in `android/app/` (presente in locale, **non** è nella repo per sicurezza)

### Primi passi

```bash
npm install

# Prima volta (build nativa + install sul device):
npx expo run:android --device

# Tutte le altre volte (hot reload, nessuna ricompilazione):
npx expo start --dev-client
```

> ⚠️ L'app **non funziona in Expo Go**: usa moduli nativi (Firebase, biometria, PDF).
> Il dev-client installa una build di sviluppo standalone; dopo la prima build,
> per il codice JS/TS basta Metro con hot reload.

### Comandi utili

| Comando | Descrizione |
|---|---|
| `npm run typecheck` | Controllo TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run android:device` | Build + install sul device USB |
| `npm run build:android` | APK release locale (`android/gradlew assembleRelease`) |
| `npm run clean:android` | Pulizia build Gradle |

---

## 📲 Installare l'app sul telefono

**Modo 1 — APK pronta da GitHub (consigliato)**

1. Apri il repository → **Releases** → `latest-apk`
2. Scarica `app-release.apk`
3. Installa: sovrascrive la versione precedente e **mantiene login e impostazioni**

**Modo 2 — Build locale**

```bash
npm run build:android
# APK in android/app/build/outputs/apk/release/
```

---

## 🤖 CI/CD automatica

Ad ogni push, il workflow `.github/workflows/ci.yml` esegue due job in sequenza:

1. **Verify** — `npm ci`, controllo TypeScript (`tsc --noEmit`) ed ESLint
2. **Build release APK** (solo se Verify passa) — JDK 17 temurin + Android SDK, ricostruzione di `google-services.json` dal secret `GOOGLE_SERVICES_B64`, `./gradlew assembleRelease`, pubblicazione dell'APK sulla release **`latest-apk`** con la versione letta da `package.json`

Risultato: ogni push su `main` produce un APK installabile, sempre aggiornato, senza passaggi manuali.

### Setup su una repo nuova (una volta sola)

`google-services.json` non è nella repo: la CI lo ricrea da un secret.

```bash
# Con GitHub CLI (gh) autenticato:
gh secret set GOOGLE_SERVICES_B64 < <(base64 -w0 android/app/google-services.json)
```

PowerShell (senza gh, dalla web UI: repo → Settings → Secrets and variables → Actions):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android\app\google-services.json")) | Set-Clipboard
# incolla il valore nel secret GOOGLE_SERVICES_B64
```

---

## 📂 Struttura del progetto

```
├── App.tsx                    # Bootstrap: sessione, push, polling badge
├── app.json                   # Config Expo (slug, package android, versione)
├── src/
│   ├── api/client.ts          # API client (cookie sessione, tutti gli endpoint)
│   ├── components/            # UI riutilizzabile
│   │   ├── TopBar.tsx         # Barra superiore con monogramma e campanella
│   │   ├── Modal.tsx          # Foglio modale condiviso (tocco fuori = chiudi)
│   │   ├── ConfirmDialog.tsx  # Conferme (uscita, azioni destructive)
│   │   ├── Toaster.tsx        # Messaggi di feedback
│   │   ├── Skeleton.tsx       # Segnaposto di caricamento
│   │   └── ...                # Badge, Button, Card, EmptyState, FileIcon, Input
│   ├── lib/
│   │   ├── push.ts            # Registrazione FCM, rispetta l'interruttore notifiche
│   │   ├── notifiche.ts       # Notifiche locali e canale di notifica
│   │   ├── scadenze-locali.ts # Promemoria scadenze (rete di sicurezza locale)
│   │   ├── deeplink.ts        # Apertura del contenuto giusto dalla notifica
│   │   ├── download.ts        # Download e apertura file
│   │   ├── condividi.ts       # Condivisione documenti
│   │   ├── haptics.ts         # Feedback aptico
│   │   └── utils.ts           # Utilità condivise
│   ├── navigation/            # AppNavigator (tabs + stack + modali globali)
│   ├── screens/
│   │   ├── LoginScreen.tsx    # Accesso
│   │   ├── ArchivioScreen.tsx # Archivio per anno/cartella/file
│   │   ├── MessaggiScreen.tsx # Comunicazioni dallo studio
│   │   ├── CassettoScreen.tsx # Documenti personali
│   │   ├── AttivitaScreen.tsx # Registro attività
│   │   ├── PdfPreviewScreen.tsx # Anteprima PDF integrata
│   │   ├── NotificheModal.tsx # Centro notifiche in-app
│   │   ├── SettingsModal.tsx  # Impostazioni (profilo, notifiche, tema)
│   │   ├── OnboardingScreen.tsx # Primo avvio
│   │   └── SplashScreen.tsx   # Schermata iniziale
│   ├── store/auth.ts          # Store globale (Zustand)
│   ├── theme/colors.ts        # Design system: palette light + dark
│   └── types/api.ts           # Tipi API condivisi
└── android/                   # Progetto nativo (prebuild manuale)
```

---

## 🔢 Versioni

La versione vive in tre punti, tenuti allineati:

1. `app.json` → `expo.version`
2. `package.json` → `version`
3. `android/app/build.gradle` → `versionName` / `versionCode`

Per pubblicare una nuova versione: incrementa `versionName` (es. `1.26.0`) e `versionCode` (sempre +1) in `android/app/build.gradle`, allinea gli altri due file e fai push — la CI pubblica la nuova APK su GitHub Releases.

### Ultime versioni

| Versione | App | Novità principali |
|---|---|---|
| **v4.39** | 1.39.0 | L'hero dell'Archivio ora è IDENTICO a quello del Cassetto (richiesta del titolare: "è troppo chiara"): gradiente blu notte #0A1128 → blu primario #003566 → blu notte, angoli 22 e bordo oro identici. Spiegazione del mistero della riga nera: l'hero dell'Archivio è dentro un'animazione d'ingresso che il Cassetto non ha, e su Android può aprire una fessura di 1 pixel ai bordi della scheda mostrando il fondo (negli anni quasi nero). Ora la fessura è inoffensiva: il disegno sborda di 6 pixel oltre i bordi (può mostrare solo disegno) e il fondo della scheda è dello stesso colore degli estremi del gradiente: impossibile vedere la riga, anche durante l'animazione. Inclusive v4.37 e v4.38 |
| **v4.38** | 1.38.0 | Il "Scarica" del Cassetto ora lavora come in Archivio (richiesta del titolare). Prima era un salvataggio muto nella cartella Download: nessuna notifica, nessuna registrazione nel sistema e un percorso interno mostrato a video ("Salvato in: /storage/..."). Ora usa lo STESSO motore dell'Archivio (scaricaInDownload): percentuale dentro il pulsante, controllo della sessione, notifica di sistema di Android "Download completato" col NOME del file (toccala per aprire il documento) e file registrato nell'app File del telefono, sezione Download. Include tutta la v4.37 (riga nera VIA + "Archivio Documentale" nel Cassetto), il cui blocco si era fermato prima dell'installazione |
| **v4.37** | 1.37.0 | Addio la riga nera nell'hero dell'Archivio e Cassetto più chiaro (richieste del titolare). Archivio: il gradiente v4.34 finiva ai bordi col blu notte #0A1128 (a schermo quasi nero) proprio accanto al pulsante "I miei preferiti" — ora solo blu veri (estremi blu marino #034078, luce zaffiro #0B5AA5 al centro) e fondo scheda allineato al blu: zero nero possibile, look scuro con la luce al centro invariato. Cassetto: l'hero ora si chiama "Archivio Documentale" (via "Caveau"); tolta la pillola "Anteprima" (il file si apre tocchandolo) e al suo posto tre bottoni con la scritta Scarica / Modifica / Elimina (rosso); dopo il caricamento il messaggio verde dice dove va il file («nome» è ora nel tuo archivio) e il pulsante dice "Scegli file dal telefono" |
| **v4.36** | 1.36.0 | VIA la seconda duplicazione nei Messaggi e il falso 2025 vuoto in Archivio (richieste del titolare). Messaggi: quando apri un messaggio il testo si ripeteva ancora — ora se il corpo è identico al titolo il box non si mostra proprio; se il MESSAGGIO INTERO è scritto due volte di fila (prima metà = seconda metà, anche col titolo dentro e "Studio PFC:" davanti alla seconda copia) resta solo la prima copia; i trattini diversi (–, —, -) non ingannano più il taglio del titolo. Archivio: appena aperto il 2025 sembrava vuoto (si andava nel 2024 e tornando ricomparivano le cartelle) — era solo la risposta del server ancora in viaggio: ora lo stato vuoto esce SOLO dopo una risposta vera, nel frattempo gira lo scheletro, e le risposte vecchie non sovrascrivono più le nuove |
| **v4.35** | 1.35.0 | Messaggi: VIA la ripetizione del messaggio quando lo apri per rispondere — il titolo a volte era scritto DUE volte nel testo (anche con "Studio PFC:" davanti): la pulizia del doppione ora RIPETE il taglio fino a 3 volte, spariscono anche i doppioni doppi (il testo vero nel database resta intatto, cambia solo la visualizzazione). Consegna con blocco anti-fantasma Metro: uccide qualunque vecchio server rimasto sulla porta 8081, verifica che la porta sia libera, fa partire Metro con cache pulita e CONTROLLA il codice che Metro serve prima di installare — la tacca ora dice la verità (v1.35.0 · js435) |
| **v4.34** | 1.34.0 | Archivio con la grafica del Cassetto (richiesta del titolare: "voglio il blu più scuro, mi piace quella del cassetto"): l'hero dell'anno ora usa la STESSA grafica della Vault Hero del Cassetto — gradiente ORIZZONTALE da blu notte #0A1128 a blu primario #003566 e ritorno (la "luce" al centro), fondo scheda #0A1128, angoli 22 e bordo oro 0.4 identici. Tema scuro invariato (sfondo #0A1128, velo azzurro, zero nero puro come da v4.33) — preferiti, ricerca, cartelle, download intatti |
| **v4.33** | 1.33.0 | VIA IL NERO (richiesta del titolare): nell'Archivio l'hero dell'anno aveva un gradiente che partiva da #0A1128 (quasi nero) — la scheda sembrava divisa tra nero e blu proprio attorno al pulsante "I miei preferiti", e in orizzontale si vedeva blu e nero; ora il gradiente va da blu notte #003566 a zaffiro chiaro #0B5AA5 e la scheda è TUTTA blu. Nel tema scuro: sfondo da quasi-nero a blu notte #0A1128 e il velo dietro ai pannelli (Preferiti, Impostazioni, Notifiche, Cassetto, dettaglio file) da nero puro ad azzurro notte uguale al tema chiaro — zero nero in tutta la app, logica invariata |
| **v4.32** | 1.32.0 | Riconsegna completa della v4.31 con lo ZIP A 7 FILE: dentro anche `Modal.tsx` (il foglio dal basso condiviso, mai spedito prima: sul PC restava quello del clone e il pannello non coincideva con quello testato). Le comunicazioni aprono il PANNELLO DAL BASSO (come richiesto): la striscia oro resta sottile e fissa — un tocco e sale il pannello con tutte le comunicazioni, si chiude toccando fuori o con la X; via la lista in linea che spingeva il contenuto; VIA il bordo grigio attorno alle schede dei messaggi (soprattutto sui nuovi) e dal riquadro del testo; il doppione (titolo ripetuto sotto) ora salta anche con spazi, maiuscole, punteggiatura e "Studio PFC:" davanti — logica invariata |
| **v4.30** | 1.30.0 | Comunicazioni dello Studio aperte come richiesto: la striscia oro resta sottile e NON si espande più — un tocco e la lista delle comunicazioni si apre SOTTO, in linea, con la freccina che gira (secondo tocco e si richiude); via la scheda grande e via il pannello dal basso; tacca sotto le linguette ora "v1.30.0 · js430" (versione + sigillo del codice: doppia prova di quale build gira sul telefono) — logica invariata |
| **v4.29** | 1.29.0 | Tacca di versione visibile: sotto le linguette Attivi/Archiviati compare "v1.29.0" — letta direttamente dalla configurazione dell'app, dice sempre la verità su quale build gira sul telefono (se la vedi, il telefono è aggiornato; se non la vedi, il nuovo build non è stato installato) — grafica invariata, logica invariata |
| **v4.28** | 1.28.0 | Messaggi puliti sin dall'inizio: via il contorno grigio (l'ombra Android che si disegnava storta finché non si rientrava nella tab); le schede non si "espandono" più — restano compatte e al tocco aprono il testo SOTTO, per intero, con freccina (via il "Leggi tutto"); anche la pill "Richiesta Documento" porta la lettera; via la barretta scura in alto nei pannelli (quella che si vedeva all'altezza dei preferiti) — logica invariata |
| **v4.27** | 1.27.0 | Messaggi: la lettera è l'icona di tutti i messaggi — anche le richieste documento (via la nuvola: busta ambra al suo posto, il colore dice lo stato); le schede ora si APRONO bene al primo colpo, senza più dover uscire e rientrare nella tab — logica invariata |
| **v4.26** | 1.26.0 | Messaggi: via il testo scritto due volte (il titolo ripetuto nel corpo non si vede più), icona delle lettere elegante nelle schede — busta col pallino per i nuovi, busta aperta in oro per i letti — barra di navigazione invariata, logica invariata |
| **v4.25** | 1.25.0 | Messaggi belli sempre (anche tutti letti): schede Attivi/Archiviati a segment control a pillola (stile Archivio), icona di stato a cerchio con i letti in tinta oro, "STUDIO PFC" a lettering elegante, schede con ombra morbida, "Carica la risposta" a pillola — logica invariata |
| **v4.24** | 1.24.0 | Messaggi raffinati: via il banner informativo (più spazio alla lista), "Segna tutti letti (n)" come pillola oro, i messaggi nuovi restano segnati "Nuovo" anche a tab aperta (come nella Bacheca) e si chiudono solo col tocco, schede in tinta oro — logica invariata |
| **v4.22** | 1.22.0 | Bacheca rifinita: la X del pannello è allineata al titolo (come nella scheda), via il pulsante "Chiudi" — la chiusura resta con la X, il tocco fuori o il trascinamento giù |
| **v4.21** | 1.21.0 | Bacheca senza date e con la chiusura più comoda (richieste del titolare) |
| **v4.20** | 1.20.0 | Bacheca delle Comunicazioni: scheda elegante oro/blu al posto dei cartelli gialli, elenco completo in un pannello dal basso, la notifica push apre direttamente la Bacheca, pallino NUOVO sulle novità, tema scuro supportato |
| **v4.19** | 1.19.0 | Gli avvisi pubblici dello studio arrivano anche in app: sempre visibili sotto la barra in alto su ogni schermata, aggiornati in tempo reale; siti internet cliccabili negli avvisi e nei messaggi |
| **v4.18** | 1.18.0 | Niente più doppioni: "Scarica" e "Condividi" sempre insieme, anche nel lettore PDF; via la voce email dedicata (col pannello Condividi la email la fai già, scegliendo Gmail/mail) |
| **v4.17** | 1.17.0 | I preferiti si curano da soli: file spostato o rinominato viene ritrovato automaticamente (riprova, stesso nome, nome simile); solo se sparito davvero compare una schermata chiara con ricerca e rimozione dai preferiti |
| **v4.16** | 1.16.0 | Fine del 404 criptico: riparazione automatica dei preferiti rotti; il file scaricato mantiene il SUO nome (non più "download completato"); scheda file essenziale (Percorso + Dimensione) |
| **v4.15** | 1.15.0 | Archivio ordinato: "3 cartelle" (non più sezioni), via le diciture di aggiornamento, pulsante oro "I miei preferiti (n)", preferiti sempre in cima, stati veri al tocco (apri = visto, scarica = scaricato) |
| **v4.14** | 1.14.0 | Schermata di accesso ripensata: respirata e centrata, occhietto per mostrare/nascondere la password, logo invariato |
| **v4.13** | 1.13.0 | Interruttore notifiche vero (acceso = tutto arriva, spento = nulla più), pillola Attivo/Non attivo sempre coerente, via @username e versione app, scroll fluido in tutti i pannelli |
| **v4.12** | 1.12.0 | Archivio ripensato: anni solo nei chip, cartelle subito visibili, auto-aggiornamento silenzioso, apertura più veloce; Impostazioni stile v4 |
| **v4.11** | 1.11.0 | Grafica completa v4: palette Midnight Sapphire & Champagne Gold, TopBar con monogramma, interni di tutte le schede rifatti (logica invariata) |
| **v4.7** | 1.7.0 | Il tocco sulle notifiche apre il contenuto giusto, anche a app chiusa; campanella che si aggiorna e si pulisce da sola |

---

## 🔒 Sicurezza e privacy

- **Nessun segreto nella repo**: `google-services.json` è ricreato in CI da un secret GitHub (`GOOGLE_SERVICES_B64`)
- **Sessione a cookie** gestita dal backend, con logout e audit log lato server
- **Accesso riservato**: l'app è destinata ai clienti dello studio; le notifiche seguono l'interruttore scelto dal cliente, che può spegnerle in qualsiasi momento
- **Nessun dato tecnico esposto nell'UI**: token e diagnostica vivono nel codice, non a schermo

---

## 🧯 Risoluzione problemi

| Problema | Soluzione |
|---|---|
| Metro non si collega al device | Stessa rete Wi-Fi o `adb reverse tcp:8081 tcp:8081`; riavvia con `npx expo start --dev-client --clear` |
| Errore Firebase su build nuova | Verifica che `android/app/google-services.json` esista e contenga package `com.portalepfcrn` |
| Non arrivano notifiche | Apri **Impostazioni**: la pillola deve dire **Attivo** (verde). Se dice Non attivo, accendi l'interruttore "Ricevi gli avvisi dello studio": il telefono viene registrato automaticamente e la pillola diventa verde |
| Kotlin/compose errori in build | Assicurati che `android/build.gradle` abbia `kotlinVersion = "2.0.21"` e il classpath esplicito `kotlin-gradle-plugin:2.0.21` |
| Gradle cache corrotta | `cd android && ./gradlew clean` oppure elimina `android/.gradle` |

---

## 📄 Licenza

Progetto a uso interno dello studio — tutti i diritti riservati.

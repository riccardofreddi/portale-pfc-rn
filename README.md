# Portale PFC Mobile

App mobile (Android) per i clienti dello studio: archivio documenti per anno/cartella, messaggi, cassetto personale, notifiche push Firebase e anteprima PDF.

**Stack:** React Native 0.76 · Expo SDK 52 (dev-client) · TypeScript · Zustand · Firebase FCM · Backend `portale-pfc-v2.vercel.app`

---

## Funzionalità

- **Archivio** — documenti organizzati per anno → cartella → file, con ricerca globale, preferiti, selezione multipla (download/preferiti in blocco) e anteprima PDF
- **Messaggi** — comunicazioni dallo studio, risposta con upload file, archiviazione
- **Cassetto personale** — upload/download/rinomina/eliminazione documenti (QR P.IVA, visure, IBAN, ecc.)
- **Attività** — registro audit delle operazioni svolte
- **Notifiche push** — Firebase Cloud Messaging con diagnostica e test directly dall'app
- **Dark mode** — tema chiaro/scuro/sistema (Impostazioni → Aspetto), persistente
- **Controllo aggiornamenti** — Impostazioni → Controlla aggiornamenti: confronta la versione installata con l'ultima APK pubblicata su GitHub Releases
- **Sicurezza** — sessione via cookie, logout remoto, audit log lato server

## Struttura del progetto

```
├── App.tsx                  # Bootstrap: sessione, push, polling badge
├── app.json                 # Config Expo (slug, package android, versione)
├── src/
│   ├── api/client.ts        # API client (cookie sessione, tutti gli endpoint)
│   ├── components/          # Button, Card, Modal, Toaster, TopBar, ...
│   ├── lib/                 # push (FCM), deeplink, haptics, utils, updates
│   ├── navigation/          # AppNavigator (tabs + stack + modali globali)
│   ├── screens/             # Login, Archivio, Messaggi, Cassetto, Attività,
│   │                        # PdfPreview, Onboarding, Settings, Notifiche, Splash
│   ├── store/auth.ts        # Store globale (Zustand)
│   ├── theme/               # Design system: light/dark colors, spacing, typography
│   └── types/api.ts         # Tipi API condivisi
└── android/                 # Progetto nativo (prebuild manuale, includes google-services.json)
```

## Requisiti

- Node.js ≥ 20
- JDK 17, Android SDK 34 (Android Studio)
- Un device fisico con USB debugging (consigliato) o emulatore
- `google-services.json` del progetto Firebase **portale-pfc-v3** in `android/app/` (già presente in locale; NON è nella repo per sicurezza)

## Sviluppo quotidiano

```bash
npm install

# Prima volta (build nativa + install sul device):
npx expo run:android --device

# Tutte le altre volte (hot reload, nessuna ricompilazione):
npx expo start --dev-client
```

> L'app **non funziona in Expo Go**: usa moduli nativi (Firebase, biometria, PDF).
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

## Versioni

La versione vive in tre punti, tenuti allineati:

1. `app.json` → `expo.version`
2. `package.json` → `version`
3. `android/app/build.gradle` → `versionName` / `versionCode`

Quando pubblichi una nuova versione: incrementa `versionName` (es. `1.1.0`) e
`versionCode` (sempre +1) in `android/app/build.gradle`, allinea gli altri due file
e fai push: la CI pubblica la nuova APK su GitHub Releases e l'app la segnala
tramite "Controlla aggiornamenti".

## CI/CD (GitHub Actions)

Il workflow `.github/workflows/ci.yml` fa due cose ad ogni push:

1. **verify** — `npm ci`, TypeScript e ESLint
2. **build-apk** — (dopo verify) build APK release e pubblicazione sulla
   release GitHub `latest-apk`, scrivendo la versione nel body

### Setup su una repo nuova (una volta sola)

Il file `google-services.json` **non è nella repo**: la CI lo ricrea da un secret.

```bash
# Con GitHub CLI (gh) autenticato:
gh secret set GOOGLE_SERVICES_B64 < <(base64 -w0 android/app/google-services.json)
```

PowerShell (senza gh, dalla web UI: repo → Settings → Secrets and variables → Actions):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android\app\google-services.json")) | Set-Clipboard
# incolla il valore nel secret GOOGLE_SERVICES_B64
```

## Aggiornare l'app sul telefono

1. Apri l'app → **Impostazioni → Controlla aggiornamenti**
2. Se esce una nuova versione, l'app apre la pagina GitHub Releases
3. Scarica `app-release.apk`, installala (sovrascrive la precedente, mantiene login e impostazioni)

In alternativa: `npm run build:android` in locale e installa l'APK da `android/app/build/outputs/apk/release/`.

## Troubleshooting

| Problema | Soluzione |
|---|---|
| Metro non si collega al device | Stessa rete Wi-Fi o `adb reverse tcp:8081 tcp:8081`; riavvia con `npx expo start --dev-client --clear` |
| Errore Firebase su build nuova | Verifica che `android/app/google-services.json` esista e contenga package `com.portalepfcrn` |
| Push non arrivano | Impostazioni → Stato notifiche → "Registra di nuovo"; verifica che il server FCM sia "attivo" |
| Kotlin/compose errori in build | Assicurati che `android/build.gradle` abbia `kotlinVersion = "2.0.21"` e il classpath esplicito `kotlin-gradle-plugin:2.0.21` |
| Gradle cache corrotta | `cd android && ./gradlew clean` oppure elimina `android/.gradle` |

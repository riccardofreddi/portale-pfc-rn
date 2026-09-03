# Guida migrazione pulita — Portale PFC Mobile v1.0.0

Questa guida sostituisce il vecchio progetto (RN CLI) con la nuova versione
Expo + miglioramenti, sia sul PC che su GitHub. ~15 minuti in totale.

---

## 1. Cosa contiene il pacchetto

| File | Descrizione |
|---|---|
| `portale-pfc-rn-github.zip` | Progetto completo: codice + storico git pulito + `google-services.json` + config Android già corretta |
| `setup-github.ps1` | Script che crea la repo GitHub, fa il push e imposta il secret della CI |
| `GUIDA-MIGRAZIONE.md` | Questa guida |

---

## 2. Pulizia del PC (cancella il vecchio progetto)

Chiudi eventuali terminali con Metro/Expo attivi (Ctrl+C), poi in PowerShell:

```powershell
# SOSTITUISCI il percorso con quello della TUA vecchia cartella:
Remove-Item -Recurse -Force "$HOME\percorso\vecchia\portale-pfc-rn"
```

Poi estrai `portale-pfc-rn-github.zip` in una nuova cartella, ad esempio `C:\dev\portale-pfc-rn`.

> Dentro lo zip c'è già `android\app\google-services.json`: non devi copiare nulla a mano.

## 3. Elimina la vecchia repo su GitHub

**Via web (più semplice):**
1. Apri `https://github.com/riccardofreddi/portale-pfc-rn`
2. `Settings` → scorri in fondo fino a **Danger Zone**
3. **Delete this repository** → digita il nome della repo per confermare

**Via GitHub CLI (alternativa):**
```powershell
gh repo delete riccardofreddi/portale-pfc-rn --yes
```
> Serve scope `delete_repo`: `gh auth refresh -s delete_repo`

## 4. Crea la nuova repo e fai il push

Dalla cartella estratta:

```powershell
cd C:\dev\portale-pfc-rn
.\setup-github.ps1          # aggiungi -Private se la vuoi privata
```

Lo script fa tutto: crea la repo, pusha `main`, imposta il secret
`GOOGLE_SERVICES_B64` per la CI e stampa il link.

<details>
<summary><b>Procedura manuale</b> (se preferisci non usare lo script)</summary>

1. Su GitHub: `New repository` → nome `portale-pfc-rn` → **NON** inizializzare con README
2. Nella cartella del progetto:
   ```powershell
   git remote add origin https://github.com/riccardofreddi/portale-pfc-rn.git
   git push -u origin main
   ```
3. Secret CI: repo → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`
   - Nome: `GOOGLE_SERVICES_B64`
   - Valore (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("android\app\google-services.json")) | Set-Clipboard`
</details>

## 5. Ricompila l'app sul telefono

La prima volta nella nuova cartella serve una build nativa (la cache Gradle
di Windows la rende più veloce della prima volta):

```powershell
npm install
npx expo run:android --device
```

Dopo: sviluppo quotidiano con `npx expo start --dev-client` (hot reload).

## 6. Verifica la CI

Su GitHub: tab **Actions** → workflow **CI** → deve fare verde `verify` e `build-apk`.
L'APK finisce su **Releases → App APK (latest)**.

---

## Cosa c'è di nuovo nell'app (v1.0.0)

- 🌙 **Dark mode completo** — Impostazioni → Aspetto → Sistema / Chiaro / Scuro (persistente)
- 🔄 **Controllo aggiornamenti** — Impostazioni → Controlla aggiornamenti: se la CI pubblica una APK più nuova, l'app te lo segnala e apre GitHub
- ℹ️ **Versione reale** in Impostazioni
- 🏗️ **CI migliorata** — verifica TypeScript+ESLint prima di ogni build APK
- 🧹 **Repo pulita** — storico git nuovo, README italiano, `.gitignore`/`.gitattributes` corretti

## Problemi?

| Problema | Soluzione |
|---|---|
| `setup-github.ps1` bloccato da policy | `powershell -ExecutionPolicy Bypass -File .\setup-github.ps1` |
| Il nome repo esiste già | Elimina prima la vecchia repo (sezione 3), poi rilancia lo script |
| La CI fallisce per il secret | Rilancia `setup-github.ps1` (imposta il secret) oppure fallo a mano (sezione 4) |
| Errore Kotlin in build | Verifica `android/build.gradle`: `kotlinVersion = "2.0.21"` + classpath `kotlin-gradle-plugin:2.0.21` (già corretti nello zip) |

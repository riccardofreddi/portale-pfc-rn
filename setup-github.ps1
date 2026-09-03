# Setup GitHub per Portale PFC Mobile
# Crea la repo, fa il push e imposta il secret per la CI.
#
# USO (PowerShell, dalla cartella del progetto estratto):
#   .\setup-github.ps1                          # repo pubblica "portale-pfc-rn"
#   .\setup-github.ps1 -Private                 # repo privata
#   .\setup-github.ps1 -RepoName mio-nome       # nome custom
#
# Richiede GitHub CLI: https://cli.github.com/  (poi: gh auth login)

param(
  [string]$RepoName = "portale-pfc-rn",
  [string]$Owner = "riccardofreddi",
  [switch]$Private
)

$ErrorActionPreference = "Stop"

Write-Host "=== Setup GitHub - Portale PFC Mobile ===" -ForegroundColor Cyan

# 1. Verifica GitHub CLI
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "GitHub CLI (gh) NON trovato." -ForegroundColor Yellow
  Write-Host "Opzioni:" -ForegroundColor Yellow
  Write-Host "  a) Installa gh:  winget install GitHub.cli   poi:  gh auth login"
  Write-Host "  b) Segui la procedura manuale in GUIDA-MIGRAZIONE.md (sezione 4)"
  exit 1
}

gh auth status
if ($LASTEXITCODE -ne 0) {
  Write-Host "Prima esegui:  gh auth login" -ForegroundColor Yellow
  exit 1
}

# 2. Crea la repo e fa il push del ramo main
$vis = if ($Private) { "--private" } else { "--public" }
Write-Host ""
Write-Host "Creo la repo $Owner/$RepoName e faccio push di main..."
gh repo create $RepoName $vis --source . --remote origin --push
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Creazione fallita. Cause tipiche:" -ForegroundColor Red
  Write-Host " - esiste gia' una repo con questo nome -> eliminala prima (GUIDA-MIGRAZIONE.md sezione 3)"
  Write-Host " - git remote 'origin' gia' configurato -> rimuovilo con: git remote remove origin"
  exit 1
}

# 3. Secret GOOGLE_SERVICES_B64 per la CI
$gsPath = Join-Path (Get-Location) "android\app\google-services.json"
if (Test-Path $gsPath) {
  Write-Host "Imposto il secret GOOGLE_SERVICES_B64 per la CI..."
  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($gsPath))
  $b64 | gh secret set GOOGLE_SERVICES_B64 -R "$Owner/$RepoName"
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Secret impostato." -ForegroundColor Green
  } else {
    Write-Host "Impostazione secret fallita: fallo manualmente dalla web UI (README -> CI/CD)." -ForegroundColor Yellow
  }
} else {
  Write-Host "ATTENZIONE: android\app\google-services.json non trovato!" -ForegroundColor Red
  Write-Host "La CI fallira' finche' non imposti il secret GOOGLE_SERVICES_B64 (README -> CI/CD)." -ForegroundColor Red
}

Write-Host ""
Write-Host "Fatto! Repo: https://github.com/$Owner/$RepoName" -ForegroundColor Green
Write-Host "La CI buildera' l'APK automaticamente: guardala su Actions -> CI." -ForegroundColor Green
Write-Host "L'APK verra' pubblicato su Releases -> App APK (latest)." -ForegroundColor Green

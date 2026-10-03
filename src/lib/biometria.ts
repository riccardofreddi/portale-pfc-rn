/**
 * v4.87: motore dello sblocco biometrico (impronta o volto).
 *
 * - Nessuna chiave crittografica, nessun dato biometrico salvato: la
 *   libreria nativa (compilata nell'APK da sempre, finora mai usata)
 *   interroga il chip sicuro del telefono e risponde solo SI o NO,
 *   tutto in locale sul dispositivo.
 * - Nessuna chiamata di rete: l'impronta e il volto non escono mai dal
 *   telefono.
 * - Qualsiasi problema (sensore assente, biometria non configurata,
 *   chiamata nativa fallita) risponde false: chi chiama non deve mai
 *   bloccare l'app per un errore (telefono senza biometria = app si
 *   apre come sempre, senza richieste).
 *
 * Nota API: la versione installata della libreria (3.0.0) esporta un
 * OGGETTO con le funzioni (non una classe): si chiama direttamente
 * RNBiometrics.isSensorAvailable() / RNBiometrics.simplePrompt().
 */
import RNBiometrics from 'react-native-biometrics';

/**
 * true solo se il telefono ha un sensore biometrico pronto con impronta
 * o volto REGISTRATI. false altrimenti (nessuna richiesta all'utente).
 */
export async function sensorePronto(): Promise<boolean> {
  try {
    const res = await RNBiometrics.isSensorAvailable();
    if (!res.available) {
      return false;
    }
    return (
      res.biometryType === RNBiometrics.Biometrics ||
      res.biometryType === RNBiometrics.TouchID ||
      res.biometryType === RNBiometrics.FaceID
    );
  } catch {
    return false;
  }
}

/**
 * Apre la richiesta biometrica di sistema (impronta o volto).
 * Risolve true SOLO se il riconoscimento va a buon fine: annullamento,
 * dito/viso non riconosciuto o errore = false (e conta come tentativo
 * fallito per chi chiama).
 *
 * Niente ripiego sul PIN del telefono: la libreria di default usa
 * allowDeviceCredentials: false, quindi lo sblocco e SOLO biometrico
 * (altrimenti login completo con le credenziali).
 */
export async function chiediSblocco(
  promptMessage = 'Sblocca Portale',
  cancelButtonText = 'Annulla',
): Promise<boolean> {
  try {
    const res = await RNBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText,
    });
    return res.success === true;
  } catch {
    return false;
  }
}

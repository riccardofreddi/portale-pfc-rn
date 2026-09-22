/**
 * v4.65: dichiarazione per gli asset immagine (PNG) importati da Metro.
 * Senza questa, `import LOGO_PF from '@/assets/pf-logo.png'` non passa
 * la verifica TypeScript.
 */
declare module '*.png' {
  const asset: number;
  export default asset;
}

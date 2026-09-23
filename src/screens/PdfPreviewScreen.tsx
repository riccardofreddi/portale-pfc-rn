/**
 * Schermata Preview PDF (v3.2 — metodo robusto).
 *
 * Prima il PDF veniva caricato DA INTERNET dentro il lettore, passando il
 * cookie: bastava poco (cookie mancante, risposta di errore del server) e
 * l'anteprima restava "Caricamento..." o dava errore. Ora il file viene
 * PRIMA scaricato in una cartella temporanea con il metodo sicuro usato
 * anche per i download (stessa sessione, controllo dello stato HTTP, errore
 * chiaro) e POI aperto da lì: funziona sempre, e se lo riapri è immediato
 * perché riusa la copia già scaricata.
 *
 * v4.17: la riparazione va a GRADI (la cura vive in download.ts): il
 * file viene riprovato al suo posto, poi cercato con lo stesso nome,
 * poi con un nome simile. Se una cura riesce e il file era cambiato di
 * posto, un avviso dice chiaramente che è stato aperto dal percorso
 * attuale. SOLO se il file è davvero sparito da ogni angolo
 * dell'archivio compare la schermata "Documento non trovato", che NON
 * è un vicolo cieco: offre di cercarlo nella ricerca dell'archivio
 * (col nome già scritto: magari ha un nome nuovo) e, se era un
 * preferito, di togliere la stellina; oltre al classico Riprova.
 *
 * v4.18: in ALTO ci sono SEMPRE i due pulsanti che servono: "Scarica"
 * (salva il file nella cartella Download) e "Condividi" (apre il
 * pannello di Android: WhatsApp, Gmail, Drive, email e tutto il resto).
 * Via il doppione della vecchia email dedicata: Condividi fa già
 * tutto, email compresa.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Pdf from 'react-native-pdf';
import { useAppStore } from '@/store/auth';
import { api } from '@/api/client';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { scaricaInDownload, scaricaInCacheConRiparazione } from '@/lib/download';
import { condividiDocumento } from '@/lib/condividi';
import { spacing, typography, useColors, type ThemeColors } from '@/theme';

interface Props {
  // v4.72: lastModified (versione del file) arriva dalla lista del server e
  // serve da chiave di cache: se il file viene ricaricato con la STESSA chiave
  // (Cassetto: iban_2026.pdf cancellato e ricaricato), l'anteprima deve
  // riscaricare il contenuto nuovo invece di riusare la vecchia copia locale.
  route: { params: { key: string; nome: string; lastModified?: number | string | null } };
}

export default function PdfPreviewScreen({ route }: Props) {
  const colors = useColors();
  const styles = makeStyles(colors);

  const { key, nome, lastModified } = route.params;
  const navigation = useNavigation();
  const setPreviewFile = useAppStore((s) => s.setPreviewFile);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // v4.17: il file è sparito da OGNI angolo dell'archivio (la cura a
  // gradi non ha trovato niente): schermata d'aiuto al posto del secco
  // "HTTP 404 · Riprova" che non portava da nessuna parte.
  const [smarrito, setSmarrito] = useState(false);
  const [eraPreferito, setEraPreferito] = useState(false);
  const [rimuovendo, setRimuovendo] = useState(false);
  // v4.16: la chiave VIVA del file (dopo una eventuale riparazione):
  // il pulsante Scarica deve scaricare il file giusto, non quello morto.
  const [chiaveAttiva, setChiaveAttiva] = useState(key);
  // v4.18: percorso locale della copia già scaricata (per "Condividi"
  // senza riscaricare nulla) + condivisione in corso.
  const [percorsoLocale, setPercorsoLocale] = useState<string | null>(null);
  const [condividendo, setCondividendo] = useState(false);

  const carica = React.useCallback(async () => {
    setError(null);
    setFileUri(null);
    setSmarrito(false);
    setEraPreferito(false);
    setPercorsoLocale(null);
    try {
      // v4.17: scaricaInCacheConRiparazione cura da sola il caso
      // "file spostato/rinominato" a gradi (riprova, stesso nome,
      // nome simile) e ripara anche la stellina.
      const esito = await scaricaInCacheConRiparazione(key, nome, lastModified);
      setChiaveAttiva(esito.key);
      setPercorsoLocale(esito.percorso);
      setFileUri(`file://${esito.percorso}`);
      // v4.17: se il file è stato trovato con un NOME SIMILE (o spostato
      // di posto) lo diciamo chiaramente: mai aprire file diversi in
      // silenzio. Il grado 'stessa' (riprova riuscita) resta invisibile.
      if (esito.tipoRiparazione === 'simile') {
        toast.info(
          'File trovato',
          'Aperto il più simile trovato nella ricerca dell\'archivio',
        );
      } else if (esito.riparato) {
        toast.info(
          'File spostato',
          'Aperto dalla sua posizione attuale nell\'archivio',
        );
      }
    } catch (err) {
      const e = err as Error & { smarrito?: boolean; eraPreferito?: boolean };
      if (e?.smarrito) {
        setSmarrito(true);
        setEraPreferito(Boolean(e.eraPreferito));
      }
      setError(e instanceof Error ? e.message : 'Impossibile aprire il file');
    }
  }, [key, nome, lastModified]);

  // v4.17: apre la ricerca dell'archivio col nome del file già scritto:
  // se lo studio l'ha rinominato, il cliente vede DOVE vive ora.
  function apriRicercaArchivio() {
    haptics.tap();
    DeviceEventEmitter.emit('pfc-apri-ricerca', { query: nome });
    setPreviewFile(null);
    navigation.goBack();
  }

  // v4.17: toglie la stellina dal file che non esiste più (nient'altro
  // da aprire) e torna all'archivio. Evento = contatore preferiti
  // aggiornato subito nel pannello e nel pulsante dell'hero.
  async function rimuoviPreferitoSmarrito() {
    haptics.tap();
    setRimuovendo(true);
    try {
      await api.preferiti.toggle(chiaveAttiva);
      DeviceEventEmitter.emit('pfc-preferiti-riparati', { chiaveMorta: chiaveAttiva });
      toast.success('Rimosso dai preferiti');
      setPreviewFile(null);
      navigation.goBack();
    } catch {
      toast.error('Errore', 'Impossibile aggiornare i preferiti. Riprova');
    } finally {
      setRimuovendo(false);
    }
  }

  useEffect(() => {
    carica();
    const unsub = navigation.addListener('blur', () => {
      setPreviewFile(null);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, setPreviewFile]);

  async function handleDownload() {
    haptics.impact();
    setSalvando(true);
    try {
      // v4.16: usa la chiave viva (uguale a quella di partenza se non ci
      // sono state riparazioni).
      await scaricaInDownload(chiaveAttiva, nome);
      haptics.success();
      toast.success('File scaricato', 'Salvato in Download col suo nome');
    } catch (err) {
      toast.error('Errore download', err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setSalvando(false);
    }
  }

  // v4.18: apre il pannello di condivisione di Android col file GIÀ in
  // cache (nessun riscaricamento): WhatsApp, Gmail, Drive, email e via
  // dicendo. Attivo solo quando il documento è davvero a schermo.
  async function handleCondividi() {
    if (!percorsoLocale || condividendo) return;
    haptics.tap();
    setCondividendo(true);
    try {
      const esito = await condividiDocumento(percorsoLocale, nome);
      if (esito === 'ok') {
        haptics.success();
        toast.success('Condivisione pronta', "Scegli l'app con cui inviarlo");
      } else if (esito === 'solo-testo') {
        toast.info('Pannello aperto', "Per allegare il FILE serve l'aggiornamento dell'app");
      } else if (esito === 'errore') {
        toast.error('Condivisione', 'Non sono riuscito ad aprire il pannello. Riprova');
      }
    } finally {
      setCondividendo(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            setPreviewFile(null);
            navigation.goBack();
          }}
          style={styles.closeBtn}
          accessibilityLabel="Chiudi"
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {nome}
        </Text>
        {/* v4.18: Condividi SEMPRE accanto a Scarica (via la vecchia
         * email dedicata: il pannello di sistema fa già tutto, email
         * compresa). Attivo solo con il documento a schermo: è lui che
         * viene condiviso. */}
        <Pressable
          onPress={handleCondividi}
          hitSlop={8}
          style={styles.downloadBtn}
          disabled={!percorsoLocale || condividendo}
          accessibilityLabel="Condividi il documento"
        >
          {condividendo ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <>
              <Ionicons name="share-social-outline" size={13} color={colors.accent} />
              <Text style={styles.downloadBtnText}>Condividi</Text>
            </>
          )}
        </Pressable>
        <Pressable onPress={handleDownload} hitSlop={8} style={styles.downloadBtn} disabled={salvando}>
          {salvando ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <>
              <Ionicons name="download-outline" size={13} color={colors.accent} />
              <Text style={styles.downloadBtnText}>Scarica</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.pdfContainer}>
        {!fileUri && !error && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Caricamento...</Text>
          </View>
        )}
        {error && smarrito ? (
          // v4.17: fine della strada per QUESTO percorso, non per il cliente:
          // tre vie chiare invece del loop "HTTP 404 · Riprova".
          <View style={styles.overlay}>
            <Ionicons name="alert-circle-outline" size={44} color={colors.danger} />
            <Text style={styles.smarritoTitle}>Documento non trovato</Text>
            <Text style={styles.smarritoText}>
              Lo studio lo ha spostato o eliminato dall'archivio. Puoi cercarlo
              con la ricerca (magari ha un nome nuovo) o toglierlo dai preferiti.
            </Text>
            <Pressable onPress={apriRicercaArchivio} style={styles.smarritoBtnOro}>
              <Ionicons name="search" size={16} color={colors.primary} />
              <Text style={styles.smarritoBtnOroText}>Cerca nell'archivio</Text>
            </Pressable>
            {eraPreferito ? (
              <Pressable
                onPress={rimuoviPreferitoSmarrito}
                disabled={rimuovendo}
                style={styles.smarritoBtnNavy}
              >
                {rimuovendo ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <>
                    <Ionicons name="star-outline" size={16} color={colors.textInverse} />
                    <Text style={styles.smarritoBtnNavyText}>Rimuovi dai preferiti</Text>
                  </>
                )}
              </Pressable>
            ) : null}
            <Pressable onPress={carica} hitSlop={6} style={styles.smarritoRiprova}>
              <Text style={styles.smarritoRiprovaText}>↻ Riprova</Text>
            </Pressable>
          </View>
        ) : error ? (
          <View style={styles.overlay}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={carica} style={styles.retryBtn}>
              <Text style={styles.retryText}>↻ Riprova</Text>
            </Pressable>
          </View>
        ) : null}
        {fileUri ? (
          <Pdf
            source={{ uri: fileUri }}
            onError={(err) => {
              const msg = err && typeof err === 'object' && 'message' in err
                ? String((err as { message: unknown }).message)
                : 'Errore caricamento PDF';
              setError(msg);
            }}
            style={styles.pdf}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
    },
    downloadBtn: {
      flexDirection: 'row',
      gap: 5,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      backgroundColor: colors.accentSoft,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    downloadBtnText: {
      ...typography.bodySmall,
      color: colors.accent,
      fontWeight: '600',
    },
    pdfContainer: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
    },
    pdf: {
      flex: 1,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      zIndex: 1,
      gap: spacing.md,
    },
    loadingText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    errorText: {
      ...typography.body,
      color: colors.danger,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
    },
    retryBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 10,
      backgroundColor: colors.accent,
    },
    retryText: {
      ...typography.button,
      color: colors.textInverse,
      fontWeight: '700',
    },
    // v4.17: schermata "Documento non trovato"
    smarritoTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    smarritoText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.xl,
      lineHeight: 20,
    },
    smarritoBtnOro: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.accent,
      minWidth: 240,
      justifyContent: 'center',
    },
    smarritoBtnOroText: {
      ...typography.button,
      color: colors.primary,
      fontWeight: '700',
    },
    smarritoBtnNavy: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
      minWidth: 240,
      justifyContent: 'center',
    },
    smarritoBtnNavyText: {
      ...typography.button,
      color: colors.textInverse,
      fontWeight: '700',
    },
    smarritoRiprova: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    smarritoRiprovaText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      fontWeight: '600',
    },
  });

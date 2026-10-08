/**
 * AggiornamentoModal (v4.86) - il pannello dell'aggiornamento guidato.
 *
 * Quando su GitHub Releases esce una versione piu' recente dell'app,
 * all'avvio compare questo pannello con il bottone "Aggiorna ora".
 * Finche' l'utente non preme il bottone resta fermo: il tasto indietro
 * non lo chiude e toccare fuori non chiude.
 *
 * v4.93 - "AGGIORNA ORA" chiudeva il pannello e l'APK scaricava nel
 * browser: poi il cliente doveva cercare la notifica e toccare il file.
 *
 * v4.100 - FA TUTTO DA SOLO. Il tocco su "Aggiorna ora" NON apre piu'
 * il browser: l'APK scarica DENTRO l'app (il bottone mostra
 * "Scaricamento... X%") e a fine download l'app apre DA SOLA
 * l'installer di Android: resta solo la conferma di sistema
 * "Aggiorna app?" (non eliminabile: sicurezza di Android). Se il
 * download fallisce, il bottone diventa "Riprova" e sotto compare
 * "Scarica dal browser": la vecchia via, come ultima spiaggia.
 * Se il cliente annulla l'installer, il pannello riparte al prossimo
 * avvio (nessuna memoria: tutti devono finire sull'ultima versione).
 * L'APK gia' scaricato per la stessa release non si riscarica: al
 * secondo tocco l'installer apre subito.
 *
 * Minimale per scelta del titolare: nessun numero di versione, nessun
 * testo tecnico, solo titolo e bottone. Il confronto delle versioni e
 * la decisione se mostrarlo vivono in src/lib/updates.ts; il controllo
 * parte da App.tsx all'avvio, con utente collegato.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal as RNModal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  apriDownloadAggiornamento,
  eseguiAggiornamento,
} from '@/lib/updates';
import { radius, spacing, typography, useColors, type ThemeColors } from '@/theme';

interface AggiornamentoModalProps {
  visible: boolean;
  /** La versione che GitHub sta proponendo. Serve a ricordare quale
   *  APK e' gia' in cache per questa release (nessun riscaricamento).
   *  Se manca (non dovrebbe mai), si scarica e si apre l'installer
   *  comunque: il pannello non resta bloccato sullo schermo. */
  versioneLatest?: string | null;
  /** v4.93: chiamata quando l'installer e' stato aperto: App la usa
   *  per chiudere il pannello (visible => false). */
  onAggiora?: () => void;
}

export function AggiornamentoModal({
  visible,
  versioneLatest,
  onAggiora,
}: AggiornamentoModalProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  // v4.100: fasi del pannello. "inattivo" = bottone "Aggiorna ora";
  // "scaricamento" = download in corso (bottone con la percentuale);
  // "errore" = bottone "Riprova" + via di fuga col browser.
  const [fase, setFase] = useState<'inattivo' | 'scaricamento' | 'errore'>(
    'inattivo',
  );
  const [percento, setPercento] = useState(0);

  // Il download puo' durare minuti: se il pannello nel frattempo viene
  // smontato, i callback di progresso non devono piu' toccare lo stato.
  const montato = useRef(true);
  useEffect(() => {
    montato.current = true;
    return () => {
      montato.current = false;
    };
  }, []);

  // Riapertura (prossimo avvio, o ritorno dopo un annullamento): le
  // fasi ripartono pulite, la cache dell'APK fa il resto al bisogno.
  useEffect(() => {
    if (visible) {
      setFase('inattivo');
      setPercento(0);
    }
  }, [visible]);

  // v4.100: un solo gestore per il bottone: scarica dentro l'app e
  // apre da solo l'installer. Nessun browser, nessuna notifica da
  // cercare: al cliente resta la conferma di Android e basta.
  const gestisciAggiorna = () => {
    if (fase === 'scaricamento') return; // un tocco per volta
    setFase('scaricamento');
    setPercento(0);
    void (async () => {
      try {
        await eseguiAggiornamento(versioneLatest ?? '', (p) => {
          if (montato.current) setPercento(p);
        });
        // Installer aperto: chiudi il pannello. Se il cliente annulla
        // l'installazione, l'app resta usabile e al prossimo avvio
        // l'aggiornamento si ripresenta da solo.
        onAggiora?.();
      } catch {
        if (montato.current) setFase('errore');
      }
    })();
  };

  // v4.100: ultima spiaggia se il download dentro l'app fallisce
  // (rete filtrata, GitHub bloccato): la vecchia via del browser.
  const gestisciBrowser = () => {
    apriDownloadAggiornamento();
    onAggiora?.();
  };

  const inCorso = fase === 'scaricamento';

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // v4.86: il tasto indietro NON chiude: finche' l'utente non preme
        // "Aggiorna ora" il pannello resta. v4.100: dopo il tocco il
        // pannello si chiude da solo quando l'installer e' aperto
        // (onAggiora): non serve il tasto indietro.
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" />
      <View style={styles.veilo}>
        <View style={styles.card}>
          <Text style={styles.titolo}>Nuova versione disponibile</Text>
          <Pressable
            style={({ pressed }) => [
              styles.bottone,
              (pressed || inCorso) && styles.bottonePremuto,
            ]}
            onPress={gestisciAggiorna}
            disabled={inCorso}
            accessibilityRole="button"
            accessibilityLabel={
              inCorso ? 'Scaricamento in corso' : 'Aggiorna ora'
            }
          >
            <Text style={styles.bottoneTesto}>
              {inCorso
                ? percento > 0
                  ? `Scaricamento... ${percento}%`
                  : 'Scaricamento...'
                : fase === 'errore'
                  ? 'Riprova'
                  : 'Aggiorna ora'}
            </Text>
          </Pressable>
          {fase === 'errore' && (
            <Pressable
              onPress={gestisciBrowser}
              accessibilityRole="button"
              accessibilityLabel="Scarica dal browser"
            >
              <Text style={styles.fugaBrowser}>Scarica dal browser</Text>
            </Pressable>
          )}
        </View>
      </View>
    </RNModal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    veilo: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      padding: spacing.xxl,
      alignItems: 'center',
      gap: spacing.xl,
    },
    titolo: {
      ...typography.h3,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    bottone: {
      alignSelf: 'stretch',
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
    },
    bottonePremuto: {
      opacity: 0.85,
    },
    bottoneTesto: {
      ...typography.button,
      color: colors.textInverse,
    },
    fugaBrowser: {
      ...typography.button,
      color: colors.textSecondary,
      textDecorationLine: 'underline',
    },
  });

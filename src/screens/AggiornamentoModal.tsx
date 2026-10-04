/**
 * AggiornamentoModal (v4.86) - il pannello dell'aggiornamento guidato.
 *
 * Quando su GitHub Releases esce una versione piu' recente dell'app,
 * all'avvio compare questo pannello con il bottone "Aggiorna ora":
 * apre il download diretto dell'APK nel browser. Finche' l'utente non
 * preme il bottone resta fermo: il tasto indietro non lo chiude e
 * toccare fuori non chiude.
 *
 * v4.93 - "AGGIORNA ORA" CHIUDE IL PANNELLO. Prima il pannello restava
 * aperto anche dopo il download (tornando dal browser era ancora li',
 * bloccante) e a ogni avvio, finche' l'install non riusciva, ricompariva:
 * il cliente si sentiva intrappolato. Ora il tocco su "Aggiorna ora":
 * 1) RICORDA la richiesta (AsyncStorage: "gia' chiesto di andare alla
 *    versione X") => al prossimo avvio il pannello NON ricompare per la
 *    STESSA release; torna solo quando su GitHub esce una release nuova;
 * 2) chiude il pannello subito => si continua a usare l'app mentre
 *    l'APK scarica nel browser.
 *
 * Minimale per scelta del titolare: nessun numero di versione, nessun
 * testo tecnico, solo titolo e bottone. Il confronto delle versioni e
 * la decisione se mostrarlo vivono in src/lib/updates.ts; il controllo
 * parte da App.tsx all'avvio, con utente collegato.
 */
import React from 'react';
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
  segnaAggiornamentoChiesto,
} from '@/lib/updates';
import { radius, spacing, typography, useColors, type ThemeColors } from '@/theme';

interface AggiornamentoModalProps {
  visible: boolean;
  /** v4.93: la versione che GitHub sta proponendo. Serve per ricordare
   *  l'"Aggiorna ora" (ack) e non far piu' comparire il pannello per la
   *  stessa release. Se manca (non dovrebbe mai), si scarica e chiude
   *  comunque: il pannello non resta bloccato sullo schermo. */
  versioneLatest?: string | null;
  /** v4.93: chiamata DOPO aver aperto il download: App la usa per
   *  chiudere il pannello (visible => false). */
  onAggiora?: () => void;
}

export function AggiornamentoModal({
  visible,
  versioneLatest,
  onAggiora,
}: AggiornamentoModalProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  // v4.93: un solo gestore per il bottone, con la sequenza completa:
  // ricorda => scarica => chiudi. La promessa dell'ack non blocca nulla
  // (va per conto suo) e un eventuale fallimento non impedisce ne' il
  // download ne' la chiusura.
  const gestisciAggiorna = () => {
    if (versioneLatest) {
      void segnaAggiornamentoChiesto(versioneLatest);
    }
    apriDownloadAggiornamento();
    onAggiora?.();
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // v4.86: il tasto indietro NON chiude: finche' l'utente non preme
        // "Aggiorna ora" il pannello resta. v4.93: dopo il tocco il
        // pannello si chiude da solo (onAggiora): non serve il tasto indietro.
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" />
      <View style={styles.veilo}>
        <View style={styles.card}>
          <Text style={styles.titolo}>Nuova versione disponibile</Text>
          <Pressable
            style={({ pressed }) => [
              styles.bottone,
              pressed && styles.bottonePremuto,
            ]}
            onPress={gestisciAggiorna}
            accessibilityRole="button"
            accessibilityLabel="Aggiorna ora"
          >
            <Text style={styles.bottoneTesto}>Aggiorna ora</Text>
          </Pressable>
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
  });

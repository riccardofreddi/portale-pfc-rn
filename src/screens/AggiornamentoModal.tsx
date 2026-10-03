/**
 * AggiornamentoModal (v4.86) - il pannello dell'aggiornamento guidato.
 *
 * Quando su GitHub Releases esce una versione piu' recente dell'app,
 * all'avvio compare questo pannello e RESTA finche' l'app non viene
 * aggiornata: il tasto indietro non lo chiude e toccare fuori non
 * chiude. Un solo bottone, "Aggiorna ora": apre il download diretto
 * dell'APK nel browser; finito l'install, riaprendo l'app il pannello
 * non ricompare (la versione installata e' quella nuova).
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
import { apriDownloadAggiornamento } from '@/lib/updates';
import { radius, spacing, typography, useColors, type ThemeColors } from '@/theme';

interface AggiornamentoModalProps {
  visible: boolean;
}

export function AggiornamentoModal({ visible }: AggiornamentoModalProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // v4.86: il tasto indietro NON chiude: aggiornare e' l'unica via.
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
            onPress={apriDownloadAggiornamento}
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

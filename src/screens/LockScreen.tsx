/**
 * v4.87: schermata di blocco (cancelletto) con sblocco biometrico.
 *
 * Compare a ogni apertura dell'app con sessione ripristinata e al
 * ritorno dopo oltre 60 secondi in background, SOLO se il telefono ha
 * impronta o volto registrati. Il riconoscimento avviene tutto sul
 * telefono: riconosciuto = si entra subito, senza ridigitare le
 * credenziali. Dopo 2 tentativi falliti di fila (o col tasto sempre
 * visibile "Torna al login") si passa al login completo con password.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, spacing, typography, useColors, type ThemeColors } from '@/theme';
import { haptics } from '@/lib/haptics';
import { chiediSblocco, sensorePronto } from '@/lib/biometria';

// v4.87: 2 tentativi falliti di fila = login completo (regola approvata).
const MAX_TENTATIVI = 2;

interface Props {
  onSbloccato: () => void;
  onTornaAlLogin: () => void;
}

export default function LockScreen({ onSbloccato, onTornaAlLogin }: Props) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [tentativiFalliti, setTentativiFalliti] = useState(0);
  const [inCorso, setInCorso] = useState(true);

  function registraFallimento() {
    haptics.error();
    const nuovo = tentativiFalliti + 1;
    setTentativiFalliti(nuovo);
    if (nuovo >= MAX_TENTATIVI) {
      // 2 tentativi falliti di fila: login completo.
      onTornaAlLogin();
    }
  }

  // Al primo rendering la richiesta biometrica parte da sola: il
  // cancelletto non aspetta che l'utente trovi un bottone.
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const pronto = await sensorePronto();
      if (!vivo) {
        return;
      }
      if (!pronto) {
        // Sensore non piu' pronto (biometria disattivata nel frattempo):
        // niente cancelletto, si passa al login completo.
        onTornaAlLogin();
        return;
      }
      const ok = await chiediSblocco();
      if (!vivo) {
        return;
      }
      setInCorso(false);
      if (ok) {
        onSbloccato();
        return;
      }
      registraFallimento();
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function riprova() {
    haptics.tap();
    setInCorso(true);
    void (async () => {
      const ok = await chiediSblocco();
      setInCorso(false);
      if (ok) {
        onSbloccato();
        return;
      }
      registraFallimento();
    })();
  }

  function alLogin() {
    haptics.tap();
    onTornaAlLogin();
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.centro}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.titolo}>Sblocca Portale</Text>
        <Text style={styles.testo}>
          {inCorso
            ? 'In attesa della tua impronta o del tuo volto...'
            : tentativiFalliti > 0
              ? 'Riconoscimento non riuscito. Riprova, oppure entra con le tue credenziali.'
              : 'Usa la tua impronta o il tuo volto per entrare.'}
        </Text>

        {tentativiFalliti > 0 && !inCorso ? (
          <Pressable
            style={({ pressed }) => [
              styles.bottonePrincipale,
              pressed && styles.bottonePremuto,
            ]}
            onPress={riprova}
          >
            <Text style={styles.testoBottonePrincipale}>Riprova</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.bottoneSecondario,
            pressed && styles.bottonePremuto,
          ]}
          onPress={alLogin}
        >
          <Text style={styles.testoBottoneSecondario}>Torna al login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centro: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    emoji: {
      fontSize: 56,
      marginBottom: spacing.lg,
    },
    titolo: {
      ...typography.h2,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    testo: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    bottonePrincipale: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.md,
      minWidth: 220,
    },
    bottoneSecondario: {
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      minWidth: 220,
    },
    bottonePremuto: {
      opacity: 0.85,
    },
    testoBottonePrincipale: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textInverse,
    },
    testoBottoneSecondario: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
  });

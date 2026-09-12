/**
 * Modal — bottom sheet style modal.
 *
 * v4.13 — SCORREVOLEZZA (il pannello "incollava" mentre si scorreva):
 * il foglio era un Pressable che AVVOLGEVA i contenuti. Su Android un
 * toccabile attorno a una lista gareggia per il tocco con lo scroll
 * interno: la lista parte a scatti e si blocca (il sintanno esatto
 * riportato dal cliente). Ora la struttura e' invertita:
 * - il tocco FUORI dal foglio e' un Pressable INVISIBILE posto DIETRO il
 *   foglio (tocco fuori = chiude, esattamente come prima);
 * - il foglio e' una View semplice, che non gareggia con lo scroll:
 *   le liste dentro i pannelli (Impostazioni, Notifiche, Cassetto,
 *   dettaglio file dell'Archivio) scorrono fluide.
 * v4.28 — VIA la maniglia: la barretta grigio-scuro in alto sopra il
 *   titolo era vista come "una riga nera" (il titolare l'ha notata
 *   all'altezza dei preferiti e non la vuole). I pannelli aprono
 *   direttamente coi contenuti, con un piccolo respiro in piu' in cima
 *   (paddingTop del foglio al posto dello spazio della maniglia).
 */
import React from 'react';
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { radius, spacing, useColors, type ThemeColors } from '@/theme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Modal({ visible, onClose, children, style }: ModalProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Tocco "fuori dal foglio": livello invisibile DIETRO il foglio
         * (e' il primo figlio: il foglio, disegnato dopo, sta sopra). */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Chiudi pannello"
          accessibilityRole="button"
        />
        {/* Foglio: View semplice, senza gestione del tocco: lo scroll
         * interno funziona nativo, senza liti di responder. */}
        <View style={[styles.sheet, style]}>
          {children}
        </View>
      </View>
    </RNModal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      maxHeight: '85%',
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
  });

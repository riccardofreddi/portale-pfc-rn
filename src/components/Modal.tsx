/**
 * Modal — bottom sheet style modal.
 *
 * v4.70 — AGGIORNAMENTO DELLA DIAGNOSI v4.69 (il resize non arrivava
 * davvero): la causa finale era fuori da qui. L'app ha targetSdk 35: da
 * Android 15 il sistema FORZA l'edge-to-edge e IGNORA l'adjustResize su
 * OGNI finestra (anche su questa). styles.xml ora dichiara windowOptOut-
 * EdgeToEdgeEnforcement (il ridimensionamento torna) e, comunque, i
 * pannelli con campi di testo del Cassetto NON passano piu' da qui:
 * sono livelli dentro la finestra principale (CassettoScreen v4.70).
 * Questa Modal resta per i pannelli SENZA TextInput (carica documento,
 * Archivio, Impostazioni, Notifiche, banner): per la tastiera non
 * c'e' piu' nessun rischio.
 *
 * v4.69 — LA FINESTRA TORNA A RIDIMENSIONARSI CON LA TASTIERA (difetto
 * radice: nel Cassetto la scheda restava coperta dalla tastiera, "si
 * blocca e non sale"). Due fatti verificati nel sorgente RN 0.76.5:
 * 1. statusBarTranslucent={true} dice ad Android di disegnare la finestra
 *    della Modal DIETRO la barra di stato; una finestra cosi' NON si
 *    ridimensiona quando arriva la tastiera (ReactModalHostView imposta
 *    SOFT_INPUT_ADJUST_RESIZE, ma con la barra traslucente salta
 *    fitsSystemWindows e il resize resta morto). Il foglio, ancorato in
 *    fondo, restava sotto la tastiera.
 * 2. Su Android dentro una Modal gli eventi JS della tastiera NON
 *    arrivano: nascono dal layout della finestra PRINCIPALE
 *    (ReactRootView.CustomGlobalLayoutListener); la finestra della Modal
 *    non emette nulla. Qualsiasi gestione tastiera via JS dentro la
 *    Modal (inclusa la v4.68) e' destinata a non partire.
 * Rimedio alla radice: statusBarTranslucent tolto. La finestra della
 * Modal torna una finestra normale che ANDROID ridimensiona da solo
 * quando arriva la tastiera: il foglio SALE senza una riga di JS, su
 * ogni telefono. Vale per TUTTI i pannelli dell'app (Cassetto, Archivio,
 * Impostazioni, Notifiche, banner avvisi): con la tastiera aperta il
 * pannello resta sempre visibile sopra di essa.
 * Costo cosmetico accettato: il velo scuro dietro al foglio non copre
 * piu' la banda della barra di stato (il foglio in se' e' identico);
 * con la barra di navigazione a 3 tasti, i bottoni del foglio non
 * stanno piu' dietro la barra. Su iOS la prop non esisteva (Android
 * only): zero cambiamenti.
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

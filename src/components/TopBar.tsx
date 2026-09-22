/**
 * TopBar — header fisso, replica ESATTA del PfcTopBar dell'app Android v4
 * (commit eb34840, branding "Portale PF").
 *
 * - Monogramma "PF": quadrato 44 con bordo sfumato Midnight → GeoPrimary →
 *   Sapphire e interno blu notte, testo ORO.
 * - Titolo "Portale" (ExtraBold) + sottotitolo "Cliente: {nome}".
 * - Campanella circolare: icona ORO quando ci sono notifiche (altrimenti
 *   grigia), badge rosso con conteggio ("9+" oltre nove).
 * - Avatar: anello ORO SFUMATO (oro → oro chiaro → bronzo) con interno blu
 *   notte e iniziali BIANCHE.
 * - Barra con ombra sottile, come la Surface con elevation dell'app v4.
 *
 * v4.11: la logica store (notifiche, pannello impostazioni) è IDENTICA.
 *
 * v4.65: il monogramma disegnato a mano (anello sfumato blu + PF oro) viene
 * sostituito dal VERO logo PF dorato, stessa grafica dell'icona app
 * "Rilievo": brand uguale su icona, login e barra superiore.
 */
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, Rect, LinearGradient, Stop } from 'react-native-svg';
import { useAppStore } from '@/store/auth';
import { getInitials } from '@/lib/utils';
import { useColors, type ThemeColors } from '@/theme';
// v4.65: il logo PF dorato e' il PNG vero (stessa grafica dell'icona app)
import LOGO_PF from '@/assets/pf-logo.png';

// Colori firma del brand (validi in entrambi i temi, come nell'app v4)
const NAVY_NOTTE = '#0A1128';
const ORO = '#D4AF37';
const ORO_CHIARO = '#F7E7B4';
const ORO_SCURO = '#996515';

export function TopBar() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const user = useAppStore((s) => s.user);
  const nNotifiche = useAppStore((s) => s.nNotifiche);
  const setShowNotifPanel = useAppStore((s) => s.setShowNotifPanel);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  // Sottotitolo "Cliente: {nome}" come nell'app Android v4
  const nomeCliente =
    user?.name?.trim() || user?.username?.trim() || 'Cliente';
  const iniziali = (user ? getInitials(user.name) : '?')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* Gruppo brand: monogramma PF + titolo/sottotitolo */}
        <View style={styles.brand}>
          {/* v4.65: vero logo PF dorato (grafica icona app "Rilievo") */}
          <Image source={LOGO_PF} style={styles.logoImg} />
          <View style={styles.brandText}>
            <Text style={styles.brandName}>Portale</Text>
            <Text style={styles.brandSubtitle} numberOfLines={1}>
              Cliente: {nomeCliente}
            </Text>
          </View>
        </View>

        {/* Gruppo azioni: campanella + avatar */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => setShowNotifPanel(true)}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityLabel="Notifiche"
          >
            <Ionicons
              name={nNotifiche > 0 ? 'notifications' : 'notifications-outline'}
              size={22}
              color={nNotifiche > 0 ? ORO : colors.textSecondary}
            />
            {nNotifiche > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {nNotifiche > 9 ? '9+' : nNotifiche}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={({ pressed }) => [styles.avatarRing, pressed && styles.pressed]}
            accessibilityLabel="Menu utente"
          >
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="pfAvatarRing" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={ORO} />
                  <Stop offset="0.5" stopColor={ORO_CHIARO} />
                  <Stop offset="1" stopColor={ORO_SCURO} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#pfAvatarRing)" />
            </Svg>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>{iniziali}</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      backgroundColor: colors.surface,
    },
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 12,
      minHeight: 66,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      shadowColor: '#0A1128',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 3,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flexShrink: 1,
    },
    // v4.65: il logo e' il PNG dorato (angoli arrotondati gia' nell'immagine)
    logoImg: {
      width: 44,
      height: 44,
    },
    brandText: {
      flexShrink: 1,
    },
    brandName: {
      color: colors.textPrimary,
      fontWeight: '800',
      fontSize: 18,
      letterSpacing: -0.3,
    },
    brandSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '500',
      marginTop: 1,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.7,
    },
    badge: {
      position: 'absolute',
      top: 1,
      right: -2,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
    avatarRing: {
      width: 42,
      height: 42,
      borderRadius: 21,
      overflow: 'hidden',
    },
    avatarInner: {
      flex: 1,
      margin: 2,
      borderRadius: 19,
      backgroundColor: NAVY_NOTTE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 13,
    },
  });

/**
 * Schermata di Login.
 *
 * Grafica replicata dall'app Android v4: bagliore blu notte in cima,
 * monogramma "PF" con anello oro, titolo PORTALE, card bianca arrotondata,
 * campi con icone e badge "connessione crittografata".
 *
 * v4.14: contenuto centrato con respiro garantito sotto la status bar
 * (il logo non tocca mai la barra dell'orologio), "Accesso Archivio"
 * una volta sola, occhio mostra/nascondi sul campo password, tolta la
 * dicitura di sicurezza duplicata in fondo a schermo.
 *
 * v4.65: al posto del monogramma disegnato in CSS (anello oro + cerchio blu)
 * c'e' il VERO logo PF dorato, stessa grafica dell'icona app "Rilievo";
 * sotto al logo un solo titolo: "Accesso Portale" (prima c'erano
 * "PORTALE" + "Accesso Archivio"). Il resto della schermata e' identico.
 */
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, Rect, LinearGradient, Stop } from 'react-native-svg';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { registerPushForCurrentUser } from '@/lib/push';
import { shadow, spacing, typography, useColors, type ThemeColors } from '@/theme';
// v4.65: il logo PF dorato e' un PNG vero (stessa grafica dell'icona app):
// cosi' la schermata di login mostra ESATTAMENTE quello che il titolare vede
// sull'icona del telefono.
import LOGO_PF from '@/assets/pf-logo.png';

// Colori firma del brand (validi in entrambi i temi, come nell'app v4)
const NAVY_NOTTE = '#0A1128';
const NAVY_PRIMARIO = '#003566';
const ORO_CHIARO = '#F7E7B4';

export default function LoginScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const insets = useSafeAreaInsets();
  const setUser = useAppStore((s) => s.setUser);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mostraPassword, setMostraPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username || !password) {
      toast.warning('Inserisci username e password');
      return;
    }
    setLoading(true);
    haptics.impact();
    try {
      const res = await api.auth.login(username, password);
      if (!res.ok) {
        haptics.error();
        toast.error('Login fallito', res.error ?? 'Credenziali non valide');
        return;
      }
      const me = await api.auth.me();
      if (!me.user || me.user.role !== 'client') {
        haptics.error();
        toast.error('Accesso negato', 'Accesso riservato ai clienti');
        await api.auth.logout();
        return;
      }
      setUser(me.user);
      haptics.success();
      toast.success(`Benvenuto, ${me.user.name}!`, 'Login effettuato');
      void registerPushForCurrentUser();
    } catch (err) {
      haptics.error();
      toast.error(
        'Errore di login',
        err instanceof Error ? err.message : 'Errore di rete',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Bagliore blu notte in cima (gradiente come nell'app v4) */}
      <View pointerEvents="none" style={styles.glow}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={NAVY_NOTTE} stopOpacity="1" />
              <Stop offset="0.55" stopColor={NAVY_PRIMARIO} stopOpacity="0.8" />
              <Stop offset="1" stopColor={NAVY_PRIMARIO} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#glow)" />
        </Svg>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + spacing.xxxl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            {/* v4.65: vero logo PF dorato (grafica icona app "Rilievo") */}
            <Image source={LOGO_PF} style={styles.logo} />
            <Text style={styles.title}>Accesso Portale</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.cardDescription}>
              Inserisci le tue credenziali per consultare l&apos;archivio.
            </Text>
            <Input
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Il tuo username"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={
                <Ionicons name="person-outline" size={20} color={NAVY_PRIMARIO} />
              }
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="La tua password"
              secureTextEntry={!mostraPassword}
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={NAVY_PRIMARIO} />
              }
              rightIcon={
                <Pressable
                  onPress={() => setMostraPassword((v) => !v)}
                  hitSlop={8}
                  accessibilityLabel={
                    mostraPassword ? 'Nascondi password' : 'Mostra password'
                  }
                >
                  <Ionicons
                    name={mostraPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={NAVY_PRIMARIO}
                  />
                </Pressable>
              }
            />
            <Button
              label="Accedi all'Archivio"
              onPress={handleLogin}
              loading={loading}
              disabled={!username || !password}
              icon={<Ionicons name="arrow-forward" size={18} color={ORO_CHIARO} />}
            />
          </View>

          {/* Badge fiducia: connessione crittografata */}
          <View style={styles.trustBadge}>
            <View style={styles.trustIconWrap}>
              <Ionicons name="shield-outline" size={18} color={colors.success} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.trustTitle}>
                Connessione Crittografata TLS 1.3 / AES-256
              </Text>
              <Text style={styles.trustSubtitle}>Archivio riservato e protetto</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    glow: {
      ...StyleSheet.absoluteFillObject,
      height: 300,
      backgroundColor: 'transparent',
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      justifyContent: 'center',
    },
    hero: {
      alignItems: 'center',
      marginBottom: spacing.xxl,
    },
    // v4.65: il logo e' il PNG dorato (angoli arrotondati gia' nell'immagine)
    logo: {
      width: 96,
      height: 96,
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.h2,
      color: colors.textPrimary,
      fontWeight: '800',
      letterSpacing: 0.5,
      marginBottom: spacing.xs,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: spacing.xl,
      gap: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadow.lg,
    },
    cardDescription: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    trustBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: spacing.lg,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    trustIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.successSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trustTitle: {
      ...typography.caption,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    trustSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      fontSize: 11,
    },
  });

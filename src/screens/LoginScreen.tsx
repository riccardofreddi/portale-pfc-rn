/**
 * Schermata di Login.
 */
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { registerPushForCurrentUser } from '@/lib/push';
import { shadow, spacing, typography, useColors, type ThemeColors } from '@/theme';

export default function LoginScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const setUser = useAppStore((s) => s.setUser);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoText}>PF</Text>
            </View>
            <Text style={styles.title}>Portale Documenti</Text>
            <Text style={styles.subtitle}>Accesso riservato ai clienti</Text>
          </View>

          <View style={styles.formCard}>
            <Input
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Il tuo username"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="La tua password"
              secureTextEntry
            />
            <Button
              label="Accedi"
              onPress={handleLogin}
              loading={loading}
              disabled={!username || !password}
            />
          </View>

          <Text style={styles.footer}>
            Portale sicuro e riservato · Tutti i diritti riservati
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    flex: {
      flex: 1,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
      justifyContent: 'center',
    },
    hero: {
      alignItems: 'center',
      marginBottom: spacing.xxxl,
    },
    logoWrap: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    logoText: {
      ...typography.h1,
      color: colors.textInverse,
      fontWeight: '800',
    },
    title: {
      ...typography.h2,
      color: colors.textInverse,
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.bodySmall,
      color: colors.textTertiary,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.xl,
      gap: spacing.lg,
      ...shadow.lg,
    },
    footer: {
      ...typography.caption,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
  });

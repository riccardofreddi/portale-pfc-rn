/**
 * Schermata Impostazioni (bottom sheet modal).
 * Sezioni: Info app (versione reale), Aspetto (tema), Notifiche (diagnostica FCM),
 * controllo aggiornamenti, profilo, logout.
 */
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { toast } from '@/components/Toaster';
import { confirmDialog } from '@/components/ConfirmDialog';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { pushState, registerPushForCurrentUser, unregisterPush } from '@/lib/push';
import { APP_VERSION, checkForUpdates, openReleasesPage } from '@/lib/updates';
import type { FcmStatusResponse } from '@/types/api';
import { spacing, typography, useColors, useTheme, type ThemeColors, type ThemeMode } from '@/theme';

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: string }> = [
  { value: 'system', label: 'Sistema', icon: '📱' },
  { value: 'light', label: 'Chiaro', icon: '☀️' },
  { value: 'dark', label: 'Scuro', icon: '🌙' },
];

export function SettingsModal() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  const visible = useAppStore((s) => s.settingsOpen);
  const setVisible = useAppStore((s) => s.setSettingsOpen);
  const setUser = useAppStore((s) => s.setUser);
  const user = useAppStore((s) => s.user);

  const [server, setServer] = useState<FcmStatusResponse | null>(null);
  const [diag, setDiag] = useState({
    registered: pushState.registered,
    token: pushState.token,
    error: pushState.error,
  });
  const [testing, setTesting] = useState(false);
  const [reregistering, setReregistering] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDiag({
      registered: pushState.registered,
      token: pushState.token,
      error: pushState.error,
    });
    api.push
      .fcmStatus()
      .then(setServer)
      .catch(() => setServer(null));
  }, [visible]);

  function handleThemeSelect(m: ThemeMode) {
    haptics.tap();
    setThemeMode(m);
  }

  async function sendTestPush() {
    if (!pushState.registered) {
      toast.warning('Token non registrato', 'Riprova tra qualche secondo o tocca "Registra di nuovo".');
      return;
    }
    setTesting(true);
    haptics.impact();
    try {
      const res = await api.push.fcmTest();
      if (res.ok) {
        toast.success('Test inviato', `(${res.sent ?? 1}/${res.tokenCount ?? 1}) Controlla il telefono.`);
      } else {
        toast.error('Test fallito', res.msg ?? 'Nessun token registrato o FCM non attivo.');
      }
    } catch (err) {
      toast.error('Errore test push', err instanceof Error ? err.message : 'Errore');
    } finally {
      setTesting(false);
    }
  }

  async function reregister() {
    setReregistering(true);
    haptics.tap();
    try {
      await registerPushForCurrentUser();
      await new Promise<void>((resolve) => setTimeout(resolve, 1500));
      setDiag({
        registered: pushState.registered,
        token: pushState.token,
        error: pushState.error,
      });
      if (pushState.registered) {
        toast.success('Token FCM registrato correttamente.');
      } else {
        toast.error('Registrazione FCM non completata', pushState.error);
      }
    } catch (err) {
      toast.error('Errore registrazione', err instanceof Error ? err.message : 'Errore');
    } finally {
      setReregistering(false);
    }
  }

  async function handleCheckUpdates() {
    setCheckingUpdates(true);
    haptics.tap();
    try {
      const res = await checkForUpdates();
      if (res.status === 'available') {
        confirmDialog({
          title: `Aggiornamento v${res.latest} disponibile`,
          message: `Versione attuale: v${res.current}. Aprire la pagina delle release su GitHub per scaricare il nuovo APK?`,
          confirmText: 'Apri GitHub',
          onConfirm: () => openReleasesPage(res.url),
        });
      } else {
        toast.success('App aggiornata', `Sei già all'ultima versione (v${res.current}).`);
      }
    } catch (err) {
      toast.error(
        'Aggiornamenti non disponibili',
        err instanceof Error ? err.message : 'Errore di rete',
      );
    } finally {
      setCheckingUpdates(false);
    }
  }

  async function handleLogout() {
    await unregisterPush().catch(() => {});
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    setVisible(false);
    setUser(null);
  }

  return (
    <Modal visible={visible} onClose={() => setVisible(false)}>
      <View style={styles.content}>
        <Text style={styles.title}>ℹ Informazioni</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>APPLICAZIONE</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>App</Text>
            <Text style={styles.rowValue}>Portale PFC Mobile</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Versione</Text>
            <Text style={styles.rowValue}>v{APP_VERSION}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Utente</Text>
            <Text style={styles.rowValue}>@{user?.username ?? '-'}</Text>
          </View>
          <Button
            label={checkingUpdates ? '⏳ Verifica in corso…' : '🔄 Controlla aggiornamenti'}
            onPress={handleCheckUpdates}
            loading={checkingUpdates}
            variant="secondary"
            size="md"
            style={styles.updateBtn}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ASPETTO</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((o) => {
              const active = themeMode === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => handleThemeSelect(o.value)}
                  style={[styles.themeBtn, active && styles.themeBtnActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Tema ${o.label}`}
                >
                  <Text style={styles.themeIcon}>{o.icon}</Text>
                  <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.helpText}>
            Con "Sistema" l'app segue automaticamente il tema del telefono.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>STATO NOTIFICHE</Text>
            <View
              style={[
                styles.statusPill,
                diag.registered ? styles.statusPillOk : styles.statusPillWarn,
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  diag.registered ? styles.statusPillTextOk : styles.statusPillTextWarn,
                ]}
              >
                {diag.registered ? 'Registrato' : 'Non registrato'}
              </Text>
            </View>
          </View>

          {diag.token ? (
            <Text style={styles.tokenText}>
              Token: {diag.token.slice(0, 28)}… ({diag.token.length} char)
            </Text>
          ) : (
            <Text style={styles.mutedText}>Nessun token FCM ricevuto dal device.</Text>
          )}

          {diag.error ? <Text style={styles.errorText}>Errore: {diag.error}</Text> : null}

          {server && (
            <View style={styles.serverInfo}>
              <Text style={styles.serverRow}>
                Server FCM:{' '}
                <Text style={server.fcmEnabled ? styles.serverOk : styles.serverErr}>
                  {server.fcmEnabled ? 'attivo' : 'NON CONFIGURATO'}
                </Text>
              </Text>
              <Text style={styles.serverRow}>
                Token registrati sul server: {server.userTokens}
              </Text>
            </View>
          )}

          {server && !server.fcmEnabled && (
            <Text style={styles.errorText}>
              Il server non può inviare push: mancano le credenziali Firebase. Contatta lo studio.
            </Text>
          )}

          <Button
            label={reregistering ? 'Registrazione…' : '↻ Registra di nuovo'}
            onPress={reregister}
            variant="secondary"
            loading={reregistering}
            size="md"
            style={styles.reregisterBtn}
          />
        </View>

        <Button
          label={testing ? 'Invio in corso…' : '🔔 Invia notifica di test'}
          onPress={sendTestPush}
          loading={testing}
        />
        <Text style={styles.helpText}>
          Invia una notifica FCM di prova al tuo telefono per verificare che le push funzionino.
          Devi aver effettuato il login con l'app installata.
        </Text>

        <Pressable
          onPress={() => {
            setVisible(false);
            // @ts-expect-error global augmentation
            setTimeout(() => global.__navigateToProfile?.(), 200);
          }}
          style={({ pressed }) => [styles.profileBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.profileText}>👤 Profilo e impostazioni</Text>
        </Pressable>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.logoutText}>🚪 Esci dall'account</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: { padding: spacing.xl, gap: spacing.lg },
    title: { ...typography.h4, color: colors.textPrimary, fontWeight: '700' },
    section: { backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: spacing.lg, gap: spacing.sm },
    sectionLabel: { ...typography.labelSmall, color: colors.textTertiary, fontWeight: '700' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowLabel: { ...typography.bodySmall, color: colors.textSecondary },
    rowValue: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '500' },
    updateBtn: { marginTop: spacing.xs },
    themeRow: { flexDirection: 'row', gap: spacing.sm },
    themeBtn: {
      flex: 1,
      height: 56,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    themeBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    themeIcon: { fontSize: 16 },
    themeLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
    themeLabelActive: { color: colors.accentDark },
    statusPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999 },
    statusPillOk: { backgroundColor: colors.successSoft },
    statusPillWarn: { backgroundColor: colors.warningSoft },
    statusPillText: { ...typography.labelSmall, fontSize: 10, fontWeight: '700' },
    statusPillTextOk: { color: colors.success },
    statusPillTextWarn: { color: colors.warning },
    tokenText: { ...typography.caption, color: colors.textTertiary },
    mutedText: { ...typography.caption, color: colors.textTertiary },
    errorText: { ...typography.caption, color: colors.danger },
    serverInfo: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 2 },
    serverRow: { ...typography.caption, color: colors.textTertiary },
    serverOk: { color: colors.success, fontWeight: '700' },
    serverErr: { color: colors.danger, fontWeight: '700' },
    reregisterBtn: { marginTop: spacing.xs },
    helpText: { ...typography.caption, color: colors.textTertiary, marginTop: -spacing.sm },
    logoutBtn: { paddingVertical: spacing.lg, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
    logoutText: { ...typography.body, color: colors.danger, fontWeight: '600' },
    profileBtn: { paddingVertical: spacing.lg, alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 10 },
    profileText: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  });

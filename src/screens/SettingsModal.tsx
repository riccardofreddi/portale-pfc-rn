/**
 * Schermata Impostazioni (bottom sheet modal).
 * Sezioni: Aspetto (tema), Stato notifiche (diagnostica FCM), test push, logout.
 *
 * Novità v4.2 (pannello CORTO: si arriva a "Esci" senza fatica):
 * - TOLTA la sezione "APPLICAZIONE" (nome app, versione, utente, controllo
 *   aggiornamenti): era solo roba da tecnici, allungava la lista per nulla.
 *   Il pannello ora parte da "Aspetto" e finisce presto.
 * - Il pannello è anche più ALTO (fino al 75% dello schermo, sempre dentro
 *   il limite dell'85% del pannello: maniglia e padding calcolati) e mentre
 *   scorri si vede la barretta di scorrimento (prima nascosta).
 * -nestedScrollEnabled: aiuta Android a capire che il gesto serve alla lista
 *   anche se parte su un pulsante interno.
 *
 * Novità v4.1:
 * - FIX SCROLL: prima il limite di altezza del pannello era sul contenitore
 *   esterno, quindi la lista interna non capiva di dover scorrere e su molti
 *   telefoni "Esci dall'account" e "Invia notifica di test" restavano fuori
 *   schermo. Ora il limite è DIRETTO sulla lista (stesso trucco già usato
 *   dalla schermata notifiche): lo scorrimento funziona davvero.
 * - RIMOSSO il pulsante "Profilo e impostazioni": mandava a una schermata
 *   "Profile" che non esiste ed era la causa dell'errore "NAVIGATE ... Profile"
 *   nei log. In meno nella lista = meno strada da scorrere.
 */
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { pushState, registerPushForCurrentUser, resetStatoPushLocale } from '@/lib/push';
import type { FcmStatusResponse } from '@/types/api';
import { spacing, typography, useColors, useTheme, type ThemeColors, type ThemeMode, radius } from '@/theme';

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: string }> = [
  { value: 'system', label: 'Sistema', icon: '📱' },
  { value: 'light', label: 'Chiaro', icon: '☀️' },
  { value: 'dark', label: 'Scuro', icon: '🌙' },
];

export function SettingsModal() {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const { height: altezzaSchermo } = useWindowDimensions();

  // v4.2: la lista può arrivare fino al 75% dello schermo, MA mai oltre
  // l'85% del pannello (maniglia 24 + padding fondo 48 = 72 riservati):
  // il min() garantisce che non venga mai tagliata, su qualsiasi telefono.
  const maxLista = Math.min(
    Math.round(altezzaSchermo * 0.75),
    Math.round(altezzaSchermo * 0.85) - 72,
  );

  const visible = useAppStore((s) => s.settingsOpen);
  const setVisible = useAppStore((s) => s.setSettingsOpen);
  const setUser = useAppStore((s) => s.setUser);

  const [server, setServer] = useState<FcmStatusResponse | null>(null);
  const [diag, setDiag] = useState({
    registered: pushState.registered,
    token: pushState.token,
    error: pushState.error,
  });
  const [testing, setTesting] = useState(false);
  const [reregistering, setReregistering] = useState(false);

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

  async function handleLogout() {
    // v4.4: al logout NON si cancella piu' il token FCM dal server (la
    // vecchia unregisterPush e' stata tolta): il telefono resta agganciato
    // all'account e le notifiche continuano ad arrivare anche con la
    // sessione chiusa, come su WhatsApp. Il backend riassocia da solo il
    // token se sul telefono entra un altro cliente; se l'app viene
    // disinstallata, il server ripulisce il token da solo.
    resetStatoPushLocale();
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
      {/* v4.1: maxHeight DIRETTO sulla lista => lo scroll funziona davvero.
       * v4.2: nestedScrollEnabled (gesto sicuro anche su pulsanti interni)
       * e barretta di scorrimento VISIBILE (prima nascosta: non si capiva
       * che si poteva scorrere). */}
      <ScrollView
        style={{ maxHeight: maxLista }}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        <Text style={styles.title}>⚙ Impostazioni</Text>

        {/* v4.2: tolta la sezione "APPLICAZIONE" (nome app, versione, utente,
         * controllo aggiornamenti): solo roba da tecnici, allungava la strada
         * verso "Esci dall'account" senza dare nulla al cliente. */}

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
          Ricevi una notifica di prova: se arriva, le notifiche funzionano.
        </Text>

        {/* v4.1: rimosso il pulsante "Profilo e impostazioni": navigava verso
         * una schermata "Profile" inesistente (errore NOBRIDGE in console e
         * nessun effetto visibile). Il pannello impostazioni È il profilo. */}

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
        >
          <Text style={styles.logoutText}>🚪 Esci dall'account</Text>
        </Pressable>
      </ScrollView>
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
    logoutBtn: { marginTop: spacing.xs, minHeight: 54, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.danger, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
    logoutBtnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
    logoutText: { ...typography.body, color: colors.danger, fontWeight: '800' },
  });

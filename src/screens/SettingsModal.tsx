/**
 * Schermata Impostazioni (bottom sheet modal) — v4.13.
 *
 * Novita' v4.13 (dopo la prova della v4.12):
 * - Card PROFILO: tolto lo @username ("non deve apparire a nessun
 *   cliente"). Restano le iniziali, il nome e la pillola "Cliente
 *   Attivo" / "Amministratore".
 * - Tolta la riga "Versione app" (roba tecnica che confonde).
 * - Card NOTIFICHE: UN solo interruttore che comanda TUTTO.
 *     * ACCESO: il telefono e' agganciato al registro del server (token
 *       FCM) e gli allarmi locali del giorno di scadenza sono schedulati
 *       => arrivano TUTTI gli avvisi come da logica: nuovi documenti e
 *       messaggi in tempo reale, scadenze con l'anticipo scelto nello
 *       studio (pannello admin) e la rete di sicurezza del giorno stesso.
 *     * SPENTO: il telefono viene TOGLTO dal registro del server
 *       (DELETE /api/push/fcm: endpoint gia' esistente, nessuna modifica
 *       al backend) e gli allarmi locali sono cancellati SUBITO => non
 *       arriva piu' niente, nemmeno a app chiusa.
 *   La pillola "Attivo" / "Non attivo" SPECCHIA l'interruttore: prima
 *   guardava una diagnostica interna che si azzera a ogni riavvio (per
 *   questo risultava "Non attivo" anche se tutto funzionava).
 * - Tolto il testo "08:30" dal pannello: l'orario resta dentro l'app
 *   (rete di sicurezza del giorno di scadenza) ma non confonde piu'.
 * - Scorrevolezza: il colpevole vero era il componente Modal (toccalile
 *   attorno alla lista = scroll che incolla su Android): corretto li',
 *   a beneficio di tutti i pannelli. Qui restano le cautele v4.12 (un
 *   solo ScrollView, altezza calcolata, niente zone morte).
 *
 * Tocco di stile come la v4 Android (SettingsBottomSheet): pannello
 * corto, card pulite, zero pulsanti tecnici.
 */
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from '@/components/Modal';
import { confirmDialog } from '@/components/ConfirmDialog';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import {
  pushState,
  registerPushForCurrentUser,
  resetStatoPushLocale,
} from '@/lib/push';
import {
  aggiornaPromemoriaScadenze,
  promemoriaAttivi,
  setPromemoriaAttivi,
} from '@/lib/scadenze-locali';
import { spacing, typography, useColors, useTheme, type ThemeColors, type ThemeMode } from '@/theme';

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }> = [
  { value: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Chiaro', icon: 'sunny-outline' },
  { value: 'dark', label: 'Scuro', icon: 'moon-outline' },
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

  const user = useAppStore((s) => s.user);

  // v4.13: UNA sola verita' — l'interruttore. La pillola lo specchia.
  // Default ATTIVO (il comportamento di sempre per chi non tocca nulla).
  const [notificheOn, setNotificheOn] = useState(true);

  useEffect(() => {
    if (!visible) return;
    promemoriaAttivi().then(setNotificheOn);
  }, [visible]);

  function handleThemeSelect(m: ThemeMode) {
    haptics.tap();
    setThemeMode(m);
  }

  // v4.13: l'interruttore comanda TUTTE le notifiche, con effetto SUBITO.
  async function handleNotificheToggle(valore: boolean) {
    haptics.tap();
    setNotificheOn(valore);
    await setPromemoriaAttivi(valore);

    // Allarmi locali del giorno di scadenza: creati o cancellati SUBITO
    // (la libreria legge l'interruttore appena salvato).
    await aggiornaPromemoriaScadenze();

    if (valore) {
      // Riaggancia il telefono al registro del server (token FCM): da
      // questo momento arrivano TUTTI gli avvisi come da logica. Se la
      // rete manca, l'app si riaggiungira' da sola al prossimo avvio.
      await registerPushForCurrentUser();
      toast.success(
        'Notifiche attive',
        'Arriveranno documenti, messaggi e scadenze dello studio.',
      );
    } else {
      // Toglie il telefono dal registro del server (endpoint esistente,
      // nessuna modifica al backend): da adesso non arriva piu' niente,
      // nemmeno a app chiusa. Gli allarmi locali sono gia' stati tolti.
      try {
        if (pushState.token) {
          await api.push.fcmUnregister(pushState.token);
        }
      } catch {
        // offline: non importa, la registrazione resta comunque saltata
      }
      pushState.registered = false;
      toast.info(
        'Notifiche spente',
        'Non arriveranno più avvisi su questo telefono.',
      );
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

  // v4.12: conferma prima di uscire (come l'AlertDialog della app v4)
  function chiediConfermaLogout() {
    haptics.tap();
    confirmDialog({
      title: 'Conferma disconnessione',
      message: 'Sei sicuro di voler uscire dal Portale PFC?',
      confirmText: 'Esci',
      cancelText: 'Annulla',
      destructive: true,
      onConfirm: handleLogout,
    });
  }

  const nomeBello = (user?.name?.trim() || user?.username || 'Cliente PFC').trim();
  const iniziali = (user?.name?.trim() || user?.username || 'PF')
    .replace(/^pf/i, '')
    .trim()
    .slice(0, 2)
    .toUpperCase() || 'PF';

  return (
    <Modal visible={visible} onClose={() => setVisible(false)} style={{ paddingBottom: 0 }}>
      {/* Un solo ScrollView, altezza calcolata (v4.2), niente zone morte
       * (v4.12). v4.13: lo scroll scorre davvero, perche' il componente
       * Modal non avvolge piu' la lista in un toccabile. */}
      <ScrollView
        style={{ maxHeight: maxLista }}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        overScrollMode="never"
      >
        <Text style={styles.title}>Impostazioni</Text>

        {/* --- Card PROFILO (v4.13: via lo @username) --- */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{iniziali}</Text>
            </View>
            <View style={styles.profileText}>
              <Text style={styles.profileName} numberOfLines={1}>
                {nomeBello}
              </Text>
              <View
                style={[
                  styles.ruoloPill,
                  user?.role === 'admin' ? styles.ruoloPillAdmin : styles.ruoloPillCliente,
                ]}
              >
                <Text
                  style={[
                    styles.ruoloText,
                    user?.role === 'admin' ? styles.ruoloTextAdmin : styles.ruoloTextCliente,
                  ]}
                >
                  {user?.role === 'admin' ? 'Amministratore' : 'Cliente Attivo'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- Card NOTIFICHE: l'interruttore comanda TUTTO (v4.13) --- */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>NOTIFICHE</Text>
            <View
              style={[
                styles.statusPill,
                notificheOn ? styles.statusPillOk : styles.statusPillWarn,
              ]}
            >
              <View style={[styles.statusDot, notificheOn ? styles.statusDotOk : styles.statusDotWarn]} />
              <Text
                style={[
                  styles.statusPillText,
                  notificheOn ? styles.statusPillTextOk : styles.statusPillTextWarn,
                ]}
              >
                {notificheOn ? 'Attivo' : 'Non attivo'}
              </Text>
            </View>
          </View>

          <Text style={styles.helpText}>
            {notificheOn
              ? 'Il telefono è agganciato all\'account: gli avvisi arrivano anche a app chiusa.'
              : 'Nessun avviso arriverà su questo telefono finché non riaccendi l\'interruttore.'}
          </Text>

          <View style={styles.divider} />
          <View style={styles.switchRow}>
            <View style={styles.switchIconBox}>
              <Ionicons name="notifications-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>Ricevi gli avvisi dello studio</Text>
              <Text style={styles.switchSub}>Documenti, messaggi e scadenze</Text>
            </View>
            <Switch
              value={notificheOn}
              onValueChange={handleNotificheToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.border}
              accessibilityLabel="Notifiche attive o spente"
            />
          </View>
        </View>

        {/* --- Card ASPETTO (v4.13: tolta la riga versione) --- */}
        <View style={styles.card}>
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
                  <Ionicons
                    name={o.icon}
                    size={18}
                    color={active ? colors.accentDark : colors.textSecondary}
                  />
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

        {/* --- Esci dall'account (con conferma) --- */}
        <Pressable
          onPress={chiediConfermaLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          accessibilityLabel="Esci dall'account"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Esci dall'account</Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxxl },
    title: { ...typography.h4, color: colors.textPrimary, fontWeight: '700' },

    // v4.12 — card in stile v4: fondo soft, raggio 18, bordo sottile
    card: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    sectionLabel: { ...typography.labelSmall, color: colors.textTertiary, fontWeight: '700' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    // Profilo
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
    profileText: { flex: 1, gap: 2 },
    profileName: { ...typography.body, color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
    ruoloPill: {
      alignSelf: 'flex-start',
      marginTop: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    ruoloPillCliente: { backgroundColor: colors.infoSoft },
    ruoloPillAdmin: { backgroundColor: colors.warningSoft },
    ruoloText: { fontSize: 10, fontWeight: '700' },
    ruoloTextCliente: { color: colors.primary },
    ruoloTextAdmin: { color: colors.warning },

    // Stato notifiche
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999 },
    statusPillOk: { backgroundColor: colors.successSoft },
    statusPillWarn: { backgroundColor: colors.warningSoft },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusDotOk: { backgroundColor: colors.success },
    statusDotWarn: { backgroundColor: colors.warning },
    statusPillText: { ...typography.labelSmall, fontSize: 10.5, fontWeight: '800' },
    statusPillTextOk: { color: colors.success },
    statusPillTextWarn: { color: colors.warning },

    // Interruttore / righe
    divider: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xs },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    switchIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    switchText: { flex: 1, gap: 1 },
    switchTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
    switchSub: { ...typography.caption, color: colors.textTertiary },

    // Tema
    themeRow: { flexDirection: 'row', gap: spacing.sm },
    themeBtn: {
      flex: 1,
      height: 56,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    themeBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    themeLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
    themeLabelActive: { color: colors.accentDark },

    helpText: { ...typography.caption, color: colors.textTertiary, lineHeight: 16 },

    // Esci
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 54,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.danger,
      backgroundColor: colors.dangerSoft,
    },
    logoutBtnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
    logoutText: { ...typography.body, color: colors.danger, fontWeight: '800' },
  });

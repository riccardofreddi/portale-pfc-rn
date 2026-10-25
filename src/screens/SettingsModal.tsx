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
 *
 * Novita' v4.83 (richiesta del titolare: "il cliente deve poter rivedere
 * la intro quando si dimentica di come funziona"): card GUIDA con il
 * pulsante "Rivedi la guida introduttiva". Riapre l'intro della prima
 * volta (OnboardingScreen) SOPRA a tutto, senza smontare l'app: alla
 * fine il cliente riprende esattamente da dove era.
 */
import React, { useEffect, useState } from 'react';
import {
  Linking,
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
import { puliziaCacheUtente } from '@/lib/download';
import { api } from '@/api/client';
import { APP_VERSION, CODICE_INTERFACCIA } from '@/lib/updates';
import { useAppStore } from '@/store/auth';
import {
  annullaDeregistrazionePendente,
  deregistraPushDaServer,
  pushState,
  registerPushForCurrentUser,
  resetStatoPushLocale,
} from '@/lib/push';
import {
  aggiornaPromemoriaScadenze,
  cancellaPromemoriaLocali,
  promemoriaAttivi,
  setPromemoriaAttivi,
} from '@/lib/scadenze-locali';
import { caricaModuloNotifiche } from '@/lib/notifiche';
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
  // v4.83: apre il ripasso della intro (lo mostra AppNavigator sopra a tutto)
  const setIntroRipassoOpen = useAppStore((s) => s.setIntroRipassoOpen);

  const user = useAppStore((s) => s.user);

  // v4.13: UNA sola verita' — l'interruttore. La pillola lo specchia.
  // Default ATTIVO (il comportamento di sempre per chi non tocca nulla).
  const [notificheOn, setNotificheOn] = useState(true);

  // v4.118 — STATO REALE (non solo l'interruttore):
  // - permessoSistema: il telefono concede DAVVERO le notifiche? (null =
  //   non noto, es. moduli nativi mancanti su copie vecchie)
  // - diagnostica: token FCM presente, esito dell'ultima registrazione,
  //   quanti promemoria sono programmati nell'orologio di Android.
  // Finora la pillola "Attivo" diceva che tutto andava anche con il
  // permesso negato per sempre, e l'utente non aveva NESSUNA via
  // d'uscita se non capire da solo dove battere.
  const [permessoSistema, setPermessoSistema] = useState<boolean | null>(null);
  const [diagnostica, setDiagnostica] = useState<{
    token: boolean;
    registrato: boolean;
    errore: string;
    promemoria: number | null;
  } | null>(null);
  const [testInCorso, setTestInCorso] = useState(false);

  async function leggiStatoNotifiche() {
    promemoriaAttivi().then(setNotificheOn);
    const Notifications = await caricaModuloNotifiche();
    if (!Notifications) {
      setPermessoSistema(null);
      setDiagnostica(null);
      return;
    }
    try {
      const perm = await Notifications.getPermissionsAsync();
      setPermessoSistema(Boolean(perm.granted));
    } catch {
      setPermessoSistema(null);
    }
    let promemoria: number | null = null;
    try {
      const tutti = await Notifications.getAllScheduledNotificationsAsync();
      promemoria = tutti.filter((n) => n.identifier.startsWith('pfc-scad-')).length;
    } catch {
      promemoria = null;
    }
    setDiagnostica({
      token: Boolean(pushState.token),
      registrato: pushState.registered,
      errore: pushState.error,
      promemoria,
    });
  }

  useEffect(() => {
    if (!visible) return;
    void leggiStatoNotifiche();
  }, [visible]);

  // v4.118: invia una notifica DI PROVA dal server (endpoint esistente,
  // usato finora solo dalla diagnostica web): la prova vera e propria
  // che il telefono è agganciato e che la push arriva fin qui.
  async function inviaNotificaDiTest() {
    haptics.tap();
    setTestInCorso(true);
    try {
      const res = await api.push.fcmTest();
      if (res.ok) {
        toast.success(
          'Notifica di test inviata',
          'Arriva in pochi secondi: guarda la barra di stato.',
        );
      } else {
        toast.warning(
          'Notifica non inviata',
          res.msg || 'Il telefono non risulta registrato per le notifiche.',
        );
      }
    } catch (err) {
      toast.error(
        'Errore',
        err instanceof Error ? err.message : 'Invio di prova non riuscito',
      );
    } finally {
      setTestInCorso(false);
    }
  }

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
      // v4.112: riaccendere cancella l'eventuale promemoria di
      // deregistrazione pendente (il telefono deve STARE nel registro).
      await annullaDeregistrazionePendente();
      // Riaggancia il telefono al registro del server (token FCM): da
      // questo momento arrivano TUTTI gli avvisi come da logica.
      // v4.112: ORA SI SA se e' riuscita (registerPush ritorna l'esito):
      // prima il toast diceva "Notifiche attive" anche con permesso negato
      // o rete giu'. Gli allarmi locali della scadenza sono comunque a
      // posto (aggiornaPromemoriaScadenze qui sopra); la riparazione
      // silenziosa riprovera' da sola al prossimo avvio/foreground.
      const registrato = await registerPushForCurrentUser();
      if (registrato) {
        toast.success(
          'Notifiche attive',
          'Arriveranno documenti, messaggi e scadenze dello studio.',
        );
      } else {
        toast.warning(
          'Notifiche non ancora attive',
          `${pushState.error || 'Registrazione allo studio non riuscita'}. Riproveremo da soli al prossimo avvio.`,
        );
      }
    } else {
      // Toglie il telefono dal registro del server (endpoint esistente,
      // nessuna modifica al backend): da adesso non arriva piu' niente,
      // nemmeno a app chiusa. Gli allarmi locali sono gia' stati tolti.
      // v4.112: deregistraPushDaServer usa anche il TOKEN DI RISERVA
      // (chiesto a Firebase se la memoria lo ha perso al riavvio) e se la
      // chiamata fallisce (offline) lascia un PROMEMORIA PERSISTENTE su
      // disco: l'uscita dal registro si completera' da sola al ritorno
      // della rete (prima il telefono RESTAVA nel registro: le push
      // continuavano ad arrivare a interruttore spento).
      const uscito = await deregistraPushDaServer();
      toast.info(
        'Notifiche spente',
        uscito
          ? 'Non arriveranno più avvisi su questo telefono.'
          : 'Spente su questo telefono: l\'uscita dal registro dello studio si completerà appena torna la rete.',
      );
    }
  }

  // v4.83: riapre la guida introduttiva (la intro della prima volta),
  // chiudendo prima il pannello. Al termine il cliente riprende da dove
  // era: nessun login, nessun dato toccato.
  function apriGuidaIntro() {
    haptics.tap();
    setVisible(false);
    setIntroRipassoOpen(true);
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
    // v4.116: la cache dei documenti NON resta piu' sul telefono dopo
    // l'uscita (telefono condiviso): PDF in cache e copie pronte per la
    // condivisione vengono cancellati qui, senza bloccare l'uscita
    // (la funzione e' tutta best-effort).
    void puliziaCacheUtente();
    // v4.118: gli ALLARMI LOCALI di scadenza fanno la stessa fine
    // (appartengono all'account uscito; LoginScreen li cancella comunque
    // al rientro, qui è la via diretta). I segnali anti-doppione si
    // puliscono da soli alla prima sync dell'account nuovo.
    void cancellaPromemoriaLocali();
  }

  // v4.12: conferma prima di uscire (come l'AlertDialog della app v4)
  function chiediConfermaLogout() {
    haptics.tap();
    confirmDialog({
      title: 'Conferma disconnessione',
      message: 'Sei sicuro di voler uscire dal Portale Studio?',
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

  // v4.118: la pillola ora dice la verità: "Permesso negato" quando il
  // telefono blocca le notifiche anche a interruttore acceso (null =
  // stato non conoscibile: restiamo sul vecchio comportamento).
  const pillolaNegato = notificheOn && permessoSistema === false;
  const pillolaOk = notificheOn && permessoSistema !== false;

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
                pillolaOk
                  ? styles.statusPillOk
                  : pillolaNegato
                    ? styles.statusPillDanger
                    : styles.statusPillWarn,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  pillolaOk
                    ? styles.statusDotOk
                    : pillolaNegato
                      ? styles.statusDotDanger
                      : styles.statusDotWarn,
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  pillolaOk
                    ? styles.statusPillTextOk
                    : pillolaNegato
                      ? styles.statusPillTextDanger
                      : styles.statusPillTextWarn,
                ]}
              >
                {pillolaNegato ? 'Permesso negato' : notificheOn ? 'Attivo' : 'Non attivo'}
              </Text>
            </View>
          </View>

          <Text style={styles.helpText}>
            {!notificheOn
              ? 'Nessun avviso arriverà su questo telefono finché non riaccendi l\'interruttore.'
              : pillolaNegato
                ? 'Il telefono NEGA il permesso di mostrare notifiche: finché non riattivato non ne arriva nessuna, anche con l\'interruttore acceso.'
                : 'Il telefono è agganciato all\'account: gli avvisi arrivano anche a app chiusa.'}
          </Text>

          {/* v4.118: quando il permesso è NEGATO, la via d'uscita diretta:
              un tocco apre le impostazioni notifiche dell'app nel sistema. */}
          {pillolaNegato && (
            <Pressable
              onPress={() => {
                haptics.tap();
                Linking.openSettings().catch(() => {
                  toast.error('Errore', 'Impossibile aprire le impostazioni del telefono');
                });
              }}
              style={styles.apriImpostazioni}
              accessibilityRole="button"
              accessibilityLabel="Apri le impostazioni del telefono"
            >
              <Ionicons name="settings-outline" size={18} color={colors.danger} />
              <View style={styles.switchText}>
                <Text style={[styles.switchTitle, { color: colors.danger }]}>
                  Apri impostazioni
                </Text>
                <Text style={styles.switchSub}>
                  Notifiche → attiva "Tutte le notifiche"
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          )}

          <View style={styles.divider} />
          <View style={styles.switchRow}>
            <View style={styles.switchIconBox}>
              <Ionicons name="notifications-outline" size={18} color={colors.primaryText} />
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

          {/* v4.118: blocco diagnostica discreto: dice la VERITÀ su token,
              ultima registrazione e promemoria programmati (prima era
              tutto invisibile: "attivo" anche quando non lo era). */}
          {diagnostica && (
            <View style={styles.diagBox}>
              <Text style={styles.diagRiga}>
                Telefono registrato: {diagnostica.registrato ? 'sì' : 'no'}
                {!diagnostica.registrato && diagnostica.errore
                  ? ` (${diagnostica.errore})`
                  : ''}
              </Text>
              <Text style={styles.diagRiga}>
                Token di notifica: {diagnostica.token ? 'presente' : 'assente'}
              </Text>
              <Text style={styles.diagRiga}>
                Promemoria scadenze programmati:{' '}
                {diagnostica.promemoria === null ? 'sconosciuto' : diagnostica.promemoria}
              </Text>
              <Pressable
                onPress={inviaNotificaDiTest}
                disabled={testInCorso}
                style={({ pressed }) => [
                  styles.testBtn,
                  pressed && styles.testBtnPressed,
                  testInCorso && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Invia una notifica di prova"
              >
                <Ionicons name="paper-plane-outline" size={16} color={colors.primaryText} />
                <Text style={styles.testBtnText}>
                  {testInCorso ? 'Invio…' : 'Invia notifica di prova'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* v4.118: i produttori (Xiaomi, Huawei, Samsung, Oppo) fermano
              gli allarmi per "risparmiare batteria" ANCHE con il permesso
              concesso: la risposta ai "non ricevo gli avvisi". */}
          <Text style={styles.helpText}>
            Se gli avvisi non arrivano a telefono spento: Impostazioni del
            telefono → App → Portale Studio → Batteria → "Senza restrizioni".
            Alcuni telefoni (Xiaomi, Huawei, Samsung, Oppo) fermano gli
            allarmi per risparmiare batteria.
          </Text>
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

        {/* --- Card GUIDA (v4.83: rivedere l'introduzione) --- */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>GUIDA</Text>
          <Pressable
            onPress={apriGuidaIntro}
            style={({ pressed }) => [styles.guidaRow, pressed && styles.guidaRowPressed]}
            accessibilityRole="button"
            accessibilityLabel="Rivedi la guida introduttiva"
          >
            <View style={styles.switchIconBox}>
              <Ionicons name="school-outline" size={18} color={colors.primaryText} />
            </View>
            <View style={styles.switchText}>
              <Text style={styles.switchTitle}>Rivedi la guida introduttiva</Text>
              <Text style={styles.switchSub}>Come funziona l'app, in tre schermate</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
          <Text style={styles.helpText}>
            E' la stessa guida che hai visto alla prima apertura dell'app.
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

        {/* v4.89: tacca di versione spostata qui da MessaggiScreen
         * (richiesta del titolare): sotto "Esci dall'account" si vede a
         * colpo d'occhio quale build gira davvero, senza appesantire la
         * lista dei messaggi. Il numero arriva da updates.ts (fonte unica). */}
        <Text style={styles.versioneTag}>
          v{APP_VERSION} · js{CODICE_INTERFACCIA}
        </Text>
      </ScrollView>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    content: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxxl },
    title: { ...typography.h4, color: colors.textPrimary, fontWeight: '700' },

    // v4.89: tacca di versione sotto "Esci dall'account" (stesso stile di
    // quella che era in MessaggiScreen): piccola, discreta, veritiera.
    versioneTag: { textAlign: 'center', fontSize: 11, color: colors.textTertiary, paddingBottom: spacing.xs, letterSpacing: 0.3 },

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
    ruoloTextCliente: { color: colors.primaryText },
    ruoloTextAdmin: { color: colors.warning },

    // Stato notifiche
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 999 },
    statusPillOk: { backgroundColor: colors.successSoft },
    statusPillWarn: { backgroundColor: colors.warningSoft },
    statusPillDanger: { backgroundColor: colors.dangerSoft },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusDotOk: { backgroundColor: colors.success },
    statusDotWarn: { backgroundColor: colors.warning },
    statusDotDanger: { backgroundColor: colors.danger },
    statusPillText: { ...typography.labelSmall, fontSize: 10.5, fontWeight: '800' },
    statusPillTextOk: { color: colors.success },
    statusPillTextWarn: { color: colors.warning },
    statusPillTextDanger: { color: colors.danger },

    // v4.118 — riga "Apri impostazioni" quando il permesso è negato
    apriImpostazioni: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 54,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.danger,
      paddingHorizontal: spacing.md,
    },
    // v4.118 — blocco diagnostica + notifica di prova
    diagBox: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: spacing.md,
      gap: 4,
    },
    diagRiga: { ...typography.caption, color: colors.textSecondary },
    testBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 42,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      marginTop: 6,
    },
    testBtnPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
    testBtnText: { ...typography.caption, color: colors.primaryText, fontWeight: '800' },

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

    // v4.83 — Guida (riga tappabile per rivedere la intro)
    guidaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 56,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
    },
    guidaRowPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },

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

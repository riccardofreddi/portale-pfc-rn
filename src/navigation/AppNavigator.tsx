/**
 * Navigazione principale.
 *
 * - AuthStack (Login) quando non autenticato
 * - AppStack:
 *   - MainTabs (Bottom Tabs: Archivio, Messaggi, Cassetto, Attività) con TopBar
 *     + badge messaggi non letti sul tab Messaggi
 *   - PdfPreview (modal)
 *   - NotificheModal + SettingsModal come overlay globali
 *
 * Gestione deep-link: quando pendingDeepLink è impostato, naviga al tab/anno/cartella
 * richiesto e poi pulisce il pending.
 *
 * v4.7 - FIX "il tap sulla notifica non mi porta nella tab": il vecchio
 * consumatore del deep-link aggiornava solo la memoria interna (setClienteTab
 * nello store zustand) ma NON toccava mai il navigatore a tab, quindi la tab
 * visibile restava dov'era. Ora il deep-link fa UNA navigazione VERA con
 * navigationRef.navigate('MainTabs', { screen: ... }) e, in aggiunta, il
 * navigatore RISCRIVE nello store la tab attiva a ogni cambio (onStateChange):
 * cosi' l'app sa sempre in che tab si trova davvero (badge Messaggi e regola
 * "sei gia' nella tab = letto" funzionano anche quando cambi tab a mano).
 *
 * Tema: tutta la UI (tab bar inclusa) segue il tema corrente (chiaro/scuro/sistema).
 *
 * v4.83 - DUE NOVITA' (richieste del titolare), aggiustate con la v4.84:
 * 1. RIPASSO DELLA INTRO: in Impostazioni c'e' la card GUIDA con il
 *    pulsante "Rivedi la guida introduttiva". Lo store (introRipassoOpen)
 *    fa da ponte: qui l'intro della prima volta (OnboardingScreen) si
 *    apre in una Modal nativa a tutto schermo (v4.84: l'app dietro resta
 *    coperta e non risponde a tocchi); alla fine il cliente riprende
 *    esattamente da dove era, senza smontare l'app.
 * 2. APP IN MANUTENZIONE: mentre il cliente usa l'app, chiediamo al
 *    server (subito, poi ogni 10 secondi e a ogni riapertura dell'app)
 *    se lo studio ha attivato la manutenzione dall'admin. Se attiva e il
 *    cliente NON e' esente, compare la Modal nativa "App in manutenzione"
 *    (v4.84): tutto schermo, blocca ogni tocco, il tasto indietro non la
 *    chiude, e il messaggio e' professionale (niente riferimenti a chi
 *    la spegne). FIX ESENTE v4.84: il flag esente nello store risale al
 *    login, quindi quando la manutenzione e' attiva l'app lo riverifica
 *    col server a ogni controllo (api.auth.me): "Esente" cliccato a app
 *    aperta (o tolto) vale entro 10 secondi, in entrambe le direzioni.
 *    Appena lo studio la spegne l'app riprende da sola: nessun login,
 *    nessun bottone. Se la rete manca NON blocchiamo per errore: la
 *    schermata compare solo con conferma del server.
 *    FIX RICARICA v4.85: quella riverifica NON tocca piu' lo store. La
 *    v4.84 riscriveva l'oggetto user nello store a ogni controllo
 *    (setUser) e le schermate che dipendono da user (es. Archivio, con
 *    il suo effetto di caricamento su [user]) ricaricavano ogni 10
 *    secondi: si vedeva solo sui clienti esenti, perche' per gli altri
 *    la schermata di manutenzione copre tutto. Ora il flag fresco serve
 *    SOLO a decidere, qui dentro: zero scritture nello store, zero
 *    ricariche; l'app resta ferma e silenziosa finche' qualcosa cambia
 *    davvero (e se resta uguale, React non ridisegna nulla).
 */

import React, { useEffect, useState } from 'react';
import { AppState, Modal, StatusBar, StyleSheet, Text, View } from 'react-native';
// StyleSheet è usato da tabBadgeStyles (badge rosso statico)
import {
  NavigationContainer,
  createNavigationContainerRef,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from '@/screens/LoginScreen';
import ArchivioScreen from '@/screens/ArchivioScreen';
import MessaggiScreen from '@/screens/MessaggiScreen';
import CassettoScreen from '@/screens/CassettoScreen';
import AttivitaScreen from '@/screens/AttivitaScreen';
import PdfPreviewScreen from '@/screens/PdfPreviewScreen';
import { NotificheModal } from '@/screens/NotificheModal';
import { SettingsModal } from '@/screens/SettingsModal';
import { SplashScreen } from '@/screens/SplashScreen';
import OnboardingScreen, { isOnboardingDone } from '@/screens/OnboardingScreen';
// v4.83: SafeAreaView per la schermata "App in manutenzione"
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar } from '@/components/TopBar';
// v4.19: banner AVVISI PUBBLICI dello studio, sempre visibile su tutte le
// tab (come il banner giallo del sito, che sta sopra il contenuto delle tab)
import { AvvisiBanner } from '@/components/AvvisiBanner';
import { useAppStore, type ClienteTab } from '@/store/auth';
import { api } from '@/api/client';
import { haptics } from '@/lib/haptics';
import { scegliScadenza, schermataVisibile } from '@/lib/deeplink';
import { useColors, useTheme } from '@/theme';
// v4.83: token di stile per la schermata "App in manutenzione"
import { spacing, typography, type ThemeColors } from '@/theme';

export type AppStackParamList = {
  // v4.7: MainTabs puo' ricevere il nome della tab da mostrare (deep-link da
  // notifica): e' il parametro usato da navigationRef.navigate per passare
  // davvero da una tab all'altra.
  MainTabs: { screen: keyof MainTabsParamList } | undefined;
  // v4.72: lastModified = versione del file per la cache dell'anteprima
  // (file ricaricato con la stessa chiave => l'anteprima riscarica il nuovo).
  PdfPreview: { key: string; nome: string; lastModified?: number | string | null };
  // v4.1: rimossa la voce "Profile" — quella schermata non è mai esistita
  // nel navigatore e il pulsante che ci saltava generava l'errore
  // "The action 'NAVIGATE' with payload {name: 'Profile'}..." in console.
  // Le impostazioni sono e restano il pannello che si apre dall'avatar in alto.
};

export type AuthStackParamList = {
  Login: undefined;
  Onboarding: undefined;
};

export type MainTabsParamList = {
  Archivio: undefined;
  Messaggi: undefined;
  Cassetto: undefined;
  Attivita: undefined;
};

const AppStack = createNativeStackNavigator<AppStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabsParamList>();

/**
 * v4.7: riferimento stabile al navigatore, creato una volta sola. Serve al
 * consumatore del deep-link per CAMBIARE DAVVERO TAB: navigate('MainTabs',
 * { screen: 'Archivio' }) porta l'utente sulla tab richiesta (e, se era su
 * PdfPreview, riporta sotto la tab bar). Prima della v4.7 il deep-link
 * aggiornava solo lo store: la tab visibile non si spostava mai.
 */
export const navigationRef = createNavigationContainerRef<AppStackParamList>();

/** v4.7: nome tab nello store (minuscolo) -> nome route nel navigatore. */
const ROUTE_DA_TAB: Record<ClienteTab, keyof MainTabsParamList> = {
  archivio: 'Archivio',
  messaggi: 'Messaggi',
  cassetto: 'Cassetto',
  attivita: 'Attivita',
};

const TAB_VALIDI: ReadonlySet<string> = new Set([
  'archivio',
  'messaggi',
  'cassetto',
  'attivita',
]);

function MainTabsScreen() {
  const colors = useColors();
  const { effective } = useTheme();

  const navigation = useNavigation();
  const previewFile = useAppStore((s) => s.previewFile);
  const pendingDeepLink = useAppStore((s) => s.pendingDeepLink);
  const setPendingDeepLink = useAppStore((s) => s.setPendingDeepLink);
  const setClienteTab = useAppStore((s) => s.setClienteTab);
  const setAnno = useAppStore((s) => s.setAnno);
  const setCartella = useAppStore((s) => s.setCartella);
  const setShowNotifPanel = useAppStore((s) => s.setShowNotifPanel);
  const setPendingDocumento = useAppStore((s) => s.setPendingDocumento);
  const nMessaggiNonLetti = useAppStore((s) => s.nMessaggiNonLetti);

  // Naviga al PdfPreview quando previewFile è impostato
  useEffect(() => {
    if (previewFile) {
      // @ts-expect-error navigate with params
      navigation.navigate('PdfPreview', {
        key: previewFile.key,
        nome: previewFile.nome,
        lastModified: previewFile.lastModified
          ? new Date(previewFile.lastModified).getTime()
          : null,
      });
    }
  }, [previewFile, navigation]);

  // Consuma pendingDeepLink: naviga al tab/anno/cartella richiesto
  // v4.7 - FIX PRINCIPALE: qui si esegue la navigazione VERA alla tab
  // (navigationRef.navigate): prima si chiamava solo setClienteTab, che
  // aggiorna la memoria ma non muove la tab visibile, e il cliente che
  // toccava la notifica restava dov'era.
  // v4.6: se il deep-link indica anche un DOCUMENTO (notifica di scadenza),
  // lo passa all'Archivio che lo apre appena caricata la cartella. Se il
  // deep-link e' di una scadenza DEL SERVER (porta solo anno+cartella, senza
  // nome file), lo ricava da solo chiedendo al server le scadenze imminenti
  // e prendendo la piu' vicina in quella cartella: e' quella che ha generato
  // l'avviso. Se la ricerca fallisce (rete giu' ecc.) l'app resta comunque
  // sulla cartella giusta: nessun errore visibile.
  useEffect(() => {
    if (!pendingDeepLink) return;

    // Se c'e' una tab da raggiungere ma il navigatore non e' ancora pronto
    // (montaggio in corso, es. avvio da notifica a app chiusa), riprova tra
    // poco invece di buttare il link: ricreiamo l'oggetto cosi' l'effetto
    // parte di nuovo appena il navigatore e' pronto.
    if (pendingDeepLink.tab && !navigationRef.isReady()) {
      const riprova = setTimeout(
        () => setPendingDeepLink({ ...pendingDeepLink }),
        150,
      );
      return () => clearTimeout(riprova);
    }

    if (pendingDeepLink.tab) {
      setClienteTab(pendingDeepLink.tab);
      // v4.7: la navigazione vera. Se l'utente era su PdfPreview (modal),
      // questo lo riporta sulla tab bar con la tab giusta attiva.
      navigationRef.navigate('MainTabs', {
        screen: ROUTE_DA_TAB[pendingDeepLink.tab],
      });
    }
    if (pendingDeepLink.anno) {
      setAnno(pendingDeepLink.anno);
    }
    if (pendingDeepLink.cartella) {
      setCartella(pendingDeepLink.cartella);
    }
    if (pendingDeepLink.openNotifiche) {
      setShowNotifPanel(true);
    }

    const anno = pendingDeepLink.anno;
    const cartella = pendingDeepLink.cartella;
    if (anno && cartella) {
      if (pendingDeepLink.documento) {
        // Nome file noto (promemoria locale o riga campanella): apertura diretta.
        setPendingDocumento({
          anno,
          cartella,
          documento: pendingDeepLink.documento,
        });
      } else if (pendingDeepLink.origineScadenza) {
        // Push scadenza del server: solo anno+cartella. Risolvi il file.
        api.scadenze
          .list()
          .then((res) => {
            const documento = scegliScadenza(
              res.scadenze ?? [],
              anno,
              cartella,
            );
            if (documento) {
              useAppStore.getState().setPendingDocumento({
                anno,
                cartella,
                documento,
              });
            }
          })
          .catch(() => {
            // silenzioso: resta la navigazione alla cartella
          });
      }
    }

    haptics.tap();
    const t = setTimeout(() => setPendingDeepLink(null), 200);
    return () => clearTimeout(t);
  }, [
    pendingDeepLink,
    setClienteTab,
    setAnno,
    setCartella,
    setShowNotifPanel,
    setPendingDocumento,
    setPendingDeepLink,
  ]);

  return (
    <>
      <StatusBar
        barStyle={effective === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />
      <TopBar />
      {/* v4.19: avvisi pubblici SEMPRE visibili, appena sotto la TopBar
       * (fuori dal navigatore a tab: restano su Archivio, Messaggi, Cassetto
       * e Attivita, identico al sito dove il banner sta sopra le tab).
       * Se lo studio non ha pubblicato avvisi occupa ZERO spazio. */}
      <AvvisiBanner />
      <MainTabs.Navigator
        screenListeners={{
          tabPress: () => haptics.tap(),
        }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingBottom: 4,
            height: 62,
          },
          tabBarIconStyle: {
            marginBottom: 0,
          },
        }}
      >
        <MainTabs.Screen
          name="Archivio"
          component={ArchivioScreen}
          options={{
            title: 'Archivio',
            tabBarLabel: ({ focused, color }) => (
              <TabLabel label="Archivio" focused={focused} color={color} />
            ),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={focused ? 'folder' : 'folder-outline'}
                color={color}
                focused={focused}
                pillBg={colors.accentSoft}
              />
            ),
          }}
        />
        <MainTabs.Screen
          name="Messaggi"
          component={MessaggiScreen}
          options={{
            title: 'Messaggi',
            tabBarLabel: ({ focused, color }) => (
              <TabLabel label="Messaggi" focused={focused} color={color} />
            ),
            tabBarIcon: ({ color, focused }) => (
              <TabIconWithBadge
                icon={
                  focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'
                }
                color={color}
                focused={focused}
                pillBg={colors.accentSoft}
                badge={nMessaggiNonLetti}
              />
            ),
          }}
        />
        <MainTabs.Screen
          name="Cassetto"
          component={CassettoScreen}
          options={{
            title: 'Cassetto',
            tabBarLabel: ({ focused, color }) => (
              <TabLabel label="Cassetto" focused={focused} color={color} />
            ),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={focused ? 'cloud-upload' : 'cloud-upload-outline'}
                color={color}
                focused={focused}
                pillBg={colors.accentSoft}
              />
            ),
          }}
        />
        <MainTabs.Screen
          name="Attivita"
          component={AttivitaScreen}
          options={{
            title: 'Attività',
            tabBarLabel: ({ focused, color }) => (
              <TabLabel label="Attività" focused={focused} color={color} />
            ),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                icon={focused ? 'time' : 'time-outline'}
                color={color}
                focused={focused}
                pillBg={colors.accentSoft}
              />
            ),
          }}
        />
      </MainTabs.Navigator>

      {/* Modali globali */}
      <NotificheModal />
      <SettingsModal />
    </>
  );
}

// Icone tab come nell'app Android v4 (NavigationBar Material 3): pillola oro
// dietro l'icona quando la sezione è attiva, filled/outline altrimenti.
function TabIcon({
  icon,
  color,
  focused,
  pillBg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
  pillBg: string;
}) {
  return (
    <View style={[tabPillStyles.pill, focused && { backgroundColor: pillBg }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
  );
}

// Label della tab: 11sp, GRASSETTO quando attiva (come i NavigationBarItem v4)
function TabLabel({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: focused ? '700' : '400', color }}>
      {label}
    </Text>
  );
}

function TabIconWithBadge({
  icon,
  color,
  focused,
  pillBg,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
  pillBg: string;
  badge: number;
}) {
  return (
    <View style={[tabPillStyles.pill, focused && { backgroundColor: pillBg }]}>
      <Ionicons name={icon} size={22} color={color} />
      {badge > 0 && (
        <View style={tabBadgeStyles.badge}>
          <Text style={tabBadgeStyles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

// Pillola indicatrice dietro l'icona (come l'indicatorColor M3 dell'app v4)
const tabPillStyles = StyleSheet.create({
  pill: {
    width: 56,
    height: 29,
    borderRadius: 14.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Il badge dei messaggi è NAVY su bianco in entrambi i temi (containerColor
// GeoPrimary nell'app v4) → stile statico
const tabBadgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#003566',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
});

// v4.83: contenitore radice che avvolge il navigatore + i nuovi overlay
// (ripasso intro e schermata manutenzione) senza toccare il layout.
// v4.84: gli overlay non sono piu' View dopo il navigatore (cosi'
// l'app restava visibile e scorrevole accanto): sono Modal native,
// che coprono tutto lo schermo e bloccano ogni tocco dietro.
const appRootStyles = StyleSheet.create({
  root: { flex: 1 },
});

/**
 * v4.83: schermata "App in manutenzione". Compare quando lo studio
 * attiva la manutenzione dall'admin (e il cliente non e' esente) e
 * sparisce da sola quando lo studio la spegne: nessun bottone, nessun
 * login. v4.84: e' una Modal NATIVA (non una View accanto al
 * navigatore): a tutto schermo vero (status bar inclusa), blocca ogni
 * tocco sull'app dietro, il tasto indietro non la chiude. Messaggio
 * professionale, senza riferimenti a chi la spegne.
 */
function ManutenzioneModal() {
  const colors = useColors();
  const { effective } = useTheme();
  const styles = makeStylesManutenzione(colors);
  return (
    <Modal
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // v4.84: il tasto indietro NON chiude la manutenzione.
      }}
    >
      <StatusBar
        barStyle={effective === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.wrap}>
          <View style={styles.iconWrap}>
            <Ionicons name="construct" size={54} color={colors.warning} />
          </View>
          <Text style={styles.title}>App in manutenzione</Text>
          <Text style={styles.text}>
            L'app è temporaneamente non disponibile per manutenzione. Ci scusiamo per il disagio e ti invitiamo a riprovare più tardi.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const makeStylesManutenzione = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
      gap: spacing.lg,
    },
    iconWrap: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.warningSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...typography.h2,
      color: colors.textPrimary,
      fontWeight: '700',
      textAlign: 'center',
    },
    text: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 320,
    },
  });

export function AppNavigator() {
  const colors = useColors();
  const { effective } = useTheme();

  const user = useAppStore((s) => s.user);
  const loadingUser = useAppStore((s) => s.loadingUser);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // v4.83: ripasso della intro aperto dalla card GUIDA di Impostazioni.
  const introRipassoOpen = useAppStore((s) => s.introRipassoOpen);
  const setIntroRipassoOpen = useAppStore((s) => s.setIntroRipassoOpen);

  // v4.83: APP IN MANUTENZIONE (vedi commento in testa al file).
  const [manutenzione, setManutenzione] = useState(false);

  // v4.84 FIX ESENTE: il flag esente nello store e' quello del login. Se
  // il titolare clicca "Esente" (o lo toglie) MENTRE l'app e' aperta, lo
  // snapshot locale resta vecchio e la schermata sbaglia. Quindi non ci
  // fidiamo piu' dello snapshot per decidere: dipendiamo solo dallo
  // username (valore primitivo e stabile: il ciclo non riparte) e,
  // quando il server conferma la manutenzione, richiediamo il flag
  // esente FRESCO con api.auth.me().
  // v4.85 FIX RICARICA: quel flag fresco serve SOLO alla decisione qui
  // sotto: NON scriviamo piu' lo store (vedi commento in testa al file).
  const username = user?.username ?? null;

  useEffect(() => {
    if (!username) {
      setManutenzione(false);
      return;
    }
    let vivo = true;
    async function controlla() {
      try {
        const res = await api.sistema.manutenzione();
        if (!vivo) {
          return;
        }
        if (res.attivo !== true) {
          // Manutenzione spenta (o mai accesa): nessuna schermata.
          setManutenzione(false);
          return;
        }
        // Manutenzione ATTIVA (conferma del server). FIX ESENTE: chiediamo
        // al server il flag esente di ADESSO: lo snapshot nello store
        // risale al login e con "Esente" cliccato a app aperta saremmo
        // rimasti col valore vecchio.
        // v4.85 FIX RICARICA: il flag fresco lo usiamo SOLO per decidere,
        // qui dentro: NESSUN setUser. Riscrivere l'oggetto user ogni 10
        // secondi rifaceva partire i caricamenti delle schermate che
        // dipendono da user (es. Archivio): era la "ricarica" che si
        // vedeva sui clienti esenti. Letto e basta: se non cambia nulla,
        // non cambia nulla ANCHE a schermo.
        let esenteAdesso = false;
        try {
          const me = await api.auth.me();
          if (!vivo) {
            return;
          }
          esenteAdesso = me.user?.exemptMaintenance === true;
        } catch {
          // /auth/me irraggiungibile ma manutenzione confermata: fidati
          // dello snapshot locale (se dice esente, non blocchiamo).
          esenteAdesso =
            useAppStore.getState().user?.exemptMaintenance === true;
        }
        if (esenteAdesso) {
          // Esente confermato dal server: la manutenzione non lo tocca
          // (o smette di toccarlo entro questo giro).
          setManutenzione(false);
        } else {
          // Cliente non esente (o sessione non piu' valida): schermata
          // a tutto schermo.
          setManutenzione(true);
        }
      } catch {
        // Rete giu' o server irraggiungibile: resta com'e'. La schermata
        // compare solo con conferma del server, mai per errore.
      }
    }
    controlla();
    // v4.84: ogni 10 secondi (prima 60): la manutenzione e' una fase di
    // urgenza, il cliente non deve poter continuare a usare l'app.
    const t = setInterval(controlla, 10000);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        controlla();
      }
    });
    return () => {
      vivo = false;
      clearInterval(t);
      sub.remove();
    };
  }, [username]);

  useEffect(() => {
    if (!loadingUser && !user) {
      isOnboardingDone().then((done) => {
        if (!done) setShowOnboarding(true);
      });
    }
  }, [loadingUser, user]);

  if (loadingUser) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <SplashScreen />
      </>
    );
  }

  if (showOnboarding && !user) {
    return (
      <>
        <StatusBar
          barStyle={effective === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <OnboardingScreen onDone={() => setShowOnboarding(false)} />
      </>
    );
  }

  return (
    <View style={appRootStyles.root}>
    <NavigationContainer
      ref={navigationRef}
      // v4.7: mirror "navigatore -> store". A ogni cambio di navigazione
      // (anche un semplice cambio di tab a mano dalla barra in basso) il
      // contenitore ci dice qual e' la schermata visibile: se e' una tab
      // cliente, la riscriviamo nello store. Prima lo store si aggiornava
      // solo arrivando da una notifica, quindi cambiando tab a mano l'app
      // non sapeva dov'era l'utente (regola "sei gia' nella tab Messaggi =
      // letto" e badge fuori sincrono).
      onStateChange={(stato) => {
        const visibile = schermataVisibile(stato)?.toLowerCase();
        if (visibile && TAB_VALIDI.has(visibile)) {
          if (useAppStore.getState().clienteTab !== visibile) {
            useAppStore.getState().setClienteTab(visibile as ClienteTab);
          }
        }
      }}
    >
      {user ? (
        <AppStack.Navigator screenOptions={{ headerShown: false }}>
          <AppStack.Screen name="MainTabs" component={MainTabsScreen} />
          <AppStack.Screen
            name="PdfPreview"
            component={PdfPreviewScreen}
            options={{ presentation: 'modal' }}
          />
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>

      {/* v4.83: RIPASSO della intro (da Impostazioni): si apre in una
       * Modal nativa a tutto schermo (v4.84), sopra a tutto, senza
       * smontare l'app; alla fine il cliente riprende da dove era. Se
       * c'e' la manutenzione, quella ha la precedenza. */}
      {introRipassoOpen && user && !manutenzione ? (
        <Modal
          visible
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => {
            // v4.84: il tasto indietro non chiude la guida: si chiude
            // solo col bottone finale dell'introduzione.
          }}
        >
          <StatusBar
            barStyle={effective === 'dark' ? 'light-content' : 'dark-content'}
            backgroundColor={colors.background}
          />
          <OnboardingScreen onDone={() => setIntroRipassoOpen(false)} />
        </Modal>
      ) : null}

      {/* v4.83: APP IN MANUTENZIONE — Modal nativa sopra a tutto (anche
       * alle altre modali). L'app controlla da sola lo stato e riprende
       * da sola quando lo studio spegne la manutenzione. */}
      {manutenzione ? <ManutenzioneModal /> : null}
    </View>
  );
}

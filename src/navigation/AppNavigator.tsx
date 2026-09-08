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
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
// StyleSheet è usato da tabBadgeStyles (badge rosso statico)
import {
  NavigationContainer,
  createNavigationContainerRef,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import { TopBar } from '@/components/TopBar';
import { useAppStore, type ClienteTab } from '@/store/auth';
import { api } from '@/api/client';
import { haptics } from '@/lib/haptics';
import { scegliScadenza, schermataVisibile } from '@/lib/deeplink';
import { typography, useColors, useTheme } from '@/theme';

export type AppStackParamList = {
  // v4.7: MainTabs puo' ricevere il nome della tab da mostrare (deep-link da
  // notifica): e' il parametro usato da navigationRef.navigate per passare
  // davvero da una tab all'altra.
  MainTabs: { screen: keyof MainTabsParamList } | undefined;
  PdfPreview: { key: string; nome: string };
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
        barStyle="light-content"
        backgroundColor={colors.primary}
      />
      <TopBar />
      <MainTabs.Navigator
        screenListeners={{
          tabPress: () => haptics.tap(),
        }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingBottom: 4,
            height: 60,
          },
          tabBarLabelStyle: {
            ...typography.labelSmall,
            fontSize: 10,
            marginTop: 2,
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
            tabBarIcon: ({ color, focused }) => (
              <TabIcon emoji="📂" color={color} dimmed={!focused} />
            ),
          }}
        />
        <MainTabs.Screen
          name="Messaggi"
          component={MessaggiScreen}
          options={{
            title: 'Messaggi',
            tabBarIcon: ({ color, focused }) => (
              <TabIconWithBadge
                emoji="💬"
                color={color}
                dimmed={!focused}
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
            tabBarIcon: ({ color, focused }) => (
              <TabIcon emoji="💼" color={color} dimmed={!focused} />
            ),
          }}
        />
        <MainTabs.Screen
          name="Attivita"
          component={AttivitaScreen}
          options={{
            title: 'Attività',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon emoji="📋" color={color} dimmed={!focused} />
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

function TabIcon({
  emoji,
  color,
  dimmed,
}: {
  emoji: string;
  color: string;
  dimmed: boolean;
}) {
  return (
    <Text style={{ fontSize: 20, opacity: dimmed ? 0.5 : 1, color }}>
      {emoji}
    </Text>
  );
}

function TabIconWithBadge({
  emoji,
  color,
  dimmed,
  badge,
}: {
  emoji: string;
  color: string;
  dimmed: boolean;
  badge: number;
}) {
  return (
    <View>
      <Text style={{ fontSize: 20, opacity: dimmed ? 0.5 : 1, color }}>
        {emoji}
      </Text>
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

// Il badge è rosso su testo bianco in entrambi i temi → stile statico
const tabBadgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -16,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export function AppNavigator() {
  const colors = useColors();
  const { effective } = useTheme();

  const user = useAppStore((s) => s.user);
  const loadingUser = useAppStore((s) => s.loadingUser);
  const [showOnboarding, setShowOnboarding] = useState(false);

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
  );
}

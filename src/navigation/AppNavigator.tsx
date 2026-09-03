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
 * Tema: tutta la UI (tab bar inclusa) segue il tema corrente (chiaro/scuro/sistema).
 */

import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
// StyleSheet è usato da tabBadgeStyles (badge rosso statico)
import { NavigationContainer, useNavigation } from '@react-navigation/native';
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
import { useAppStore } from '@/store/auth';
import { haptics } from '@/lib/haptics';
import { typography, useColors, useTheme } from '@/theme';

export type AppStackParamList = {
  MainTabs: undefined;
  PdfPreview: { key: string; nome: string };
  Profile: undefined;
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
  const nMessaggiNonLetti = useAppStore((s) => s.nMessaggiNonLetti);

  // Esponi funzione globale per navigare a Profile (chiamata da SettingsModal)
  useEffect(() => {
    // @ts-expect-error global augmentation
    global.__navigateToProfile = () => {
      // @ts-expect-error navigate with params
      navigation.navigate('Profile');
    };
    return () => {
      // @ts-expect-error global augmentation
      delete global.__navigateToProfile;
    };
  }, [navigation]);

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
  useEffect(() => {
    if (!pendingDeepLink) return;
    if (pendingDeepLink.tab) {
      setClienteTab(pendingDeepLink.tab);
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
    haptics.tap();
    const t = setTimeout(() => setPendingDeepLink(null), 200);
    return () => clearTimeout(t);
  }, [
    pendingDeepLink,
    setClienteTab,
    setAnno,
    setCartella,
    setShowNotifPanel,
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
    <NavigationContainer>
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

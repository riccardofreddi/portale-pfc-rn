/**
 * Schermata Onboarding — mostrata alla prima apertura.
 */
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, typography, useColors, type ThemeColors } from '@/theme';
import { haptics } from '@/lib/haptics';

const ONBOARDING_KEY = 'pfc_onboarding_done';
const { width } = Dimensions.get('window');

interface Slide {
  emoji: string;
  title: string;
  description: string;
  bg: string;
}

function getSlides(colors: ThemeColors): Slide[] {
  return [
    {
      emoji: '📂',
      title: 'I tuoi documenti, sempre',
      description:
        'Accedi a tutti i tuoi documenti fiscali: F24, modelli, visure. Sempre a portata di mano, organizzati per anno e cartella.',
      bg: colors.accentSoft,
    },
    {
      emoji: '🔔',
      title: 'Notifiche in tempo reale',
      description:
        'Ricevi notifiche push per nuove scadenze, messaggi dallo studio e nuovi documenti caricati. Anche a app chiusa.',
      bg: colors.infoSoft,
    },
    {
      emoji: '🔒',
      title: 'Sicuro e privato',
      description:
        'I tuoi dati sono protetti. Sblocco rapido con Face ID o impronta. Documenti disponibili anche offline.',
      bg: colors.successSoft,
    },
  ];
}

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const slides = getSlides(colors);

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList<Slide>>(null);

  const onViewableItemsChanged = ({
    viewableItems,
  }: {
    viewableItems: ViewToken[];
    changed: ViewToken[];
  }) => {
    if (viewableItems[0]?.index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  };

  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };

  async function handleNext() {
    haptics.tap();
    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      onDone();
    }
  }

  async function handleSkip() {
    haptics.tap();
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.skipWrap}>
        {currentIndex < slides.length - 1 && (
          <Pressable onPress={handleSkip} hitSlop={12}>
            <Text style={styles.skipText}>Salta</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        ref={slidesRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(_, i) => String(i)}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={32}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
              <Text style={styles.icon}>{item.emoji}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.dotsWrap}>
        {slides.map((_, i) => {
          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View key={i} style={[styles.dot, { opacity }]} />
          );
        })}
      </View>

      <View style={styles.ctaWrap}>
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.ctaText}>
            {currentIndex === slides.length - 1 ? 'Inizia' : 'Avanti'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export async function isOnboardingDone(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true';
  } catch {
    return false;
  }
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    skipWrap: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: spacing.lg,
    },
    skipText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    slide: {
      width,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
      gap: spacing.lg,
    },
    iconWrap: {
      width: 140,
      height: 140,
      borderRadius: 70,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    icon: {
      fontSize: 64,
    },
    title: {
      ...typography.h2,
      color: colors.textPrimary,
      fontWeight: '700',
      textAlign: 'center',
    },
    description: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 320,
    },
    dotsWrap: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    ctaWrap: {
      padding: spacing.xl,
    },
    cta: {
      height: 56,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaText: {
      ...typography.button,
      color: colors.textInverse,
    },
  });

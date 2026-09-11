/**
 * AvvisiBanner — BACHECA DELLE COMUNICAZIONI (v4.20).
 *
 * Gli AVVISI PUBBLICI dello studio (admin -> Bacheca -> "Pubblica avviso",
 * API /api/avvisi) mostrati come nel disegno approvato dal titolare:
 *
 * - SCHEDA UNICA elegante nei colori oro/blu dell'app, sempre visibile
 *   SUBITO sotto la TopBar su tutte le tab: icona megafono nel cerchio
 *   oro, titolo "Comunicazione dello Studio", anteprima dell'ultimo
 *   avviso, pill "NUOVO" se ci sono novita' e chip "+N comunicazioni"
 *   quando ce ne sono altre (senza date: scelta del titolare);
 * - la X in alto RIDUCE la scheda a una striscia sottile SEMPRE visibile
 *   (pallino rosso + contatore dei nuovi; un tocco la riapre): la scelta
 *   resta sul telefono (AsyncStorage);
 * - un tocco sulla scheda apre la BACHECA, il pannello dal basso con
 *   TUTTE le comunicazioni (testo completo, link cliccabili, NUOVO sui
 *   nuovi): si chiude con la X in alto (allineata al titolo, come nella
 *   scheda), toccando fuori o trascinandola giu';
 * - TAP sulla push "Nuovo avviso dallo studio": apre direttamente la
 *   Bacheca (evento 'pfc-apri-bacheca' + flag avvio freddo da push.ts);
 * - TEMPO REALE: stessa rete di eventi della v4.19 (push ricevuta o app
 *   tornata in primo piano => ricarica senza che il cliente faccia nulla);
 * - MEMORIA letto/non letto: al primo avvio della v4.20 il "visto" parte
 *   da adesso, cosi' gli avvisi gia' pubblicati non escono tutti NUOVI;
 *   aprire la Bacheca segna tutto come visto.
 *
 * Gli avvisi NON creano notifiche in campanella (scelta del server):
 * nessun effetto sul badge, come prima. I messaggi privati restano nella
 * tab Messaggi: la Bacheca mostra SOLO gli avvisi pubblici.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  DeviceEventEmitter,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, Rect, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/api/client';
import { spezzaLink } from '@/lib/linkify';
import { haptics } from '@/lib/haptics';
import { prendiTapAvvisoPendente } from '@/lib/push';
import { useColors, useTheme, type ThemeColors } from '@/theme';

// Colori firma del brand (come la TopBar: validi in entrambi i temi)
const NAVY_NOTTE = '#0A1128';
const ORO = '#D4AF37';
const ORO_CHIARO = '#F7E7B4';
const ORO_SCURO = '#996515';

// Chiavi sul telefono (AsyncStorage)
const CHIAVE_ULTIMO_VISTO = 'pfc-bacheca-ultimo-visto';
const CHIAVE_RIDOTTA = 'pfc-bacheca-ridotta';

type Avviso = { id: string; text: string; timestamp: string };

export function AvvisiBanner() {
  const colors = useColors();
  const { effective } = useTheme();
  const scuro = effective === 'dark';
  const styles = makeStyles(colors, scuro);

  const [avvisi, setAvvisi] = useState<Avviso[]>([]);
  const [pronto, setPronto] = useState(false);
  const [ultimoVisto, setUltimoVisto] = useState(0);
  const [ridotta, setRidotta] = useState(false);
  const [bachecaAperta, setBachecaAperta] = useState(false);
  // I "NUOVO" dentro la Bacheca sono la fotografia di quelli c'erano
  // all'apertura: segnare tutto visto non deve farli sparire all'istante.
  const [nuoviAlApertura, setNuoviAlApertura] = useState<string[]>([]);

  // Nuovi = avvisi pubblicati DOPO l'ultima volta che la Bacheca e' stata
  // aperta (ultimoVisto = epoch ms; 0 = memoria non ancora caricata).
  const nuovi = useMemo(() => {
    if (ultimoVisto <= 0) return [] as Avviso[];
    return avvisi.filter((a) => {
      const t = new Date(a.timestamp).getTime();
      return Number.isFinite(t) && t > ultimoVisto;
    });
  }, [avvisi, ultimoVisto]);

  // Specchio dei nuovi per apriBacheca: la callback resta stabile e legge
  // sempre il valore aggiornato (senza rifarla a ogni cambio lista).
  const nuoviRef = useRef<Avviso[]>(nuovi);
  useEffect(() => {
    nuoviRef.current = nuovi;
  }, [nuovi]);

  const carica = useCallback(async () => {
    try {
      const res = await api.avvisi.list();
      setAvvisi(res.avvisi);
    } catch {
      // Silenzioso (come il sito): resta l'ultima lista nota; si riprova
      // al prossimo evento (push o ritorno in primo piano).
    }
  }, []);

  const apriBacheca = useCallback(() => {
    haptics.tap();
    setNuoviAlApertura(nuoviRef.current.map((a) => a.id));
    setBachecaAperta(true);
    // Tutto visto: i pallini NUOVI e il contatore della striscia si spengono.
    const adesso = Date.now();
    setUltimoVisto(adesso);
    AsyncStorage.setItem(CHIAVE_ULTIMO_VISTO, String(adesso)).catch(() => {});
  }, []);

  useEffect(() => {
    carica();
    const subPush = DeviceEventEmitter.addListener('pfc-push-ricevuta', () => {
      carica();
    });
    const subRisentita = DeviceEventEmitter.addListener(
      'pfc-app-risentita',
      () => {
        carica();
      },
    );
    // v4.20: tap sulla push "Nuovo avviso" => Bacheca aperta da sola
    const subBacheca = DeviceEventEmitter.addListener(
      'pfc-apri-bacheca',
      () => {
        apriBacheca();
      },
    );
    return () => {
      subPush.remove();
      subRisentita.remove();
      subBacheca.remove();
    };
  }, [carica, apriBacheca]);

  // Memoria letto/non letto + scelta "ridotta" (prima volta: vedi sopra).
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [visto, ridottaSalvata] = await Promise.all([
          AsyncStorage.getItem(CHIAVE_ULTIMO_VISTO),
          AsyncStorage.getItem(CHIAVE_RIDOTTA),
        ]);
        if (!vivo) return;
        if (visto === null) {
          // Prima apertura della Bacheca: il "visto" parte da adesso,
          // cosi' gli avvisi pubblicati PRIMA dell'aggiornamento non
          // escono tutti con il pallino NUOVO.
          const adesso = Date.now();
          await AsyncStorage.setItem(CHIAVE_ULTIMO_VISTO, String(adesso));
          if (!vivo) return;
          setUltimoVisto(adesso);
        } else {
          const n = Number(visto);
          setUltimoVisto(Number.isFinite(n) && n > 0 ? n : Date.now());
        }
        if (ridottaSalvata === '1') setRidotta(true);
      } catch {
        // Storage irraggiungibile: senza pallini NUOVI, tutto il resto gira.
        if (vivo) setUltimoVisto(Date.now());
      } finally {
        if (vivo) setPronto(true);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const chiudiBacheca = useCallback(() => {
    setBachecaAperta(false);
    setNuoviAlApertura([]);
  }, []);

  const richiudi = useCallback(() => {
    haptics.tap();
    setRidotta(true);
    AsyncStorage.setItem(CHIAVE_RIDOTTA, '1').catch(() => {});
  }, []);

  const espandi = useCallback(() => {
    haptics.tap();
    setRidotta(false);
    AsyncStorage.setItem(CHIAVE_RIDOTTA, '0').catch(() => {});
  }, []);

  // v4.20: app aperta TOCCANDO la push di un avviso (avvio freddo): la
  // Bacheca consuma il tap appena e' pronta (memoria caricata + avvisi).
  useEffect(() => {
    if (!pronto || avvisi.length === 0) return;
    if (prendiTapAvvisoPendente()) apriBacheca();
  }, [pronto, avvisi.length, apriBacheca]);

  // v4.20: il pannello si chiude anche TRASCINANDOLO giu' (presa solo sulla
  // zona maniglia+testa: lo scorrimento della lista resta libero).
  const offsetFoglio = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_e, g) => {
        offsetFoglio.setValue(Math.max(0, g.dy));
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 80) chiudiBacheca();
        Animated.spring(offsetFoglio, {
          toValue: 0,
          useNativeDriver: false,
          speed: 24,
          bounciness: 4,
        }).start();
      },
    }),
  ).current;

  // Nessun avviso pubblicato (o memoria non ancora caricata): ZERO spazio.
  if (!pronto || avvisi.length === 0) return null;

  const ultimo = avvisi[0];
  if (!ultimo) return null;
  const altre = avvisi.length - 1;

  return (
    <View style={styles.wrap}>
      {ridotta ? (
        // ---- STRISCIA SOTTILE (sempre visibile, un tocco la riapre) ----
        <Pressable
          onPress={espandi}
          style={styles.striscia}
          accessibilityLabel="Apri le comunicazioni dello studio"
        >
          <View style={styles.cerchioMini}>
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="bachecaMini" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={ORO} />
                  <Stop offset="1" stopColor={ORO_CHIARO} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#bachecaMini)" />
            </Svg>
            <Ionicons name="megaphone" size={11} color={NAVY_NOTTE} />
          </View>
          <Text style={styles.strisciaTesto} numberOfLines={1}>
            Comunicazioni dello Studio
          </Text>
          {nuovi.length > 0 && <View style={styles.punto} />}
          {nuovi.length > 0 && (
            <View style={styles.contatore}>
              <Text style={styles.contatoreTesto}>
                {nuovi.length > 9 ? '9+' : nuovi.length}
              </Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
        </Pressable>
      ) : (
        // ---- SCHEDA UNICA ELEGANTE ----
        <Pressable
          onPress={apriBacheca}
          style={styles.scheda}
          accessibilityLabel="Apri la Bacheca delle comunicazioni dello studio"
        >
          <View style={styles.barraOro}>
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="bachecaBarra" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={ORO} />
                  <Stop offset="1" stopColor={ORO_CHIARO} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#bachecaBarra)" />
            </Svg>
          </View>
          <View style={styles.testa}>
            <View style={styles.cerchio}>
              <Svg style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="bachecaCerchio" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={ORO} />
                    <Stop offset="1" stopColor={ORO_CHIARO} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#bachecaCerchio)" />
              </Svg>
              <Ionicons name="megaphone" size={14} color={NAVY_NOTTE} />
            </View>
            <View style={styles.testi}>
              <Text style={styles.titolo}>Comunicazione dello Studio</Text>
            </View>
            {nuovi.length > 0 && (
              <View style={styles.pillNuovo}>
                <Text style={styles.pillNuovoTesto}>NUOVO</Text>
              </View>
            )}
            <Pressable
              hitSlop={10}
              onPress={richiudi}
              style={styles.x}
              accessibilityLabel="Riduci le comunicazioni dello studio"
            >
              <Ionicons name="close" size={16} color={colors.textTertiary} />
            </Pressable>
          </View>
          <Text style={styles.anteprima} numberOfLines={3}>
            {spezzaLink(ultimo.text, styles.link)}
          </Text>
          <View style={styles.piede}>
            <View style={styles.leggi}>
              <Text style={styles.leggiTesto}>Leggi tutto</Text>
              <Ionicons
                name="chevron-forward"
                size={12}
                color={scuro ? ORO_CHIARO : ORO_SCURO}
              />
            </View>
            {altre > 0 && (
              <View style={styles.chip}>
                <Text style={styles.chipTesto}>
                  +{altre} {altre === 1 ? 'comunicazione' : 'comunicazioni'}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      )}

      {/* ---- BACHECA: pannello dal basso con tutte le comunicazioni ---- */}
      <Modal
        visible={bachecaAperta}
        transparent
        animationType="slide"
        onRequestClose={chiudiBacheca}
      >
        <View style={styles.fondo}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={chiudiBacheca}
            accessibilityLabel="Chiudi la Bacheca"
          />
          <Animated.View
            style={[styles.foglio, { transform: [{ translateY: offsetFoglio }] }]}
          >
            <View style={styles.foglioTestaZona} {...panResponder.panHandlers}>
              <View style={styles.maniglia} />
              <View style={styles.foglioTesta}>
                <View style={styles.foglioTitoli}>
                  <Text style={styles.foglioTitolo}>
                    Comunicazioni dello Studio
                  </Text>
                  <Text style={styles.foglioSotto}>
                    {avvisi.length}{' '}
                    {avvisi.length === 1 ? 'comunicazione' : 'comunicazioni'}
                  </Text>
                </View>
                <Pressable
                  hitSlop={12}
                  onPress={chiudiBacheca}
                  style={styles.xPannello}
                  accessibilityLabel="Chiudi"
                >
                  <Ionicons name="close" size={18} color={colors.textTertiary} />
                </Pressable>
              </View>
            </View>
            <ScrollView
              style={styles.lista}
              contentContainerStyle={styles.listaContenuto}
              showsVerticalScrollIndicator={false}
            >
              {avvisi.map((a, i) => (
                <View
                  key={a.id}
                  style={[styles.voce, i === 0 && styles.vocePrima]}
                >
                  {nuoviAlApertura.includes(a.id) && (
                    <View style={styles.voceTesta}>
                      <View style={styles.pillNuovoFoglio}>
                        <Text style={styles.pillNuovoFoglioTesto}>NUOVO</Text>
                      </View>
                    </View>
                  )}
                  <Text style={styles.voceTesto}>
                    {spezzaLink(a.text, styles.linkFoglio)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ThemeColors, scuro: boolean) =>
  StyleSheet.create({
    // Il fondo e' lo stesso delle schermate (colors.background): la banda
    // TopBar -> Bacheca -> contenuto scorre senza strane cuciture (v4.19).
    wrap: {
      backgroundColor: colors.background,
      paddingHorizontal: 18,
      paddingTop: 10,
    },
    // ---- scheda unica ----
    scheda: {
      backgroundColor: colors.surface,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: scuro ? colors.border : '#E7E2D3',
      overflow: 'hidden',
      shadowColor: '#0A1128',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3,
    },
    barraOro: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
    testa: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      padding: 12,
      paddingBottom: 0,
    },
    cerchio: {
      width: 30,
      height: 30,
      borderRadius: 15,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    testi: { flexShrink: 1 },
    titolo: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: -0.1,
    },
    pillNuovo: {
      marginLeft: 'auto',
      backgroundColor: scuro ? colors.dangerSoft : colors.danger,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
    },
    pillNuovoTesto: {
      color: scuro ? colors.danger : '#FFFFFF',
      fontSize: 8.5,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    x: { marginLeft: 8, padding: 2 },
    anteprima: {
      color: colors.textSecondary,
      fontSize: 12.5,
      lineHeight: 17,
      fontWeight: '500',
      paddingHorizontal: 12,
      marginTop: 7,
    },
    link: {
      color: scuro ? ORO_CHIARO : ORO_SCURO,
      fontWeight: '800',
      textDecorationLine: 'underline',
    },
    piede: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 11,
    },
    leggi: { flexDirection: 'row', alignItems: 'center' },
    leggiTesto: {
      color: scuro ? ORO_CHIARO : ORO_SCURO,
      fontSize: 11.5,
      fontWeight: '800',
    },
    chip: {
      marginLeft: 'auto',
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: scuro ? 'rgba(212, 175, 55, 0.3)' : '#EFDFB8',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    chipTesto: {
      color: scuro ? ORO_CHIARO : ORO_SCURO,
      fontSize: 9.5,
      fontWeight: '700',
    },
    // ---- striscia ridotta ----
    striscia: {
      height: 38,
      borderRadius: 12,
      backgroundColor: scuro ? 'rgba(212, 175, 55, 0.10)' : '#FFFDF6',
      borderWidth: 1,
      borderColor: scuro ? 'rgba(212, 175, 55, 0.35)' : '#EAD9A0',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
    },
    cerchioMini: {
      width: 22,
      height: 22,
      borderRadius: 11,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    strisciaTesto: {
      color: colors.textPrimary,
      fontSize: 11.5,
      fontWeight: '700',
      flexShrink: 1,
    },
    punto: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.danger,
    },
    contatore: {
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    contatoreTesto: { color: '#FFFFFF', fontSize: 8.5, fontWeight: '800' },
    // ---- Bacheca (pannello dal basso) ----
    fondo: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    foglio: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      maxHeight: '78%',
      paddingBottom: 28,
    },
    foglioTestaZona: { paddingTop: 8, paddingHorizontal: 16 },
    maniglia: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: scuro ? colors.borderStrong : colors.border,
      alignSelf: 'center',
      marginBottom: 10,
    },
    foglioTesta: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 8 },
    foglioTitoli: { flexShrink: 1 },
    foglioTitolo: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    foglioSotto: {
      color: colors.textTertiary,
      fontSize: 10,
      fontWeight: '600',
      marginTop: 2,
    },
    // X del pannello allineata alla riga del titolo (come la X della
    // scheda "Comunicazione dello Studio": stessa resa, stesso padding).
    xPannello: { marginLeft: 8, padding: 2, marginTop: 1 },
    lista: { flexGrow: 0 },
    listaContenuto: { paddingHorizontal: 16, paddingBottom: 10 },
    voce: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingVertical: 10,
    },
    vocePrima: { borderTopWidth: 0, paddingTop: 2 },
    voceTesta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    pillNuovoFoglio: {
      backgroundColor: colors.dangerSoft,
      borderRadius: 999,
      paddingHorizontal: 6.5,
      paddingVertical: 2,
    },
    pillNuovoFoglioTesto: {
      color: colors.danger,
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    voceTesto: {
      color: colors.textSecondary,
      fontSize: 12.5,
      lineHeight: 17.5,
    },
    linkFoglio: {
      color: scuro ? ORO_CHIARO : ORO_SCURO,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
  });

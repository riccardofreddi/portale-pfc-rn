/**
 * AvvisiBanner — COMUNICAZIONI DELLO STUDIO IN UN PANNELLO DAL BASSO (v4.31).
 *
 * Come lo vuole il titolare (v4.31, dopo aver visto la v4.30 in linea):
 *
 * - la striscia oro "Comunicazioni dello Studio" resta SOTTILE e FISSA:
 *   non si allarga, non si espande e non spinge niente (v4.31: VIA la
 *   lista in linea);
 * - UN TOCCO sulla striscia apre il PANNELLO DAL BASSO: e' lo stesso
 *   foglio condiviso dell'app (Archivio, Cassetto, Notifiche): sale da
 *   sotto con l'animazione, si chiude toccando FUORI o con la X, e non
 *   ha nessuna barretta in alto (v4.28: via la riga nera);
 * - dentro il pannello: la lista di TUTTE le comunicazioni (testo
 *   completo, link cliccabili, NUOVI sui nuovi);
 * - aprire il pannello segna tutto come visto (pallini NUOVI e contatore
 *   della striscia si spengono); la memoria resta sul telefono
 *   (AsyncStorage);
 * - TAP sulla push "Nuovo avviso dallo studio": il pannello si apre da
 *   solo (evento 'pfc-apri-bacheca' + flag avvio freddo da push.ts: i
 *   nomi storici restano per non toccare il lato push);
 * - TEMPO REALE: push ricevuta o app tornata in primo piano => ricarica
 *   senza che il cliente faccia nulla;
 * - MEMORIA letto/non letto: al primo avvio il "visto" parte da adesso,
 *   cosi' gli avvisi gia' pubblicati non escono tutti NUOVI.
 *
 * Gli avvisi NON creano notifiche in campanella (scelta del server):
 * nessun effetto sul badge, come prima. I messaggi privati restano nella
 * tab Messaggi.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, Rect, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal } from '@/components/Modal';
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

// Chiave sul telefono (AsyncStorage): l'ultima volta che il pannello e' stato aperto
const CHIAVE_ULTIMO_VISTO = 'pfc-bacheca-ultimo-visto';

type Avviso = { id: string; text: string; timestamp: string };

export function AvvisiBanner() {
  const colors = useColors();
  const { effective } = useTheme();
  const scuro = effective === 'dark';
  const styles = makeStyles(colors, scuro);

  const [avvisi, setAvvisi] = useState<Avviso[]>([]);
  const [pronto, setPronto] = useState(false);
  const [ultimoVisto, setUltimoVisto] = useState(0);
  // v4.31: il pannello dal basso e' aperto o chiuso; parte chiuso a ogni avvio
  const [listaAperta, setListaAperta] = useState(false);
  // I "NUOVI" dentro il pannello sono la fotografia di quelli c'erano
  // all'apertura: segnare tutto visto non deve farli sparire all'istante.
  const [nuoviAlApertura, setNuoviAlApertura] = useState<string[]>([]);

  // Nuovi = avvisi pubblicati DOPO l'ultima volta che il pannello e' stato
  // aperto (ultimoVisto = epoch ms; 0 = memoria non ancora caricata).
  const nuovi = useMemo(() => {
    if (ultimoVisto <= 0) return [] as Avviso[];
    return avvisi.filter((a) => {
      const t = new Date(a.timestamp).getTime();
      return Number.isFinite(t) && t > ultimoVisto;
    });
  }, [avvisi, ultimoVisto]);

  // Specchio dei nuovi per apriLista: la callback resta stabile e legge
  // sempre il valore aggiornato (senza rifarsi a ogni cambio lista).
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

  // v4.31: apre il pannello dal basso e segna tutto visto (come faceva la
  // vecchia Bacheca): pallini NUOVI e contatore della striscia si spengono.
  const apriLista = useCallback(() => {
    setNuoviAlApertura(nuoviRef.current.map((a) => a.id));
    const adesso = Date.now();
    setUltimoVisto(adesso);
    AsyncStorage.setItem(CHIAVE_ULTIMO_VISTO, String(adesso)).catch(() => {});
    setListaAperta(true);
  }, []);

  const chiudiLista = useCallback(() => {
    haptics.tap();
    setListaAperta(false);
  }, []);

  // v4.31: UN tocco sulla striscia apre il pannello DAL BASSO: la striscia
  // non cambia mai forma (via l'espansione, via la lista in linea).
  const toggleLista = useCallback(() => {
    haptics.tap();
    apriLista();
  }, [apriLista]);

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
    // Tap sulla push "Nuovo avviso" => il pannello si apre da solo (nome
    // storico dell'evento lasciato intatto: lo emette push.ts).
    const subBacheca = DeviceEventEmitter.addListener(
      'pfc-apri-bacheca',
      () => {
        apriLista();
      },
    );
    return () => {
      subPush.remove();
      subRisentita.remove();
      subBacheca.remove();
    };
  }, [carica, apriLista]);

  // Memoria letto/non letto (prima volta: il visto parte da adesso, cosi'
  // gli avvisi pubblicati PRIMA dell'aggiornamento non escono tutti NUOVI).
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const visto = await AsyncStorage.getItem(CHIAVE_ULTIMO_VISTO);
        if (!vivo) return;
        if (visto === null) {
          const adesso = Date.now();
          await AsyncStorage.setItem(CHIAVE_ULTIMO_VISTO, String(adesso));
          if (!vivo) return;
          setUltimoVisto(adesso);
        } else {
          const n = Number(visto);
          setUltimoVisto(Number.isFinite(n) && n > 0 ? n : Date.now());
        }
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

  // App aperta TOCCANDO la push di un avviso (avvio freddo): il pannello
  // consuma il tap appena e' pronta (memoria caricata + avvisi).
  useEffect(() => {
    if (!pronto || avvisi.length === 0) return;
    if (prendiTapAvvisoPendente()) apriLista();
  }, [pronto, avvisi.length, apriLista]);

  // Nessun avviso pubblicato (o memoria non ancora caricata): ZERO spazio.
  if (!pronto || avvisi.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {/* v4.31: STRISCIA FISSA: un tocco apre il pannello DAL BASSO */}
      <Pressable
        onPress={toggleLista}
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
        {/* Freccina: giu' = pannello chiuso, su = pannello aperto */}
        <Ionicons
          name={listaAperta ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textTertiary}
        />
      </Pressable>

      {/* v4.31: PANNELLO DAL BASSO (foglio condiviso dell'app, senza
       * barretta in alto): sale da sotto al tocco sulla striscia, si
       * chiude toccando fuori o con la X. La striscia non si muove. */}
      <Modal visible={listaAperta} onClose={chiudiLista}>
        <View style={styles.pannelloTesta}>
          <Text style={styles.pannelloTitolo}>Comunicazioni dello Studio</Text>
          <Pressable
            onPress={chiudiLista}
            style={styles.pannelloChiudi}
            accessibilityLabel="Chiudi le comunicazioni dello studio"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView style={styles.pannelloLista} contentContainerStyle={styles.pannelloListaCont}>
          {avvisi.map((a, i) => (
            <View
              key={a.id}
              style={[styles.voce, i === 0 && styles.vocePrima]}
            >
              {nuoviAlApertura.includes(a.id) && (
                <View style={styles.voceTesta}>
                  <View style={styles.pillNuovoVoce}>
                    <Text style={styles.pillNuovoVoceTesto}>NUOVO</Text>
                  </View>
                </View>
              )}
              <Text style={styles.voceTesto}>
                {spezzaLink(a.text, styles.linkVoce)}
              </Text>
            </View>
          ))}
        </ScrollView>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: ThemeColors, scuro: boolean) =>
  StyleSheet.create({
    // Il fondo e' lo stesso delle schermate (colors.background): la banda
    // TopBar -> striscia -> contenuto scorre senza strane cuciture (v4.19).
    wrap: {
      backgroundColor: colors.background,
      paddingHorizontal: 18,
      paddingTop: 10,
    },
    // ---- striscia fissa (v4.31: mai cambia forma) ----
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
    // ---- pannello dal basso (v4.31: foglio condiviso, senza barretta) ----
    pannelloTesta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 18,
      paddingBottom: 8,
    },
    pannelloTitolo: {
      color: colors.textPrimary,
      fontSize: 16.5,
      fontWeight: '800',
      flexShrink: 1,
    },
    pannelloChiudi: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    // Il foglio si adatta al contenuto (con molti avvisi si ferma all'85%
    // dello schermo e si scorre dentro, come i pannelli dell'Archivio).
    pannelloLista: { flexGrow: 0 },
    pannelloListaCont: { paddingHorizontal: 18, paddingBottom: 10 },
    voce: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingVertical: 12,
    },
    vocePrima: { borderTopWidth: 0, paddingTop: 2 },
    voceTesta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    pillNuovoVoce: {
      backgroundColor: colors.dangerSoft,
      borderRadius: 999,
      paddingHorizontal: 6.5,
      paddingVertical: 2,
    },
    pillNuovoVoceTesto: {
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
    linkVoce: {
      color: scuro ? ORO_CHIARO : ORO_SCURO,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
  });

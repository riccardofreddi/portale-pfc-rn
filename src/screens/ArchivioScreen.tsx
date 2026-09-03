/**
 * Schermata Archivio — design v2.
 * Gerarchia: Anni → Cartelle → File.
 *
 * Novità v2:
 * - Card di benvenuto NEUTRA (nessun saluto con il nome: l'app è usata anche da
 *   società): titolo "Benvenuto", sottotitolo "Qui trovi l'archivio di {nome}"
 *   che funziona sia per persone sia per aziende, data italiana e statistiche.
 * - Animazioni di ingresso (fade + scivolata) per hero, ricerca e griglia anni;
 *   effetto "schiaccia" al tocco su card-anno e barra di ricerca.
 * - Sfondo hero con "bagliori" soft (nessuna libreria nuova: solo View assolute).
 * - Barra di ricerca staccata dal bordo superiore, più alta, icona ben visibile.
 * - Griglia anni a 2 colonne con card grandi e leggibili.
 * - Pulsante "Aggiorna" rimosso: si usa il trascina-per-aggiornare (RefreshControl).
 * - Ricerca con debounce (300 ms), minimo 2 caratteri, evidenziazione dei termini
 *   trovati, conteggio risultati e anteprima diretta dei PDF.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FileIcon, canPreviewFile } from '@/components/FileIcon';
import { Badge } from '@/components/Badge';
import { SkeletonList } from '@/components/Skeleton';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { formatDate } from '@/lib/utils';
import type { Cartella, FileItem, SearchResult } from '@/types/api';
import { radius, shadow, spacing, typography, useColors, type ThemeColors } from '@/theme';

type Step = 'anno' | 'cartella' | 'file';

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MESI = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

function dataDiOggi(): string {
  const d = new Date();
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} ${d.getFullYear()}`;
}

function oraDi(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Spezza il nome evidenziando (in accento) le parti che corrispondono alla query. */
function evidenzia(nome: string, query: string, matchStyle: { color: string; fontWeight: '700' }): React.ReactNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [nome];
  const lower = nome.toLowerCase();
  const parti: React.ReactNode[] = [];
  let i = 0;
  for (;;) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      parti.push(nome.slice(i));
      break;
    }
    if (idx > i) parti.push(nome.slice(i, idx));
    parti.push(
      <Text key={`${idx}-${q.length}`} style={matchStyle}>
        {nome.slice(idx, idx + q.length)}
      </Text>,
    );
    i = idx + q.length;
  }
  return parti;
}

/* ============================================================
 * Animazioni (React Native core, nessuna libreria aggiuntiva)
 * ============================================================ */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Entrata: fade + piccola scivolata dal basso. */
function Entrata({
  delay = 0,
  style,
  children,
}: {
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 430,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Pressable con effetto "schiaccia" al tocco. */
function ScalablePress({
  onPress,
  onLongPress,
  style,
  accessibilityLabel,
  children,
}: {
  onPress: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.timing(scale, { toValue: 0.96, duration: 110, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityLabel={accessibilityLabel}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

/* ============================================================
 * Schermata
 * ============================================================ */

export default function ArchivioScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const user = useAppStore((s) => s.user);
  const anno = useAppStore((s) => s.annoSelezionato);
  const cartella = useAppStore((s) => s.cartellaSelezionata);
  const setAnno = useAppStore((s) => s.setAnno);
  const setCartella = useAppStore((s) => s.setCartella);
  const setPreviewFile = useAppStore((s) => s.setPreviewFile);

  const [anni, setAnni] = useState<string[]>([]);
  const [cartelle, setCartelle] = useState<Cartella[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastLoad, setLastLoad] = useState<Date | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [togglingFav, setTogglingFav] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedFiles = files.filter((f) => selected.has(f.key));

  const searchSeq = useRef(0);

  const step: Step = cartella ? 'file' : anno ? 'cartella' : 'anno';
  const numColumns = step === 'anno' ? 2 : 1;

  const nome = (user?.name?.trim() || user?.username || '').trim();
  const nomeBello = nome ? nome.charAt(0).toUpperCase() + nome.slice(1) : '';

  const load = useCallback(
    async (showRefresh = false) => {
      if (!user) return;
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await api.documenti.list({
          username: user.username,
          anno: anno ?? undefined,
          cartella: cartella ?? undefined,
        });
        if (res.anni) setAnni(res.anni.sort((a, b) => b.localeCompare(a)));
        setCartelle(res.cartelle ?? []);
        setFiles(res.files ?? []);
        setLastLoad(new Date());
      } catch (err) {
        toast.error('Errore caricamento', err instanceof Error ? err.message : 'Errore sconosciuto');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user, anno, cartella],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Ricerca con debounce: parte dopo 300 ms, solo da 2 caratteri, e ignora
  // le risposte ormai superate da query più recenti (guardia di sequenza).
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const seq = ++searchSeq.current;
      try {
        const res = await api.ricerca.search(q, user?.username);
        if (seq === searchSeq.current) setSearchResults(res.results ?? []);
      } catch {
        if (seq === searchSeq.current) setSearchResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user?.username]);

  async function handleTogglePreferito(file: FileItem) {
    setTogglingFav(file.key);
    haptics.tap();
    try {
      const res = await api.preferiti.toggle(file.key);
      setFiles((prev) =>
        prev.map((f) =>
          f.key === file.key
            ? { ...f, isPreferito: res.isPreferito, stato: res.isPreferito ? 'preferito' : 'visto' }
            : f,
        ),
      );
      toast.success(res.isPreferito ? 'Aggiunto ai preferiti' : 'Rimosso dai preferiti');
    } catch {
      toast.error('Errore', 'Impossibile aggiornare i preferiti');
    } finally {
      setTogglingFav(null);
    }
  }

  async function handleDownload(file: FileItem) {
    setDownloading(file.key);
    haptics.impact();
    try {
      const cookie = await api.documenti.sessionCookieHeader();
      const url = api.documenti.downloadUrl(file.key);
      const localPath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${file.nome}`;
      const res = await ReactNativeBlobUtil.config({
        path: localPath,
        fileCache: true,
      }).fetch('GET', url, { Cookie: cookie });
      toast.success('Download completato', `Salvato in: ${res.path()}`);
    } catch (err) {
      toast.error('Errore download', err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setDownloading(null);
    }
  }

  function apriRicerca() {
    haptics.tap();
    setSearchOpen(true);
  }

  function apriRisultato(item: SearchResult) {
    if (canPreviewFile(item.nome)) {
      setPreviewFile({ key: item.key, nome: item.nome } as FileItem);
    } else {
      handleDownload({ key: item.key, nome: item.nome } as FileItem);
    }
  }

  function toggleSelect(key: string) {
    haptics.tap();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    haptics.tap();
    setSelected(new Set(files.map((f) => f.key)));
  }

  function clearSelection() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function handleBulkDownload() {
    haptics.impact();
    toast.info(`Download di ${selectedFiles.length} file in corso...`);
    let success = 0;
    for (const f of selectedFiles) {
      try {
        const cookie = await api.documenti.sessionCookieHeader();
        const url = api.documenti.downloadUrl(f.key);
        const localPath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${f.nome}`;
        await ReactNativeBlobUtil.config({ path: localPath, fileCache: true }).fetch('GET', url, { Cookie: cookie });
        success++;
      } catch (err) {
        console.error('[Archivio] bulk download error:', f.nome, err);
      }
    }
    if (success === selectedFiles.length) {
      haptics.success();
      toast.success('Tutti i file scaricati', `${success}/${selectedFiles.length}`);
    } else {
      haptics.warning();
      toast.warning('Download parziale', `${success}/${selectedFiles.length} scaricati`);
    }
    clearSelection();
  }

  async function handleBulkPreferiti() {
    haptics.tap();
    let count = 0;
    for (const f of selectedFiles) {
      try {
        await api.preferiti.toggle(f.key);
        count++;
      } catch (err) {
        console.error('[Archivio] bulk preferiti error:', f.nome, err);
      }
    }
    toast.success('Preferiti aggiornati', `${count} file modificati`);
    load(true);
    clearSelection();
  }

  /* ---------- Vista ricerca dedicata ---------- */

  if (searchOpen) {
    const q = searchQuery.trim();
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.searchHeader}>
          <Pressable
            onPress={() => {
              setSearchOpen(false);
              setSearchQuery('');
              setSearchResults([]);
            }}
            style={styles.iconBtn}
            accessibilityLabel="Chiudi ricerca"
          >
            <Text style={styles.iconBtnText}>←</Text>
          </Pressable>
          <View style={styles.searchInputWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cerca documenti..."
              placeholderTextColor={colors.textTertiary}
              style={styles.searchInput}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                style={styles.clearBtn}
                accessibilityLabel="Cancella testo"
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        {searching ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : searchResults.length === 0 ? (
          <EmptyState
            icon={<Text style={styles.emptyIcon}>🔍</Text>}
            title={q.length >= 2 ? `Nessun risultato per "${q}"` : 'Cerca documenti'}
            subtitle={q.length >= 2 ? 'Prova con un altro nome o annata' : 'Scrivi almeno 2 lettere del nome del file'}
          />
        ) : (
          <>
            <Text style={styles.resultCount}>
              {searchResults.length === 1 ? '1 risultato' : `${searchResults.length} risultati`} per "{q}"
            </Text>
            <FlatList
              style={styles.list}
              contentContainerStyle={styles.listContent}
              data={searchResults}
              keyExtractor={(item) => item.key}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable onPress={() => apriRisultato(item)}>
                  {({ pressed }) => (
                    <Card style={[styles.row, pressed && styles.rowPressed]}>
                      <FileIcon filename={item.nome} />
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {evidenzia(item.nome, q, styles.matchText)}
                        </Text>
                        <Text style={styles.rowSubtitle} numberOfLines={1}>
                          {item.anno} › {item.cartella}
                          {item.sizeStr ? ` · ${item.sizeStr}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.downloadIcon}>{canPreviewFile(item.nome) ? '👁' : '⬇'}</Text>
                    </Card>
                  )}
                </Pressable>
              )}
            />
          </>
        )}
      </SafeAreaView>
    );
  }

  /* ---------- Vista principale ---------- */

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {step !== 'anno' && (
        <View style={styles.toolbar}>
          <Pressable
            onPress={() => {
              if (step === 'file') setCartella(null);
              else setAnno(null);
            }}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            accessibilityLabel="Indietro"
          >
            <Text style={styles.iconBtnText}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          {step === 'file' && !selectMode && files.length > 0 && (
            <Pressable
              onPress={() => {
                haptics.tap();
                setSelectMode(true);
              }}
              style={styles.iconBtn}
              accessibilityLabel="Seleziona"
            >
              <Text style={styles.iconBtnText}>☑</Text>
            </Pressable>
          )}
          {selectMode && (
            <>
              <Pressable onPress={selectAll} style={styles.iconBtn} accessibilityLabel="Seleziona tutti">
                <Text style={styles.iconBtnText}>✓✓</Text>
              </Pressable>
              <Pressable onPress={clearSelection} style={styles.iconBtn} accessibilityLabel="Annulla selezione">
                <Text style={styles.iconBtnText}>✕</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {step !== 'anno' && (
        <View style={styles.breadcrumb}>
          <Text style={styles.crumbText}>
            {anno}
            {cartella ? ` › ${cartella}` : ''}
          </Text>
        </View>
      )}

      {/* Card di benvenuto: neutra, adatta a persone e società */}
      {step === 'anno' && (
        <Entrata style={styles.heroWrap}>
          <Card style={styles.heroCard} padded={false}>
            <View style={styles.heroAurora1} pointerEvents="none" />
            <View style={styles.heroAurora2} pointerEvents="none" />
            <View style={styles.heroInner}>
              <Text style={styles.heroOverline}>{`Archivio · ${dataDiOggi()}`}</Text>
              <Text style={styles.heroTitle}>
                Benvenuto <Text style={styles.heroWave}>👋</Text>
              </Text>
              <Text style={styles.heroSubtitle}>
                {nomeBello
                  ? `Qui trovi l'archivio di ${nomeBello}`
                  : 'Qui trovi tutti i documenti del portale'}
              </Text>
              <View style={styles.heroChips}>
                <View style={styles.heroChip}>
                  <Text style={styles.heroChipText}>
                    📁 {anni.length} {anni.length === 1 ? 'anno' : 'anni'} di archivio
                  </Text>
                </View>
                {lastLoad && (
                  <View style={styles.heroChip}>
                    <Text style={styles.heroChipText}>✓ Aggiornato alle {oraDi(lastLoad)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.heroHint}>Trascina in basso per aggiornare l'archivio</Text>
            </View>
          </Card>
        </Entrata>
      )}

      {/* Barra di ricerca: sempre visibile, ben staccata dai bordi */}
      <Entrata delay={90} style={styles.searchWrap}>
        <ScalablePress onPress={apriRicerca} style={styles.searchBar} accessibilityLabel="Apri ricerca">
          <View style={styles.searchIconBox}>
            <Text style={styles.searchIconBoxText}>🔍</Text>
          </View>
          <Text style={styles.searchBarText}>Cerca nel portale...</Text>
        </ScalablePress>
      </Entrata>

      {step === 'anno' && !loading && anni.length > 0 && (
        <Text style={styles.sectionLabel}>Sfoglia per anno</Text>
      )}

      {loading && !refreshing ? (
        <SkeletonList count={5} height={64} />
      ) : (
        <FlatList<string | Cartella | FileItem>
          key={step}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          data={(step === 'anno' ? anni : step === 'cartella' ? cartelle : files) as Array<
            string | Cartella | FileItem
          >}
          keyExtractor={(item, i): string => {
            if (typeof item === 'string') return item;
            if ('key' in item && typeof item.key === 'string') return item.key;
            if ('nome' in item && typeof item.nome === 'string') return item.nome;
            return String(i);
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.surface}
            />
          }
          renderItem={({ item, index }) => {
            if (typeof item === 'string') {
              return (
                <Entrata delay={Math.min(160 + index * 60, 700)} style={styles.yearCell}>
                  <ScalablePress
                    onPress={() => {
                      haptics.tap();
                      setAnno(item);
                    }}
                  >
                    <Card style={styles.yearCard} padded={false}>
                      <View style={styles.yearCardInner}>
                        <View style={styles.yearIconBox}>
                          <Text style={styles.yearIconBoxText}>📁</Text>
                        </View>
                        <Text style={styles.yearCardTitle}>{item}</Text>
                        <View style={styles.yearCardFoot}>
                          <Text style={styles.yearCardSub}>Apri</Text>
                          <Text style={styles.yearCardArrow}>›</Text>
                        </View>
                      </View>
                    </Card>
                  </ScalablePress>
                </Entrata>
              );
            }
            if ('nome' in item && 'count' in item) {
              const c = item as Cartella;
              const subparts = [
                c.count != null ? `${c.count} file` : null,
                c.nuovi ? `${c.nuovi} nuovi` : null,
              ].filter(Boolean);
              return (
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    setCartella(c.nome);
                  }}
                >
                  {({ pressed }) => (
                    <Card style={[styles.row, pressed && styles.rowPressed]}>
                      <View style={[styles.folderIcon, { backgroundColor: colors.accentSoft }]}>
                        <Text style={styles.folderIconText}>📁</Text>
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={2}>
                          {c.nome}
                        </Text>
                        {subparts.length > 0 && <Text style={styles.rowSubtitle}>{subparts.join(' · ')}</Text>}
                      </View>
                      {c.nuovi ? <Badge label={c.nuovi} variant="danger" /> : null}
                      <Text style={styles.chevron}>›</Text>
                    </Card>
                  )}
                </Pressable>
              );
            }
            const f = item as FileItem;
            const isSelected = selected.has(f.key);
            return (
              <Pressable
                onPress={() => {
                  if (selectMode) toggleSelect(f.key);
                  else if (canPreviewFile(f.nome)) setPreviewFile(f);
                  else handleDownload(f);
                }}
                onLongPress={() => {
                  if (!selectMode) {
                    haptics.impact();
                    setSelectMode(true);
                    setSelected(new Set([f.key]));
                  }
                }}
              >
                {({ pressed }) => (
                  <Card
                    style={[styles.row, pressed && styles.rowPressed, selectMode && isSelected && styles.rowSelected]}
                  >
                    {selectMode ? (
                      <View style={styles.checkboxWrap}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                          {isSelected && <Text style={styles.checkboxText}>✓</Text>}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.statusDotWrap}>
                        <View
                          style={[
                            styles.statusDot,
                            f.stato === 'nuovo' && styles.statusDotNew,
                            f.stato === 'visto' && styles.statusDotSeen,
                            f.stato === 'scaricato' && styles.statusDotDownloaded,
                            f.stato === 'preferito' && styles.statusDotDownloaded,
                          ]}
                        />
                      </View>
                    )}
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {f.nome}
                      </Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {f.sizeStr}
                        {f.lastModified ? ` · ${formatDate(f.lastModified)}` : ''}
                      </Text>
                    </View>
                    {!selectMode && (
                      <View style={styles.rowActions}>
                        <Pressable
                          onPress={() => handleTogglePreferito(f)}
                          disabled={togglingFav === f.key}
                          style={styles.actionBtn}
                          accessibilityLabel="Preferito"
                        >
                          <Text style={[styles.starIcon, f.isPreferito && styles.starIconActive]}>
                            {f.isPreferito ? '★' : '☆'}
                          </Text>
                        </Pressable>
                        {canPreviewFile(f.nome) && (
                          <Pressable
                            onPress={() => setPreviewFile(f)}
                            style={styles.actionBtn}
                            accessibilityLabel="Anteprima"
                          >
                            <Text style={styles.actionIcon}>👁</Text>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => handleDownload(f)}
                          disabled={downloading === f.key}
                          style={styles.actionBtn}
                          accessibilityLabel="Scarica"
                        >
                          <Text style={styles.actionIcon}>{downloading === f.key ? '⏳' : '⬇'}</Text>
                        </Pressable>
                      </View>
                    )}
                  </Card>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<Text style={styles.emptyIcon}>📂</Text>}
              title="Nessun documento trovato"
              subtitle={
                step === 'anno'
                  ? 'Trascina in basso per aggiornare'
                  : 'Trascina in basso per aggiornare la cartella'
              }
            />
          }
          ListFooterComponent={
            step === 'file' && files.length > 0 ? (
              <Text style={styles.tipText}>💡 Tieni premuto un file per selezionarne più di uno</Text>
            ) : null
          }
        />
      )}

      {selectMode && selected.size > 0 && (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkCount}>
            {selected.size} selezionat{selected.size === 1 ? 'o' : 'i'}
          </Text>
          <View style={styles.bulkActions}>
            <Pressable
              onPress={handleBulkPreferiti}
              style={({ pressed }) => [styles.bulkBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.bulkBtnText}>★ Preferiti</Text>
            </Pressable>
            <Pressable
              onPress={handleBulkDownload}
              style={({ pressed }) => [styles.bulkBtn, styles.bulkBtnPrimary, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.bulkBtnPrimaryText}>⬇ Scarica ({selected.size})</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
    iconBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    iconBtnPressed: { backgroundColor: colors.surfaceAlt },
    iconBtnText: { fontSize: 20, color: colors.textSecondary },
    breadcrumb: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surfaceAlt },
    crumbText: { ...typography.caption, color: colors.textSecondary },
    list: { flex: 1 },
    listContent: { padding: spacing.lg, gap: spacing.md },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64 },
    rowPressed: { borderColor: colors.accent, transform: [{ scale: 0.98 }] },
    folderIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    folderIconText: { fontSize: 20 },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
    rowSubtitle: { ...typography.caption, color: colors.textSecondary },
    chevron: { fontSize: 22, color: colors.textTertiary, fontWeight: '300' },
    statusDotWrap: { width: 8, alignItems: 'center' },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textTertiary },
    statusDotNew: { backgroundColor: colors.danger },
    statusDotSeen: { backgroundColor: colors.textTertiary },
    statusDotDownloaded: { backgroundColor: colors.success },
    rowActions: { flexDirection: 'row', alignItems: 'center' },
    actionBtn: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
    starIcon: { fontSize: 18, color: colors.textTertiary },
    starIconActive: { color: colors.warning },
    actionIcon: { fontSize: 16 },
    downloadIcon: { fontSize: 18, color: colors.accent },
    emptyIcon: { fontSize: 48 },
    matchText: { color: colors.accent, fontWeight: '700' },
    resultCount: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
    tipText: { ...typography.caption, color: colors.textTertiary, textAlign: 'center', paddingVertical: spacing.lg },

    // Card di benvenuto (v2)
    heroWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, marginBottom: spacing.xs },
    heroCard: { backgroundColor: colors.surface, borderColor: colors.border, overflow: 'hidden', ...shadow.md },
    heroAurora1: { position: 'absolute', top: -70, right: -50, width: 210, height: 210, borderRadius: 105, backgroundColor: colors.accent, opacity: 0.12 },
    heroAurora2: { position: 'absolute', bottom: -80, left: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: colors.accent, opacity: 0.07 },
    heroInner: { padding: spacing.xl, gap: spacing.sm },
    heroOverline: { ...typography.labelSmall, color: colors.textTertiary, letterSpacing: 1.2 },
    heroTitle: { ...typography.h1, color: colors.textPrimary, marginTop: 2 },
    heroWave: { fontSize: 26 },
    heroSubtitle: { ...typography.body, color: colors.textSecondary },
    heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
    heroChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
    heroChipText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
    heroHint: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },

    // Barra di ricerca (v2: staccata dal bordo, piu' alta, icona visibile)
    searchWrap: { marginTop: spacing.lg, marginBottom: spacing.sm, marginHorizontal: spacing.lg },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadow.sm,
    },
    searchIconBox: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
    searchIconBoxText: { fontSize: 16 },
    searchBarText: { ...typography.body, color: colors.textTertiary },

    // Intestazione sezione anni
    sectionLabel: { ...typography.labelSmall, color: colors.textTertiary, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs, letterSpacing: 1.2 },

    // Griglia anni (v2: card grandi con icona, anno e invito all'apertura)
    gridRow: { gap: spacing.md },
    yearCell: { flex: 1 },
    yearCard: { flex: 1, minHeight: 128 },
    yearCardInner: { flex: 1, alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.lg },
    yearIconBox: { width: 46, height: 46, borderRadius: radius.md + 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
    yearIconBoxText: { fontSize: 22 },
    yearCardTitle: { ...typography.h2, color: colors.textPrimary },
    yearCardFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    yearCardSub: { ...typography.caption, color: colors.accent, fontWeight: '700' },
    yearCardArrow: { fontSize: 16, color: colors.accent, fontWeight: '700', marginTop: -1 },

    // Vista ricerca dedicata
    searchHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 44, gap: spacing.sm },
    searchIcon: { fontSize: 14 },
    searchInput: { flex: 1, ...typography.bodySmall, color: colors.textPrimary, paddingVertical: 0 },
    clearBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.border },
    clearBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },

    rowSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    checkboxWrap: { width: 24, alignItems: 'center', justifyContent: 'center' },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
    checkboxText: { color: colors.textInverse, fontSize: 14, fontWeight: '700' },
    bulkBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, shadowColor: colors.primary, shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4 },
    bulkCount: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
    bulkActions: { flexDirection: 'row', gap: spacing.sm },
    bulkBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
    bulkBtnText: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
    bulkBtnPrimary: { backgroundColor: colors.accent },
    bulkBtnPrimaryText: { ...typography.bodySmall, color: colors.textInverse, fontWeight: '700' },
  });

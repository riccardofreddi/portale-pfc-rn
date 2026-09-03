/**
 * Schermata Archivio.
 * Gerarchia: Anni → Cartelle → File.
 * Features: ricerca globale, refresh, preferiti, preview PDF, download, multi-select.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
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
import { spacing, typography, useColors, type ThemeColors } from '@/theme';

type Step = 'anno' | 'cartella' | 'file';

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [togglingFav, setTogglingFav] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedFiles = files.filter((f) => selected.has(f.key));

  const step: Step = cartella ? 'file' : anno ? 'cartella' : 'anno';

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

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const res = await api.ricerca.search(query.trim(), user?.username);
      setSearchResults(res.results ?? []);
    } catch {
      // silent
    } finally {
      setSearching(false);
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

  if (searchOpen) {
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
            <Text style={styles.iconBtnText}>✕</Text>
          </Pressable>
          <View style={styles.searchInputWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Cerca documenti..."
              placeholderTextColor={colors.textTertiary}
              style={styles.searchInput}
              autoFocus
            />
          </View>
        </View>

        {searching ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : searchResults.length === 0 ? (
          <EmptyState title={searchQuery.trim() ? `Nessun risultato per "${searchQuery}"` : 'Cerca documenti'} />
        ) : (
          <FlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={searchResults}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <Pressable onPress={() => handleDownload({ key: item.key, nome: item.nome } as FileItem)}>
                {({ pressed }) => (
                  <Card style={[styles.row, pressed && styles.rowPressed]}>
                    <FileIcon filename={item.nome} />
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{item.nome}</Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>{item.cartella}</Text>
                    </View>
                    <Text style={styles.downloadIcon}>⬇</Text>
                  </Card>
                )}
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.toolbar}>
        {step !== 'anno' && (
          <Pressable
            onPress={() => {
              if (step === 'file') setCartella(null);
              else setAnno(null);
            }}
            style={styles.iconBtn}
            accessibilityLabel="Indietro"
          >
            <Text style={styles.iconBtnText}>←</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => load(true)}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          accessibilityLabel="Aggiorna"
        >
          <Text style={[styles.iconBtnText, refreshing && { opacity: 0.5 }]}>↻</Text>
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
        {!selectMode && (
          <Pressable onPress={() => setSearchOpen(true)} style={styles.iconBtn} accessibilityLabel="Cerca">
            <Text style={styles.iconBtnText}>🔍</Text>
          </Pressable>
        )}
      </View>

      {step === 'anno' && anni.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.yearChips}
        >
          {anni.map((a) => (
            <Pressable
              key={a}
              onPress={() => setAnno(a)}
              style={[styles.yearChip, anno === a && styles.yearChipActive]}
            >
              <Text style={[styles.yearChipText, anno === a && styles.yearChipTextActive]}>{a}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {step !== 'anno' && (
        <View style={styles.breadcrumb}>
          <Text style={styles.crumbText}>
            {anno}{cartella ? ` › ${cartella}` : ''}
          </Text>
        </View>
      )}

      {loading && !refreshing ? (
        <SkeletonList count={5} height={64} />
      ) : (
        <FlatList<string | Cartella | FileItem>
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={(step === 'anno' ? anni : step === 'cartella' ? cartelle : files) as Array<string | Cartella | FileItem>}
          keyExtractor={(item, i): string => {
            if (typeof item === 'string') return item;
            if ('key' in item && typeof item.key === 'string') return item.key;
            if ('nome' in item && typeof item.nome === 'string') return item.nome;
            return String(i);
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          renderItem={({ item }) => {
            if (typeof item === 'string') {
              return (
                <Pressable onPress={() => setAnno(item)}>
                  {({ pressed }) => (
                    <Card style={[styles.row, pressed && styles.rowPressed]}>
                      <View style={[styles.folderIcon, { backgroundColor: colors.accentSoft }]}>
                        <Text style={styles.folderIconText}>📁</Text>
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle}>{item}</Text>
                        <Text style={styles.rowSubtitle}>Anno</Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Card>
                  )}
                </Pressable>
              );
            }
            if ('nome' in item && 'count' in item) {
              const c = item as Cartella;
              const subparts = [
                c.count != null ? `${c.count} file` : null,
                c.nuovi ? `${c.nuovi} nuovi` : null,
              ].filter(Boolean);
              return (
                <Pressable onPress={() => setCartella(c.nome)}>
                  {({ pressed }) => (
                    <Card style={[styles.row, pressed && styles.rowPressed]}>
                      <View style={[styles.folderIcon, { backgroundColor: colors.accentSoft }]}>
                        <Text style={styles.folderIconText}>📁</Text>
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={2}>{c.nome}</Text>
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
                  <Card style={[styles.row, pressed && styles.rowPressed, selectMode && isSelected && styles.rowSelected]}>
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
                    <FileIcon filename={f.nome} />
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{f.nome}</Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {f.sizeStr}{f.lastModified ? ` · ${formatDate(f.lastModified)}` : ''}
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
                          <Pressable onPress={() => setPreviewFile(f)} style={styles.actionBtn} accessibilityLabel="Anteprima">
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
              subtitle={step === 'anno' ? 'Seleziona un anno per iniziare' : undefined}
            />
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
    iconBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    iconBtnPressed: { backgroundColor: colors.surfaceAlt },
    iconBtnText: { fontSize: 20, color: colors.textSecondary },
    yearChips: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
    yearChip: { paddingHorizontal: spacing.lg, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
    yearChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    yearChipText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
    yearChipTextActive: { color: colors.textInverse },
    breadcrumb: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surfaceAlt },
    crumbText: { ...typography.caption, color: colors.textSecondary },
    list: { flex: 1 },
    listContent: { padding: spacing.lg, gap: spacing.sm },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64 },
    rowPressed: { borderColor: colors.accent, transform: [{ scale: 0.98 }] },
    folderIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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
    actionBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    starIcon: { fontSize: 18, color: colors.textTertiary },
    starIconActive: { color: colors.warning },
    actionIcon: { fontSize: 16 },
    downloadIcon: { fontSize: 18, color: colors.accent },
    emptyIcon: { fontSize: 48 },
    searchHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingHorizontal: spacing.md, height: 44, gap: spacing.sm },
    searchIcon: { fontSize: 14 },
    searchInput: { flex: 1, ...typography.bodySmall, color: colors.textPrimary, paddingVertical: 0 },
    rowSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    checkboxWrap: { width: 24, alignItems: 'center', justifyContent: 'center' },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
    checkboxText: { color: colors.textInverse, fontSize: 14, fontWeight: '700' },
    bulkBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, shadowColor: colors.primary, shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 4 },
    bulkCount: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
    bulkActions: { flexDirection: 'row', gap: spacing.sm },
    bulkBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: 10, backgroundColor: colors.surfaceAlt },
    bulkBtnText: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
    bulkBtnPrimary: { backgroundColor: colors.accent },
    bulkBtnPrimaryText: { ...typography.bodySmall, color: colors.textInverse, fontWeight: '700' },
  });

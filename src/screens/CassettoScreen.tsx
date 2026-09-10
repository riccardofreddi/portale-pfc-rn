/**
 * Schermata Cassetto Personale.
 *
 * v4.11 — grafica replicata dall'app Android v4 (CassettoScreen.kt):
 * - Hero "Caveau Documentale": card blu notte con gradiente Midnight →
 *   GeoPrimary → Midnight, bordo oro, lucchetto oro in box soft e pulsante
 *   oro "Aggiungi" (apre lo stesso pannello di sempre).
 * - Card documento: icona tipo file, nome, dimensione · data, linea di
 *   separazione e riga azioni: pillola "Anteprima" + icone Scarica /
 *   Rinomina / Elimina (stesse funzioni di sempre).
 * - Tolto il pulsante "Aggiorna": si usa il trascina-per-aggiornare
 *   (il caricamento all'apertura resta identico).
 * - Logica INTATTA: caricamento, upload con tipo, download, rinomina,
 *   eliminazione, limite dimensione file.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, Rect, LinearGradient, Stop } from 'react-native-svg';
import DocumentPicker, { types } from 'react-native-document-picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { FileIcon, canPreviewFile } from '@/components/FileIcon';
import { Modal } from '@/components/Modal';
import { confirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/Button';
import { SkeletonList } from '@/components/Skeleton';
import { toast } from '@/components/Toaster';
import { haptics } from '@/lib/haptics';
import { api } from '@/api/client';
import { useAppStore } from '@/store/auth';
import { formatDate, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/utils';
import type { CassettoFile, FileItem } from '@/types/api';
import { shadow, spacing, typography, useColors, type ThemeColors } from '@/theme';

const TIPI_FILE = [
  { value: 'QR Code P.IVA', color: '#059669' },
  { value: 'Certificato P.IVA', color: '#0284c7' },
  { value: 'Visura Camerale', color: '#7c3aed' },
  { value: 'Doc. Identita', color: '#dc2626' },
  { value: 'IBAN', color: '#d97706' },
] as const;

// Colori firma del brand (validi in entrambi i temi, come nell'app v4)
const NAVY_NOTTE = '#0A1128';
const NAVY_PRIMARIO = '#003566';
const ORO = '#D4AF37';
const ORO_CHIARO = '#F7E7B4';

export default function CassettoScreen() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const setPreviewFile = useAppStore((s) => s.setPreviewFile);
  const [files, setFiles] = useState<CassettoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [renaming, setRenaming] = useState<CassettoFile | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.cassetto.list();
      setFiles(res.files);
    } catch (err) {
      toast.error('Errore', err instanceof Error ? err.message : 'Errore caricamento');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload() {
    if (!selectedTipo) return;
    try {
      const picked = await DocumentPicker.pick({ type: [types.allFiles], allowMultiSelection: false });
      const doc = picked[0];
      if (!doc) return;
      const stat = await ReactNativeBlobUtil.fs.stat(doc.uri.replace('file://', ''));
      if (stat.size > MAX_FILE_SIZE_BYTES) {
        toast.error('File troppo grande', `Massimo ${MAX_FILE_SIZE_MB}MB`);
        return;
      }
      setUploading(true);
      haptics.impact();
      const fd = new FormData();
      fd.append('file', { uri: doc.uri, type: doc.type ?? 'application/octet-stream', name: doc.name } as unknown as Blob);
      fd.append('tipo', selectedTipo);
      await api.cassetto.upload(fd);
      toast.success('File caricato con successo');
      setUploadOpen(false);
      setSelectedTipo(null);
      load(true);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) return;
      toast.error('Errore upload', err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(file: CassettoFile) {
    haptics.impact();
    try {
      const cookie = await api.documenti.sessionCookieHeader();
      const url = api.documenti.downloadUrl(file.key);
      const localPath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${file.nome}`;
      const res = await ReactNativeBlobUtil.config({ path: localPath, fileCache: true }).fetch('GET', url, { Cookie: cookie });
      toast.success('Download completato', `Salvato in: ${res.path()}`);
    } catch (err) {
      toast.error('Errore download', err instanceof Error ? err.message : 'Errore sconosciuto');
    }
  }

  function handleDelete(file: CassettoFile) {
    confirmDialog({
      title: 'Elimina documento',
      message: `Sei sicuro di voler eliminare "${file.nome}"? L'azione non può essere annullata.`,
      confirmText: 'Elimina',
      destructive: true,
      onConfirm: async () => {
        haptics.error();
        try {
          await api.cassetto.delete(file.key);
          setFiles((prev) => prev.filter((f) => f.key !== file.key));
          toast.success('File eliminato');
        } catch (err) {
          toast.error('Errore', err instanceof Error ? err.message : 'Errore eliminazione');
        }
      },
    });
  }

  async function handleRenameSubmit() {
    if (!renaming || !renameValue.trim()) return;
    haptics.tap();
    try {
      await api.cassetto.rename(renaming.key, renameValue.trim());
      setFiles((prev) => prev.map((f) => (f.key === renaming.key ? { ...f, nome: renameValue.trim() } : f)));
      toast.success('File rinominato');
      setRenaming(null);
      setRenameValue('');
    } catch (err) {
      toast.error('Errore', err instanceof Error ? err.message : 'Errore rinomina');
    }
  }

  function apriAnteprima(file: CassettoFile) {
    setPreviewFile({
      nome: file.nome,
      key: file.key,
      size: file.size,
      sizeStr: file.sizeStr,
      lastModified: file.lastModified,
      stato: 'visto',
      isPreferito: false,
    } as FileItem);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.listContentWrap}>
        {/* Hero "Caveau Documentale" (come la Vault Hero Card dell'app v4) */}
        <View style={styles.vaultHero}>
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="cassettoVault" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={NAVY_NOTTE} />
                <Stop offset="0.5" stopColor={NAVY_PRIMARIO} />
                <Stop offset="1" stopColor={NAVY_NOTTE} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#cassettoVault)" />
          </Svg>
          <View style={styles.vaultInner}>
            <View style={styles.vaultLeft}>
              <View style={styles.vaultLockBox}>
                <Ionicons name="lock-closed" size={24} color={ORO} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.vaultOverline}>CASSETTO RISERVATO</Text>
                <Text style={styles.vaultTitle}>Caveau Documentale</Text>
                <Text style={styles.vaultSubtitle}>
                  {files.length} document{files.length === 1 ? 'o' : 'i'} archiviat{files.length === 1 ? 'o' : 'i'} con cifratura
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => setUploadOpen(true)}
              style={({ pressed }) => [styles.vaultAdd, pressed && { opacity: 0.85 }]}
              accessibilityLabel="Carica documento"
            >
              <Ionicons name="add" size={17} color={NAVY_NOTTE} />
              <Text style={styles.vaultAddText}>Aggiungi</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {loading && !refreshing ? (
        <SkeletonList count={4} height={88} />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={files}
          keyExtractor={(item) => item.key}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.surface} />}
          renderItem={({ item: file }) => (
            <Card style={styles.fileCard} padded={false}>
              <Pressable onPress={() => apriAnteprima(file)} accessibilityLabel="Apri anteprima">
                {({ pressed }) => (
                  <View style={[styles.fileTop, pressed && { opacity: 0.8 }]}>
                    <FileIcon filename={file.nome} size={44} />
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>{file.nome}</Text>
                      <Text style={styles.fileMeta} numberOfLines={1}>
                        {file.sizeStr}{file.lastModified ? `  ·  ${formatDate(file.lastModified)}` : ''}
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>
              <View style={styles.divider} />
              <View style={styles.fileActionsRow}>
                {canPreviewFile(file.nome) ? (
                  <Pressable
                    onPress={() => apriAnteprima(file)}
                    style={({ pressed }) => [styles.previewPill, pressed && { opacity: 0.8 }]}
                    accessibilityLabel="Anteprima"
                  >
                    <Ionicons name="eye-outline" size={15} color={colors.primary} />
                    <Text style={styles.previewPillText}>Anteprima</Text>
                  </Pressable>
                ) : (
                  <View style={styles.previewPillSpacer} />
                )}
                <View style={styles.iconActions}>
                  <Pressable onPress={() => handleDownload(file)} style={styles.iconAction} accessibilityLabel="Scarica">
                    <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setRenaming(file);
                      setRenameValue(file.nome);
                    }}
                    style={styles.iconAction}
                    accessibilityLabel="Rinomina"
                  >
                    <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(file)} style={styles.iconAction} accessibilityLabel="Elimina">
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="folder-open-outline" size={36} color={colors.primary} />}
              title="Nessun documento trovato"
              subtitle="Tocca «Aggiungi» per caricare i tuoi documenti personali"
            />
          }
        />
      )}

      <Modal visible={uploadOpen} onClose={() => setUploadOpen(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Carica documento</Text>
          <Text style={styles.modalSubtitle}>Seleziona il tipo di documento:</Text>
          <View style={styles.tipiList}>
            {TIPI_FILE.map((tipo) => (
              <Pressable
                key={tipo.value}
                onPress={() => setSelectedTipo(tipo.value)}
                style={[styles.tipoRow, selectedTipo === tipo.value && styles.tipoRowActive]}
              >
                {/* Radio come nell'app v4 (AddCassettoDialog) */}
                <View style={[styles.radio, selectedTipo === tipo.value && styles.radioSelected]}>
                  {selectedTipo === tipo.value && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.tipoLabel, selectedTipo === tipo.value && styles.tipoLabelActive]}>{tipo.value}</Text>
              </Pressable>
            ))}
          </View>
          {selectedTipo && (
            <Button
              label={uploading ? '⏳ Caricamento...' : 'Scegli file'}
              onPress={handleUpload}
              loading={uploading}
              style={styles.uploadCtaBtn}
            />
          )}
        </View>
      </Modal>

      <Modal visible={!!renaming} onClose={() => setRenaming(null)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Rinomina documento</Text>
          <TextInput
            value={renameValue}
            onChangeText={setRenameValue}
            style={styles.renameInput}
            autoFocus
            onSubmitEditing={handleRenameSubmit}
          />
          <View style={styles.renameActions}>
            <Pressable onPress={() => setRenaming(null)} style={styles.renameCancelBtn}>
              <Text style={styles.renameCancelText}>Annulla</Text>
            </Pressable>
            <Button label="Salva" onPress={handleRenameSubmit} disabled={!renameValue.trim()} size="md" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    listContentWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
    // Hero Caveau (v4.11)
    vaultHero: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.4)', backgroundColor: NAVY_NOTTE, ...shadow.md },
    vaultInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, padding: 18 },
    vaultLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    vaultLockBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(212, 175, 55, 0.15)', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.5)', alignItems: 'center', justifyContent: 'center' },
    vaultOverline: { color: ORO_CHIARO, fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
    vaultTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 16, marginTop: 2 },
    vaultSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },
    vaultAdd: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ORO, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
    vaultAddText: { color: NAVY_NOTTE, fontWeight: '700', fontSize: 13 },
    list: { flex: 1 },
    listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: 14 },
    // Card documento (v4.11)
    fileCard: { borderRadius: 18 },
    fileTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    fileInfo: { flex: 1, gap: 2 },
    fileName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    fileMeta: { ...typography.caption, color: colors.textSecondary },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: 16 },
    fileActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
    previewPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
    previewPillSpacer: { width: 8 },
    previewPillText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
    iconActions: { flexDirection: 'row', alignItems: 'center' },
    iconAction: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    modalContent: { padding: spacing.xl, gap: spacing.md },
    modalTitle: { ...typography.h4, color: colors.textPrimary, fontWeight: '700' },
    modalSubtitle: { ...typography.bodySmall, color: colors.textSecondary },
    tipiList: { gap: spacing.xs },
    tipoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: 10 },
    tipoRowActive: { backgroundColor: colors.accentSoft },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
    radioSelected: { borderColor: colors.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    tipoLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
    tipoLabelActive: { color: colors.accentDark, fontWeight: '600' },
    uploadCtaBtn: { marginTop: spacing.sm },
    renameInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.body, color: colors.textPrimary, backgroundColor: colors.surfaceAlt },
    renameActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.md },
    renameCancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    renameCancelText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '500' },
  });

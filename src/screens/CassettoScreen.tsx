/**
 * Schermata Cassetto Personale.
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
import { spacing, typography, useColors, type ThemeColors } from '@/theme';

const TIPI_FILE = [
  { value: 'QR Code P.IVA', color: '#059669' },
  { value: 'Certificato P.IVA', color: '#0284c7' },
  { value: 'Visura Camerale', color: '#7c3aed' },
  { value: 'Doc. Identita', color: '#dc2626' },
  { value: 'IBAN', color: '#d97706' },
] as const;

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

  function getAccentColor(nome: string): string {
    const tipo = TIPI_FILE.find((t) => nome.includes(t.value));
    return tipo?.color ?? colors.textTertiary;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroIcon}>💼</Text>
            <View>
              <Text style={styles.heroTitle}>Cassetto Personale</Text>
              <Text style={styles.heroSubtitle}>
                {files.length} document{files.length === 1 ? 'o' : 'i'} salvat{files.length === 1 ? 'o' : 'i'}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => setUploadOpen(true)}
            style={({ pressed }) => [styles.heroAdd, pressed && { opacity: 0.8 }]}
            accessibilityLabel="Carica documento"
          >
            <Text style={styles.heroAddText}>+</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={() => load(true)}
        style={({ pressed }) => [styles.refreshBtn, pressed && styles.btnPressed]}
      >
        <Text style={[styles.refreshIcon, refreshing && { opacity: 0.5 }]}>↻</Text>
        <Text style={styles.refreshText}>Aggiorna</Text>
      </Pressable>

      {loading && !refreshing ? (
        <SkeletonList count={4} height={72} />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={files}
          keyExtractor={(item) => item.key}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          renderItem={({ item: file }) => {
            const accent = getAccentColor(file.nome);
            return (
              <View style={styles.fileCardWrap}>
                <View style={[styles.accentBar, { backgroundColor: accent }]} />
                <Card style={styles.fileCard} padded={false}>
                  <View style={styles.fileCardContent}>
                    <FileIcon filename={file.nome} />
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>{file.nome}</Text>
                      <Text style={styles.fileMeta} numberOfLines={1}>
                        {file.sizeStr}{file.lastModified ? ` · ${formatDate(file.lastModified)}` : ''}
                      </Text>
                    </View>
                    <View style={styles.fileActions}>
                      {canPreviewFile(file.nome) && (
                        <Pressable
                          onPress={() =>
                            setPreviewFile({
                              nome: file.nome,
                              key: file.key,
                              size: file.size,
                              sizeStr: file.sizeStr,
                              lastModified: file.lastModified,
                              stato: 'visto',
                              isPreferito: false,
                            } as FileItem)
                          }
                          style={styles.actionBtn}
                          accessibilityLabel="Anteprima"
                        >
                          <Text style={styles.actionIcon}>👁</Text>
                        </Pressable>
                      )}
                      <Pressable onPress={() => handleDownload(file)} style={styles.actionBtn} accessibilityLabel="Scarica">
                        <Text style={styles.actionIcon}>⬇</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setRenaming(file);
                          setRenameValue(file.nome);
                        }}
                        style={styles.actionBtn}
                        accessibilityLabel="Rinomina"
                      >
                        <Text style={styles.actionIcon}>✎</Text>
                      </Pressable>
                      <Pressable onPress={() => handleDelete(file)} style={styles.actionBtn} accessibilityLabel="Elimina">
                        <Text style={[styles.actionIcon, { color: colors.danger }]}>🗑</Text>
                      </Pressable>
                    </View>
                  </View>
                </Card>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<Text style={styles.emptyIcon}>💼</Text>}
              title="Cassetto vuoto"
              subtitle="Tocca + per caricare un documento"
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
                <View style={[styles.tipoColorBar, { backgroundColor: tipo.color }]} />
                <Text style={[styles.tipoLabel, selectedTipo === tipo.value && styles.tipoLabelActive]}>{tipo.value}</Text>
                {selectedTipo === tipo.value && <Text style={styles.tipoCheck}>✓</Text>}
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
    hero: { margin: spacing.lg, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.accent },
    heroContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
    heroLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
    heroIcon: { fontSize: 24 },
    heroTitle: { ...typography.h4, color: colors.textInverse, fontWeight: '700' },
    heroSubtitle: { ...typography.caption, color: 'rgba(255,255,255,0.8)' },
    heroAdd: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    heroAddText: { fontSize: 28, color: colors.textInverse, fontWeight: '300' },
    refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, height: 32 },
    refreshIcon: { fontSize: 14, color: colors.textSecondary },
    refreshText: { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },
    btnPressed: { opacity: 0.5 },
    list: { flex: 1 },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
    fileCardWrap: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface },
    accentBar: { width: 6 },
    fileCard: { flex: 1, borderRadius: 0, borderWidth: 0, shadowOpacity: 0.03 },
    fileCardContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
    fileInfo: { flex: 1, gap: 2 },
    fileName: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
    fileMeta: { ...typography.caption, color: colors.textSecondary },
    fileActions: { flexDirection: 'row', alignItems: 'center' },
    actionBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    actionIcon: { fontSize: 16 },
    emptyIcon: { fontSize: 48 },
    modalContent: { padding: spacing.xl, gap: spacing.md },
    modalTitle: { ...typography.h4, color: colors.textPrimary, fontWeight: '700' },
    modalSubtitle: { ...typography.bodySmall, color: colors.textSecondary },
    tipiList: { gap: spacing.sm },
    tipoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, gap: spacing.md },
    tipoRowActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    tipoColorBar: { width: 4, height: 32, borderRadius: 2 },
    tipoLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
    tipoLabelActive: { color: colors.accentDark, fontWeight: '600' },
    tipoCheck: { color: colors.accent, fontSize: 18, fontWeight: '700' },
    uploadCtaBtn: { marginTop: spacing.sm },
    renameInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.body, color: colors.textPrimary, backgroundColor: colors.surfaceAlt },
    renameActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.md },
    renameCancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    renameCancelText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '500' },
  });

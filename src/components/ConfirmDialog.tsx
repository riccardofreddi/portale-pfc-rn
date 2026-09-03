/**
 * ConfirmDialog — alert con Annulla/Conferma.
 * Usa Alert.alert nativo di RN.
 */
import { Alert } from 'react-native';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function confirmDialog(opts: ConfirmOptions): void {
  Alert.alert(
    opts.title,
    opts.message,
    [
      {
        text: opts.cancelText ?? 'Annulla',
        style: 'cancel',
        onPress: opts.onCancel,
      },
      {
        text: opts.confirmText ?? 'Conferma',
        style: opts.destructive ? 'destructive' : 'default',
        onPress: opts.onConfirm,
      },
    ],
    { cancelable: true },
  );
}

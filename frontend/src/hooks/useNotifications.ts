/**
 * Hook personnalisé pour afficher des notifications Material-UI.
 * 
 * Fournit des méthodes pratiques pour afficher différents types de notifications
 * (succès, erreur, avertissement, info) avec notistack.
 */

import { useSnackbar } from "notistack";

export function useNotifications() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const showSuccess = (message: string, options?: { duration?: number; action?: React.ReactNode }) => {
    enqueueSnackbar(message, {
      variant: "success",
      autoHideDuration: options?.duration ?? 4000,
      action: options?.action,
    });
  };

  const showError = (message: string, options?: { duration?: number; action?: React.ReactNode }) => {
    enqueueSnackbar(message, {
      variant: "error",
      autoHideDuration: options?.duration ?? 6000,
      action: options?.action,
    });
  };

  const showWarning = (message: string, options?: { duration?: number; action?: React.ReactNode }) => {
    enqueueSnackbar(message, {
      variant: "warning",
      autoHideDuration: options?.duration ?? 5000,
      action: options?.action,
    });
  };

  const showInfo = (message: string, options?: { duration?: number; action?: React.ReactNode }) => {
    enqueueSnackbar(message, {
      variant: "info",
      autoHideDuration: options?.duration ?? 4000,
      action: options?.action,
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    closeSnackbar,
  };
}









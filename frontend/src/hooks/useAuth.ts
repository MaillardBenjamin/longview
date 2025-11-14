/**
 * Hook personnalisé pour accéder au contexte d'authentification.
 * 
 * Fournit une interface simplifiée pour accéder aux fonctionnalités
 * d'authentification (user, login, register, logout) depuis n'importe
 * quel composant.
 * 
 * @returns Contexte d'authentification avec user, token, isLoading, login, register, logout
 */
import { useAuthContext } from "@/providers/AuthProvider";

export function useAuth() {
  return useAuthContext();
}



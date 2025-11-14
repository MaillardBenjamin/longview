/**
 * Provider d'authentification pour l'application.
 * 
 * Gère l'état d'authentification global (utilisateur, token) et fournit
 * les fonctions de connexion, inscription et déconnexion. Le token est
 * persisté dans localStorage pour maintenir la session entre les rechargements.
 */

import { loginUser, registerUser, fetchCurrentUser } from "@/services/auth";
import type { AuthToken, User } from "@/types/user";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Provider d'authentification qui enveloppe l'application.
 * 
 * @param children - Composants enfants à envelopper
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Récupère le token depuis localStorage au chargement
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("lv_token"));
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(token));

  // Récupère l'utilisateur actuel si un token existe
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetchCurrentUser()
      .then(setUser)
      .catch(() => {
        // Si le token est invalide, on le supprime
        localStorage.removeItem("lv_token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  /**
   * Persiste le token d'authentification dans localStorage.
   */
  const persistToken = useCallback((auth: AuthToken) => {
    localStorage.setItem("lv_token", auth.accessToken);
    setToken(auth.accessToken);
  }, []);

  /**
   * Connecte un utilisateur avec email et mot de passe.
   */
  const login = useCallback(
    async (email: string, password: string) => {
      const authResponse = await loginUser({ email, password });
      persistToken(authResponse);
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    },
    [persistToken],
  );

  /**
   * Enregistre un nouvel utilisateur puis le connecte automatiquement.
   */
  const register = useCallback(
    async (email: string, password: string, fullName?: string) => {
      await registerUser({ email, password, fullName });
      await login(email, password);
    },
    [login],
  );

  /**
   * Déconnecte l'utilisateur et supprime le token.
   */
  const logout = useCallback(() => {
    localStorage.removeItem("lv_token");
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, token, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook pour accéder au contexte d'authentification.
 * 
 * @returns Contexte d'authentification
 * @throws Error si utilisé en dehors d'un AuthProvider
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}


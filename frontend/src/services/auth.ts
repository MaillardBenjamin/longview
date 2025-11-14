/**
 * Services d'authentification.
 * 
 * Gère l'inscription, la connexion et la récupération des informations
 * de l'utilisateur actuel.
 */

import apiClient from "@/lib/api-client";
import type { AuthToken, User } from "@/types/user";

export interface RegisterPayload {
  email: string;
  password: string;
  fullName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Enregistre un nouvel utilisateur.
 * 
 * @param payload - Données d'inscription (email, password, fullName optionnel)
 * @returns Utilisateur créé
 */
export async function registerUser(payload: RegisterPayload): Promise<User> {
  const response = await apiClient.post<User>("/auth/register", {
    email: payload.email,
    password: payload.password,
    full_name: payload.fullName,
  });
  return response.data;
}

/**
 * Authentifie un utilisateur et récupère un token JWT.
 * 
 * @param payload - Identifiants de connexion (email, password)
 * @returns Token d'authentification
 */
export async function loginUser(payload: LoginPayload): Promise<AuthToken> {
  const formData = new FormData();
  formData.append("username", payload.email);
  formData.append("password", payload.password);

  const response = await apiClient.post<AuthToken>("/auth/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data;
}

/**
 * Récupère les informations de l'utilisateur actuellement authentifié.
 * 
 * @returns Utilisateur authentifié
 */
export async function fetchCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>("/auth/me");
  return response.data;
}


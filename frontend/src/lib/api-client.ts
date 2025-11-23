/**
 * Client HTTP pour les appels API.
 * 
 * Configure Axios avec l'URL de base de l'API et ajoute automatiquement
 * le token d'authentification dans les en-têtes des requêtes.
 * Convertit également les réponses de snake_case en camelCase.
 */

import axios from "axios";

/**
 * Convertit un objet de snake_case en camelCase de manière récursive.
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertKeysToCamelCase(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase);
  }

  if (typeof obj === "object") {
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key);
      converted[camelKey] = convertKeysToCamelCase(value);
    }
    return converted;
  }

  return obj;
}

// Client Axios configuré avec l'URL de base de l'API
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1",
  withCredentials: false,
});

// Intercepteur pour ajouter automatiquement le token d'authentification
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("lv_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour convertir les réponses de snake_case en camelCase
apiClient.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = convertKeysToCamelCase(response.data);
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;



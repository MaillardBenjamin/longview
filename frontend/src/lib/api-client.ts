/**
 * Client HTTP pour les appels API.
 * 
 * Configure Axios avec l'URL de base de l'API et ajoute automatiquement
 * le token d'authentification dans les en-têtes des requêtes.
 */

import axios from "axios";

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

export default apiClient;



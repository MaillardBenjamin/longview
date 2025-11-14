/**
 * Point d'entrée principal de l'application React.
 * 
 * Configure les providers globaux (React Query, Authentification, Router)
 * et monte l'application dans le DOM.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import { AuthProvider } from "@/providers/AuthProvider";
import "./index.css";

// Client React Query pour la gestion du cache et des requêtes asynchrones
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

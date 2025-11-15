/**
 * Point d'entrée principal de l'application React.
 * 
 * Configure les providers globaux (React Query, Authentification, Router, Material-UI)
 * et monte l'application dans le DOM.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import App from "./App";
import { AuthProvider } from "@/providers/AuthProvider";
import { theme } from "@/theme";
import "./index.css";

// Client React Query pour la gestion du cache et des requêtes asynchrones
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);

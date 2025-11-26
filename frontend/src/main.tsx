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
import { HelmetProvider } from "react-helmet-async";
import CssBaseline from "@mui/material/CssBaseline";
import { SnackbarProvider } from "notistack";

import App from "./App";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeModeProvider } from "@/providers/ThemeModeProvider";
import "./index.css";

// Client React Query pour la gestion du cache et des requêtes asynchrones
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeModeProvider>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          autoHideDuration={4000}
        >
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </AuthProvider>
          </QueryClientProvider>
        </SnackbarProvider>
      </ThemeModeProvider>
    </HelmetProvider>
  </StrictMode>,
);

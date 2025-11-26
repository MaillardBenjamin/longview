/**
 * Hook pour gérer le mode sombre/clair de l'application.
 * 
 * Permet de basculer entre le mode clair et sombre et sauvegarde
 * la préférence dans localStorage.
 */

import { useState, useEffect, useMemo } from "react";
import { createTheme } from "@mui/material/styles";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "lv_theme_mode";

/**
 * Crée un thème Material-UI selon le mode (clair ou sombre).
 */
function createAppTheme(mode: ThemeMode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#0ea5e9",
        light: "#38bdf8",
        dark: "#0284c7",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#64748b",
        light: "#94a3b8",
        dark: "#475569",
      },
      background: {
        default: mode === "dark" ? "#0f172a" : "#f8fafc",
        paper: mode === "dark" ? "#1e293b" : "#ffffff",
      },
      text: {
        primary: mode === "dark" ? "#f8fafc" : "#0f172a",
        secondary: mode === "dark" ? "#94a3b8" : "#64748b",
      },
    },
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      h4: {
        fontWeight: 700,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            padding: "10px 24px",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow:
              mode === "dark"
                ? "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)"
                : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow:
              mode === "dark"
                ? "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)"
                : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          },
        },
      },
    },
  });
}

/**
 * Hook pour gérer le mode de thème (clair/sombre).
 * 
 * @returns Objet avec le thème actuel, le mode, et la fonction pour basculer
 */
export function useThemeMode() {
  // Récupérer le mode depuis localStorage ou utiliser le mode système
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    
    // Vérifier localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") {
      return saved;
    }
    
    // Utiliser la préférence système
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    
    return "light";
  });

  // Créer le thème selon le mode
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  // Sauvegarder dans localStorage quand le mode change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // Écouter les changements de préférence système
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      // Ne changer que si l'utilisateur n'a pas de préférence sauvegardée
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setMode(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleMode = () => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  return {
    theme,
    mode,
    toggleMode,
    setMode,
  };
}


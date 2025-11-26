/**
 * Provider pour gérer le mode de thème (clair/sombre) de l'application.
 * 
 * Enveloppe l'application avec le ThemeProvider Material-UI et fournit
 * le contexte pour basculer entre les modes.
 */

import { createContext, useContext, ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { useThemeMode } from "@/hooks/useThemeMode";
import type { ThemeMode } from "@/hooks/useThemeMode";

interface ThemeModeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

/**
 * Hook pour accéder au contexte du mode de thème.
 */
export function useThemeModeContext() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeModeContext must be used within ThemeModeProvider");
  }
  return context;
}

interface ThemeModeProviderProps {
  children: ReactNode;
}

/**
 * Provider qui enveloppe l'application avec le ThemeProvider Material-UI.
 */
export function ThemeModeProvider({ children }: ThemeModeProviderProps) {
  const { theme, mode, toggleMode, setMode } = useThemeMode();

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode, setMode }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  );
}


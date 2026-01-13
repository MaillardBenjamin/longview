/**
 * Composant de protection de route.
 * 
 * Redirige vers la page de connexion si l'utilisateur n'est pas authentifié.
 * Si l'authentification est désactivée, autorise l'accès à tous.
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { CircularProgress, Container } from "@mui/material";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const enableAuth = import.meta.env.VITE_ENABLE_AUTH === "true";

  // Si l'authentification est désactivée, autoriser l'accès à tous
  if (!enableAuth) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}












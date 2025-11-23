/**
 * Page de profil utilisateur.
 * 
 * Permet à l'utilisateur de modifier ses informations personnelles :
 * nom, email et mot de passe.
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Typography,
  TextField,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { fetchCurrentUser, updateUser } from "@/services/auth";
import { useAuth } from "@/hooks/useAuth";

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout, user: authUser } = useAuth();
  
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Récupérer les informations de l'utilisateur (pour avoir les données à jour)
  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: fetchCurrentUser,
  });

  // Utiliser l'utilisateur de la query ou celui du contexte d'authentification
  const currentUser = user || authUser;

  // Initialiser les champs avec les données de l'utilisateur
  useEffect(() => {
    if (currentUser) {
      setEmail(currentUser.email || "");
      setFullName(currentUser.fullName || "");
    }
  }, [currentUser]);

  // Mutation pour mettre à jour l'utilisateur
  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (updatedUser) => {
      setSuccess("Vos informations ont été mises à jour avec succès.");
      setError(null);
      setPassword("");
      setConfirmPassword("");
      
      // Invalider le cache pour recharger les données utilisateur
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      
      // Si l'email a changé, déconnecter l'utilisateur pour qu'il se reconnecte
      if (updatedUser.email !== currentUser?.email) {
        setTimeout(() => {
          logout();
          navigate("/login");
        }, 2000);
      }
    },
    onError: (err: any) => {
      const errorMessage =
        err?.response?.data?.detail ||
        (err instanceof Error ? err.message : "Une erreur est survenue lors de la mise à jour");
      setError(errorMessage);
      setSuccess(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (password && password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password && password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    // Préparer les données de mise à jour
    const updateData: {
      email?: string;
      fullName?: string;
      password?: string;
    } = {};

    if (email !== currentUser?.email) {
      updateData.email = email;
    }
    if (fullName !== (currentUser?.fullName || "")) {
      updateData.fullName = fullName;
    }
    if (password) {
      updateData.password = password;
    }

    // Si aucune modification, ne rien faire
    if (Object.keys(updateData).length === 0) {
      setError("Aucune modification détectée.");
      return;
    }

    updateMutation.mutate(updateData);
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
      >
        Retour
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        Mon profil
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Modifiez vos informations personnelles
      </Typography>

      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Adresse email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              margin="normal"
              autoComplete="email"
            />

            <TextField
              fullWidth
              label="Nom complet"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              margin="normal"
              autoComplete="name"
            />

            <Divider sx={{ my: 3 }}>Changer le mot de passe (optionnel)</Divider>

            <TextField
              fullWidth
              label="Nouveau mot de passe"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      aria-label="Afficher le mot de passe"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText="Laissez vide si vous ne souhaitez pas changer le mot de passe"
            />

            <TextField
              fullWidth
              label="Confirmer le nouveau mot de passe"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      aria-label="Afficher le mot de passe"
                    >
                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 4 }}>
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Annuler
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}


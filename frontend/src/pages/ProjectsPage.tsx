/**
 * Page de gestion des projets.
 * 
 * Permet aux utilisateurs de voir leurs projets, créer de nouveaux projets,
 * et accéder aux simulations de chaque projet.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { fetchProjects, createProject, deleteProject, updateProject } from "@/services/projects";
import type { ProjectCreate, ProjectUpdate } from "@/types/project";

export function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<{ id: number; name: string; description?: string } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Récupérer les projets
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  // Mutation pour créer un projet
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setCreateDialogOpen(false);
      setNewProjectName("");
      setNewProjectDescription("");
      setError(null);
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la création du projet"
      );
    },
  });

  // Mutation pour supprimer un projet
  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    },
  });

  // Mutation pour mettre à jour un projet
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProjectUpdate }) => updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditDialogOpen(false);
      setEditingProject(null);
      setError(null);
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la mise à jour du projet"
      );
    },
  });

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      setError("Le nom du projet est requis");
      return;
    }
    const projectData: ProjectCreate = {
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined,
    };
    createMutation.mutate(projectData);
  };

  const handleEditProject = (project: { id: number; name: string; description?: string | null }) => {
    setEditingProject({
      id: project.id,
      name: project.name,
      description: project.description || undefined,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateProject = () => {
    if (!editingProject || !editingProject.name.trim()) {
      setError("Le nom du projet est requis");
      return;
    }
    const updateData: ProjectUpdate = {
      name: editingProject.name.trim(),
      description: editingProject.description?.trim() || undefined,
    };
    updateMutation.mutate({ id: editingProject.id, data: updateData });
  };

  const handleDeleteProject = (projectId: number) => {
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (projectToDelete) {
      deleteMutation.mutate(projectToDelete);
    }
  };

  const handleViewProject = (projectId: number) => {
    navigate(`/projects/${projectId}`);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h4" component="h1">
          Mes projets
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Nouveau projet
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {projects && projects.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
              Vous n'avez pas encore de projet. Créez votre premier projet pour organiser vos simulations.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {projects?.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {project.name}
                  </Typography>
                  {project.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {project.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Créé le {new Date(project.createdAt).toLocaleDateString("fr-FR")}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => handleViewProject(project.id)}>
                    Voir
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => handleEditProject(project)}
                    aria-label="Modifier"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteProject(project.id)}
                    aria-label="Supprimer"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog de création */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau projet</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom du projet"
            fullWidth
            required
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optionnel)"
            fullWidth
            multiline
            rows={3}
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleCreateProject} variant="contained" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Création..." : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog d'édition */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier le projet</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom du projet"
            fullWidth
            required
            value={editingProject?.name || ""}
            onChange={(e) =>
              setEditingProject(
                editingProject
                  ? { ...editingProject, name: e.target.value }
                  : null
              )
            }
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optionnel)"
            fullWidth
            multiline
            rows={3}
            value={editingProject?.description || ""}
            onChange={(e) =>
              setEditingProject(
                editingProject
                  ? { ...editingProject, description: e.target.value }
                  : null
              )
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleUpdateProject} variant="contained" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Mise à jour..." : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer ce projet ? Toutes les simulations associées seront également supprimées. Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}



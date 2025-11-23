/**
 * Services pour la gestion des projets de simulation.
 * 
 * Gère les opérations CRUD sur les projets qui regroupent les simulations.
 */

import apiClient from "@/lib/api-client";
import type { Project, ProjectCreate, ProjectUpdate, ProjectWithSimulations } from "@/types/project";

/**
 * Liste tous les projets de l'utilisateur authentifié.
 * 
 * @returns Liste des projets de l'utilisateur
 */
export async function fetchProjects(): Promise<Project[]> {
  const response = await apiClient.get<Project[]>("/projects");
  return response.data;
}

/**
 * Récupère un projet spécifique avec ses simulations associées.
 * 
 * @param projectId - Identifiant du projet
 * @returns Projet avec ses simulations
 */
export async function fetchProject(projectId: number): Promise<ProjectWithSimulations> {
  const response = await apiClient.get<ProjectWithSimulations>(`/projects/${projectId}`);
  return response.data;
}

/**
 * Crée un nouveau projet.
 * 
 * @param payload - Données du nouveau projet
 * @returns Projet créé
 */
export async function createProject(payload: ProjectCreate): Promise<Project> {
  const response = await apiClient.post<Project>("/projects", payload);
  return response.data;
}

/**
 * Met à jour un projet existant.
 * 
 * @param projectId - Identifiant du projet
 * @param payload - Données de mise à jour
 * @returns Projet mis à jour
 */
export async function updateProject(projectId: number, payload: ProjectUpdate): Promise<Project> {
  const response = await apiClient.put<Project>(`/projects/${projectId}`, payload);
  return response.data;
}

/**
 * Supprime un projet.
 * 
 * @param projectId - Identifiant du projet
 */
export async function deleteProject(projectId: number): Promise<void> {
  await apiClient.delete(`/projects/${projectId}`);
}



import type { Simulation } from "./simulation";

export interface Project {
  id: number;
  userId: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithSimulations extends Project {
  simulations: Simulation[];
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  isActive?: boolean;
}



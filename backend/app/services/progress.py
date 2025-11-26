"""
Module de gestion de la progression des calculs.

Permet de suivre et de transmettre la progression des simulations en temps réel
via Server-Sent Events (SSE).
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Dict, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)

# Stockage global de la progression par task_id
_progress_store: Dict[str, "ProgressState"] = {}


@dataclass
class ProgressState:
    """
    État de progression d'une tâche.
    
    Attributes:
        task_id: Identifiant unique de la tâche
        current_step: Étape actuelle (ex: "capitalisation", "retraite", "optimisation")
        step_description: Description détaillée de l'étape
        progress_percent: Pourcentage de progression (0-100)
        total_steps: Nombre total d'étapes
        current_step_index: Index de l'étape actuelle (0-based)
        message: Message optionnel de progression
        started_at: Timestamp de début
        updated_at: Timestamp de dernière mise à jour
        is_complete: Indique si la tâche est terminée
        error: Message d'erreur si la tâche a échoué
    """
    task_id: str
    current_step: str = "initialisation"
    step_description: str = ""
    progress_percent: float = 0.0
    total_steps: int = 1
    current_step_index: int = 0
    message: str = ""
    started_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    is_complete: bool = False
    error: Optional[str] = None


def create_progress_task(
    total_steps: int = 1, 
    initial_step: str = "initialisation",
    task_id: str | None = None,
) -> str:
    """
    Crée une nouvelle tâche de progression.
    
    Args:
        total_steps: Nombre total d'étapes
        initial_step: Nom de l'étape initiale
        task_id: Identifiant optionnel de la tâche (si None, un nouvel ID est généré)
        
    Returns:
        task_id: Identifiant unique de la tâche
    """
    if task_id is None:
        task_id = str(uuid4())
    
    _progress_store[task_id] = ProgressState(
        task_id=task_id,
        current_step=initial_step,
        total_steps=total_steps,
    )
    logger.info(f"Tâche de progression créée: {task_id} ({total_steps} étapes)")
    return task_id


def update_progress(
    task_id: str,
    progress_percent: Optional[float] = None,
    current_step: Optional[str] = None,
    step_description: Optional[str] = None,
    message: Optional[str] = None,
    step_index: Optional[int] = None,
) -> None:
    """
    Met à jour la progression d'une tâche.
    
    Args:
        task_id: Identifiant de la tâche
        progress_percent: Pourcentage de progression (0-100)
        current_step: Nom de l'étape actuelle
        step_description: Description de l'étape
        message: Message optionnel
        step_index: Index de l'étape (0-based)
    """
    if task_id not in _progress_store:
        logger.warning(f"Tâche de progression introuvable: {task_id}")
        return
    
    state = _progress_store[task_id]
    
    if current_step is not None:
        state.current_step = current_step
    if step_description is not None:
        state.step_description = step_description
    if message is not None:
        state.message = message
    if step_index is not None:
        state.current_step_index = step_index
        # Calculer automatiquement le pourcentage si total_steps est défini
        # MAIS seulement si progress_percent n'a pas été fourni explicitement
        if state.total_steps > 0 and progress_percent is None:
            state.progress_percent = (step_index / state.total_steps) * 100
    if progress_percent is not None:
        # progress_percent explicite a la priorité
        state.progress_percent = max(0.0, min(100.0, progress_percent))
    
    state.updated_at = time.time()
    
    logger.info(
        f"[PROGRESSION] [{task_id}] {state.current_step} "
        f"({state.progress_percent:.1f}%) - {state.message}"
    )
    print(f"[PROGRESSION] [{task_id}] {state.current_step} ({state.progress_percent:.1f}%) - {state.message}")


def complete_progress(task_id: str, message: Optional[str] = None) -> None:
    """
    Marque une tâche comme terminée.
    
    Args:
        task_id: Identifiant de la tâche
        message: Message de fin optionnel
    """
    if task_id not in _progress_store:
        logger.warning(f"Tâche de progression introuvable: {task_id}")
        return
    
    state = _progress_store[task_id]
    state.is_complete = True
    state.progress_percent = 100.0
    state.updated_at = time.time()
    if message:
        state.message = message
    
    logger.info(f"Tâche terminée: {task_id}")


def fail_progress(task_id: str, error: str) -> None:
    """
    Marque une tâche comme échouée.
    
    Args:
        task_id: Identifiant de la tâche
        error: Message d'erreur
    """
    if task_id not in _progress_store:
        logger.warning(f"Tâche de progression introuvable: {task_id}")
        return
    
    state = _progress_store[task_id]
    state.is_complete = True
    state.error = error
    state.updated_at = time.time()
    
    logger.error(f"Tâche échouée: {task_id} - {error}")


def get_progress(task_id: str) -> Optional[ProgressState]:
    """
    Récupère l'état de progression d'une tâche.
    
    Args:
        task_id: Identifiant de la tâche
        
    Returns:
        État de progression ou None si la tâche n'existe pas
    """
    return _progress_store.get(task_id)


def delete_progress(task_id: str) -> None:
    """
    Supprime une tâche de progression (nettoyage).
    
    Args:
        task_id: Identifiant de la tâche
    """
    if task_id in _progress_store:
        del _progress_store[task_id]
        logger.debug(f"Tâche de progression supprimée: {task_id}")


def cleanup_old_progress(max_age_seconds: int = 3600) -> None:
    """
    Nettoie les tâches de progression anciennes.
    
    Args:
        max_age_seconds: Âge maximum en secondes avant suppression
    """
    current_time = time.time()
    to_delete = []
    
    for task_id, state in _progress_store.items():
        if state.is_complete and (current_time - state.updated_at) > max_age_seconds:
            to_delete.append(task_id)
    
    for task_id in to_delete:
        delete_progress(task_id)
    
    if to_delete:
        logger.info(f"Nettoyage de {len(to_delete)} tâches de progression anciennes")


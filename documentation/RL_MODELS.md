# Utilisation des Modèles RL Pré-entraînés

## Vue d'ensemble

Le système RL sauvegarde automatiquement les modèles après chaque entraînement et permet de les réutiliser pour des simulations similaires, ce qui réduit considérablement le temps de calcul.

## Fonctionnement

### 1. Sauvegarde automatique

Quand vous lancez une optimisation RL :
- Le modèle est automatiquement sauvegardé après l'entraînement
- Emplacement : `backend/app/models/rl/`
- Format : fichiers `.zip` (format stable-baselines3)
- Nom : `rl_model_{hash}_{episodes}ep.zip`

Le hash est généré à partir des paramètres de simulation (âge, revenus, objectifs, etc.) pour identifier les modèles compatibles.

### 2. Utilisation depuis le Frontend

Dans le formulaire de simulation, vous avez deux options :

#### Option A : Nouvel entraînement (recommandé la première fois)
1. Cochez "Optimisation intelligente par IA (expérimental)"
2. Laissez "Utiliser un modèle pré-entraîné" décoché
3. Choisissez le nombre d'épisodes (1000 par défaut)
4. Le modèle sera entraîné et sauvegardé automatiquement

**Temps estimé** : 2-5 minutes pour 1000 épisodes (selon votre configuration)

#### Option B : Modèle pré-entraîné (rapide)
1. Cochez "Optimisation intelligente par IA (expérimental)"
2. Cochez "Utiliser un modèle pré-entraîné"
3. Le système cherchera automatiquement un modèle compatible

**Temps estimé** : 10-30 secondes

> ⚠️ **Note** : Si aucun modèle compatible n'est trouvé, un nouvel entraînement sera nécessaire.

### 3. Compatibilité des modèles

Un modèle est considéré comme compatible si :
- Les paramètres de simulation sont similaires (même hash)
- Le nombre d'épisodes est suffisant (minimum 500)

Le système recherche automatiquement le meilleur modèle disponible.

## Répertoire des modèles

Par défaut, les modèles sont stockés dans :
```
backend/app/models/rl/
```

Vous pouvez changer ce répertoire via la variable d'environnement :
```bash
export RL_MODELS_DIR=/chemin/vers/vos/modeles
```

## Exemple de fichier de modèle

```
rl_model_a1b2c3d4e5f6g7h8_1000ep.zip
```

- `a1b2c3d4e5f6g7h8` : Hash des paramètres
- `1000ep` : Nombre d'épisodes d'entraînement

## Gestion des modèles

### Lister les modèles disponibles

```python
from app.services.monte_carlo.rl.model_storage import get_model_directory
from pathlib import Path

models_dir = get_model_directory()
for model_file in models_dir.glob("rl_model_*.zip"):
    print(model_file.name)
```

### Nettoyer les anciens modèles

Les modèles peuvent être nettoyés automatiquement (modèles de plus de 30 jours) :

```python
from app.services.monte_carlo.rl.model_storage import cleanup_old_models

deleted_count = cleanup_old_models(max_age_days=30)
print(f"{deleted_count} modèles supprimés")
```

## Recommandations

1. **Première utilisation** : Entraînez un nouveau modèle (option A)
2. **Utilisations suivantes** : Utilisez le modèle pré-entraîné si les paramètres sont similaires (option B)
3. **Nouveau profil** : Si vos paramètres changent significativement, ré-entraînez un nouveau modèle

## Limitations actuelles

- Les modèles sont spécifiques à un profil de simulation (hash basé sur les paramètres)
- Un modèle pré-entraîné ne peut être utilisé que si les paramètres correspondent
- Les modèles ne sont pas partagés entre utilisateurs (stockage local)

## Améliorations futures possibles

- Partage de modèles entre utilisateurs
- Fine-tuning de modèles existants
- Interface de gestion des modèles dans le frontend
- Modèles génériques pré-entraînés sur différents profils






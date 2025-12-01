# Documentation de l'API LongView

## Vue d'ensemble

L'API LongView est une API REST construite avec FastAPI qui permet de gérer les simulations financières de retraite. Elle utilise l'authentification JWT et retourne des données au format JSON.

**Base URL** : `http://localhost:8000/api/v1`

## Authentification

Toutes les routes (sauf `/auth/register` et `/auth/login`) nécessitent une authentification via un token JWT.

### Obtenir un token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Réponse** :
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Utiliser le token

Ajoutez le header suivant à toutes les requêtes authentifiées :
```
Authorization: Bearer <access_token>
```

## Endpoints de simulation

### 1. Créer une simulation

```http
POST /api/v1/simulations/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Ma simulation",
  "current_age": 35,
  "retirement_age": 65,
  "life_expectancy": 85,
  "target_monthly_income": 3000,
  "state_pension_monthly_income": 1000,
  "project_id": 1,
  "inputs_snapshot": { ... }
}
```

**Réponse** : Simulation créée avec son ID

### 2. Lister les simulations

```http
GET /api/v1/simulations/
Authorization: Bearer <token>
```

**Réponse** : Liste des simulations de l'utilisateur

### 3. Récupérer une simulation

```http
GET /api/v1/simulations/{simulation_id}
Authorization: Bearer <token>
```

### 4. Mettre à jour une simulation

```http
PUT /api/v1/simulations/{simulation_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Simulation mise à jour",
  "target_monthly_income": 3500,
  "inputs_snapshot": { ... }
}
```

### 5. Supprimer une simulation

```http
DELETE /api/v1/simulations/{simulation_id}
Authorization: Bearer <token>
```

## Endpoints de calcul

### 1. Prévisualisation de capitalisation

Calcule une projection déterministe (sans aléa) de la phase de capitalisation.

```http
POST /api/v1/simulations/capitalization-preview
Content-Type: application/json

{
  "adults": [...],
  "savings_phases": [...],
  "investment_accounts": [...],
  "market_assumptions": { ... }
}
```

**Réponse** :
```json
{
  "start_capital": 50000,
  "end_capital": 500000,
  "total_contributions": 200000,
  "total_gains": 250000,
  "monthly_series": [...]
}
```

### 2. Simulation Monte Carlo de capitalisation

Calcule une simulation probabiliste avec tirages aléatoires.

```http
POST /api/v1/simulations/monte-carlo
Content-Type: application/json

{
  "adults": [...],
  "savings_phases": [...],
  "investment_accounts": [...],
  "market_assumptions": {
    "confidence_level": 0.9,
    "tolerance_ratio": 0.01,
    "max_iterations": 20000,
    "batch_size": 500,
    ...
  }
}
```

**Réponse** :
```json
{
  "iterations": 2000,
  "confidence_level": 0.9,
  "confidence_reached": true,
  "mean_final_capital": 500000,
  "median_final_capital": 495000,
  "percentile_10": 400000,
  "percentile_50": 495000,
  "percentile_90": 600000,
  "monthly_percentiles": [...]
}
```

### 3. Simulation Monte Carlo de retraite

Simule la phase de décumulation pendant la retraite.

```http
POST /api/v1/simulations/retirement-monte-carlo
Content-Type: application/json

{
  "adults": [...],
  "investment_accounts": [...],
  "market_assumptions": { ... },
  "spending_profile": [...],
  "target_monthly_income": 3000,
  "state_pension_monthly_income": 1000,
  "additional_income_streams": [...]
}
```

**Réponse** :
```json
{
  "iterations": 2000,
  "median_final_capital": 100000,
  "monthly_percentiles": [
    {
      "month_index": 1,
      "age": 65.083,
      "monthly_withdrawal": 2000,
      "cumulative_withdrawal": 2000,
      "percentile_50": 500000,
      ...
    }
  ]
}
```

### 4. Optimisation de l'épargne recommandée

**Endpoint principal** : `POST /api/v1/simulations/recommended-savings`

Calcule l'épargne mensuelle minimale nécessaire pour atteindre un capital cible en fin de vie.

**Paramètres de requête** :
- `task_id` (optionnel) : ID de tâche pour le suivi de progression via SSE

**Corps de la requête** :
```json
{
  "adults": [
    {
      "first_name": "Jean",
      "current_age": 35,
      "retirement_age": 65,
      "life_expectancy": 85
    }
  ],
  "savings_phases": [
    {
      "label": "Épargne actuelle",
      "from_age": 35,
      "to_age": 65,
      "monthly_contribution": 1000
    }
  ],
  "investment_accounts": [
    {
      "id": "pea1",
      "type": "pea",
      "current_amount": 50000,
      "monthly_contribution": 500,
      "allocation_actions": 70,
      "allocation_obligations": 30
    }
  ],
  "market_assumptions": {
    "inflation_mean": 2.0,
    "inflation_volatility": 1.0,
    "asset_classes": {
      "equities": {
        "expected_return": 7.0,
        "volatility": 15.0
      },
      "bonds": {
        "expected_return": 3.0,
        "volatility": 6.0
      }
    },
    "correlations": { ... },
    "confidence_level": 0.9,
    "tolerance_ratio": 0.01,
    "max_iterations": 20000,
    "batch_size": 500
  },
  "spending_profile": [
    {
      "label": "Retraite active",
      "from_age": 65,
      "to_age": 75,
      "spending_ratio": 1.0
    }
  ],
  "target_monthly_income": 3000,
  "state_pension_monthly_income": 1000,
  "additional_income_streams": [],
  "target_final_capital": 0,
  "capitalization_only": false,
  "calculate_minimum_savings": true,
  "tax_parameters": {
    "tmi_savings_phase": 30,
    "tmi_retirement_phase": 14,
    "is_couple": false
  }
}
```

**Réponse** :
```json
{
  "scale": 1.0,
  "recommended_monthly_savings": 1500,
  "minimum_capital_at_retirement": 500000,
  "monte_carlo_result": {
    "iterations": 200,
    "median_final_capital": 500000,
    "monthly_percentiles": [...]
  },
  "retirement_results": {
    "pessimistic": { ... },
    "median": { ... },
    "optimistic": { ... }
  },
  "steps": [
    {
      "iteration": 0,
      "scale": 0.0,
      "monthly_savings": 0,
      "final_capital": 300000,
      "effective_final_capital": 300000,
      "depletion_months": 0
    }
  ],
  "residual_error": 0,
  "residual_error_ratio": 0
}
```

**Note** : Si `capitalization_only` est `true`, `retirement_results` sera `null`.

### 5. Suivi de progression (SSE)

Pour suivre la progression d'une optimisation en temps réel :

```http
GET /api/v1/simulations/progress/{task_id}
Authorization: Bearer <token>
Accept: text/event-stream
```

**Réponse** (Server-Sent Events) :
```
data: {"task_id": "task_123", "current_step": "optimization", "progress_percent": 50, "message": "Étape 5/10", "is_complete": false}

data: {"task_id": "task_123", "current_step": "optimization", "progress_percent": 100, "message": "Terminé", "is_complete": true}
```

## Endpoints de projets

### 1. Créer un projet

```http
POST /api/v1/projects/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Mon projet de retraite",
  "description": "Planification pour 2030"
}
```

### 2. Lister les projets

```http
GET /api/v1/projects/
Authorization: Bearer <token>
```

### 3. Récupérer un projet

```http
GET /api/v1/projects/{project_id}
Authorization: Bearer <token>
```

### 4. Mettre à jour un projet

```http
PUT /api/v1/projects/{project_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Projet mis à jour"
}
```

### 5. Supprimer un projet

```http
DELETE /api/v1/projects/{project_id}
Authorization: Bearer <token>
```

## Gestion des erreurs

L'API retourne des codes HTTP standard :

- `200 OK` : Succès
- `201 Created` : Ressource créée
- `400 Bad Request` : Requête invalide
- `401 Unauthorized` : Token manquant ou invalide
- `404 Not Found` : Ressource introuvable
- `422 Unprocessable Entity` : Erreur de validation

**Format d'erreur** :
```json
{
  "detail": "Message d'erreur détaillé"
}
```

## Formats de données

### Format des dates

Les dates sont au format ISO 8601 : `YYYY-MM-DDTHH:MM:SS`

### Format des nombres

- Les montants sont en euros (float)
- Les âges sont en années (float, peut inclure des décimales pour les mois)
- Les pourcentages sont en décimales (ex: 0.07 pour 7%)

### Format des noms de champs

L'API utilise le format **snake_case** pour tous les champs JSON :
- `current_age` (pas `currentAge`)
- `retirement_age` (pas `retirementAge`)
- `monthly_contribution` (pas `monthlyContribution`)

Le frontend convertit automatiquement entre `camelCase` et `snake_case`.

## Limitations

- **Taille maximale des requêtes** : 10 MB
- **Timeout des calculs** : 5 minutes
- **Nombre maximum d'itérations Monte Carlo** : 100 000 (recommandé : 20 000)
- **Taille des batchs** : minimum 50, recommandé 500

## Rate limiting

Actuellement, il n'y a pas de limite de taux. Cela peut être ajouté en production selon les besoins.




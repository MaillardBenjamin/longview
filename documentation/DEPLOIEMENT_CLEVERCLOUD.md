# 🚀 Guide de Déploiement sur Clever Cloud

Ce guide explique comment déployer LongView sur Clever Cloud avec deux services :
- **Backend** : Service Python (FastAPI)
- **Frontend** : Service statique (React/Vite)

## 📋 Prérequis

- Compte Clever Cloud
- Application Clever Cloud créée
- Optionnel : Base de données PostgreSQL (si `ENABLE_DATABASE=true`)

## 🔧 Configuration du Backend

### 1. Créer un service Python

1. Dans votre application Clever Cloud, ajoutez un **service Python**
2. Sélectionnez la région et le plan adapté

### 2. Configurer les variables d'environnement

Configurez les variables d'environnement suivantes dans l'interface Clever Cloud :

#### Variables obligatoires

```bash
# Configuration de base
PROJECT_NAME=LongView
API_V1_STR=/api/v1

# Sécurité (OBLIGATOIRE en production : définir une clé secrète forte !)
# La valeur par défaut n'est que pour le développement local
# Générer une clé forte avec: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=<générer-une-clé-secrète-forte>

# Configuration de la base de données
# Pour désactiver la DB et l'authentification, mettre à false
ENABLE_DATABASE=false

# Si ENABLE_DATABASE=true, configurer la base de données
# Clever Cloud fournit automatiquement DATABASE_URL via la variable d'environnement
# DATABASE_URL sera automatiquement injecté si vous liez une add-on PostgreSQL

# CORS - Remplacer par l'URL de votre frontend
CORS_ORIGINS=https://votre-frontend.cleverapps.io

# Environnement
ENVIRONMENT=production
DEBUG=false
```

#### Variables optionnelles

```bash
# JWT (seulement si ENABLE_DATABASE=true)
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALGORITHM=HS256
```

### 3. Lier une base de données PostgreSQL (optionnel)

Si `ENABLE_DATABASE=true` :

1. Dans votre application, ajoutez un **add-on PostgreSQL**
2. Clever Cloud configurera automatiquement `DATABASE_URL`
3. Les migrations Alembic seront exécutées automatiquement lors du déploiement (grâce au `Procfile`)

### 4. Fichiers de configuration

Les fichiers suivants sont déjà présents dans le projet :

- ✅ `backend/clevercloud.json` : Configuration du build Python
- ✅ `backend/Procfile` : Commandes de démarrage
- ✅ `backend/runtime.txt` : Version Python (3.11)
- ✅ `backend/requirements.txt` : Dépendances Python

### 5. Déploiement

Le backend peut être déployé via :
- **Git** : Poussez votre code sur GitHub/GitLab et connectez-le à Clever Cloud
- **Clever CLI** : Utilisez `clever deploy` depuis le dossier `backend/`

## 🎨 Configuration du Frontend

### 1. Créer un service statique

1. Dans votre application Clever Cloud, ajoutez un **service statique**
2. Sélectionnez la région et le plan adapté

### 2. Configurer les variables d'environnement

Configurez les variables d'environnement suivantes dans l'interface Clever Cloud :

```bash
# URL de l'API backend (remplacer par l'URL de votre backend)
VITE_API_BASE_URL=https://votre-backend.cleverapps.io/api/v1

# Fonctionnalités optionnelles
VITE_ENABLE_RL_OPTIMIZATION=false
VITE_ENABLE_AUTH=false
```

### 3. Fichiers de configuration

Les fichiers suivants sont déjà présents dans le projet :

- ✅ `frontend/clevercloud.json` : Configuration du build statique
- ✅ `frontend/package.json` : Dépendances Node.js
- ✅ `frontend/vite.config.ts` : Configuration Vite

### 4. Déploiement

Le frontend peut être déployé via :
- **Git** : Poussez votre code sur GitHub/GitLab et connectez-le à Clever Cloud
- **Clever CLI** : Utilisez `clever deploy` depuis le dossier `frontend/`

## 🔗 Configuration des URLs

### Backend

Après le déploiement, votre backend sera accessible sur :
```
https://votre-app-[id].cleverapps.io
```

### Frontend

Après le déploiement, votre frontend sera accessible sur :
```
https://votre-app-[id].cleverapps.io
```

## ⚙️ Modes de déploiement

### Mode 1 : Sans base de données (recommandé pour débuter)

Cette configuration permet un déploiement simple sans gestion de comptes utilisateurs :

**Backend :**
```bash
ENABLE_DATABASE=false
CORS_ORIGINS=https://votre-frontend.cleverapps.io
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=<clé-secrète-forte>
```

**Frontend :**
```bash
VITE_API_BASE_URL=https://votre-backend.cleverapps.io/api/v1
VITE_ENABLE_AUTH=false
VITE_ENABLE_RL_OPTIMIZATION=false
```

**Fonctionnalités disponibles :**
- ✅ Simulations de retraite
- ✅ Calculs Monte Carlo
- ✅ Optimisation de l'épargne
- ❌ Sauvegarde des simulations
- ❌ Authentification utilisateur
- ❌ Gestion de projets

### Mode 2 : Avec base de données (complet)

Cette configuration permet toutes les fonctionnalités :

**Backend :**
```bash
ENABLE_DATABASE=true
DATABASE_URL=<fourni-automatiquement-par-clever-cloud>
CORS_ORIGINS=https://votre-frontend.cleverapps.io
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=<clé-secrète-forte>
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

**Frontend :**
```bash
VITE_API_BASE_URL=https://votre-backend.cleverapps.io/api/v1
VITE_ENABLE_AUTH=true
VITE_ENABLE_RL_OPTIMIZATION=false
```

**Fonctionnalités disponibles :**
- ✅ Toutes les fonctionnalités du Mode 1
- ✅ Sauvegarde des simulations
- ✅ Authentification utilisateur
- ✅ Gestion de projets
- ✅ Profils utilisateurs

## 🔍 Vérification du déploiement

### Backend

1. Vérifiez que le service répond :
   ```bash
   curl https://votre-backend.cleverapps.io/health
   ```
   Devrait retourner : `{"status":"ok"}`

2. Vérifiez la documentation API :
   ```
   https://votre-backend.cleverapps.io/docs
   ```

### Frontend

1. Accédez à l'URL du frontend dans votre navigateur
2. Vérifiez que la page se charge correctement
3. Testez une simulation de retraite

## 🐛 Dépannage

### Le backend ne démarre pas

- Vérifiez les logs dans l'interface Clever Cloud
- Vérifiez que toutes les variables d'environnement sont définies
- Vérifiez que le port est bien `$PORT` (injecté automatiquement)

### Erreur CORS

- Vérifiez que `CORS_ORIGINS` dans le backend contient l'URL exacte du frontend
- Vérifiez qu'il n'y a pas d'espace dans `CORS_ORIGINS`
- Le format attendu : `https://frontend.cleverapps.io` (pas de slash final)

### Le frontend ne trouve pas l'API

- Vérifiez que `VITE_API_BASE_URL` est correct
- Vérifiez que l'URL du backend est accessible depuis le navigateur
- Vérifiez les logs du navigateur (F12) pour les erreurs de connexion

### Migration de base de données échoue

- Vérifiez que `ENABLE_DATABASE=true`
- Vérifiez que `DATABASE_URL` est bien configuré
- Vérifiez les logs du déploiement pour les erreurs Alembic

## 📚 Ressources supplémentaires

- [Documentation Clever Cloud](https://www.clever-cloud.com/doc/)
- [Documentation FastAPI](https://fastapi.tiangolo.com/)
- [Documentation Vite](https://vitejs.dev/)

## ✅ Checklist de déploiement

### Backend

- [ ] Service Python créé sur Clever Cloud
- [ ] Variables d'environnement configurées
- [ ] Base de données PostgreSQL liée (si `ENABLE_DATABASE=true`)
- [ ] `CORS_ORIGINS` configuré avec l'URL du frontend
- [ ] `SECRET_KEY` changé (pas la valeur par défaut)
- [ ] Code déployé
- [ ] `/health` endpoint répond
- [ ] Documentation API accessible sur `/docs`

### Frontend

- [ ] Service statique créé sur Clever Cloud
- [ ] Variables d'environnement configurées
- [ ] `VITE_API_BASE_URL` pointe vers le backend
- [ ] Code déployé
- [ ] Page d'accueil se charge
- [ ] Les simulations fonctionnent

## 🎉 Félicitations !

Votre application LongView est maintenant déployée sur Clever Cloud !

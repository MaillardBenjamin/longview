# ✅ Checklist de Préparation au Déploiement Clever Cloud

## 📦 Fichiers de Configuration

### Backend
- [x] `backend/clevercloud.json` - Configuration du build Python
- [x] `backend/Procfile` - Commandes de démarrage (avec gestion DB optionnelle)
- [x] `backend/runtime.txt` - Version Python (3.11)
- [x] `backend/requirements.txt` - Dépendances Python

### Frontend
- [x] `frontend/clevercloud.json` - Configuration du build statique
- [x] `frontend/package.json` - Dépendances Node.js

### Documentation
- [x] `documentation/DEPLOIEMENT_CLEVERCLOUD.md` - Guide complet de déploiement

## 🔧 Configuration Technique

### Backend - Points à vérifier

#### ✅ Configuration de base
- [x] Application FastAPI configurée correctement
- [x] Endpoint `/health` disponible
- [x] CORS configuré via variables d'environnement
- [x] Base de données optionnelle (`ENABLE_DATABASE`)
- [x] Endpoints de calcul fonctionnent sans DB

#### ⚠️ Variables d'environnement obligatoires
- [ ] `SECRET_KEY` : **OBLIGATOIRE EN PRODUCTION** - Variable d'environnement à définir dans Clever Cloud
  - La valeur par défaut ("super-secret-change-me") est uniquement pour le développement local
  - Générer une clé forte : `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- [ ] `CORS_ORIGINS` : URL du frontend Clever Cloud
- [ ] `ENABLE_DATABASE` : `false` (sans DB) ou `true` (avec DB)
- [ ] `ENVIRONMENT` : `production`
- [ ] `DEBUG` : `false`

#### ⚠️ Variables conditionnelles (si `ENABLE_DATABASE=true`)
- [ ] `DATABASE_URL` : Fourni automatiquement par Clever Cloud si add-on PostgreSQL lié
- [ ] `ACCESS_TOKEN_EXPIRE_MINUTES` : Optionnel (défaut : 1440)
- [ ] `ALGORITHM` : Optionnel (défaut : HS256)

#### ⚠️ Dépendances ML (optionnelles mais lourdes)
Si `VITE_ENABLE_RL_OPTIMIZATION=false` (recommandé en production) :
- Les dépendances ML (torch, stable-baselines3) ne sont pas nécessaires
- Le build sera plus rapide et moins lourd

**Recommandation** : Créer un `requirements-minimal.txt` sans les dépendances ML si RL est désactivé.

### Frontend - Points à vérifier

#### ✅ Configuration de base
- [x] Application React/Vite configurée correctement
- [x] Build de production fonctionne (`npm run build`)
- [x] Variables d'environnement utilisent le préfixe `VITE_`

#### ⚠️ Variables d'environnement obligatoires
- [ ] `VITE_API_BASE_URL` : URL du backend Clever Cloud (ex: `https://app-xxx.cleverapps.io/api/v1`)
- [ ] `VITE_ENABLE_AUTH` : `false` (sans authentification) ou `true` (avec authentification)
- [ ] `VITE_ENABLE_RL_OPTIMIZATION` : `false` (recommandé en production)

## 🚨 Points d'Attention

### 1. Secret Key
**CRITIQUE** : La `SECRET_KEY` **DOIT** être définie comme variable d'environnement en production !
- La valeur par défaut (`super-secret-change-me`) est uniquement pour le développement local
- En production, définir `SECRET_KEY` dans l'interface Clever Cloud (variables d'environnement)
- Générer une clé forte avec :
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
- Ne jamais commiter la `SECRET_KEY` de production dans le code

### 2. CORS
- Format attendu : `https://frontend.cleverapps.io` (sans slash final)
- Pas de format JSON, juste une chaîne simple ou séparée par virgules
- Testez bien que le frontend peut appeler le backend

### 3. Base de données
- Si `ENABLE_DATABASE=false` : Pas besoin d'add-on PostgreSQL
- Si `ENABLE_DATABASE=true` : Liens automatique via `DATABASE_URL` si add-on PostgreSQL ajouté
- Les migrations Alembic s'exécutent automatiquement au déploiement (si DB activée)

### 4. Dépendances ML
- Les dépendances ML (torch, stable-baselines3, numpy, etc.) sont **lourdes**
- Si `VITE_ENABLE_RL_OPTIMIZATION=false`, elles ne sont pas nécessaires
- Le build peut prendre du temps si elles sont incluses

### 5. Workers Uvicorn
- Configuré avec 2 workers dans le `Procfile`
- Ajustez selon les ressources de votre plan Clever Cloud
- Pour un plan gratuit : peut-être réduire à 1 worker

### 6. Port
- Le port est automatiquement injecté par Clever Cloud via `$PORT`
- Ne pas hardcoder le port dans le code

## 📋 Checklist de Déploiement

### Avant le déploiement

#### Backend
- [ ] Générer une `SECRET_KEY` forte : `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- [ ] **Définir `SECRET_KEY` comme variable d'environnement dans Clever Cloud** (obligatoire en production)
- [ ] Configurer toutes les autres variables d'environnement dans Clever Cloud
- [ ] Si DB activée : Ajouter l'add-on PostgreSQL
- [ ] Tester localement que l'application démarre avec les mêmes variables d'env
- [ ] Vérifier que `/health` répond
- [ ] Vérifier que les endpoints de calcul fonctionnent sans DB (si `ENABLE_DATABASE=false`)

#### Frontend
- [ ] Configurer `VITE_API_BASE_URL` avec l'URL du backend
- [ ] Configurer les autres variables d'environnement
- [ ] Tester le build localement : `npm run build`
- [ ] Vérifier que le dossier `dist/` est généré correctement

### Déploiement

#### Backend
- [ ] Pousser le code sur le dépôt Git
- [ ] Déployer via Clever Cloud (Git ou CLI)
- [ ] Vérifier les logs de déploiement
- [ ] Tester `/health` : `curl https://backend.cleverapps.io/health`
- [ ] Tester `/docs` : `https://backend.cleverapps.io/docs`
- [ ] Vérifier les logs d'erreurs

#### Frontend
- [ ] Pousser le code sur le dépôt Git
- [ ] Déployer via Clever Cloud (Git ou CLI)
- [ ] Vérifier les logs de build
- [ ] Accéder à l'URL du frontend
- [ ] Tester une simulation complète
- [ ] Vérifier la console du navigateur (F12) pour les erreurs

### Après le déploiement

- [ ] Tester que le frontend peut appeler le backend (pas d'erreur CORS)
- [ ] Tester une simulation de retraite complète
- [ ] Vérifier les performances (temps de réponse)
- [ ] Vérifier les logs pour les erreurs potentielles
- [ ] Tester le mode sombre (si applicable)
- [ ] Vérifier la documentation API (`/docs`)

## 🔍 Tests de Vérification

### Backend

```bash
# Test de santé
curl https://votre-backend.cleverapps.io/health
# Devrait retourner : {"status":"ok"}

# Test d'un endpoint de calcul (sans authentification)
curl -X POST https://votre-backend.cleverapps.io/api/v1/simulations/capitalization-preview \
  -H "Content-Type: application/json" \
  -d '{"currentAge":40,"retirementAge":65,...}'
```

### Frontend

1. Ouvrir l'URL du frontend dans le navigateur
2. Ouvrir la console (F12) et vérifier qu'il n'y a pas d'erreurs
3. Tester une simulation complète
4. Vérifier que les résultats s'affichent correctement

## 📝 Notes Importantes

### Mode sans base de données (recommandé pour débuter)

**Avantages :**
- ✅ Déploiement simple et rapide
- ✅ Pas de coût de base de données
- ✅ Moins de maintenance
- ✅ Toutes les fonctionnalités de simulation disponibles

**Limitations :**
- ❌ Pas de sauvegarde des simulations
- ❌ Pas d'authentification utilisateur
- ❌ Pas de gestion de projets
- ❌ Données perdues à la fermeture du navigateur

### Mode avec base de données (complet)

**Avantages :**
- ✅ Sauvegarde des simulations
- ✅ Authentification utilisateur
- ✅ Gestion de projets
- ✅ Historique des simulations

**Inconvénients :**
- ❌ Coût supplémentaire (add-on PostgreSQL)
- ❌ Configuration plus complexe
- ❌ Migration de base de données nécessaire
- ❌ Maintenance supplémentaire

## ✅ État de Préparation

**Statut général : ✅ PRÊT POUR LE DÉPLOIEMENT**

Tous les fichiers de configuration sont présents et la documentation est complète. Il reste uniquement à :
1. Configurer les variables d'environnement dans Clever Cloud
2. Générer une `SECRET_KEY` forte
3. Déployer les services

## 🎯 Prochaines Étapes

1. Créer les services sur Clever Cloud (backend Python + frontend statique)
2. Configurer les variables d'environnement (voir `DEPLOIEMENT_CLEVERCLOUD.md`)
3. Déployer le backend
4. Déployer le frontend
5. Tester et vérifier

Pour plus de détails, consultez `documentation/DEPLOIEMENT_CLEVERCLOUD.md`.

# Guide de dépannage - Connexion Frontend/Backend

Ce guide vous aide à résoudre les problèmes de connexion entre le frontend et le backend en local.

## Problèmes courants

### 1. Le frontend ne peut pas se connecter au backend

#### Symptômes
- Erreurs CORS dans la console du navigateur
- Erreurs "Network Error" ou "Failed to fetch"
- Le frontend n'affiche pas de données

#### Solutions

**A. Vérifier que le backend est lancé**

```bash
# Dans un terminal
cd backend
python -m app
```

Vous devriez voir :
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Application startup complete.
```

**B. Tester l'endpoint de santé du backend**

```bash
curl http://localhost:8000/health
```

Devrait retourner : `{"status":"ok"}`

**C. Vérifier la configuration CORS du backend**

Dans `backend/.env`, vérifiez que `CORS_ORIGINS` contient l'URL de votre frontend :

```bash
# Pour Vite (port par défaut : 5173)
CORS_ORIGINS=http://localhost:5173

# Si vous utilisez un autre port
CORS_ORIGINS=http://localhost:3000

# Pour autoriser plusieurs origines
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Important** : Après modification du `.env`, redémarrez le backend !

**D. Vérifier la configuration du frontend**

Dans `frontend/.env`, vérifiez que `VITE_API_BASE_URL` pointe vers votre backend :

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

**Important** : Après modification du `.env`, redémarrez le serveur de développement Vite !

**E. Vérifier que le frontend utilise la bonne URL**

Ouvrez la console du navigateur (F12) et vérifiez :
1. L'onglet **Network** : voyez-vous des requêtes vers `http://localhost:8000` ?
2. L'onglet **Console** : y a-t-il des erreurs CORS ?

#### Erreur CORS typique

Si vous voyez une erreur comme :
```
Access to XMLHttpRequest at 'http://localhost:8000/api/v1/...' from origin 'http://localhost:5173' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Solution** : Le backend n'autorise pas l'origine du frontend. Vérifiez `CORS_ORIGINS` dans `backend/.env` et redémarrez le backend.

### 2. Les variables d'environnement ne sont pas chargées

#### Frontend (Vite)

Les variables d'environnement Vite doivent être préfixées par `VITE_` et sont chargées au **build**, pas à l'exécution.

**Important** : 
- Modifiez le fichier `.env` dans `frontend/`
- Redémarrez le serveur de développement (`npm run dev`)
- Les variables sont injectées au build, pas à l'exécution

#### Backend (FastAPI)

Les variables d'environnement sont chargées au démarrage de l'application.

**Important** :
- Modifiez le fichier `.env` dans `backend/`
- Redémarrez le backend
- Les variables sont rechargées à chaque redémarrage

### 3. Vérification rapide de la configuration

#### Script de vérification

Créez un fichier `check-config.sh` :

```bash
#!/bin/bash

echo "=== Vérification de la configuration ==="
echo ""

echo "1. Backend - Configuration CORS :"
cd backend
if [ -f .env ]; then
    grep CORS_ORIGINS .env || echo "⚠️  CORS_ORIGINS non trouvé dans .env"
else
    echo "⚠️  Fichier .env non trouvé dans backend/"
fi

echo ""
echo "2. Frontend - URL de l'API :"
cd ../frontend
if [ -f .env ]; then
    grep VITE_API_BASE_URL .env || echo "⚠️  VITE_API_BASE_URL non trouvé dans .env"
else
    echo "⚠️  Fichier .env non trouvé dans frontend/"
fi

echo ""
echo "3. Test de connexion au backend :"
curl -s http://localhost:8000/health && echo " ✓ Backend accessible" || echo " ✗ Backend non accessible (vérifiez qu'il est lancé)"
```

### 4. Configuration recommandée pour le développement local

#### Backend (`backend/.env`)

```bash
PROJECT_NAME=LongView
API_V1_STR=/api/v1
SECRET_KEY=votre-cle-secrete-changez-moi
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALGORITHM=HS256
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/longview
CORS_ORIGINS=http://localhost:5173
ENVIRONMENT=local
DEBUG=true
```

#### Frontend (`frontend/.env`)

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_ENABLE_RL_OPTIMIZATION=false
```

### 5. Ordre de démarrage recommandé

1. **Démarrer le backend** :
   ```bash
   cd backend
   python -m app
   ```
   
2. **Vérifier que le backend fonctionne** :
   ```bash
   curl http://localhost:8000/health
   ```

3. **Démarrer le frontend** :
   ```bash
   cd frontend
   npm run dev
   ```

4. **Ouvrir le navigateur** :
   - Frontend : http://localhost:5173
   - Backend API : http://localhost:8000
   - Documentation API : http://localhost:8000/docs

### 6. Débogage avec la console du navigateur

Ouvrez la console du navigateur (F12) et vérifiez :

1. **Onglet Console** :
   - Cherchez les erreurs en rouge
   - Vérifiez les messages d'erreur CORS

2. **Onglet Network** :
   - Filtrez par "XHR" ou "Fetch"
   - Cliquez sur une requête API
   - Vérifiez :
     - **Request URL** : doit être `http://localhost:8000/api/v1/...`
     - **Status Code** : doit être 200, 201, etc. (pas 401, 403, 404, 500)
     - **Response Headers** : doit contenir `Access-Control-Allow-Origin`

### 7. Test manuel de l'API

Pour tester si l'API fonctionne indépendamment du frontend :

```bash
# Test de l'endpoint de santé
curl http://localhost:8000/health

# Test de l'endpoint racine
curl http://localhost:8000/

# Test d'une requête avec CORS (simuler le frontend)
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:8000/api/v1/
```

Si le backend répond correctement mais que le frontend ne peut pas se connecter, c'est probablement un problème CORS.

### 8. Réinitialisation complète

Si rien ne fonctionne, réinitialisez la configuration :

```bash
# 1. Arrêter tous les serveurs (Ctrl+C)

# 2. Vérifier les fichiers .env
cd backend
cat .env
# Vérifiez CORS_ORIGINS=http://localhost:5173

cd ../frontend
cat .env
# Vérifiez VITE_API_BASE_URL=http://localhost:8000/api/v1

# 3. Redémarrer le backend
cd ../backend
python -m app

# 4. Dans un autre terminal, redémarrer le frontend
cd frontend
npm run dev
```

## Checklist de vérification

- [ ] Le backend est lancé et accessible sur http://localhost:8000
- [ ] L'endpoint `/health` répond `{"status":"ok"}`
- [ ] Le fichier `backend/.env` contient `CORS_ORIGINS=http://localhost:5173`
- [ ] Le backend a été redémarré après modification de `.env`
- [ ] Le fichier `frontend/.env` contient `VITE_API_BASE_URL=http://localhost:8000/api/v1`
- [ ] Le frontend a été redémarré après modification de `.env`
- [ ] Les ports 8000 (backend) et 5173 (frontend) ne sont pas utilisés par d'autres applications
- [ ] La console du navigateur ne montre pas d'erreurs CORS
- [ ] Les requêtes réseau dans l'onglet Network du navigateur se dirigent vers `http://localhost:8000`

## Support

Si le problème persiste après avoir suivi ce guide, vérifiez :
1. Les logs du backend dans le terminal
2. La console du navigateur (F12)
3. L'onglet Network du navigateur pour voir les requêtes échouées

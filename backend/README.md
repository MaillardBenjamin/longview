# LongView Backend

Backend FastAPI pour l'application LongView de simulation de retraite.

## Prérequis

- Python 3.11 ou supérieur
- PostgreSQL (version 12 ou supérieure)
- pip (gestionnaire de paquets Python)

## Installation

### 1. Installer les dépendances

```bash
# Depuis le répertoire backend
pip install -r requirements.txt
```

Ou avec un environnement virtuel (recommandé) :

```bash
# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Sur macOS/Linux :
source venv/bin/activate
# Sur Windows :
# venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt
```

### 2. Configuration de la base de données

#### Option 1 : Utiliser PostgreSQL local

1. Créer une base de données PostgreSQL :
```bash
createdb longview
```

2. Configurer le fichier `.env` :
```bash
# Copier le fichier d'exemple
cp env.example .env

# Modifier le fichier .env avec vos paramètres de connexion
# DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/longview
```

#### Option 2 : Utiliser Docker (optionnel)

```bash
docker run --name longview-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=longview \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Configurer les variables d'environnement

Le fichier `.env` existe déjà. Assurez-vous qu'il contient les bonnes valeurs :

```bash
# Vérifier le fichier .env
cat .env
```

Variables importantes :
- `DATABASE_URL` : URL de connexion à PostgreSQL
- `SECRET_KEY` : Clé secrète pour JWT (changez-la en production)
- `CORS_ORIGINS` : Origines autorisées pour CORS (ex: `["http://localhost:5173"]`)

## Lancer le backend

### Méthode 1 : Via Python (Recommandé pour le développement)

```bash
# Depuis le répertoire backend
python -m app
```

Cela lancera le serveur sur `http://0.0.0.0:8000` avec le rechargement automatique activé.

### Méthode 2 : Via uvicorn directement

```bash
# Depuis le répertoire backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Méthode 3 : Via uvicorn avec workers (Production)

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Migrations de la base de données

### Initialiser les migrations (première fois seulement)

Les migrations sont déjà configurées. Pour créer de nouvelles migrations :

```bash
# Créer une nouvelle migration
alembic revision --autogenerate -m "Description des changements"

# Appliquer les migrations
alembic upgrade head
```

### Appliquer les migrations existantes

```bash
# Appliquer toutes les migrations
alembic upgrade head

# Vérifier l'état actuel
alembic current

# Voir l'historique des migrations
alembic history
```

## Vérifier que le backend fonctionne

Une fois le serveur lancé, vous pouvez tester :

1. **Endpoint de santé :**
   ```bash
   curl http://localhost:8000/health
   ```
   Devrait retourner : `{"status":"ok"}`

2. **Endpoint racine :**
   ```bash
   curl http://localhost:8000/
   ```
   Devrait retourner : `{"message":"Welcome to LongView"}`

3. **Documentation interactive (Swagger) :**
   Ouvrez dans votre navigateur : `http://localhost:8000/docs`

4. **Documentation alternative (ReDoc) :**
   Ouvrez dans votre navigateur : `http://localhost:8000/redoc`

## Structure du projet

```
backend/
├── app/
│   ├── __main__.py          # Point d'entrée pour `python -m app`
│   ├── main.py              # Configuration FastAPI
│   ├── api/                 # Routes et endpoints
│   ├── core/                # Configuration et sécurité
│   ├── db/                  # Connexion à la base de données
│   ├── models/              # Modèles SQLAlchemy
│   ├── schemas/             # Schémas Pydantic
│   ├── services/            # Logique métier
│   └── utils/               # Utilitaires
├── migrations/              # Migrations Alembic
├── alembic.ini              # Configuration Alembic
├── requirements.txt         # Dépendances Python
├── env.example              # Exemple de fichier .env
└── .env                     # Variables d'environnement (créé localement)
```

## Développement

### Rechargement automatique

Le serveur se recharge automatiquement lors des modifications de code quand vous utilisez :
- `python -m app` (via `__main__.py`)
- `uvicorn ... --reload`

### Logs

Les logs sont affichés dans la console. Pour plus de détails, configurez le logging dans `app/core/config.py`.

### Tests

Pour exécuter les tests (si disponibles) :
```bash
pytest
```

## Dépannage

### Erreur de connexion à la base de données

1. Vérifiez que PostgreSQL est lancé :
   ```bash
   # Sur macOS (Homebrew)
   brew services list
   # ou
   pg_isready
   ```

2. Vérifiez l'URL de connexion dans `.env` :
   ```bash
   cat .env | grep DATABASE_URL
   ```

3. Testez la connexion manuellement :
   ```bash
   psql -d longview -U postgres
   ```

### Erreur de port déjà utilisé

Si le port 8000 est déjà utilisé :
```bash
# Tuer le processus utilisant le port 8000 (macOS/Linux)
lsof -ti:8000 | xargs kill -9

# Ou utiliser un autre port
uvicorn app.main:app --port 8001
```

### Erreur d'import de modules

Assurez-vous d'être dans le bon répertoire :
```bash
# Depuis le répertoire backend
pwd
# Devrait afficher : .../LongView/backend
```

## Production

Pour la production, utilisez :
- Plusieurs workers : `--workers 4`
- Gunicorn avec uvicorn workers (optionnel)
- Variables d'environnement sécurisées
- `DEBUG=false` dans le `.env`
- Clé secrète forte pour `SECRET_KEY`

## Support

Pour plus d'informations, consultez :
- [Documentation FastAPI](https://fastapi.tiangolo.com/)
- [Documentation Alembic](https://alembic.sqlalchemy.org/)
- [Documentation SQLAlchemy](https://docs.sqlalchemy.org/)

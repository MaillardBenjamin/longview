# Guide de Déploiement LongView

## Vue d'ensemble

Ce guide décrit les étapes pour déployer LongView en production.

## Prérequis

- Serveur Linux (Ubuntu 20.04+ recommandé)
- Python 3.11 ou supérieur
- Node.js 18 ou supérieur
- PostgreSQL 12 ou supérieur
- Nginx (optionnel, pour reverse proxy)
- Certbot (pour SSL/TLS)

## Architecture de déploiement recommandée

```
┌─────────────┐
│   Nginx     │ (Reverse proxy + SSL)
└──────┬──────┘
       │
       ├──────────────┐
       │              │
┌──────▼──────┐  ┌────▼─────┐
│   Frontend  │  │ Backend  │
│   (React)   │  │(FastAPI) │
└─────────────┘  └────┬─────┘
                      │
              ┌───────▼───────┐
              │   PostgreSQL  │
              └───────────────┘
```

## Déploiement du Backend

### 1. Préparation du serveur

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation des dépendances
sudo apt install -y python3.11 python3.11-venv python3-pip postgresql postgresql-contrib nginx
```

### 2. Configuration de PostgreSQL

```bash
# Créer l'utilisateur et la base de données
sudo -u postgres psql

CREATE USER longview_user WITH PASSWORD 'votre_mot_de_passe_securise';
CREATE DATABASE longview_db OWNER longview_user;
GRANT ALL PRIVILEGES ON DATABASE longview_db TO longview_user;
\q
```

### 3. Configuration de l'application

```bash
# Cloner le repository
git clone https://github.com/votre-repo/longview.git
cd longview/backend

# Créer l'environnement virtuel
python3.11 -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Copier et configurer les variables d'environnement
cp env.example .env
nano .env
```

**Variables d'environnement importantes** :

```env
# Base de données
DATABASE_URL=postgresql://longview_user:mot_de_passe@localhost:5432/longview_db

# Sécurité
SECRET_KEY=votre_secret_key_tres_longue_et_aleatoire
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
BACKEND_CORS_ORIGINS=["https://votre-domaine.com"]

# Environnement
ENVIRONMENT=production
```

### 4. Migrations de base de données

```bash
# Appliquer les migrations
alembic upgrade head
```

### 5. Configuration systemd (service)

Créer le fichier `/etc/systemd/system/longview-backend.service` :

```ini
[Unit]
Description=LongView Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/longview/backend
Environment="PATH=/path/to/longview/backend/venv/bin"
ExecStart=/path/to/longview/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Activer et démarrer le service :

```bash
sudo systemctl daemon-reload
sudo systemctl enable longview-backend
sudo systemctl start longview-backend
sudo systemctl status longview-backend
```

## Déploiement du Frontend

### 1. Build de production

```bash
cd frontend

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp env.example .env.production
nano .env.production
```

**Variables d'environnement** :

```env
VITE_API_BASE_URL=https://api.votre-domaine.com/api/v1
```

### 2. Build

```bash
npm run build
```

Le build génère les fichiers dans `frontend/dist/`.

### 3. Configuration Nginx

Créer le fichier `/etc/nginx/sites-available/longview-frontend` :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    root /path/to/longview/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache des assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API vers backend
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activer le site :

```bash
sudo ln -s /etc/nginx/sites-available/longview-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Configuration SSL/TLS

### Installation de Certbot

```bash
sudo apt install certbot python3-certbot-nginx
```

### Obtention du certificat

```bash
sudo certbot --nginx -d votre-domaine.com
```

Certbot configure automatiquement Nginx pour utiliser HTTPS.

### Renouvellement automatique

Certbot crée automatiquement un cron job pour renouveler les certificats.

## Configuration Nginx pour le Backend (optionnel)

Si vous voulez exposer le backend sur un sous-domaine séparé :

```nginx
server {
    listen 80;
    server_name api.votre-domaine.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring et logs

### Logs backend

```bash
# Logs systemd
sudo journalctl -u longview-backend -f

# Logs Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Monitoring de la base de données

```bash
# Connexions actives
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Taille de la base de données
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('longview_db'));"
```

## Sauvegarde

### Script de sauvegarde PostgreSQL

Créer `/usr/local/bin/backup-longview.sh` :

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/longview"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Sauvegarde de la base de données
sudo -u postgres pg_dump longview_db > $BACKUP_DIR/db_$DATE.sql

# Compression
gzip $BACKUP_DIR/db_$DATE.sql

# Suppression des sauvegardes de plus de 30 jours
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
```

Rendre exécutable et ajouter au cron :

```bash
sudo chmod +x /usr/local/bin/backup-longview.sh
sudo crontab -e

# Ajouter cette ligne pour une sauvegarde quotidienne à 2h du matin
0 2 * * * /usr/local/bin/backup-longview.sh
```

## Mise à jour

### Mise à jour du backend

```bash
cd /path/to/longview
git pull origin main

cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head

sudo systemctl restart longview-backend
```

### Mise à jour du frontend

```bash
cd frontend
git pull origin main
npm install
npm run build

sudo systemctl reload nginx
```

## Sécurité

### Recommandations

1. **Firewall** : Configurer UFW pour n'autoriser que les ports nécessaires
   ```bash
   sudo ufw allow 22/tcp  # SSH
   sudo ufw allow 80/tcp  # HTTP
   sudo ufw allow 443/tcp # HTTPS
   sudo ufw enable
   ```

2. **Fail2ban** : Protection contre les attaques par force brute
   ```bash
   sudo apt install fail2ban
   ```

3. **Mise à jour régulière** :
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **Secrets** : Ne jamais commiter les fichiers `.env` dans Git

5. **Permissions** : S'assurer que les fichiers sensibles ne sont pas accessibles publiquement

## Dépannage

### Le backend ne démarre pas

```bash
# Vérifier les logs
sudo journalctl -u longview-backend -n 50

# Vérifier la configuration
sudo systemctl status longview-backend
```

### Erreurs de connexion à la base de données

```bash
# Tester la connexion
psql -U longview_user -d longview_db -h localhost

# Vérifier que PostgreSQL écoute
sudo systemctl status postgresql
```

### Le frontend ne charge pas

```bash
# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/error.log

# Vérifier les permissions
ls -la /path/to/longview/frontend/dist
```

## Performance

### Optimisations recommandées

1. **Cache Nginx** : Configurer le cache pour les assets statiques
2. **Gzip** : Activer la compression (déjà configuré)
3. **CDN** : Utiliser un CDN pour les assets statiques en production
4. **Base de données** : Configurer les index appropriés
5. **Connection pooling** : Configurer SQLAlchemy avec un pool de connexions

## Scaling horizontal (avancé)

Pour une charge élevée, considérer :

1. **Load balancer** : Nginx ou HAProxy devant plusieurs instances backend
2. **Base de données répliquée** : PostgreSQL avec réplication maître-esclave
3. **Cache Redis** : Pour mettre en cache les résultats de simulation
4. **Queue de tâches** : Celery pour les calculs longs









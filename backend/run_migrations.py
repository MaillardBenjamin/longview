#!/usr/bin/env python3
"""
Script pour exécuter les migrations Alembic uniquement si la base de données est activée.
Utilisé par Clever Cloud dans la commande 'release' du Procfile.
"""

import sys
import subprocess

try:
    from app.core.config import settings
    
    if settings.enable_database:
        print("Base de données activée. Exécution des migrations Alembic...")
        result = subprocess.run(["alembic", "upgrade", "head"], check=False)
        sys.exit(result.returncode)
    else:
        print("Base de données désactivée. Aucune migration nécessaire.")
        sys.exit(0)
except Exception as e:
    print(f"Erreur lors de l'exécution des migrations: {e}")
    sys.exit(1)

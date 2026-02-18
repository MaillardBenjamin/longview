# LongView

**LongView** est une application web open-source de simulation financière pour la planification de la retraite. Elle utilise des simulations Monte Carlo pour projeter l'évolution de votre capital et déterminer l'épargne mensuelle minimale nécessaire pour atteindre vos objectifs de retraite.

## 🎯 Fonctionnalités

- **Simulation Monte Carlo** : Projection probabiliste du capital jusqu'à la retraite avec prise en compte de l'incertitude des marchés
- **Phase de retraite** : Simulation de la décumulation du capital pendant la retraite
- **Optimisation automatique** : Calcul de l'épargne mensuelle minimale pour atteindre un capital cible à la fin de vie
- **Gestion multi-comptes** : Prise en compte de plusieurs supports d'investissement (PEA, PER, Assurance-vie, Livrets, etc.)
- **Corrélations entre actifs** : Modélisation des corrélations entre différentes classes d'actifs
- **Profil de dépenses** : Modélisation de l'évolution des besoins en fonction de l'âge
- **Interface intuitive** : Interface web moderne et réactive

## 🏗️ Architecture

### Backend

- **Framework** : FastAPI (Python 3.11+)
- **Base de données** : PostgreSQL avec SQLAlchemy
- **Authentification** : JWT
- **Simulation** : Algorithmes Monte Carlo avec décomposition de Cholesky pour les corrélations

### Frontend

- **Framework** : React 19 avec TypeScript
- **Routing** : React Router
- **State Management** : React Query
- **Visualisation** : ECharts
- **Build** : Vite

## 📋 Prérequis

- Python 3.11 ou supérieur
- Node.js 18 ou supérieur
- PostgreSQL 12 ou supérieur

## 🚀 Installation

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Configurez les variables d'environnement en copiant `env.example` vers `.env` et en remplissant les valeurs.

```bash
cp env.example .env
```

Initialisez la base de données :

```bash
alembic upgrade head
```

Démarrez le serveur :

```bash
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
```

Configurez les variables d'environnement :

```bash
cp env.example .env
```

Démarrez le serveur de développement :

```bash
npm run dev
```

## 📖 Utilisation

1. Accédez à l'application sur `http://localhost:5173`
2. Renseignez vos informations personnelles (âge, revenus, comptes d'investissement)
3. Configurez vos hypothèses de marché (rendements, volatilités, corrélations)
4. Définissez vos objectifs de retraite (revenu cible, pension de l'État)
5. Lancez la simulation pour obtenir l'épargne mensuelle recommandée

## 📚 Documentation

Une documentation complète est disponible dans le répertoire [`documentation/`](documentation/) :

- **[API.md](documentation/API.md)** : Documentation complète de l'API REST
- **[ALGORITHMES.md](documentation/ALGORITHMES.md)** : Description détaillée des algorithmes utilisés (Monte Carlo, optimisation, taxes)
- **[ARCHITECTURE.md](documentation/ARCHITECTURE.md)** : Architecture technique (avec diagrammes Mermaid)
- **[DEPLOIEMENT.md](documentation/DEPLOIEMENT.md)** : Guide de déploiement en production
- **[DIAGRAMMES.md](documentation/DIAGRAMMES.md)** : Index des diagrammes de la documentation

## 🧮 Modèle mathématique

Pour une description détaillée des algorithmes, voir [ALGORITHMES.md](documentation/ALGORITHMES.md).

### Simulation Monte Carlo

La simulation utilise des tirages aléatoires corrélés pour modéliser l'incertitude des rendements :

1. **Génération de rendements corrélés** : Utilisation de la décomposition de Cholesky pour générer des rendements corrélés entre classes d'actifs
2. **Ajustement pour l'inflation** : Soustraction d'un choc d'inflation mensuel aux rendements
3. **Application par compte** : Ajustement des rendements selon le type de compte et la fiscalité
4. **Calcul des percentiles** : Agrégation des résultats pour obtenir les percentiles (10%, 50%, 90%)

### Optimisation

L'optimisation utilise une recherche par dichotomie (bisection) avec itérations adaptatives :

1. **Évaluation initiale** : Test avec facteur 0 (épargnes existantes uniquement)
2. **Recherche de borne supérieure** : Doublement du facteur jusqu'à trouver une solution suffisante
3. **Dichotomie adaptative** : Réduction progressive de l'intervalle avec nombre d'itérations Monte Carlo adaptatif (100 → 1000+)
4. **Évaluation finale** : Réévaluation avec le maximum d'itérations pour précision maximale
5. **Pénalité pour épuisement précoce** : Application d'une pénalité si le capital médian s'épuise avant l'espérance de vie

## 📁 Structure du projet

```
LongView/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints API
│   │   ├── core/         # Configuration et sécurité
│   │   ├── db/           # Modèles de base de données
│   │   ├── schemas/      # Schémas Pydantic
│   │   └── services/     # Logique métier
│   │       └── monte_carlo/  # Modules Monte Carlo
│   └── migrations/       # Migrations Alembic
├── frontend/
│   └── src/
│       ├── components/   # Composants React
│       ├── pages/        # Pages de l'application
│       ├── services/     # Services API
│       └── types/        # Types TypeScript
└── README.md
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

- **[Guide de contribution](CONTRIBUTING.md)** : standards de code, tests, processus de revue
- **[Code de conduite](CODE_OF_CONDUCT.md)** : comportement attendu dans la communauté
- **[Signaler une vulnérabilité](SECURITY.md)** : politique de sécurité et contact

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## ⚠️ Avertissement important

**Cette application est fournie à titre informatif uniquement.**

- Les projections financières sont des **estimations basées sur des hypothèses** et ne constituent **pas des conseils en investissement**
- Les résultats sont **indicatifs** et peuvent différer significativement de la réalité
- Vous devez **vérifier par vous-même** l'exactitude des données et des calculs
- **Consultez un conseiller financier professionnel** avant toute décision d'investissement importante
- L'éditeur décline toute responsabilité concernant les décisions prises sur la base des résultats de l'application

**En utilisant LongView, vous reconnaissez avoir lu et accepté les [Conditions Générales d'Utilisation](CGU.md).**

## 📄 Documents légaux

- [Mentions Légales](MENTIONS_LEGALES.md) - Informations sur l'éditeur et l'hébergeur
- [Conditions Générales d'Utilisation (CGU)](CGU.md)
- [Politique de Confidentialité](PRIVACY.md)

**Éditeur :** Benjamin MAILLARD, entrepreneur individuel  
**SIREN :** 989 832 795 | **TVA :** FR52 989 832 795  
**Contact :** contact@oenotrac.fr


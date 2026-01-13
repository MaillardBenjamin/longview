# LongView Frontend

Frontend React/TypeScript de l'application LongView pour la simulation financière de retraite.

## 🛠️ Technologies

- **React 19** : Bibliothèque UI moderne
- **TypeScript** : Typage statique pour la sécurité du code
- **Vite** : Build tool rapide et moderne
- **React Router** : Routing côté client
- **React Query** : Gestion d'état serveur et cache
- **Material-UI (MUI)** : Composants UI
- **ECharts** : Visualisations de données
- **Axios** : Client HTTP

## 📋 Prérequis

- **Node.js** : Version 18 ou supérieure
- **npm** : Gestionnaire de paquets (inclus avec Node.js)

## 🚀 Installation

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configuration des variables d'environnement

Copiez le fichier d'exemple et configurez les variables :

```bash
cp env.example .env
```

Variables importantes :

```env
# URL de l'API backend
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Activation de l'authentification (optionnel)
VITE_ENABLE_AUTH=false

# Activation de l'optimisation par Reinforcement Learning (optionnel)
VITE_ENABLE_RL_OPTIMIZATION=false
```

### 3. Démarrer le serveur de développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173` (ou un autre port si 5173 est occupé).

## 📁 Structure du projet

```
frontend/
├── src/
│   ├── components/          # Composants React réutilisables
│   │   ├── layout/         # Composants de mise en page
│   │   ├── onboarding/     # Étapes du formulaire de simulation
│   │   ├── results/        # Visualisations des résultats
│   │   ├── seo/            # Composants SEO
│   │   └── shared/         # Composants partagés
│   ├── hooks/              # Hooks React personnalisés
│   │   ├── useAuth.ts      # Gestion de l'authentification
│   │   ├── useSimulationForm.ts  # État du formulaire
│   │   └── ...
│   ├── pages/              # Pages de l'application
│   │   ├── HomePage.tsx
│   │   ├── OnboardingPage.tsx
│   │   ├── SimulationResultPage.tsx
│   │   └── ...
│   ├── providers/          # Context providers
│   │   ├── AuthProvider.tsx
│   │   └── ThemeModeProvider.tsx
│   ├── services/           # Services API
│   │   ├── auth.ts
│   │   ├── simulations.ts
│   │   └── projects.ts
│   ├── types/              # Définitions TypeScript
│   │   ├── simulation.ts
│   │   ├── project.ts
│   │   └── user.ts
│   ├── lib/                # Utilitaires
│   │   └── api-client.ts   # Client API Axios configuré
│   ├── App.tsx             # Composant racine
│   ├── main.tsx            # Point d'entrée
│   └── theme.ts            # Configuration du thème MUI
├── public/                 # Assets statiques
├── dist/                   # Build de production (généré)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🔧 Scripts disponibles

### Développement

```bash
# Démarrer le serveur de développement avec hot-reload
npm run dev
```

### Production

```bash
# Build de production (génère les fichiers dans dist/)
npm run build

# Prévisualiser le build de production
npm run preview
```

### Qualité de code

```bash
# Linter le code
npm run lint
```

## 🏗️ Architecture

### Gestion d'état

- **React Query** : Cache et synchronisation des données API
- **Context API** : État global (authentification, thème)
- **Local State** : État local des composants (`useState`)
- **SessionStorage** : Persistance temporaire (simulations en cours)

### Communication API

Le frontend communique avec le backend via Axios. Les données sont automatiquement converties entre formats :

- **Frontend → Backend** : `camelCase` → `snake_case`
- **Backend → Frontend** : `snake_case` → `camelCase`

Les fonctions de mapping sont dans `services/simulations.ts`.

### Routing

L'application utilise React Router pour la navigation :

- `/` : Page d'accueil
- `/simulation` : Formulaire de simulation (onboarding)
- `/resultats` : Résultats de simulation
- `/projets` : Liste des projets
- `/projets/:id` : Détail d'un projet
- `/profil` : Profil utilisateur
- `/connexion` : Connexion
- `/inscription` : Inscription

### Thème

L'application supporte le mode clair/sombre via Material-UI. Le thème est configuré dans `src/theme.ts` et géré par `ThemeModeProvider`.

## 🔐 Authentification

L'authentification est optionnelle et peut être activée via la variable d'environnement `VITE_ENABLE_AUTH=true`.

Quand activée :
- Les tokens JWT sont stockés dans `localStorage`
- Les routes protégées nécessitent une authentification
- Le token est automatiquement inclus dans les requêtes API

## 📊 Visualisations

Les graphiques utilisent ECharts via `echarts-for-react` :

- **Graphiques Monte Carlo** : Distribution probabiliste du capital
- **Graphiques de retraite** : Évolution du capital pendant la retraite
- **Graphiques d'optimisation** : Itérations de l'algorithme d'optimisation

## 🎨 Styling

- **CSS Modules** : Styles locaux par composant
- **Material-UI** : Composants stylés avec le système de thème MUI
- **CSS personnalisé** : Pour les styles spécifiques à l'application

## 🧪 Tests

Les tests sont à implémenter. Structure recommandée :

```
src/
├── __tests__/
│   ├── components/
│   ├── hooks/
│   └── services/
```

## 🐛 Débogage

### Console du navigateur

Ouvrez la console (F12) pour voir :
- Les logs de l'application
- Les erreurs JavaScript
- Les requêtes réseau

### React DevTools

Installez l'extension React DevTools pour inspecter :
- L'état des composants
- Les props
- Le contexte

### Network Tab

Utilisez l'onglet Network du navigateur pour :
- Vérifier les requêtes API
- Voir les réponses du serveur
- Identifier les erreurs HTTP

## 🔗 Intégration avec le backend

Le frontend communique avec le backend via l'API REST. Voir [documentation/API.md](../documentation/API.md) pour les détails de l'API.

### Configuration CORS

Assurez-vous que le backend autorise l'origine du frontend dans `CORS_ORIGINS` :

```env
# backend/.env
CORS_ORIGINS=http://localhost:5173
```

## 📦 Build de production

Le build de production génère des fichiers optimisés dans `dist/` :

```bash
npm run build
```

Les fichiers peuvent être servis par n'importe quel serveur web statique (Nginx, Apache, etc.).

### Variables d'environnement en production

Pour la production, créez un fichier `.env.production` :

```env
VITE_API_BASE_URL=https://api.votre-domaine.com/api/v1
```

## 🚀 Déploiement

Voir [documentation/DEPLOIEMENT.md](../documentation/DEPLOIEMENT.md) pour le guide complet de déploiement.

### Déploiement sur Clever Cloud

Le fichier `clevercloud.json` configure le déploiement automatique sur Clever Cloud.

## 📚 Documentation

- [Documentation principale](../README.md)
- [Documentation API](../documentation/API.md)
- [Architecture](../documentation/ARCHITECTURE.md)
- [Guide de dépannage](../documentation/TROUBLESHOOTING.md)

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](../CONTRIBUTING.md) pour les guidelines.

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](../LICENSE) pour plus de détails.

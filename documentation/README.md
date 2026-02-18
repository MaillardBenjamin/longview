# Documentation LongView

Bienvenue dans la documentation de LongView ! Cette documentation couvre tous les aspects techniques de l'application.

## 📚 Documentation disponible

### [DIAGRAMMES.md](./DIAGRAMMES.md)
Index des diagrammes Mermaid (architecture, déploiement, algorithmes) et images PNG associées.

**Contenu** : Vue d’ensemble des schémas, liens vers les diagrammes dans ARCHITECTURE, DEPLOIEMENT et ALGORITHMES.

**Public cible** : Tous

### [API.md](./API.md)
Documentation complète de l'API REST LongView.

**Contenu** :
- Authentification JWT
- Endpoints de simulation
- Endpoints de projets
- Formats de données
- Gestion des erreurs
- Suivi de progression (SSE)

**Public cible** : Développeurs intégrant l'API, développeurs frontend

### [ALGORITHMES.md](./ALGORITHMES.md)
Description détaillée des algorithmes utilisés dans LongView.

**Contenu** :
- Simulation Monte Carlo (principe, étapes, convergence)
- Optimisation par dichotomie (algorithme, conditions)
- Gestion des corrélations (décomposition de Cholesky)
- Calcul des taxes (fiscalité française)
- Phase de capitalisation
- Phase de retraite
- Performance et optimisations

**Public cible** : Développeurs backend, chercheurs, utilisateurs avancés

### [ARCHITECTURE.md](./ARCHITECTURE.md)
Architecture technique de l'application.

**Contenu** :
- Vue d'ensemble de l'architecture
- Structure des répertoires (backend et frontend)
- Flux de données
- Modèles de données
- Services et modules
- Gestion d'état frontend
- Communication API
- Sécurité

**Public cible** : Développeurs, architectes logiciels

### [DEPLOIEMENT.md](./DEPLOIEMENT.md)
Guide complet de déploiement en production.

**Contenu** :
- Prérequis et architecture recommandée
- Déploiement du backend (PostgreSQL, systemd)
- Déploiement du frontend (Nginx, build)
- Configuration SSL/TLS (Certbot)
- Monitoring et logs
- Sauvegarde
- Mise à jour
- Sécurité
- Dépannage
- Scaling horizontal

**Public cible** : Administrateurs système, DevOps

## 🚀 Démarrage rapide

### Pour les développeurs

1. **Commencer par** : [ARCHITECTURE.md](./ARCHITECTURE.md) pour comprendre la structure
2. **Ensuite** : [API.md](./API.md) pour intégrer l'API
3. **Pour approfondir** : [ALGORITHMES.md](./ALGORITHMES.md) pour comprendre les calculs

### Pour les administrateurs

1. **Commencer par** : [DEPLOIEMENT.md](./DEPLOIEMENT.md) pour le déploiement
2. **Référence** : [API.md](./API.md) pour comprendre les endpoints

## 📖 Structure de la documentation

```
documentation/
├── README.md          # Ce fichier (index)
├── DIAGRAMMES.md      # Index des diagrammes Mermaid et images
├── API.md             # Documentation API
├── ALGORITHMES.md     # Algorithmes et calculs (avec diagrammes Mermaid)
├── ARCHITECTURE.md    # Architecture technique (avec diagrammes Mermaid)
├── DEPLOIEMENT.md     # Guide de déploiement (avec diagramme Mermaid)
├── DEPLOIEMENT_CLEVERCLOUD.md
├── CHECKLIST_DEPLOIEMENT.md
├── TROUBLESHOOTING.md # Dépannage frontend/backend
├── RL_MODELS.md       # Modèles RL pré-entraînés
└── images/            # Images et diagrammes PNG
```

## 🔄 Mise à jour

Cette documentation est mise à jour régulièrement pour refléter les changements du code. Si vous trouvez des incohérences, n'hésitez pas à ouvrir une issue ou une pull request.

## 📝 Contribution

Les contributions à la documentation sont les bienvenues ! Pour contribuer :

1. Lisez la documentation existante
2. Identifiez les améliorations possibles
3. Proposez vos modifications via une pull request

## 🔗 Liens utiles

- [README principal](../README.md) - Vue d'ensemble du projet
- [CONTRIBUTING](../CONTRIBUTING.md) - Guide de contribution
- [CODE_OF_CONDUCT](../CODE_OF_CONDUCT.md) - Code de conduite des contributeurs
- [SECURITY](../SECURITY.md) - Signaler une vulnérabilité
- [CGU](../CGU.md) - Conditions Générales d'Utilisation
- [Mentions Légales](../MENTIONS_LEGALES.md)
- [Politique de Confidentialité](../PRIVACY.md)

## ❓ Questions ?

Si vous avez des questions sur la documentation ou l'utilisation de LongView :

1. Consultez d'abord la documentation appropriée
2. Recherchez dans les issues existantes
3. Ouvrez une nouvelle issue si nécessaire









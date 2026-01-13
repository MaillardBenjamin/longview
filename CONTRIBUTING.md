# Guide de Contribution

Merci de votre intérêt pour contribuer à LongView ! Ce document fournit des guidelines pour contribuer au projet.

## 🚀 Démarrage rapide

1. **Fork** le repository
2. **Clone** votre fork : `git clone https://github.com/votre-username/LongView.git`
3. **Créez une branche** : `git checkout -b feature/ma-fonctionnalite`
4. **Faites vos modifications**
5. **Testez** vos changements
6. **Commitez** : `git commit -m "Ajout de ma fonctionnalité"`
7. **Pushez** : `git push origin feature/ma-fonctionnalite`
8. **Ouvrez une Pull Request**

## 📋 Standards de code

### Python (Backend)

- **Style** : Suivre PEP 8
- **Formatage** : Utiliser `black` (recommandé) ou au minimum respecter l'indentation de 4 espaces
- **Docstrings** : Utiliser le format Google Style pour toutes les fonctions et classes publiques
- **Type hints** : Ajouter des annotations de type pour tous les paramètres et valeurs de retour

#### Exemple de docstring

```python
def calculate_capital(
    initial_amount: float,
    monthly_contribution: float,
    years: int,
    annual_return: float,
) -> float:
    """
    Calcule le capital final après une période d'épargne.
    
    Args:
        initial_amount: Capital initial en euros
        monthly_contribution: Contribution mensuelle en euros
        years: Nombre d'années d'épargne
        annual_return: Rendement annuel attendu (décimal, ex: 0.07 pour 7%)
    
    Returns:
        Capital final en euros
    
    Raises:
        ValueError: Si years est négatif ou annual_return est invalide
    """
    if years < 0:
        raise ValueError("years doit être positif")
    # ... implémentation
```

### TypeScript/React (Frontend)

- **Style** : Suivre les conventions ESLint configurées
- **Formatage** : Utiliser Prettier (recommandé)
- **JSDoc** : Ajouter des commentaires JSDoc pour les fonctions publiques et les composants
- **TypeScript** : Utiliser des types stricts, éviter `any`

#### Exemple de JSDoc

```typescript
/**
 * Calcule le capital final après une période d'épargne.
 * 
 * @param initialAmount - Capital initial en euros
 * @param monthlyContribution - Contribution mensuelle en euros
 * @param years - Nombre d'années d'épargne
 * @param annualReturn - Rendement annuel attendu (décimal, ex: 0.07 pour 7%)
 * @returns Capital final en euros
 * @throws {Error} Si years est négatif ou annualReturn est invalide
 */
function calculateCapital(
  initialAmount: number,
  monthlyContribution: number,
  years: number,
  annualReturn: number,
): number {
  if (years < 0) {
    throw new Error("years doit être positif");
  }
  // ... implémentation
}
```

## 🧪 Tests

### Backend

Les tests doivent être placés dans le répertoire `tests/` à la racine du projet.

```bash
# Structure recommandée
tests/
├── unit/
│   ├── test_services.py
│   └── test_models.py
├── integration/
│   └── test_api.py
└── conftest.py
```

Exécuter les tests :

```bash
pytest
```

### Frontend

Les tests doivent être placés dans `frontend/src/__tests__/`.

```bash
# Structure recommandée
frontend/src/__tests__/
├── components/
├── hooks/
└── services/
```

## 📝 Documentation

### Documentation du code

- **Toutes les fonctions publiques** doivent avoir des docstrings/JSDoc
- **Tous les modules** doivent avoir une docstring de module
- **Les classes** doivent documenter leurs attributs et méthodes

### Documentation technique

La documentation technique est dans `documentation/`. Si vous modifiez :

- L'architecture → Mettre à jour `ARCHITECTURE.md`
- L'API → Mettre à jour `API.md`
- Les algorithmes → Mettre à jour `ALGORITHMES.md`
- Le déploiement → Mettre à jour `DEPLOIEMENT.md`

## 🔍 Processus de revue

1. **Votre PR sera revue** par les mainteneurs
2. **Les commentaires** seront adressés dans la PR
3. **Les tests** doivent passer
4. **Le code** doit respecter les standards
5. **La documentation** doit être à jour

## 🐛 Signaler un bug

Ouvrez une issue avec :

- **Description** claire du problème
- **Étapes pour reproduire**
- **Comportement attendu**
- **Comportement observé**
- **Environnement** (OS, versions Python/Node, etc.)
- **Logs** si applicable

## 💡 Proposer une fonctionnalité

Ouvrez une issue avec :

- **Description** de la fonctionnalité
- **Cas d'usage** et bénéfices
- **Implémentation** proposée (si vous avez des idées)
- **Alternatives** considérées

## 📦 Structure des commits

Utilisez des messages de commit clairs et descriptifs :

```
feat: Ajout de la simulation de retraite anticipée
fix: Correction du calcul des taxes pour l'assurance-vie
docs: Mise à jour de la documentation API
refactor: Refactorisation du module Monte Carlo
test: Ajout de tests pour l'optimisation
chore: Mise à jour des dépendances
```

Préfixes recommandés :
- `feat:` : Nouvelle fonctionnalité
- `fix:` : Correction de bug
- `docs:` : Documentation
- `refactor:` : Refactorisation
- `test:` : Tests
- `chore:` : Tâches de maintenance

## 🔐 Sécurité

Si vous trouvez une vulnérabilité de sécurité :

- **Ne pas** ouvrir d'issue publique
- **Contacter** directement les mainteneurs
- **Attendre** la confirmation avant de divulguer

## 📄 Licence

En contribuant, vous acceptez que vos contributions soient sous la même licence que le projet (MIT).

## ❓ Questions ?

N'hésitez pas à ouvrir une issue pour poser des questions ou demander de l'aide !

## 🙏 Merci !

Merci de contribuer à LongView ! Chaque contribution, même petite, est appréciée.

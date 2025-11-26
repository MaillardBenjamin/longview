# Documentation des Algorithmes LongView

## Vue d'ensemble

LongView utilise plusieurs algorithmes pour simuler l'évolution financière et optimiser les plans d'épargne :

1. **Simulation Monte Carlo** : Projection probabiliste avec tirages aléatoires
2. **Optimisation par dichotomie** : Recherche du facteur d'épargne optimal
3. **Gestion des corrélations** : Décomposition de Cholesky pour les rendements corrélés
4. **Calcul des taxes** : Modélisation de la fiscalité française

## Simulation Monte Carlo

### Principe

La simulation Monte Carlo génère de nombreux scénarios aléatoires pour estimer la distribution probabiliste du capital futur. Chaque scénario représente une trajectoire possible des marchés financiers.

### Étapes du calcul

1. **Initialisation** : Capital de départ, comptes d'investissement, phases d'épargne
2. **Pour chaque mois** :
   - Génération de rendements corrélés pour chaque classe d'actif
   - Ajustement pour l'inflation
   - Application des rendements aux comptes selon leur allocation
   - Ajout des contributions mensuelles
   - Calcul des taxes (si applicable)
3. **Agrégation** : Calcul des percentiles (10%, 50%, 90%) sur tous les scénarios

### Génération de rendements corrélés

Utilisation de la **décomposition de Cholesky** pour générer des rendements corrélés :

```python
# Matrice de corrélation C
# Décomposition : C = L * L^T
L = cholesky(C)

# Génération de rendements corrélés
z = L @ random_normal_vector
rendements = mu + sigma * z
```

Où :
- `mu` : Rendement attendu par classe d'actif
- `sigma` : Volatilité par classe d'actif
- `C` : Matrice de corrélation entre classes d'actif

### Ajustement pour l'inflation

L'inflation est modélisée comme un processus aléatoire :

```python
inflation_choc = normal(inflation_mean, inflation_volatility)
rendement_reel = rendement_nominal - inflation_choc
```

### Convergence adaptative

Le nombre d'itérations Monte Carlo est adaptatif selon la précision requise :

- **Début de recherche** (plage large) : 100 itérations
- **Milieu** (plage moyenne) : 100-500 itérations
- **Fin** (plage étroite) : 500-1000 itérations
- **Évaluation finale** : Maximum configuré (défaut : 20 000)

La convergence est vérifiée par batchs :
- Chaque batch de `batch_size` itérations
- Calcul de la marge d'erreur statistique
- Arrêt si `marge_erreur / moyenne < tolerance_ratio`

## Optimisation par dichotomie

### Objectif

Trouver le **facteur d'échelle** optimal des épargnes mensuelles pour atteindre un capital cible en fin de vie.

### Principe

L'algorithme utilise une **recherche par dichotomie** (bisection) :

1. **Évaluation initiale** : Test avec facteur 0 (épargnes existantes uniquement)
2. **Recherche de borne supérieure** : Doublement du facteur jusqu'à trouver une solution suffisante
3. **Dichotomie** : Réduction progressive de l'intervalle [low, high]
4. **Évaluation finale** : Réévaluation avec le maximum d'itérations pour précision maximale

### Condition de suffisance

Un scénario est considéré comme **suffisant** si :

```python
sufficient = (
    months_remaining_penalty == 0  # Pas d'épuisement précoce
    and error >= -tolerance_capital  # Capital >= objectif - tolérance
)
```

Où :
- `error = capital_effectif - capital_cible`
- `tolerance_capital = max(100€, abs(capital_cible) * tolerance_ratio)`

**Note importante** : L'algorithme accepte un dépassement de l'objectif (capital > objectif) car il ne peut qu'augmenter l'épargne, pas la réduire.

### Pénalité pour épuisement précoce

Si le capital médian s'épuise avant l'espérance de vie, une pénalité est appliquée :

```python
early_penalty = revenu_mensuel_cible * mois_manquants
capital_effectif = capital_brut - early_penalty
```

### Courbes retournées

L'algorithme retourne **toujours les courbes avec les versements réels** (scale=1.0), même si le facteur optimal trouvé est différent. Cela permet d'afficher les projections avec les versements actuels de l'utilisateur, tout en indiquant l'épargne minimum supplémentaire nécessaire.

## Gestion des taxes

### Paramètres fiscaux

Les paramètres de taxation sont configurables :

```python
tax_parameters = {
    "tmi_savings_phase": 30,      # TMI pendant la phase d'épargne (%)
    "tmi_retirement_phase": 14,   # TMI pendant la retraite (%)
    "is_couple": False             # Foyer fiscal (couple ou célibataire)
}
```

### Calcul des taxes par type de compte

#### PEA (Plan d'Épargne en Actions)
- **Plus-values** : Exonérées après 5 ans
- **Prélèvements sociaux** : 17.2% sur les plus-values

#### PER (Plan d'Épargne Retraite)
- **Retraits** : Imposables au barème progressif
- **Prélèvements sociaux** : 17.2%

#### Assurance-vie
- **Avant 8 ans** : Prélèvements sociaux 17.2% + IR selon TMI
- **Après 8 ans** : Abattement de 4 600€ (célibataire) ou 9 200€ (couple)

#### Livrets réglementés
- **Intérêts** : Exonérés d'impôt sur le revenu
- **Prélèvements sociaux** : 17.2% (depuis 2013)

#### CTO (Compte Titres Ordinaire)
- **Plus-values** : Imposables au barème progressif
- **Prélèvements sociaux** : 17.2%

### Calcul mensuel

Pour chaque mois de retraite :

1. **Retrait brut** : Montant nécessaire pour couvrir les dépenses
2. **Répartition par compte** : Selon l'allocation et les règles de retrait
3. **Calcul des plus-values** : Différence entre valeur actuelle et coût d'acquisition
4. **Application des taxes** : Selon le type de compte et la durée de détention
5. **Retrait net** : Retrait brut - taxes

## Phase de capitalisation

### Calcul mensuel

Pour chaque mois jusqu'à la retraite :

```python
# Pour chaque compte d'investissement
capital_initial = compte.current_amount
contribution = compte.monthly_contribution * scale_factor

# Génération de rendements
rendements = generer_rendements_correlés(market_assumptions)

# Application des rendements selon l'allocation
rendement_compte = (
    allocation_actions * rendement_actions +
    allocation_obligations * rendement_obligations +
    allocation_livrets * rendement_livrets
)

# Mise à jour du capital
capital_final = capital_initial * (1 + rendement_compte) + contribution
```

### Phases d'épargne

Les phases d'épargne permettent de modéliser des changements dans les versements :

```python
savings_phases = [
    {"from_age": 35, "to_age": 45, "monthly_contribution": 1000},
    {"from_age": 45, "to_age": 65, "monthly_contribution": 1500}
]
```

Les contributions sont appliquées uniquement si l'âge actuel est dans la plage `[from_age, to_age)`.

## Phase de retraite

### Calcul mensuel

Pour chaque mois pendant la retraite :

```python
# Calcul du besoin mensuel
besoin_mensuel = (
    target_monthly_income * spending_ratio -
    state_pension_monthly_income -
    additional_income
)

# Répartition du retrait par compte
retrait_par_compte = repartir_retrait(besoin_mensuel, comptes, allocation)

# Pour chaque compte
plus_value = capital_actuel - cout_acquisition
taxes = calculer_taxes(plus_value, type_compte, duree_detention)
retrait_net = retrait_brut - taxes

# Mise à jour du capital
capital_final = capital_initial - retrait_net
capital_final *= (1 + rendement_compte)  # Rendements après retrait
```

### Profil de dépenses

Le profil de dépenses permet de modéliser l'évolution des besoins :

```python
spending_profile = [
    {"from_age": 65, "to_age": 75, "spending_ratio": 1.0},   # 100% du revenu cible
    {"from_age": 75, "to_age": 85, "spending_ratio": 0.8},   # 80% du revenu cible
]
```

Le `spending_ratio` est multiplié par `target_monthly_income` pour obtenir le besoin mensuel.

## Scénarios de retraite

L'algorithme calcule trois scénarios basés sur les percentiles de capitalisation :

- **Pessimiste** : Capital initial = percentile 10 de la capitalisation
- **Médian** : Capital initial = percentile 50 (médiane)
- **Optimiste** : Capital initial = percentile 90

Chaque scénario est simulé indépendamment pour obtenir les trajectoires de décumulation.

## Performance et optimisation

### Complexité

- **Simulation Monte Carlo** : O(n × m × a)
  - n : nombre d'itérations
  - m : nombre de mois
  - a : nombre de comptes d'investissement

- **Optimisation** : O(log(k) × n × m × a)
  - k : nombre d'itérations de dichotomie (typiquement 10-20)
  - n, m, a : comme ci-dessus

### Optimisations

1. **Itérations adaptatives** : Réduction du nombre d'itérations en début de recherche
2. **Batch processing** : Vérification de convergence par batchs
3. **Calcul vectorisé** : Utilisation de NumPy pour les calculs matriciels
4. **Cache des corrélations** : Décomposition de Cholesky calculée une seule fois

### Temps de calcul typiques

- **Capitalisation seule** (200 itérations) : ~1-2 secondes
- **Retraite seule** (200 itérations) : ~1-2 secondes
- **Optimisation complète** (10 itérations dichotomie) : ~30-60 secondes

Les temps peuvent varier selon :
- Nombre de comptes d'investissement
- Durée de la simulation (âge actuel → espérance de vie)
- Nombre d'itérations Monte Carlo configuré


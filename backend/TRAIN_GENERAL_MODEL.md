# Entraînement du Modèle RL Général

## 🎯 Objectif

Entraîner un modèle RL généralisé qui peut être utilisé par **tous les utilisateurs** du site, grâce à la normalisation des états.

## 📋 Utilisation

### Configuration recommandée (Solide - 2-3h)

```bash
cd backend
python train_general_rl_model.py --profiles 50 --episodes 3000 --network solid
```

**Paramètres :**
- `--profiles 50` : 50 profils variés
- `--episodes 3000` : 3000 épisodes par profil
- `--network solid` : Réseau [256, 128, 64, 32]
- **Total : 150 000 épisodes**
- **Temps estimé : 2-3 heures**

### Configuration robuste (4-8h)

```bash
python train_general_rl_model.py --profiles 50 --episodes 10000 --network robust
```

**Paramètres :**
- `--profiles 50` : 50 profils variés
- `--episodes 10000` : 10000 épisodes par profil
- `--network robust` : Réseau [512, 256, 128, 64]
- **Total : 500 000 épisodes**
- **Temps estimé : 4-8 heures**

### Configuration rapide (test - 10 min)

```bash
python train_general_rl_model.py --profiles 5 --episodes 500 --network standard --yes
```

## 🚀 Lancer l'entraînement

```bash
cd backend
python train_general_rl_model.py --profiles 50 --episodes 3000 --network solid
```

Le script va :
1. Générer 50 profils variés (âges, revenus, capitaux différents)
2. Entraîner le modèle sur tous ces profils
3. Sauvegarder le modèle dans `backend/app/models/rl/rl_model_general_solid.zip`
4. Tous les utilisateurs pourront ensuite utiliser ce modèle !

## 📊 Options disponibles

```bash
python train_general_rl_model.py --help
```

- `--profiles N` : Nombre de profils (défaut: 50)
- `--episodes N` : Épisodes par profil (défaut: 3000)
- `--network {standard|solid|robust|enterprise}` : Taille du réseau (défaut: solid)
- `--name NAME` : Nom du modèle (défaut: general)
- `--yes` : Ne pas demander de confirmation

## 📍 Localisation du modèle

Le modèle sera sauvegardé dans :
```
backend/app/models/rl/rl_model_general_{network_size}.zip
```

## 🔄 Utilisation automatique

Une fois le modèle général entraîné :
- Les utilisateurs qui cochent "Utiliser un modèle pré-entraîné" utiliseront automatiquement ce modèle
- Temps de réponse : 10-30 secondes (au lieu de 2-5 minutes d'entraînement)
- Le modèle fonctionne pour tous grâce à la normalisation des états

## ⚙️ Prochaines étapes

1. Lancer l'entraînement avec la configuration recommandée
2. Attendre la fin (2-3 heures)
3. Le modèle sera automatiquement utilisé par tous les utilisateurs !






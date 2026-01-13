# 🚀 Configuration pour Entraînement de 12 Heures

## 📊 Calculs Basés sur les Performances Actuelles

**FPS observé** : ~340 fps  
**Temps par épisode** : ~1.06 secondes (360 steps / 340 fps)  
**Épisodes par heure** : ~3,400 épisodes  
**Épisodes pour 12h** : ~40,800 épisodes

## 🎯 Options de Configuration

### Option 1 : Modèle Solide (Recommandé)
**Temps estimé** : ~12 heures

```bash
cd /Users/benjaminmaillard/Documents/LongView/backend
source .venv/bin/activate
python train_general_rl_model.py --profiles 15 --episodes 3000 --network solid --yes
```

**Détails** :
- 15 profils variés
- 3000 épisodes par profil
- Total : 45,000 épisodes (~13 heures)
- Réseau : solid (256, 128, 64, 32) - bon équilibre vitesse/qualité

### Option 2 : Modèle Robuste (Plus de profils)
**Temps estimé** : ~12 heures

```bash
cd /Users/benjaminmaillard/Documents/LongView/backend
source .venv/bin/activate
python train_general_rl_model.py --profiles 20 --episodes 2000 --network solid --yes
```

**Détails** :
- 20 profils variés
- 2000 épisodes par profil
- Total : 40,000 épisodes (~12 heures)
- Plus de diversité de profils

### Option 3 : Modèle Standard (Plus rapide, moins de profils)
**Temps estimé** : ~12 heures

```bash
cd /Users/benjaminmaillard/Documents/LongView/backend
source .venv/bin/activate
python train_general_rl_model.py --profiles 10 --episodes 4000 --network solid --yes
```

**Détails** :
- 10 profils
- 4000 épisodes par profil
- Total : 40,000 épisodes (~12 heures)
- Plus d'épisodes par profil = meilleure convergence

### Option 4 : Modèle Robuste (Réseau plus grand)
**Temps estimé** : ~12-14 heures

```bash
cd /Users/benjaminmaillard/Documents/LongView/backend
source .venv/bin/activate
python train_general_rl_model.py --profiles 12 --episodes 3000 --network robust --yes
```

**Détails** :
- 12 profils
- 3000 épisodes par profil
- Total : 36,000 épisodes (~11 heures)
- Réseau : robust (512, 256, 128, 64) - plus de capacité

## 💡 Recommandation

**Je recommande l'Option 1** (15 profils × 3000 épisodes) car :
- ✅ Bon équilibre entre diversité de profils et profondeur d'entraînement
- ✅ Réseau "solid" offre un bon compromis vitesse/qualité
- ✅ Durée proche de 12 heures
- ✅ Modèle généralisé de bonne qualité

## 📋 Commande Complète (Option 1 - Recommandée)

```bash
cd /Users/benjaminmaillard/Documents/LongView/backend && source .venv/bin/activate && python train_general_rl_model.py --profiles 15 --episodes 3000 --network solid --yes
```

## 🔍 Surveillance Pendant l'Entraînement

### Vérifier la progression :
```bash
cd /Users/benjaminmaillard/Documents/LongView/backend
tail -f train_general_model.log | grep -E "(Profil|Checkpoint|Terminé)"
```

### Vérifier l'utilisation CPU :
```bash
top -l 1 | grep "CPU usage"
```

### Vérifier que le processus tourne toujours :
```bash
ps aux | grep train_general_rl_model | grep -v grep
```

## ⏱️ Estimation du Temps

Avec la parallélisation activée (FPS ~340) :
- **Par profil** : ~50 minutes (3000 épisodes)
- **Total 15 profils** : ~12-13 heures
- **Sauvegardes** : Tous les 10 profils + à la fin

## 📊 Fichiers Générés

Le modèle sera sauvegardé dans :
- `app/models/rl/rl_model_general_solid.zip` (modèle final)
- `app/models/rl/rl_model_general_solid_temp.zip` (checkpoint temporaire)

## 🎯 Après l'Entraînement

Le modèle pourra être utilisé par tous les utilisateurs avec l'option `use_pre_trained=true` dans l'API.





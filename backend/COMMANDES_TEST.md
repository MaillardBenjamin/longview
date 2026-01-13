# 🧪 Commandes de Test pour la Parallélisation

## Test Rapide (Recommandé pour vérifier)

**Temps estimé** : 5-10 minutes

```bash
cd /Users/benjaminmaillard/Documents/LongView/backend
source .venv/bin/activate
python train_general_rl_model.py --profiles 2 --episodes 100 --network solid --yes
```

**Ou utiliser le script** :
```bash
cd /Users/benjaminmaillard/Documents/LongView/backend
./test_parallelisation.sh
```

## Test Moyen (Pour valider la performance)

**Temps estimé** : 30-60 minutes

```bash
cd /Users/benjaminmaillard/Documents/LongView/backend
source .venv/bin/activate
python train_general_rl_model.py --profiles 5 --episodes 500 --network solid --yes
```

## Test Complet (Pour un modèle utilisable)

**Temps estimé** : 2-4 heures

```bash
cd /Users/benjaminmaillard/Documents/LongView/backend
source .venv/bin/activate
python train_general_rl_model.py --profiles 10 --episodes 1000 --network solid --yes
```

## 🔍 Vérification de la Parallélisation

Pendant l'exécution, vérifiez dans un autre terminal :

### 1. Vérifier les logs de configuration
```bash
tail -f train_general_model.log | grep -E "(PARALLÉLISATION|SubprocVecEnv|Workers|CONFIGURATION OPTIMISÉE)"
```

**Résultat attendu** :
- ✅ `PARALLÉLISATION ACTIVÉE`
- ✅ `SubprocVecEnv` (pas `DummyVecEnv`)
- ✅ `Workers configurés: 10` (ou similaire)

### 2. Vérifier l'utilisation CPU
```bash
top -l 1 | head -20
```

**Résultat attendu** :
- CPU système : 80-90% utilisé (pas 5%)
- Processus Python : plusieurs threads actifs

### 3. Vérifier les threads du processus
```bash
# Trouver le PID
ps aux | grep train_general_rl_model | grep -v grep

# Vérifier les threads (remplacer <PID> par le PID réel)
ps -p <PID> -M | wc -l
```

**Résultat attendu** :
- Plus de 10 threads (indique la parallélisation)

## ⚠️ Signes que la Parallélisation NE fonctionne PAS

Si vous voyez :
- ❌ `DummyVecEnv` dans les logs
- ❌ `PARALLÉLISATION DÉSACTIVÉE`
- ❌ CPU système à 5-10%
- ❌ Seulement 1-2 threads

Alors la parallélisation n'est pas activée. Arrêtez le processus et vérifiez le code.

## 📊 Comparaison des Performances

| Configuration | Temps sans parallélisation | Temps avec parallélisation |
|---------------|---------------------------|----------------------------|
| 2 profils × 100 épisodes | ~2 heures | ~5-10 minutes |
| 5 profils × 500 épisodes | ~10 heures | ~30-60 minutes |
| 10 profils × 1000 épisodes | ~2 jours | ~2-4 heures |

## 🎯 Recommandation

1. **Commencez par le test rapide** (2 profils, 100 épisodes) pour vérifier que tout fonctionne
2. **Vérifiez les logs** pour confirmer la parallélisation
3. **Si OK**, lancez un test moyen ou complet selon vos besoins





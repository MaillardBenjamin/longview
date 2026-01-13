# Vérification de la Parallélisation

## 📋 Logs à surveiller au lancement

Lors du lancement de l'entraînement, vous devriez voir **plusieurs indicateurs** montrant que la parallélisation est activée :

### 1. **Au démarrage du script** (`train_general_rl_model.py`)

```
======================================================================
🔧 CONFIGURATION OPTIMISÉE POUR M4 PRO
   • Cores disponibles: 12
   • Workers configurés: 10
   • Device: mps
   • Parallélisation: ✅ ACTIVÉE
======================================================================

======================================================================
⚙️  CONFIGURATION DE L'ENTRAÎNEMENT
   • Workers: 10 (multiprocessing réel)
   • Device: mps
   • Réseau: [256, 128, 64, 32]
   • Parallélisation: ✅ ACTIVÉE
======================================================================
```

### 2. **Lors de la création de l'environnement** (pour chaque profil)

```
✅ PARALLÉLISATION: Création d'un environnement vectorisé avec 10 workers (SubprocVecEnv - multiprocessing réel)
```

### 3. **Au début de chaque entraînement de profil**

```
======================================================================
🚀 PARALLÉLISATION ACTIVÉE
   • Nombre de workers: 10
   • Type: SubprocVecEnv (multiprocessing réel)
   • Device: mps
   • Épisodes: 3000
======================================================================
```

## ✅ Comment vérifier que ça fonctionne

### Option 1 : Regarder les logs au démarrage
Les logs ci-dessus doivent apparaître **immédiatement** au lancement.

### Option 2 : Vérifier les processus système
Dans un autre terminal, pendant l'entraînement :
```bash
ps aux | grep train_general_rl_model | grep -v grep
ps -M -p <PID> | wc -l  # Devrait montrer ~10+ threads
```

### Option 3 : Surveiller l'utilisation CPU
Pendant l'entraînement, l'utilisation CPU devrait être élevée (80-100%) sur plusieurs cores :
```bash
top -l 1 | head -20
# ou
htop  # Si installé
```

## ⚠️ Si la parallélisation n'est PAS activée

Si vous voyez :
```
⚠️  PARALLÉLISATION DÉSACTIVÉE (environnement unique)
```
ou
```
Création d'un environnement unique (DummyVecEnv)
```

Cela signifie que quelque chose ne fonctionne pas. Vérifiez :
1. Que `config.use_parallel = True`
2. Que `config.num_workers > 1`
3. Les erreurs dans les logs

## 📊 Performance attendue

**AVEC parallélisation (10 workers) :**
- ~6-12 minutes par profil
- Utilisation CPU : 80-100% sur 10+ cores

**SANS parallélisation :**
- ~60-120 minutes par profil
- Utilisation CPU : ~10-20% sur 1-2 cores






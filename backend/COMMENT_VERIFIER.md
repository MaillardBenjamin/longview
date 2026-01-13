# 🔍 Comment Vérifier que la Parallélisation Fonctionne

## ✅ Signes que ça FONCTIONNE

### 1. Dans les logs (train_general_model.log)

Cherchez ces messages :
```bash
cd /Users/benjaminmaillard/Documents/LongView/backend
tail -f train_general_model.log | grep -E "(PARALLÉLISATION|SubprocVecEnv|Workers)"
```

**Résultat attendu** :
- ✅ `✅ PARALLÉLISATION: Création d'un environnement vectorisé avec X workers (SubprocVecEnv - multiprocessing réel)`
- ✅ `Workers configurés: 10` (ou un nombre > 1)
- ✅ `PARALLÉLISATION ACTIVÉE`

**Si vous voyez** :
- ❌ `DummyVecEnv` → La parallélisation n'est PAS activée
- ❌ `Création d'un environnement unique` → La parallélisation n'est PAS activée

### 2. Utilisation CPU

```bash
top -l 1 | head -15
```

**Résultat attendu** :
- ✅ CPU système : **50-90% utilisé** (pas 5-10%)
- ✅ CPU inactif : **10-50%** (pas 90%)

### 3. Threads du processus

```bash
# Trouver le PID
PID=$(ps aux | grep train_general_rl_model | grep -v grep | awk '{print $2}')

# Compter les threads
ps -p $PID -M | wc -l
```

**Résultat attendu** :
- ✅ **Plus de 10 threads** (indique la parallélisation)

### 4. Utilisation CPU du processus Python

```bash
ps aux | grep train_general_rl_model | grep -v grep
```

**Résultat attendu** :
- ✅ **%CPU élevé** (50-100%) sur un seul processus
- ✅ Plusieurs processus Python enfants (workers)

## 🚨 Signes que ça NE FONCTIONNE PAS

- ❌ Logs montrent `DummyVecEnv`
- ❌ CPU système à 5-10%
- ❌ Seulement 1-5 threads
- ❌ Message "Création d'un environnement unique"

## 📊 Commande Rapide de Vérification

```bash
cd /Users/benjaminmaillard/Documents/LongView/backend
./verifier_parallelisation.sh
```

Ou manuellement :

```bash
# 1. Vérifier les logs
grep -E "(SubprocVecEnv|DummyVecEnv|PARALLÉLISATION)" train_general_model.log | tail -5

# 2. Vérifier l'utilisation CPU
top -l 1 | grep "CPU usage"

# 3. Vérifier les threads
PID=$(ps aux | grep train_general_rl_model | grep -v grep | awk '{print $2}')
ps -p $PID -M | wc -l
```

## 🔧 Si la Parallélisation ne Fonctionne PAS

1. **Vérifiez la configuration dans les logs** :
   ```bash
   grep -E "(CONFIGURATION OPTIMISÉE|Workers configurés|num_workers)" train_general_model.log | tail -10
   ```

2. **Si num_workers = 1 ou 0**, le problème vient de la configuration
3. **Si num_workers > 1 mais DummyVecEnv**, il y a un bug dans le code

## 💡 Note

Même si vous voyez plusieurs threads (15 dans votre cas), si les logs montrent `DummyVecEnv`, la parallélisation n'est **pas** activée correctement. Les threads peuvent venir d'autres parties du code (PyTorch, etc.).





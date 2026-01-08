# 🚀 Guide de Déploiement - VM Google Cloud

Ce guide vous accompagne dans la configuration du déploiement automatique sur une VM Google Cloud via GitHub Actions.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Configuration SSH](#configuration-ssh)
3. [Configuration des secrets GitHub](#configuration-des-secrets-github)
4. [Architecture du déploiement](#architecture-du-déploiement)
5. [Test du déploiement](#test-du-déploiement)
6. [Troubleshooting](#troubleshooting)

## 🎯 Prérequis

### Informations fournies

Vous devez avoir reçu :

- **📍 Adresse IP** : L'IP publique de votre VM (ex: `34.40.51.24`)
- **👤 Username** : Votre nom d'utilisateur SSH (ex: `student`)
- **🔐 Clé privée SSH** : Fichier commençant par `-----BEGIN PRIVATE KEY-----`

### Logiciels requis

- **Git** : Pour cloner et pousser le code
- **SSH client** : Généralement installé par défaut (OpenSSH)
- **Compte GitHub** : Avec accès au repository

## 🔑 Configuration SSH

### 1. Créer le fichier de clé

**Sur Linux/Mac :**

```bash
# Créer le dossier .ssh si nécessaire
mkdir -p ~/.ssh

# Créer le fichier de clé
nano ~/.ssh/tp_cicd_key
```

**Sur Windows (PowerShell) :**

```powershell
# Créer le dossier .ssh si nécessaire
mkdir -p $env:USERPROFILE\.ssh

# Créer le fichier avec notepad
notepad $env:USERPROFILE\.ssh\tp_cicd_key
```

**Important** : Copiez-collez TOUTE la clé privée incluant les lignes :
```
-----BEGIN PRIVATE KEY-----
[contenu de la clé]
-----END PRIVATE KEY-----
```

### 2. Sécuriser les permissions

**Sur Linux/Mac :**

```bash
chmod 600 ~/.ssh/tp_cicd_key
```

**Sur Windows (PowerShell) :**

```powershell
# Optionnel : Restreindre les permissions
icacls $env:USERPROFILE\.ssh\tp_cicd_key /inheritance:r /grant:r "$env:USERNAME:(R)"
```

### 3. Tester la connexion

Remplacez `VOTRE_IP` par votre adresse IP :

```bash
ssh -i ~/.ssh/tp_cicd_key student@VOTRE_IP
```

**Lors de la première connexion**, SSH demandera de confirmer l'empreinte du serveur :
```
The authenticity of host '34.40.51.24 (34.40.51.24)' can't be established.
ED25519 key fingerprint is SHA256:...
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

Tapez `yes` et appuyez sur Entrée.

### 4. Vérifier Docker

Une fois connecté, vérifiez que Docker fonctionne :

```bash
docker --version
docker ps
```

Vous devriez voir la version de Docker et un tableau (même vide).

Pour vous déconnecter :
```bash
exit
```

## 🔐 Configuration des secrets GitHub

Les secrets doivent être configurés dans GitHub pour que le workflow puisse se connecter à votre VM.

### 1. Accéder aux secrets

1. Allez sur votre repository GitHub : `https://github.com/LoricVe/anything-ipsum`
2. Cliquez sur **Settings** (⚙️)
3. Dans le menu de gauche : **Secrets and variables** → **Actions**
4. Cliquez sur **"New repository secret"**

### 2. Créer les secrets requis

Créez les secrets suivants **un par un** :

#### Secret 1 : `VPS_HOST`

- **Name** : `VPS_HOST`
- **Secret** : `34.40.51.24` (votre adresse IP)
- Cliquez sur **"Add secret"**

#### Secret 2 : `VPS_USER`

- **Name** : `VPS_USER`
- **Secret** : `student`
- Cliquez sur **"Add secret"**

#### Secret 3 : `VPS_KEY`

- **Name** : `VPS_KEY`
- **Secret** : Copiez **TOUTE** la clé privée incluant :
  ```
  -----BEGIN PRIVATE KEY-----
  [contenu complet de la clé sur plusieurs lignes]
  -----END PRIVATE KEY-----
  ```
- ⚠️ **IMPORTANT** : Incluez les lignes BEGIN et END !
- Cliquez sur **"Add secret"**

#### Secret 4 : `MISTRAL_API_KEY` (optionnel)

- **Name** : `MISTRAL_API_KEY`
- **Secret** : Votre clé API Mistral (si vous en avez une)
- Si vous n'avez pas de clé, l'application fonctionnera en mode santé check uniquement
- Cliquez sur **"Add secret"**

### 3. Vérifier les secrets

Vous devriez voir 3 ou 4 secrets dans la liste :
- ✅ `VPS_HOST`
- ✅ `VPS_USER`
- ✅ `VPS_KEY`
- ✅ `MISTRAL_API_KEY` (optionnel)

⚠️ **Note** : Les valeurs des secrets sont masquées et ne peuvent pas être relues une fois créées.

## 🏗️ Architecture du déploiement

### Pipeline complet

Le workflow CI/CD se compose de 4 jobs séquentiels :

```
1. test           → Tests API avec Jest
    ↓
2. secrets-demo   → Démonstration des secrets (parallèle)
    ↓
3. build          → Build et push Docker image vers GHCR
    ↓
4. deploy         → Déploiement sur la VM via SSH
```

### Job de déploiement

Le job `deploy` effectue les actions suivantes :

1. **Connexion SSH** : Se connecte à la VM via SSH
2. **Login Docker** : S'authentifie sur GitHub Container Registry
3. **Pull image** : Télécharge la dernière image Docker
4. **Stop conteneur** : Arrête le conteneur existant (si présent)
5. **Cleanup** : Nettoie les anciennes images
6. **Start conteneur** : Lance le nouveau conteneur sur le port 80
7. **Vérification** : Vérifie que le conteneur est bien démarré

### Ports et exposition

- **Port interne** : Le conteneur écoute sur le port `4000`
- **Port externe** : La VM expose le port `80`
- **Mapping** : `-p 80:4000` redirige le trafic du port 80 vers 4000

### Variables d'environnement

Le conteneur est lancé avec :

```bash
-e MISTRAL_API_KEY=...     # Clé API Mistral
-e APP_URL=http://...      # URL de l'application
-e NODE_ENV=production     # Mode production
```

### Redémarrage automatique

```bash
--restart unless-stopped
```

Le conteneur redémarrera automatiquement :
- ✅ Si Docker redémarre
- ✅ Si la VM redémarre
- ❌ Sauf si arrêté manuellement avec `docker stop`

## 🧪 Test du déploiement

### 1. Déclencher un déploiement

Faites une modification dans votre code :

```bash
# Exemple : Modifier le README
echo "# Déploiement test" >> README.md

# Commiter et pusher
git add .
git commit -m "test: trigger deployment"
git push
```

### 2. Suivre l'exécution

1. Allez sur GitHub : **Actions**
2. Cliquez sur le workflow en cours
3. Observez les 4 jobs s'exécuter séquentiellement
4. Attendez que tous les jobs soient verts ✅

### 3. Vérifier le déploiement

Une fois le workflow terminé, ouvrez votre navigateur :

```
http://34.40.51.24
```

Vous devriez voir l'application **Anything Ipsum** !

### 4. Vérifier l'API health

```bash
curl http://34.40.51.24/api/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "timestamp": "2026-01-08T...",
  "uptime": 123,
  "ai_connection": true
}
```

## 🐛 Troubleshooting

### Erreurs SSH courantes

#### `Permission denied (publickey)`

**Cause** : Clé SSH incorrecte ou non reconnue

**Solutions** :
1. Vérifiez que vous utilisez le bon fichier : `-i ~/.ssh/tp_cicd_key`
2. Vérifiez les permissions : `chmod 600 ~/.ssh/tp_cicd_key`
3. Vérifiez que la clé privée est complète (BEGIN et END)
4. Vérifiez le username : `student@IP` (pas `root` ni autre)

#### `WARNING: UNPROTECTED PRIVATE KEY FILE`

**Cause** : Permissions trop ouvertes sur la clé

**Solution** :
```bash
chmod 600 ~/.ssh/tp_cicd_key
```

#### `Connection refused`

**Cause** : VM éteinte ou IP incorrecte

**Solutions** :
1. Vérifiez l'adresse IP
2. Vérifiez que la VM est démarrée (via la console Google Cloud)
3. Testez avec `ping VOTRE_IP`

#### `Host key verification failed`

**Cause** : Empreinte du serveur a changé (réinstallation de la VM)

**Solution** :
```bash
ssh-keygen -R VOTRE_IP
```

### Erreurs Docker dans le workflow

#### `Error response from daemon: pull access denied`

**Cause** : Le package Docker est privé

**Solutions** :
1. Rendez le package public :
   - GitHub → Repository → Packages
   - Cliquez sur le package
   - Package settings → Change visibility → Public
2. Ou configurez l'authentification Docker sur la VM

#### `docker: Error response from daemon: driver failed programming external connectivity`

**Cause** : Le port 80 est déjà utilisé

**Solution sur la VM** :
```bash
# Voir ce qui utilise le port 80
sudo netstat -tulpn | grep :80

# Arrêter le conteneur qui utilise le port
docker stop $(docker ps -q --filter "publish=80")
```

#### `Permission denied while trying to connect to Docker`

**Cause** : L'utilisateur n'est pas dans le groupe docker

**Solution** :
```bash
# Sur la VM
sudo usermod -aG docker $USER

# Déconnexion/reconnexion nécessaire
exit
ssh -i ~/.ssh/tp_cicd_key student@VOTRE_IP
```

### Erreurs de secrets GitHub

#### Secret non reconnu

**Symptômes** :
- Le workflow dit "Secret not configured"
- Variables d'environnement vides dans les logs

**Solutions** :
1. Vérifiez l'orthographe exacte du nom du secret
2. Vérifiez que le secret est créé au niveau **repository** (pas organization ni environment)
3. Re-créez le secret si nécessaire

#### Clé SSH invalide

**Symptômes** :
- `Load key "...": invalid format`
- `Permission denied (publickey)`

**Solutions** :
1. Vérifiez que la clé commence par `-----BEGIN PRIVATE KEY-----`
2. Vérifiez que la clé se termine par `-----END PRIVATE KEY-----`
3. Assurez-vous qu'il n'y a pas d'espaces en début/fin
4. Copiez-collez la clé entière (toutes les lignes)

### Vérifications sur la VM

Si le déploiement semble réussir mais l'app ne répond pas :

```bash
# Connexion à la VM
ssh -i ~/.ssh/tp_cicd_key student@34.40.51.24

# Vérifier que le conteneur tourne
docker ps

# Voir les logs du conteneur
docker logs anything-ipsum

# Vérifier les ports
docker port anything-ipsum

# Tester depuis la VM
curl http://localhost:80/api/health

# Sortir
exit
```

### Logs utiles

**Logs GitHub Actions** :
- Consultez les logs détaillés de chaque step
- Les secrets sont automatiquement masqués avec `***`

**Logs Docker sur la VM** :
```bash
docker logs anything-ipsum
docker logs -f anything-ipsum  # Mode suivi temps réel
```

**État du système sur la VM** :
```bash
# Espace disque
df -h

# Mémoire
free -h

# Processus Docker
docker stats anything-ipsum
```

## 🎯 Commandes utiles

### Sur votre machine locale

```bash
# Tester la connexion SSH
ssh -i ~/.ssh/tp_cicd_key student@34.40.51.24

# Exécuter une commande à distance
ssh -i ~/.ssh/tp_cicd_key student@34.40.51.24 "docker ps"

# Copier un fichier vers la VM
scp -i ~/.ssh/tp_cicd_key fichier.txt student@34.40.51.24:/home/student/
```

### Sur la VM

```bash
# Voir tous les conteneurs
docker ps -a

# Arrêter l'application
docker stop anything-ipsum

# Démarrer l'application
docker start anything-ipsum

# Redémarrer l'application
docker restart anything-ipsum

# Supprimer le conteneur
docker rm -f anything-ipsum

# Voir les logs
docker logs anything-ipsum

# Entrer dans le conteneur
docker exec -it anything-ipsum sh

# Nettoyer les images inutilisées
docker image prune -a

# Nettoyer tout (attention !)
docker system prune -a
```

## 📚 Ressources

- [Documentation SSH](https://www.ssh.com/academy/ssh)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [appleboy/ssh-action](https://github.com/appleboy/ssh-action)

## 🔒 Sécurité

### ⚠️ Points d'attention

1. **Ne jamais commiter la clé privée** dans le repository
2. **Utiliser uniquement des secrets GitHub** pour les credentials
3. **Changer les secrets** après la fin du TP
4. **Limiter l'accès** à la VM uniquement à ce qui est nécessaire
5. **Surveiller les logs** pour détecter des accès non autorisés

### ✅ Bonnes pratiques

- ✅ Clé SSH unique par projet/utilisateur
- ✅ Permissions 600 sur les clés privées
- ✅ Secrets GitHub pour toutes les credentials
- ✅ Firewall configuré (seuls ports 22 et 80 ouverts)
- ✅ Updates régulières de la VM
- ✅ Logs d'accès activés

---

**Note** : Ce guide fait partie du projet **Anything Ipsum** - TP CI/CD avec déploiement automatisé sur VM Google Cloud.

🎉 **Bon déploiement !**

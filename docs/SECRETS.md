# 🔐 Gestion des Secrets GitHub Actions

## Qu'est-ce qu'un secret ?

Les secrets GitHub permettent de stocker des informations sensibles de manière sécurisée :

- 🔒 **Chiffrés** : Les secrets sont chiffrés et jamais affichés dans les logs
- 🔑 **Sécurisés** : Injectés comme variables d'environnement dans les workflows
- 📍 **Centralisés** : Configurés une seule fois dans les settings du repository
- ⚠️ **Masqués** : Automatiquement masqués dans les sorties console

## ⚠️ Règle d'or

> **JAMAIS de credentials en clair dans le code !**
>
> Toujours utiliser des secrets pour :
> - Clés API (Mistral, OpenAI, etc.)
> - Tokens d'accès
> - Mots de passe
> - Certificats
> - Webhooks secrets

## 📝 Comment créer un secret

### 1. Via l'interface GitHub

1. Allez dans **Settings** de votre repository
2. Dans le menu de gauche : **Secrets and variables** → **Actions**
3. Cliquez sur **New repository secret**
4. Entrez le nom et la valeur du secret
5. Cliquez sur **Add secret**

### 2. Types de secrets disponibles

- **Repository secrets** : Disponibles pour un repository spécifique
- **Organization secrets** : Partagés entre plusieurs repos d'une organisation
- **Environment secrets** : Spécifiques à un environnement (production, staging, etc.)

## 🔧 Utilisation dans un workflow

### Exemple basique

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Use secret
        run: echo "Le secret est masqué : $MY_SECRET"
        env:
          MY_SECRET: ${{ secrets.MY_SECRET }}
```

### Exemple avec API key

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run tests with API key
        run: npm run test:api
        env:
          MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
          APP_URL: ${{ secrets.APP_URL }}
```

### Exemple de déploiement

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Render
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}" \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}"
        env:
          RENDER_DEPLOY_HOOK_URL: ${{ secrets.RENDER_DEPLOY_HOOK_URL }}
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
```

## 🤖 Secrets automatiques de GitHub

GitHub fournit automatiquement certains secrets et variables :

### `secrets.GITHUB_TOKEN`

Token d'authentification automatique avec permissions limitées au repository.

**Utilisations courantes :**
- Push vers GitHub Container Registry
- Création de releases
- Commentaires sur les PRs
- Accès aux APIs GitHub

**Exemple :**
```yaml
- name: Login to GHCR
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

### Variables de contexte automatiques

Ces variables sont disponibles sans configuration :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `github.actor` | Utilisateur qui a déclenché le workflow | `LoricVe` |
| `github.repository` | Nom complet du repository | `LoricVe/anything-ipsum` |
| `github.repository_owner` | Propriétaire du repository | `LoricVe` |
| `github.sha` | SHA complet du commit | `08aa0a1a3765a1e3...` |
| `github.ref` | Référence complète (branch/tag) | `refs/heads/master` |
| `github.ref_name` | Nom court de la référence | `master` |
| `github.event_name` | Type d'événement | `push`, `pull_request` |
| `github.run_id` | ID unique du workflow run | `123456789` |
| `github.run_number` | Numéro séquentiel du run | `42` |

**Exemple d'utilisation :**
```yaml
- name: Display workflow info
  run: |
    echo "Repository: ${{ github.repository }}"
    echo "Triggered by: ${{ github.actor }}"
    echo "Commit SHA: ${{ github.sha }}"
    echo "Branch: ${{ github.ref_name }}"
    echo "Event: ${{ github.event_name }}"
```

## 🛡️ Bonnes pratiques de sécurité

### ✅ À faire

1. **Utiliser des secrets pour toutes les données sensibles**
   ```yaml
   env:
     API_KEY: ${{ secrets.API_KEY }}
   ```

2. **Limiter les permissions du GITHUB_TOKEN**
   ```yaml
   permissions:
     contents: read
     packages: write
   ```

3. **Utiliser des environnements pour les déploiements**
   ```yaml
   jobs:
     deploy:
       environment: production
       steps:
         - name: Deploy
           env:
             DEPLOY_KEY: ${{ secrets.PRODUCTION_DEPLOY_KEY }}
   ```

4. **Rotation régulière des secrets**
   - Changez vos secrets régulièrement
   - Révoquez les anciens tokens

5. **Secrets par environnement**
   - Utilisez des secrets différents pour dev/staging/prod
   - Ne réutilisez jamais un secret de production ailleurs

### ❌ À éviter

1. **Ne jamais logger un secret**
   ```yaml
   # ❌ MAUVAIS
   - run: echo "My API key is ${{ secrets.API_KEY }}"

   # ✅ BON
   - run: echo "API key configured"
     env:
       API_KEY: ${{ secrets.API_KEY }}
   ```

2. **Ne jamais commiter de secrets**
   ```bash
   # Vérifiez avant de commit
   git diff

   # Utilisez un .gitignore
   .env
   .env.local
   secrets.yml
   ```

3. **Ne jamais partager de secrets en clair**
   - Utilisez des gestionnaires de mots de passe
   - Partagez via des canaux sécurisés
   - Rotation après partage

4. **Ne pas exposer les secrets dans les builds publics**
   ```yaml
   # Les PRs de forks n'ont pas accès aux secrets
   if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository
   ```

## 📋 Secrets requis pour ce projet

### Pour le build Docker

- **`GITHUB_TOKEN`** : ✅ Fourni automatiquement par GitHub

### Pour les tests API (optionnel en CI)

- **`MISTRAL_API_KEY`** : Clé API Mistral AI
  - Nécessaire si vous voulez tester la génération de contenu
  - Peut être mocké dans les tests

### Pour le déploiement (exercice suivant)

- **`RENDER_DEPLOY_HOOK_URL`** : URL du webhook Render
- **`RENDER_API_KEY`** : Token d'API Render (optionnel)

## 🔍 Debugging des secrets

### Vérifier qu'un secret existe

```yaml
- name: Check if secret exists
  run: |
    if [ -z "$MY_SECRET" ]; then
      echo "❌ Secret MY_SECRET is not set"
      exit 1
    else
      echo "✅ Secret MY_SECRET is configured"
    fi
  env:
    MY_SECRET: ${{ secrets.MY_SECRET }}
```

### Vérifier les permissions

```yaml
- name: Check GITHUB_TOKEN permissions
  run: |
    curl -H "Authorization: token ${{ secrets.GITHUB_TOKEN }}" \
         https://api.github.com/user
```

## 📚 Ressources

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Using environments for deployment](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

## 🎯 Exercice pratique

Créez un secret de test pour vérifier que vous avez compris :

1. Allez dans **Settings** → **Secrets and variables** → **Actions**
2. Créez un secret `MY_SECRET` avec la valeur `ceci-est-un-test`
3. Le workflow de démo affichera que le secret est configuré (mais pas sa valeur)
4. Vérifiez dans les logs que la valeur est masquée par `***`

---

**Note** : Ce document fait partie du projet **Anything Ipsum** et sert de référence pour la gestion sécurisée des secrets dans les workflows CI/CD.

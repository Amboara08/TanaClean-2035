# TanaClean 2035

Système intelligent d'optimisation de la collecte des déchets à Antananarivo.

**Auteur** : ANDRIAMAMONJISOA Amboara · **NIE** : SE20240277

---

## Table des matières

1. [Prérequis](#prérequis)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Base de données](#base-de-données)
5. [Lancement](#lancement)
6. [Comptes de test](#comptes-de-test)
7. [Tests](#tests)
8. [Générer l'installeur .exe Windows](#générer-linstalleur-exe-windows)
9. [Autres cibles de build](#autres-cibles-de-build)
10. [Architecture de sécurité](#architecture-de-sécurité)
11. [Structure du projet](#structure-du-projet)

---

## Prérequis

| Outil | Version minimale | Vérification |
|-------|-----------------|--------------|
| Node.js | 18 LTS | `node -v` |
| npm | 9+ | `npm -v` |
| MySQL | 8.0+ | `mysql --version` |
| Wine *(Windows .exe depuis macOS/Linux)* | 6+ | `wine --version` |

> **Note Windows** : Pour générer un `.exe` depuis **macOS ou Linux**, Wine est requis.  
> Sur macOS : `brew install --cask wine-stable`  
> Sur Linux : `sudo apt install wine`

---

## Installation

```bash
# 1. Décompresser ou cloner le projet
cd tana_clean

# 2. Installer toutes les dépendances (Node.js + Electron + electron-builder)
npm install
```

---

## Configuration

Créer (ou modifier) le fichier `.env` à la racine :

```env
PORT=3131
SESSION_SECRET=changez-ceci-en-production-min-32-chars

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=tana_clean
```

---

## Base de données

```bash
# Créer la base MySQL (une seule fois)
mysql -u root -e "CREATE DATABASE IF NOT EXISTS tana_clean CHARACTER SET utf8mb4;"

# Créer les tables et insérer les données de test
npm run seed
```

---

## Lancement

### Application Desktop — Administrateur uniquement

```bash
npm run electron
```

- Démarre sur **http://localhost:3132** (lié à `127.0.0.1` — machine locale uniquement)
- Réservé aux comptes `role = admin`
- Workers et citoyens sont bloqués à la connexion

### Serveur Web — Éboueurs et Citoyens

```bash
npm run dev      # développement (rechargement auto)
npm start        # production
```

- Accessible sur **http://localhost:3131**
- L'interface `/admin` est bloquée — redirige vers la page "utiliser l'app desktop"

> Les deux serveurs peuvent tourner **simultanément** sans conflit (ports séparés).  
> Si le port 3131 est déjà occupé : `lsof -ti :3131 | xargs kill -9`

---

## Comptes de test

| Rôle | Email | Mot de passe | Interface |
|------|-------|-------------|-----------|
| **Administrateur** | admin@tanaclean.mg | password123 | App Desktop uniquement |
| **Éboueur 1** | jean@tanaclean.mg | password123 | Navigateur web |
| **Éboueur 2** | rabe@tanaclean.mg | password123 | Navigateur web |
| **Citoyen 1** | voahary@mail.mg | password123 | Navigateur web |
| **Citoyen 2** | citizen2@tanaclean.mg | password123 | Navigateur web |

---

## Tests

```bash
npm test                    # Jest — dijkstra.test.js + greedy.test.js
npm test -- --verbose       # avec détail des cas de test
npm test -- --coverage      # rapport de couverture de code
```

---

## Générer l'installeur .exe Windows

### Prérequis supplémentaires

- **Depuis Windows** : rien de plus à installer.
- **Depuis macOS** : installer Wine → `brew install --cask wine-stable`
- **Depuis Linux** : `sudo apt install wine` ou `sudo dnf install wine`

### Étape 1 — S'assurer que la base de données tourne et est seedée

```bash
npm run seed
```

> Le build Electron embarque le code source — la DB MySQL reste externe et doit
> être configurée sur la machine cible via le fichier `.env`.

### Étape 2 — Lancer le build Windows

```bash
# Build .exe uniquement (x64)
npm run build -- --win

# Ou via la commande complète
npx electron-builder --win
```

La console affiche la progression :

```
• electron-builder  version=24.x
• loaded configuration  file=package.json ("build" field)
• description is missed in the package.json  appId=mg.tanaclean.app
• packaging       platform=win32 arch=x64 electron=30.x appOutDir=dist/win-unpacked
• building        target=nsis
• building block map
• built            installerPath=dist/TanaClean 2035 Setup 1.0.0.exe
```

### Étape 3 — Récupérer l'installeur

```
dist/
└── TanaClean 2035 Setup 1.0.0.exe   ← installeur NSIS (~120-200 Mo)
```

### Ce que fait l'installeur NSIS

L'installeur Windows généré est de type **NSIS** (Nullsoft Scriptable Install System).
Il propose à l'utilisateur :

1. **Choix de la langue** — Français par défaut
2. **Contrat de licence** — affiché si `license.txt` présent dans `build/`
3. **Dossier d'installation** — modifiable (défaut : `C:\Program Files\TanaClean 2035`)
4. **Raccourcis** — Bureau + Menu Démarrer créés automatiquement
5. **Désinstallation** — via Panneau de configuration → Programmes

### Étape 4 — Configuration sur la machine Windows cible

Avant de lancer l'application sur le poste Windows, créer le fichier `.env`
dans le dossier d'installation (`C:\Program Files\TanaClean 2035\resources\`) :

```env
PORT=3132
SESSION_SECRET=votre-secret-production
DB_HOST=adresse-du-serveur-mysql
DB_PORT=3306
DB_USER=tanaclean
DB_PASSWORD=motdepasse
DB_NAME=tana_clean
```

> Si MySQL est sur la même machine : `DB_HOST=localhost`  
> Si MySQL est sur un serveur distant : indiquer son IP ou hostname

### Résolution des problèmes courants

| Erreur | Cause | Solution |
|--------|-------|----------|
| `ENOENT: wine not found` | Wine absent sur macOS/Linux | `brew install --cask wine-stable` |
| `Error: Cannot find module 'bcrypt'` | Module natif non recompilé | `npm run postinstall` ou `npm rebuild` |
| `LayoutError` dans le build | Mémoire insuffisante | Fermer les autres apps, relancer |
| `.exe` bloqué par Windows Defender | Exécutable non signé | Clic droit → Propriétés → Débloquer |
| `EADDRINUSE 3132` au lancement | Port déjà utilisé | Redémarrer la machine ou tuer le processus |

### Signer l'exécutable (optionnel — production)

Sans signature de code, Windows Defender affichera un avertissement
"Application inconnue". Pour un déploiement en production :

```bash
# Ajouter dans package.json > build > win :
"certificateFile": "chemin/vers/certificate.pfx",
"certificatePassword": "${CERT_PASSWORD}"

# Puis builder avec la variable d'environnement :
CERT_PASSWORD=motdepasse npm run build -- --win
```

---

## Autres cibles de build

```bash
npm run build -- --mac      # macOS → dist/TanaClean 2035-1.0.0.dmg
npm run build -- --linux    # Linux  → dist/TanaClean 2035-1.0.0.AppImage
npm run build               # Toutes les cibles en parallèle
```

> Le build macOS ne fonctionne que **depuis macOS**.  
> Le build Linux fonctionne depuis Linux ou macOS.  
> Le build Windows fonctionne depuis n'importe quel OS (avec Wine sur macOS/Linux).

---

## Architecture de sécurité

```
Navigateur web (3131)          App Desktop Electron (3132)
bind: 0.0.0.0                  bind: 127.0.0.1
Accessible réseau local        Machine locale uniquement
────────────────────           ──────────────────────────
✓ /worker/*  (éboueur)         ✓ /admin/*   (admin)
✓ /citizen/* (citoyen)         ✗ /worker/*  → page bloquée
✗ /admin/*   → use-desktop     ✗ /citizen/* → page bloquée

Admin via navigateur → page "utiliser l'app desktop"
Non-admin via Electron → alerte + URL navigateur
```

---

## Structure du projet

```
tana_clean/
├── .env                        ← Configuration (non versionné)
├── package.json                ← Scripts + config electron-builder
├── README.md
│
├── electron/
│   └── main.js                 ← Main process : port 3132, admin only
│
├── build/
│   ├── icon.png                ← Icône app (512×512)
│   └── installer.nsh           ← Script NSIS personnalisé
│
├── src/
│   ├── server.js               ← Express (3131 web / 3132 desktop)
│   ├── routes/                 ← admin.js  worker.js  citizen.js
│   ├── controllers/            ← AdminController  WorkerController  CitizenController
│   ├── algorithms/             ← dijkstra.js  greedy.js
│   ├── middleware/             ← auth.js  pageSize.js
│   ├── models/                 ← db.js + modèles
│   ├── views/                  ← Templates EJS
│   │   └── auth/               ← login  register  desktop-only  use-desktop
│   └── public/                 ← tokens.css  app.css  htmx.min.js
│
├── database/
│   ├── schema.sql
│   └── seed.js
│
├── tests/
│   ├── dijkstra.test.js
│   └── greedy.test.js
│
└── docs/
    └── TanaClean2035_Documentation.pdf
```

# 🚗 METOA — Application Passager

Application web Angular dédiée aux **passagers** de la plateforme de covoiturage **METOA**.

L'application permet aux utilisateurs de rechercher et gérer leurs trajets, effectuer des réservations, gérer leur profil, communiquer avec les autres utilisateurs et accéder aux différentes fonctionnalités proposées par la plateforme.

---

## 📌 Présentation

**METOA** est une plateforme de covoiturage composée de plusieurs applications clientes communiquant avec un backend commun développé avec Spring Boot.

Ce dépôt correspond à l'application **Front Passager**.

### Écosystème METOA

| Composant | Technologie | Port |
|---|---|---:|
| Backend METOA | Spring Boot / Java 17 | `8089` |
| Application Passager | Angular | `4200` |
| Application Chauffeur | Angular | `4201` |
| Application Administrateur | Angular | `4202` |

Architecture générale :

```text
                         ┌──────────────────────┐
                         │    METOA BACKEND     │
                         │ Spring Boot / Java 17│
                         │    localhost:8089    │
                         └──────────┬───────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
                  ▼                 ▼                 ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │   PASSAGER   │  │  CHAUFFEUR   │  │    ADMIN     │
          │ Angular :4200│  │ Angular :4201│  │ Angular :4202│
          └──────────────┘  └──────────────┘  └──────────────┘
```

---

# 🛠️ Technologies utilisées

## Frontend

- Angular `21.2.22`
- Angular CLI `21.2.23`
- TypeScript `5.9.3`
- RxJS `7.8.2`
- Node.js `20.20.2`
- npm `10.8.2`
- Angular SSR
- STOMP `7.3.0`
- WebSocket

## Backend

L'application communique avec le backend METOA :

- Spring Boot `3.3.7`
- Java `17`
- MySQL
- Spring Security
- JWT
- REST API
- WebSocket / STOMP

Backend :

```text
http://localhost:8089
```

---

# 📋 Prérequis

Avant d'installer le projet, vérifier que les outils suivants sont disponibles :

```bash
node -v
npm -v
npx ng version
```

Versions utilisées dans le projet :

```text
Node.js    20.20.2
npm        10.8.2
Angular    21.2.22
Angular CLI 21.2.23
TypeScript 5.9.3
RxJS       7.8.2
```

---

# 📥 Installation

Cloner le dépôt :

```bash
git clone https://github.com/Dalfran/METOA_front.git
```

Entrer dans le projet :

```bash
cd METOA_front
```

Installer les dépendances :

```bash
npm install
```

---

# ▶️ Démarrage

Le port de l'application est directement configuré dans `package.json`.

Lancer :

```bash
npm start
```

L'application est disponible sur :

```text
http://localhost:4200
```

Le script utilise :

```json
"start": "ng serve --port 4200"
```

Il n'est donc pas nécessaire d'ajouter manuellement `--port 4200`.

---

# 🔐 Authentification

L'application utilise une authentification basée sur **JWT (JSON Web Token)**.

Après authentification, le token est utilisé pour sécuriser les appels vers l'API backend.

Le token passager est stocké localement sous :

```text
metoa_token
```

Les informations de l'utilisateur connecté sont stockées sous :

```text
metoa_user
```

Les requêtes authentifiées utilisent le principe :

```http
Authorization: Bearer <JWT>
```

---

# 🌐 Communication avec le backend

Le backend est accessible sur :

```text
http://localhost:8089
```

Les services Angular communiquent avec les différents endpoints REST du backend.

Exemple de principe :

```text
Angular
   │
   │ HTTP + JWT
   ▼
Spring Boot
   │
   ▼
MySQL
```

---

# 💬 Messagerie temps réel

La messagerie utilise **WebSocket avec STOMP**.

URL WebSocket :

```text
ws://localhost:8089/chat/websocket
```

La messagerie permet notamment :

- conversations ;
- envoi de messages ;
- réception en temps réel ;
- statut des messages ;
- messages lus ;
- messages délivrés ;
- indicateur en ligne ;
- indicateur de saisie ;
- modification d'un message ;
- suppression d'un message ;
- notifications ;
- pièces jointes.

Les destinations WebSocket utilisées par l'application sont notamment :

```text
/user/queue/messages
/user/queue/inbox
/user/queue/message-status
/user/queue/typing
/user/queue/message-updated
/user/queue/message-deleted
/user/queue/notifications
/topic/presence
```

---

# 🗂️ Organisation du projet

L'application suit une organisation Angular basée notamment sur les fonctionnalités et les services partagés.

Structure simplifiée :

```text
src/
└── app/
    ├── core/
    │   ├── services/
    │   ├── guards/
    │   ├── interceptors/
    │   └── ...
    │
    ├── features/
    │   ├── auth/
    │   ├── profil/
    │   ├── trajets/
    │   ├── reservations/
    │   ├── messagerie/
    │   └── ...
    │
    ├── shared/
    │   ├── components/
    │   └── ...
    │
    └── ...
```

### `core`

Contient les éléments communs de l'application :

- services ;
- authentification ;
- guards ;
- interceptors ;
- communication avec l'API.

### `features`

Contient les fonctionnalités métier de l'application :

- authentification ;
- profil utilisateur ;
- trajets ;
- réservations ;
- messagerie ;
- etc.

### `shared`

Contient les composants et éléments réutilisables.

---

# 🔒 Sécurité

L'application ne doit pas contenir de secrets sensibles directement dans le code source.

Ne jamais versionner :

```text
mot de passe
clé JWT
clé API
identifiants privés
tokens personnels
```

Les informations sensibles doivent être gérées avec une configuration appropriée.

---

# 🌿 Organisation Git

Le projet utilise une stratégie basée sur trois niveaux principaux :

```text
main
 │
 └── develop
       │
       ├── feature/...
       ├── fix/...
       └── refactor/...
```

### `main`

Branche correspondant à une version stable du projet.

### `develop`

Branche principale d'intégration des développements.

### `feature/*`

Utilisée pour développer une nouvelle fonctionnalité.

Exemple :

```bash
git checkout develop
git pull origin develop
git checkout -b feature/gestion-reservation
```

### `fix/*`

Utilisée pour corriger un problème.

Exemple :

```bash
git checkout develop
git pull origin develop
git checkout -b fix/correction-login
```

---

# 🔄 Workflow collaboratif

Avant de commencer une fonctionnalité :

```bash
git checkout develop
git pull origin develop
```

Créer ensuite sa branche :

```bash
git checkout -b feature/nom-fonctionnalite
```

Après le développement :

```bash
git add .
git commit -m "feat: description de la fonctionnalite"
```

Publier la branche :

```bash
git push -u origin feature/nom-fonctionnalite
```

Créer ensuite une **Pull Request vers `develop`**.

### ⚠️ Règle importante

Éviter de développer directement sur :

```text
main
develop
```

Les fonctionnalités doivent être développées sur des branches dédiées.

---

# 🧪 Tests

Lancer les tests Angular :

```bash
npm test
```

---

# 🏗️ Build

Construire l'application :

```bash
npm run build
```

Le résultat de compilation est généré dans le dossier :

```text
dist/
```

Le dossier `dist/` ne doit pas être versionné.

---

# 🚀 Développement local complet

Pour travailler sur l'ensemble de l'écosystème METOA :

### 1. Backend

```text
http://localhost:8089
```

### 2. Application Passager

```bash
cd METOA_front
npm install
npm start
```

Disponible sur :

```text
http://localhost:4200
```

### 3. Application Chauffeur

```text
http://localhost:4201
```

### 4. Application Administrateur

```text
http://localhost:4202
```

---

# 👥 Collaboration

Chaque développeur doit utiliser **son propre compte GitHub**.

Les accès au dépôt sont accordés via les collaborateurs GitHub.

Les identifiants personnels ne doivent jamais être partagés.

---

# 📚 Dépôts METOA

| Projet | Repository |
|---|---|
| Backend | `METOA` |
| Passager | `METOA_front` |
| Chauffeur | `MetoaDriver` |
| Administrateur | `MetoaADMIN` |

---

# 👨‍💻 Projet

**METOA — Plateforme de covoiturage**

Application développée dans le cadre d'un projet académique.

**Frontend Passager — Angular**

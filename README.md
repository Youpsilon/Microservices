# Le Gourmet — Architecture Microservices Restaurant

Bienvenue dans le dépôt du projet de gestion de commandes pour restaurant, conçu en architecture microservices.

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (doit être **lancé** sur votre machine)
- [Node.js](https://nodejs.org/) v20+ *(uniquement pour le mode développement local)*
- [npm](https://www.npmjs.com/) *(uniquement pour le mode développement local)*

## Structure du projet (Monorepo)

```text
/packages
  /amqp-utils       # Utilitaire partagé RabbitMQ
  /auth-guard       # Librairie partagée (JWT, RBAC)
  /shared-types     # Types communs (DTOs, Events)
  /auth-service     # Port 3001
  /menu-service     # Port 3002
  /order-service    # Port 3003
  /kitchen-service  # Port 3004
  /delivery-service # Port 3005
  /api-gateway      # Port 3000
  /web-client       # Front-end React (Vite) - Port 5173
```

---

## 🐳 Lancer le projet avec Docker (recommandé)

Cette méthode lance **tout** le projet en une seule commande : bases de données, broker, cache, et tous les microservices.

### Prérequis : Docker Desktop doit être ouvert.

### 1. Lancer tous les services

Depuis la racine du projet :

```bash
docker compose --profile full up -d --build
```

> 💡 Le flag `--build` recompile les images si le code a changé. Vous pouvez l'omettre après le premier lancement pour démarrer plus vite.

Docker va démarrer dans l'ordre :

| Service | URL |
|---|---|
| **Web Client (React)** | http://localhost:5173 |
| **API Gateway** | http://localhost:3000 |
| **Auth Service** | http://localhost:3001 |
| **Menu Service** | http://localhost:3002 |
| **Order Service** | http://localhost:3003 |
| **Kitchen Service** | http://localhost:3004 |
| **Delivery Service** | http://localhost:3005 |
| **RabbitMQ Management** | http://localhost:15672 *(guest / guest)* |
| **Jaeger (Tracing)** | http://localhost:16686 |

### 2. Vérifier que tout tourne

```bash
docker compose ps
```

Tous les services doivent être à l'état `running`.

### 3. Voir les logs d'un service

```bash
# Logs en temps réel de tous les services
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f order-service
docker compose logs -f api-gateway
```

### 4. Arrêter le projet

```bash
# Arrêter sans supprimer les données
docker compose --profile full down

# Arrêter ET supprimer toutes les données (reset complet)
docker compose --profile full down -v
```

---

## 💻 Lancer le projet en mode développement local

Utilisez ce mode si vous souhaitez modifier le code et voir les changements en temps réel.

### 1. Démarrer l'infrastructure (Bases de données, RabbitMQ, Redis, Jaeger)

```bash
npm run infra:up
```

> 💡 *Note : Si c'est la première fois, Docker va télécharger les images, cela peut prendre quelques minutes.*

### 2. Installer les dépendances

```bash
npm install
```

### 3. Lancer tous les services en une seule commande

```bash
npm run dev:all
```

Ou lancez chaque service dans un terminal séparé :

```bash
# Terminal 1 — Auth
npm run dev:auth

# Terminal 2 — Menu
npm run dev:menu

# Terminal 3 — Orders
npm run dev:order

# Terminal 4 — Kitchen
npm run dev:kitchen

# Terminal 5 — Delivery
npm run dev:delivery

# Terminal 6 — API Gateway
npm run dev:gateway

# Terminal 7 — Front-end React
npm run dev:web
```

👉 Ouvrez votre navigateur sur **http://localhost:5173**

### Commandes utiles

| Commande | Description |
|---|---|
| `npm run infra:up` | Démarre l'infrastructure Docker (BDD, broker, cache) |
| `npm run infra:down` | Arrête l'infrastructure sans supprimer les données |
| `npm run infra:reset` | Réinitialise l'infrastructure (supprime les bases de données) |
| `npm run dev:all` | Lance tous les microservices et le front-end en parallèle |

---

## Tester l'application

1. Ouvrez **http://localhost:5173**
2. Utilisez les comptes ci-dessous pour tester chaque rôle.

---

## 👤 Comptes de test (pré-créés)

Les comptes suivants sont déjà créés dans la base de données. Connectez-vous directement.

| Rôle | Email | Mot de passe | Accès |
|---|---|---|---|
| **Client** | `client@restaurant.fr` | `Client123!` | Passer des commandes, voir son historique |
| **Admin** | `admin@restaurant.fr` | `Admin123!` | Gérer le menu, voir toutes les commandes, changer les statuts |
| **Chef** | `chef@restaurant.fr` | `Chef123!` | Tableau de bord cuisine, mettre à jour les statuts de préparation |
| **Livreur** | `livreur@restaurant.fr` | `Livreur123!` | Tableau de bord livraison, mettre à jour les livraisons |

> ⚠️ Ces comptes sont en base tant que Docker tourne avec ses volumes. Un `docker compose down -v` les supprime.
> Pour recréer les rôles via psql, utilisez le format **plain** (pas JSON) car TypeORM utilise `simple-array` :
> ```sql
> UPDATE users SET roles = 'admin' WHERE email = 'admin@restaurant.fr';
> UPDATE users SET roles = 'chef'  WHERE email = 'chef@restaurant.fr';
> UPDATE users SET roles = 'livreur' WHERE email = 'livreur@restaurant.fr';
> ```



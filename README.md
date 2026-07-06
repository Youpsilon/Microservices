# Le Gourmet — Architecture Microservices Restaurant

Youenn Couesnon, Joran Caunegre, Lucas Martin

Bienvenue dans le dépôt du projet de gestion de commandes pour restaurant, conçu en architecture microservices avec NestJS, TypeORM, RabbitMQ et React.

---

## 📚 Table des matières

- [Stack technique](#-stack-technique)
- [Architecture](#️-architecture)
- [Prérequis](#prérequis)
- [Structure du projet](#-structure-du-projet-monorepo)
- [Lancer avec Docker](#-lancer-le-projet-avec-docker-recommandé)
- [Lancer en mode dev local](#-lancer-le-projet-en-mode-développement-local)
- [Comptes de test](#-comptes-de-test-créés-automatiquement)
- [Variables d'environnement](#-variables-denvironnement)
- [Scénarios de crash & tests](#-scénarios-de-crash--tests-par-microservice)

---

## 🛠 Stack technique

### Back-end (microservices)

| Technologie | Rôle |
|---|---|
| **Node.js v20** | Runtime JavaScript côté serveur |
| **TypeScript** | Typage statique |
| **NestJS 11** | Framework applicatif (modules, DI, pipes, guards) |
| **TypeORM** | ORM pour PostgreSQL (entités, repositories, migrations) |
| **PostgreSQL 16** | Base de données relationnelle — une instance par service |
| **RabbitMQ 3** | Message broker (exchanges, queues, routing keys) |
| **Redis 7** | Cache HTTP au niveau de l'API Gateway |
| **amqplib** | Client AMQP bas niveau |
| **bcryptjs** | Hash des mots de passe (salted, rounds=12) |
| **jsonwebtoken / passport-jwt** | Authentification JWT (access + refresh token rotation) |
| **Jaeger / OpenTelemetry** | Distributed tracing |

### Patterns d'architecture

| Pattern | Implémentation |
|---|---|
| **Transactional Outbox** | Chaque service écrit événements + données dans la même transaction PostgreSQL |
| **Idempotent Consumer** | Table `processed_events` pour dé-dupliquer les messages RabbitMQ |
| **Outbox Poller** | Service `outbox-poller` publie les événements de l'outbox vers RabbitMQ |
| **RBAC (Role-Based Access Control)** | Guard NestJS + JWT roles : `client`, `admin`, `chef`, `livreur` |
| **API Gateway** | Point d'entrée unique avec reverse proxy HTTP + cache Redis |
| **Event-Driven** | Communication asynchrone entre services via des Domain Events |
| **Monorepo (Nx)** | Workspace npm avec packages partagés (`shared-types`, `auth-guard`, `amqp-utils`) |

### Front-end

| Technologie | Rôle |
|---|---|
| **React 18** | UI library |
| **Vite** | Dev server + bundler |
| **TypeScript** | Typage côté front |

---

## 🏗️ Architecture

```
                          ┌──────────────────┐
                          │   web-client     │  React (Vite) — :5173
                          │  (React / Vite)  │
                          └────────┬─────────┘
                                   │ HTTP
                          ┌────────▼─────────┐
                          │   api-gateway    │  :3000 — cache Redis
                          │   (NestJS)       │
                          └──┬──┬──┬──┬──┬──┘
             ┌───────────────┘  │  │  │  └───────────────┐
             │              ┌───┘  └───┐                  │
        HTTP │         HTTP │          │ HTTP         HTTP │
   ┌─────────▼──┐  ┌────────▼──┐  ┌───▼───────┐  ┌───────▼───┐
   │auth-service│  │menu-service│  │order-     │  │kitchen-   │
   │  :3001     │  │  :3002    │  │service    │  │service    │
   │(NestJS+PG) │  │(NestJS+PG)│  │:3003 (PG) │  │:3004 (PG) │
   └────────────┘  └───────────┘  └─────┬─────┘  └─────┬─────┘
                                         │               │
                                    ┌────▼───────────────▼────┐
                                    │        RabbitMQ          │
                                    │  exchanges : order.events│
                                    │             kitchen.event│
                                    │             delivery.eve.│
                                    └────────────┬─────────────┘
                                                 │
                                    ┌────────────▼─────────────┐
                                    │    delivery-service      │
                                    │       :3005 (PG)         │
                                    └──────────────────────────┘
```

### Flux d'une commande (Domain Events)

```
Client passe commande
  → POST /api/orders (order-service)
    → DB: ordre sauvegardé (status=pending)
    → Outbox: ORDER_PLACED écrit dans la même transaction
  → Outbox Poller: publie ORDER_PLACED → RabbitMQ
    → kitchen-service consomme → crée KitchenTicket
    → delivery-service ignoré (attend ORDER_READY_FOR_PICKUP)

Chef accepte le ticket
  → POST /api/kitchen/orders/:id/accept
    → Outbox: ORDER_VALIDATED → order-service met à jour (confirmed)

Chef marque prêt
  → POST /api/kitchen/orders/:id/ready
    → Outbox: ORDER_READY_FOR_PICKUP → delivery-service crée Delivery

Admin assigne livreur
  → PATCH /api/delivery/deliveries/:id/assign
    → Outbox: DELIVERY_ASSIGNED → order-service met à jour (delivering)

Livreur livre
  → PATCH /api/delivery/deliveries/:id/status { status: "completed" }
    → order-service met à jour (delivered)

Client confirme réception
  → POST /api/orders/:id/confirm
    → order-service met à jour (completed)
```

---

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (doit être **lancé** sur votre machine)
- [Node.js](https://nodejs.org/) v20+ *(uniquement pour le mode développement local)*
- [npm](https://www.npmjs.com/) *(uniquement pour le mode développement local)*

---

## 📁 Structure du projet (Monorepo)

```text
/packages
  /shared-types     # Types communs (DTOs, Events, Enums)
  /auth-guard       # Librairie partagée (JWT Guard, RBAC, @CurrentUser)
  /amqp-utils       # Utilitaire partagé RabbitMQ (connect, publish, consume)
  /auth-service     # Port 3001 — Authentification, JWT, utilisateurs
  /menu-service     # Port 3002 — Catalogue, catégories, disponibilité
  /order-service    # Port 3003 — Commandes, statuts, Outbox Poller
  /kitchen-service  # Port 3004 — Tickets cuisine, statuts préparation
  /delivery-service # Port 3005 — Livreurs, livraisons, géolocalisation
  /api-gateway      # Port 3000 — Reverse proxy HTTP + cache Redis
  /web-client       # Front-end React (Vite) — Port 5173
```

---

## 🐳 Lancer le projet avec Docker (recommandé)

Cette méthode lance **tout** le projet en une seule commande : bases de données, broker, cache, et tous les microservices.

> ⚠️ Docker Desktop doit être ouvert.

### 1. Lancer tous les services

Depuis la racine du projet (dossier `Microservices/`) :

```bash
docker compose --profile full up -d --build
```

> 💡 Le flag `--build` recompile les images si le code a changé. Vous pouvez l'omettre après le premier lancement pour démarrer plus vite.

Docker va démarrer dans l'ordre :

| Service | URL | Description |
|---|---|---|
| **Web Client (React)** | http://localhost:5173 | Interface utilisateur |
| **API Gateway** | http://localhost:3000 | Point d'entrée unique |
| **Auth Service** | http://localhost:3001 | Authentification JWT |
| **Menu Service** | http://localhost:3002 | Catalogue restaurant |
| **Order Service** | http://localhost:3003 | Gestion des commandes |
| **Kitchen Service** | http://localhost:3004 | Dashboard cuisine |
| **Delivery Service** | http://localhost:3005 | Gestion livraisons |
| **RabbitMQ Management** | http://localhost:15672 | Broker *(guest / guest)* |
| **Jaeger (Tracing)** | http://localhost:16686 | Distributed tracing |

> 🌱 **Les comptes de test sont créés automatiquement** au premier démarrage du `auth-service` si la base est vide. Aucune action supplémentaire n'est requise.

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
docker compose logs -f auth-service
```

### 4. Arrêter le projet

```bash
# Arrêter sans supprimer les données
docker compose --profile full down

# Arrêter ET supprimer toutes les données (reset complet → recrée les comptes au prochain lancement)
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

> 🌱 **Les comptes de test sont créés automatiquement** au démarrage du `auth-service` si la base est vide.

### Commandes utiles

| Commande | Description |
|---|---|
| `npm run infra:up` | Démarre l'infrastructure Docker (BDD, broker, cache) |
| `npm run infra:down` | Arrête l'infrastructure sans supprimer les données |
| `npm run infra:reset` | Réinitialise l'infrastructure (supprime les bases de données) |
| `npm run dev:all` | Lance tous les microservices et le front-end en parallèle |

---

## 👤 Comptes de test (créés automatiquement)

Les comptes suivants sont **créés automatiquement au premier démarrage** du `auth-service` si la base de données est vide. Connectez-vous directement.

| Rôle | Email | Mot de passe | Accès |
|---|---|---|---|
| **Client** | `client@restaurant.fr` | `Client123!` | Passer des commandes, voir son historique |
| **Admin** | `admin@restaurant.fr` | `Admin123!` | Gérer le menu, voir toutes les commandes, changer les statuts |
| **Chef** | `chef@restaurant.fr` | `Chef123!` | Tableau de bord cuisine, mettre à jour les statuts de préparation |
| **Livreur** | `livreur@restaurant.fr` | `Livreur123!` | Tableau de bord livraison, mettre à jour les livraisons |

> ⚠️ Ces comptes sont en base tant que Docker tourne avec ses volumes.
> Un `docker compose down -v` les supprime — ils seront recréés automatiquement au prochain lancement.
>
> Pour recréer les rôles manuellement via psql :
> ```sql
> UPDATE users SET roles = 'admin'   WHERE email = 'admin@restaurant.fr';
> UPDATE users SET roles = 'chef'    WHERE email = 'chef@restaurant.fr';
> UPDATE users SET roles = 'livreur' WHERE email = 'livreur@restaurant.fr';
> UPDATE users SET roles = 'client'  WHERE email = 'client@restaurant.fr';
> ```

---

## 🔧 Variables d'environnement

Chaque service est configuré via des variables d'environnement. En développement local, les valeurs par défaut sont utilisées automatiquement.

### auth-service

| Variable | Défaut | Description |
|---|---|---|
| `DB_HOST` | `localhost` | Hôte PostgreSQL |
| `DB_PORT` | `5433` | Port PostgreSQL |
| `DB_USER` | `postgres` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | `dev` | Mot de passe PostgreSQL |
| `DB_NAME` | `auth` | Nom de la base |
| `JWT_SECRET` | `dev-secret-change-in-prod` | Clé secrète JWT |
| `JWT_EXPIRES_IN` | `15m` | Durée du token d'accès |
| `REFRESH_EXPIRES_DAYS` | `7` | Durée du refresh token (jours) |
| `AMQP_URL` | `amqp://guest:guest@localhost:5672` | URL RabbitMQ |
| `PORT` | `3001` | Port d'écoute |

### menu-service

| Variable | Défaut | Description |
|---|---|---|
| `DB_HOST` | `localhost` | Hôte PostgreSQL |
| `DB_PORT` | `5434` | Port PostgreSQL |
| `DB_NAME` | `menu` | Nom de la base |
| `AMQP_URL` | `amqp://guest:guest@localhost:5672` | URL RabbitMQ |
| `PORT` | `3002` | Port d'écoute |

### order-service

| Variable | Défaut | Description |
|---|---|---|
| `DB_HOST` | `localhost` | Hôte PostgreSQL |
| `DB_PORT` | `5435` | Port PostgreSQL |
| `DB_NAME` | `orders` | Nom de la base |
| `AMQP_URL` | `amqp://guest:guest@localhost:5672` | URL RabbitMQ |
| `PORT` | `3003` | Port d'écoute |

### kitchen-service

| Variable | Défaut | Description |
|---|---|---|
| `DB_HOST` | `localhost` | Hôte PostgreSQL |
| `DB_PORT` | `5436` | Port PostgreSQL |
| `DB_NAME` | `kitchen` | Nom de la base |
| `JWT_SECRET` | `dev-secret-change-in-prod` | Clé secrète JWT |
| `AMQP_URL` | `amqp://guest:guest@localhost:5672` | URL RabbitMQ |
| `PORT` | `3004` | Port d'écoute |

### delivery-service

| Variable | Défaut | Description |
|---|---|---|
| `DB_HOST` | `localhost` | Hôte PostgreSQL |
| `DB_PORT` | `5437` | Port PostgreSQL |
| `DB_NAME` | `delivery` | Nom de la base |
| `JWT_SECRET` | `dev-secret-change-in-prod` | Clé secrète JWT |
| `AMQP_URL` | `amqp://guest:guest@localhost:5672` | URL RabbitMQ |
| `PORT` | `3005` | Port d'écoute |

### api-gateway

| Variable | Défaut | Description |
|---|---|---|
| `AUTH_SERVICE_URL` | `http://localhost:3001/api` | URL interne du auth-service |
| `MENU_SERVICE_URL` | `http://localhost:3002/api/menu` | URL interne du menu-service |
| `ORDER_SERVICE_URL` | `http://localhost:3003/api` | URL interne du order-service |
| `KITCHEN_SERVICE_URL` | `http://localhost:3004/api` | URL interne du kitchen-service |
| `DELIVERY_SERVICE_URL` | `http://localhost:3005/api` | URL interne du delivery-service |
| `REDIS_HOST` | `localhost` | Hôte Redis |
| `REDIS_PORT` | `6379` | Port Redis |
| `PORT` | `3000` | Port d'écoute |

---

## 💥 Scénarios de crash & tests par microservice

Ces scénarios permettent de vérifier que chaque microservice gère correctement les erreurs et que l'architecture event-driven fonctionne. Utilisez un client HTTP comme **cURL**, **Postman** ou **Insomnia**.

> **Prérequis** : Le projet doit tourner (Docker ou mode local). Récupérez d'abord un token JWT avec le compte approprié.

### Obtenir un token JWT

```bash
# Token client
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client@restaurant.fr","password":"Client123!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Token admin
TOKEN_ADMIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@restaurant.fr","password":"Admin123!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Token chef
TOKEN_CHEF=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"chef@restaurant.fr","password":"Chef123!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Token livreur
TOKEN_LIVREUR=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"livreur@restaurant.fr","password":"Livreur123!"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
```

---

### 🔐 auth-service (port 3001)

#### Crash 1 — Connexion avec mauvais mot de passe → `401 Unauthorized`

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client@restaurant.fr","password":"MauvaisMotDePasse"}'
```

**Résultat attendu :** `{"statusCode":401,"message":"Invalid credentials"}`

---

#### Crash 2 — Inscription avec un email déjà existant → `409 Conflict`

```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"client@restaurant.fr","password":"Client123!","name":"Test"}'
```

**Résultat attendu :** `{"statusCode":409,"message":"Email already registered"}`

---

#### Crash 3 — Accès à une route protégée sans token → `401 Unauthorized`

```bash
curl http://localhost:3001/api/users/me
```

**Résultat attendu :** `{"statusCode":401,"message":"Unauthorized"}`

---

#### Crash 4 — Accès avec un token expiré/invalide → `401 Unauthorized`

```bash
curl http://localhost:3001/api/users/me \
  -H "Authorization: Bearer token_invalide_ici"
```

**Résultat attendu :** `{"statusCode":401,"message":"Unauthorized"}`

---

#### Crash 5 — Validation du DTO : champs manquants → `400 Bad Request`

```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"pas-un-email","password":"court"}'
```

**Résultat attendu :** `{"statusCode":400,"message":["email must be an email","password must be longer than or equal to 8 characters","name must be longer than or equal to 2 characters",...]}` 

---

### 📋 menu-service (port 3002)

#### Crash 6 — Récupérer un item inexistant → `404 Not Found`

```bash
# Un UUID valide mais inexistant
curl http://localhost:3002/api/menu/items/00000000-0000-0000-0000-000000000000
```

**Résultat attendu :** `{"statusCode":404,"message":"Menu item not found"}`

---

#### Crash 7 — Créer un item sans être admin → `403 Forbidden`

```bash
# Avec token client
curl -X POST http://localhost:3002/api/menu/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","price":10,"categoryId":"xxx"}'
```

**Résultat attendu :** `{"statusCode":403,"message":"Forbidden resource"}`

---

### 🛒 order-service (port 3003)

#### Crash 8 — Passer une commande vide → `400 Bad Request`

```bash
curl -X POST http://localhost:3003/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[],"deliveryType":"delivery"}'
```

**Résultat attendu :** `{"statusCode":400,"message":"Order must contain at least one item"}` (ou erreur de validation DTO)

---

#### Crash 9 — Annuler une commande déjà en préparation → `400 Bad Request`

```bash
# 1. Passer une commande (récupérez l'ID dans la réponse)
ORDER=$(curl -s -X POST http://localhost:3003/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"menuItemId":"MENU_ITEM_ID","name":"Test","qty":1,"unitPrice":10}],"deliveryType":"pickup"}')

ORDER_ID=$(echo $ORDER | grep -o '"orderId":"[^"]*"' | cut -d'"' -f4)

# 2. L'admin change le statut en "preparing"
curl -X PATCH http://localhost:3003/api/orders/$ORDER_ID/status \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"status":"preparing"}'

# 3. Le client tente d'annuler → CRASH attendu
curl -X POST http://localhost:3003/api/orders/$ORDER_ID/cancel \
  -H "Authorization: Bearer $TOKEN"
```

**Résultat attendu :** `{"statusCode":400,"message":"Cannot cancel order in status preparing"}`

---

#### Crash 10 — Confirmer une réception avant livraison → `400 Bad Request`

```bash
# Avec un ORDER_ID d'une commande en status "pending" ou "confirmed"
curl -X POST http://localhost:3003/api/orders/$ORDER_ID/confirm \
  -H "Authorization: Bearer $TOKEN"
```

**Résultat attendu :** `{"statusCode":400,"message":"Cannot confirm order in status \"pending\". Order must be delivered first."}`

---

#### Crash 11 — Accès à la commande d'un autre client → `404 Not Found`

```bash
# Le service filtre par customerId : une commande d'un autre client retourne 404
curl http://localhost:3003/api/orders/$ORDER_ID_AUTRE_CLIENT \
  -H "Authorization: Bearer $TOKEN"
```

**Résultat attendu :** `{"statusCode":404,"message":"Order not found"}`

---

### 👨‍🍳 kitchen-service (port 3004)

#### Crash 12 — Accepter un ticket déjà en préparation → `400 Bad Request`

```bash
# Récupérer d'abord les tickets
curl http://localhost:3004/api/kitchen/orders \
  -H "Authorization: Bearer $TOKEN_CHEF"

# Accepter un ticket (id dans la réponse)
TICKET_ID="LE_TICKET_ID"
curl -X POST http://localhost:3004/api/kitchen/orders/$TICKET_ID/accept \
  -H "Authorization: Bearer $TOKEN_CHEF"

# Accepter une 2ème fois → CRASH
curl -X POST http://localhost:3004/api/kitchen/orders/$TICKET_ID/accept \
  -H "Authorization: Bearer $TOKEN_CHEF"
```

**Résultat attendu :** `{"statusCode":400,"message":"Ticket is not pending"}`

---

#### Crash 13 — Mettre à jour un item avec un statut invalide → `400 Bad Request`

```bash
curl -X PATCH http://localhost:3004/api/kitchen/items/ITEM_ID \
  -H "Authorization: Bearer $TOKEN_CHEF" \
  -H "Content-Type: application/json" \
  -d '{"status":"cancelled"}'
```

**Résultat attendu :** `{"statusCode":400,"message":"Invalid status"}`

---

#### Crash 14 — Accès au dashboard cuisine sans rôle chef → `403 Forbidden`

```bash
# Avec le token client
curl http://localhost:3004/api/kitchen/orders \
  -H "Authorization: Bearer $TOKEN"
```

**Résultat attendu :** `{"statusCode":403,"message":"Forbidden resource"}`

---

### 🚚 delivery-service (port 3005)

#### Crash 15 — Assigner un livreur inexistant → `404 Not Found`

```bash
# Récupérer les livraisons
curl http://localhost:3005/api/delivery/deliveries \
  -H "Authorization: Bearer $TOKEN_LIVREUR"

DELIVERY_ID="LA_DELIVERY_ID"

curl -X PATCH http://localhost:3005/api/delivery/deliveries/$DELIVERY_ID/assign \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"courierId":"00000000-0000-0000-0000-000000000000"}'
```

**Résultat attendu :** `{"statusCode":404,"message":"Courier not found"}`

---

#### Crash 16 — Mettre à jour la localisation d'une livraison sans livreur → `400 Bad Request`

```bash
# Une livraison en status "pending" sans courierId assigné
curl -X PATCH http://localhost:3005/api/delivery/deliveries/$DELIVERY_ID/location \
  -H "Authorization: Bearer $TOKEN_LIVREUR" \
  -H "Content-Type: application/json" \
  -d '{"lat":48.8566,"lng":2.3522}'
```

**Résultat attendu :** `{"statusCode":400,"message":"Delivery has no assigned courier"}`

---

### 🔗 Test du flux complet bout-en-bout (Event-Driven)

Ce scénario teste la propagation des événements entre tous les microservices.

```bash
# === ÉTAPE 1 : Client passe une commande ===
# (Récupérer d'abord un menuItemId valide)
ITEMS=$(curl -s http://localhost:3002/api/menu/items | python3 -c "import sys,json; items=json.load(sys.stdin); print(items[0]['id'])" 2>/dev/null || echo "UUID_ICI")

ORDER=$(curl -s -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"items\":[{\"menuItemId\":\"$ITEMS\",\"name\":\"Test\",\"qty\":1,\"unitPrice\":9.5}],\"deliveryType\":\"delivery\",\"deliveryAddress\":{\"street\":\"1 rue de la Paix\",\"city\":\"Paris\"}}")

echo "Commande: $ORDER"
ORDER_ID=$(echo $ORDER | grep -o '"orderId":"[^"]*"' | cut -d'"' -f4)

# === ÉTAPE 2 : Attendre ~2s que l'Outbox Poller publie l'événement ===
sleep 2

# Vérifier qu'un ticket cuisine a été créé
curl http://localhost:3004/api/kitchen/orders \
  -H "Authorization: Bearer $TOKEN_CHEF"

# === ÉTAPE 3 : Chef accepte le ticket ===
TICKET_ID="TICKET_ID_DU_STEP_2"
curl -X POST http://localhost:3004/api/kitchen/orders/$TICKET_ID/accept \
  -H "Authorization: Bearer $TOKEN_CHEF"

# === ÉTAPE 4 : Chef marque le ticket prêt ===
curl -X POST http://localhost:3004/api/kitchen/orders/$TICKET_ID/ready \
  -H "Authorization: Bearer $TOKEN_CHEF"

# === ÉTAPE 5 : Vérifier qu'une livraison a été créée ===
sleep 2
curl http://localhost:3005/api/delivery/deliveries \
  -H "Authorization: Bearer $TOKEN_LIVREUR"

# === ÉTAPE 6 : Admin assigne le livreur Pierre Livreur ===
COURIER_ID=$(curl -s http://localhost:3005/api/delivery/couriers \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  | python3 -c "import sys,json; c=json.load(sys.stdin); print(c[0]['id'])" 2>/dev/null)

DELIVERY_ID="DELIVERY_ID_DU_STEP_5"
curl -X PATCH http://localhost:3005/api/delivery/deliveries/$DELIVERY_ID/assign \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d "{\"courierId\":\"$COURIER_ID\"}"

# === ÉTAPE 7 : Livreur marque la livraison comme effectuée ===
curl -X PATCH http://localhost:3005/api/delivery/deliveries/$DELIVERY_ID/status \
  -H "Authorization: Bearer $TOKEN_LIVREUR" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'

# === ÉTAPE 8 : Vérifier le statut final de la commande ===
sleep 2
curl http://localhost:3003/api/orders/$ORDER_ID \
  -H "Authorization: Bearer $TOKEN"

# Status attendu : "delivered"

# === ÉTAPE 9 : Client confirme la réception ===
curl -X POST http://localhost:3003/api/orders/$ORDER_ID/confirm \
  -H "Authorization: Bearer $TOKEN"

# Status final attendu : "completed" 🎉
```

---

### 🐰 Tester la résilience RabbitMQ

```bash
# 1. Arrêter RabbitMQ pour simuler une panne du broker
docker stop rabbitmq

# 2. Passer une commande (l'ordre est sauvegardé en DB grâce à l'Outbox Pattern)
curl -X POST http://localhost:3003/api/orders ...

# 3. Redémarrer RabbitMQ
docker start rabbitmq

# 4. L'Outbox Poller va republier automatiquement les événements non envoyés
# → Vérifier que le ticket cuisine est bien créé
curl http://localhost:3004/api/kitchen/orders -H "Authorization: Bearer $TOKEN_CHEF"
```

**Ce test démontre que l'architecture Transactional Outbox garantit qu'aucun événement n'est perdu même si le broker tombe.**

---

### 📊 Consulter les traces dans Jaeger

Après avoir effectué des requêtes, ouvrez **http://localhost:16686** pour visualiser les traces distribuées et le temps passé dans chaque service.

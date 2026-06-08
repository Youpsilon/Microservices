# Le Gourmet — Architecture Microservices Restaurant

Bienvenue dans le dépôt du projet de gestion de commandes pour restaurant, conçu en architecture microservices.

## Prérequis

- [Node.js](https://nodejs.org/) (v20+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (doit être **lancé** sur votre machine)
- [npm](https://www.npmjs.com/)

## Structure du projet (Monorepo)

Le projet utilise les npm workspaces pour gérer les microservices et le front-end React.

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
  /web-client       # Front-end React (Vite) - Port 5173
```

## Comment lancer le projet en local

### 1. Démarrer l'infrastructure (Bases de données & RabbitMQ)

Avant de lancer le code Node.js, vous devez lancer les conteneurs Docker qui contiennent PostgreSQL, RabbitMQ, Redis, et Jaeger.
**Assurez-vous que Docker Desktop est ouvert.**

Dans un terminal, à la racine du projet (`C:\Users\coues\OneDrive\Documents\Microservices\restaurant-app`), exécutez :

```bash
npm run infra:up
```

> 💡 *Note : Si c'est la première fois, Docker va télécharger les images (PostgreSQL, RabbitMQ, etc.), cela peut prendre quelques minutes.*

### 2. Installer les dépendances

Installez toutes les dépendances pour tous les microservices et le front-end en une seule commande depuis la racine :

```bash
npm install
```

### 3. Lancer les microservices (Back-end)

Ouvrez **plusieurs terminaux** (ou utilisez un outil de multiplexage), et lancez chaque service. Ils se connecteront automatiquement à RabbitMQ et à leur propre base de données PostgreSQL. Le service Menu créera même des plats par défaut automatiquement !

```bash
# Terminal 1
npm run dev:auth

# Terminal 2
npm run dev:menu

# Terminal 3
npm run dev:order
```
*(Vous pouvez lancer kitchen et delivery plus tard si vous vous concentrez sur l'itération 1).*

### 4. Lancer le Front-end React (Web Client)

Dans un nouveau terminal, lancez le client web React. Il va démarrer sur le port 5173 et son proxy va rediriger les appels API vers les bons microservices.

```bash
npm run dev:web
```

👉 Ouvrez votre navigateur sur **http://localhost:5173**

### 5. Tester l'application

1. Cliquez sur **Menu** pour voir les plats (le `menu-service` a généré un menu par défaut).
2. Cliquez sur **Inscription** pour vous créer un compte client.
3. Une fois connecté, vous verrez votre nom en haut à droite.

---

### Commandes utiles

- Arrêter l'infrastructure Docker sans supprimer les données : `npm run infra:down`
- Réinitialiser l'infrastructure (supprime les bases de données) : `npm run infra:reset`

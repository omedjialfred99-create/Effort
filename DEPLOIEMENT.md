# Déploiement Netlify et Supabase

Le frontend est hébergé sur Netlify. L'API Express y est exposée par une Netlify Function à `/api/*`, et la base relationnelle PostgreSQL est hébergée sur Supabase. Le transfert MySQL est prévu pour une base Supabase vide et n'efface aucune donnée existante.

## 1. Créer le schéma Supabase

Dans Supabase, ouvrez **SQL Editor**, collez le contenu de `schema.postgres.sql`, puis exécutez-le. Vous pouvez aussi configurer `DATABASE_URL` en local et lancer `npm run setup-db`.

Dans Supabase, ouvrez **Connect** et choisissez **Session pooler** pour obtenir l'URI PostgreSQL du pooler. L'adresse directe `db.<project-ref>.supabase.co` est IPv6-only pour ce projet et ne se résout pas depuis l'environnement de migration actuel. Le pooler permet une connexion compatible avec le backend serverless. Gardez `sslmode=require` dans l'URI.

## 2. Transférer les données MySQL

Faites une sauvegarde de la base MySQL avant le transfert. Dans le fichier `.env` local, configurez:

```env
DATABASE_URL=postgresql://...
MYSQL_SOURCE_HOST=...
MYSQL_SOURCE_USER=...
MYSQL_SOURCE_PASSWORD=...
MYSQL_SOURCE_DATABASE=clinique_effort
```

Le script vérifie que les tables Supabase sont vides, copie les tables avec leurs identifiants, vérifie les nombres de lignes et met à jour les séquences PostgreSQL. Il utilise une transaction et annule le transfert en cas d'erreur. Il refuse de fusionner avec une base Supabase qui contient déjà des lignes.

Lancez `npm run migrate:mysql-to-supabase`. Gardez la base MySQL intacte jusqu'à avoir vérifié les données et le fonctionnement du site.

## 3. Déployer l'API sur Netlify

Le fichier `netlify.toml` configure les fonctions de `netlify/functions`. Reliez le dépôt GitHub à Netlify et redéployez le site. Les appels frontend `/api/...` sont routés vers l'API Express dans la fonction `api`.

Dans les variables d'environnement Netlify, ajoutez pour le contexte de production (et les deploy previews si nécessaire):

- `DATABASE_URL`: URI PostgreSQL Supabase (ne pas utiliser la clé `service_role`)
- `JWT_SECRET`: longue valeur aléatoire privée
- `APP_URL`: `https://effortclinique.netlify.app`, sans barre oblique finale
- `ADMIN_EMAIL`: adresse de l'administrateur
- Les variables SMTP uniquement si l'envoi d'emails doit être activé

Ne mettez aucun mot de passe dans le dépôt ou le frontend. Netlify fournit lui-même les variables configurées aux fonctions. Ne partagez pas les valeurs secrètes dans un message.

Après redéploiement, vérifiez `https://effortclinique.netlify.app/api/health`. Créez ensuite le compte administrateur avec `npm run create-admin -- "<mot-de-passe-fort>"` en local, avec `DATABASE_URL` et `ADMIN_EMAIL` pointant sur Supabase. Utilisez l'URL Netlify pour partager les liens d'activation.

`APP_URL` est l'adresse du site Netlify, et non celle de la base Supabase. Sans `APP_URL`, la génération des liens du personnel échoue volontairement au lieu de créer un lien local inutilisable.

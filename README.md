# Loto Liban Data Lab

Application Next.js prête pour GitHub, Vercel et Neon. Elle analyse `data.csv`, génère des combinaisons expérimentales et peut journaliser les résultats dans Neon Postgres.

> Important : aucun algorithme ne peut prédire un tirage aléatoire. Acheter plusieurs grilles distinctes augmente seulement la couverture combinatoire, avec un coût proportionnel.

## Tester localement

```bash
npm install
npm run dev
```

Ouvrez `http://localhost:3000`.

## 1. Publier sur GitHub

Créez un dépôt vide, puis depuis ce dossier :

```bash
git init
git add .
git commit -m "Initial Loto Liban Data Lab"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/loto-liban-data-lab.git
git push -u origin main
```

Ne publiez jamais `.env.local`.

## 2. Créer et initialiser Neon

1. Créez un projet sur https://console.neon.tech/.
2. Ouvrez **SQL Editor**.
3. Copiez-collez le contenu de `sql/schema.sql`, puis exécutez-le.
4. Dans **Connect**, copiez la chaîne de connexion PostgreSQL mise en pool.

## 3. Déployer sur Vercel

1. Connectez-vous à https://vercel.com/ avec GitHub.
2. Cliquez **Add New > Project** et importez le dépôt.
3. Dans **Environment Variables**, ajoutez `DATABASE_URL` avec la chaîne Neon.
4. Cliquez **Deploy**.
5. Testez `/api/health`: `databaseConfigured` doit être `true`.

Alternative : installez l’intégration Neon depuis Vercel Marketplace. Elle peut injecter automatiquement `DATABASE_URL`.

## Structure

- `app/` interface et routes API
- `lib/lottery.ts` analyse du CSV et génération
- `data.csv` historique utilisé par l’application
- `sql/schema.sql` table Neon
- `.env.example` modèle de configuration

## Mettre à jour les tirages

Remplacez `data.csv` en conservant le séparateur `;` et les colonnes `date;day;number_1;...;number_6;bonus;jackpot`, puis poussez le changement sur GitHub. Vercel redéploiera automatiquement.

## Stratégie Affinités historiques

Cette option compte les paires apparues ensemble dans les tirages, combine 60 % d’affinité, 20 % de fréquence individuelle et 20 % d’équilibre structurel, puis affiche les trois paires les plus observées. Elle analyse le passé sans prédire le prochain tirage.

### Mise à niveau d'une base Neon existante

Si vous aviez déjà déployé la première version, exécutez `sql/migration-add-affinites.sql` dans le SQL Editor Neon. Cela autorise la valeur `affinites` dans la contrainte de la colonne `strategy`. Pour une nouvelle base, utilisez seulement `sql/schema.sql`.

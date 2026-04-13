# 🏔️ Radar Elite - CHF/EUR

> **L'outil de change ultra-rapide pour les frontaliers du Grand Genève.**

[![Vercel Deployment](https://img.shields.io/badge/Status-Live-green?style=for-the-badge&logo=vercel)](https://votre-lien.vercel.app)
[![Next.js](https://img.shields.io/badge/Built%20with-Next.js%2015-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Data-Supabase-green?style=for-the-badge&logo=supabase)](https://supabase.com/)

---

## 🎯 Le Concept
Marre des sites de change lents, remplis de publicités et difficiles à lire sur mobile ? **Radar Elite** a été conçu à Douvaine pour offrir une réponse instantanée aux frontaliers : **Où est le meilleur taux maintenant ?**

## ✨ Fonctionnalités
- 🤖 **Robots Automatisés** : 18 banques et bureaux de change scrapés toutes les heures (7h-19h).
- 📱 **Expérience PWA** : Installable sur écran d'accueil comme une application native.
- 📉 **Graphiques Dynamiques** : Suivi des tendances avec Recharts pour ne jamais rater une baisse.
- ⚡ **Performance Élite** : Zéro publicité, chargement en moins d'une seconde.

## 🛠️ Stack Technique
- **Frontend** : Next.js 15 (App Router), Tailwind CSS, Framer Motion.
- **Backend** : Supabase (PostgreSQL) pour le stockage et les vues temps réel.
- **Automation** : GitHub Actions couplé à Playwright (Chromium) pour le scraping.
- **Visualisation** : Recharts avec gestion intelligente des données manquantes.

## 🏗️ Architecture des "Robots"
Le système utilise une infrastructure "Serverless" :
1. **GitHub Actions** réveille un robot toutes les heures.
2. Le robot simule une navigation sur les sites des banques (MMigros, Change de la Fusterie, etc.).
3. Les données sont nettoyées et injectées dans **Supabase**.
4. L'application Next.js affiche instantanément le **Top 3** des meilleurs taux.

## 🚀 Installation locale
1. Clone le projet : `git clone ...`
2. Installe les dépendances : `npm install`
3. Configure ton `.env.local` avec tes clés Supabase.
4. Lance les robots : `npx tsx services/scrapers/run_all_scrapers.ts`
5. Lance le site : `npm run dev`

---

*Développé avec passion pour faciliter le quotidien des travailleurs frontaliers.* 🇫🇷 🇨🇭/docs/app/building-your-application/deploying) for more details.

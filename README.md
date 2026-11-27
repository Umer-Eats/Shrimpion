# Shrimpion

A daily trivia game that **teaches** instead of tests. You start at the bottom of the ocean and swim up through 7 ascents. Ascents 1–6 each show you 7 facts (no timer) and then test you a different way. Ascent 7 is a 14-question exam on everything you learned.

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the build
npm run check:content   # validate the fact database
npm run make:icon       # regenerate public/favicon.svg from the shrimp sprite
```

Without Firebase keys the game runs in **local mode**: progress lives in the browser's localStorage, and sign-in, Friends and the 7 Seas show a "not configured" notice.

## Deploy to Vercel

1. Push this folder to GitHub and import it in Vercel. `vercel.json` already sets the Vite framework, `npm run build`, the `dist` output, and an SPA rewrite so routes like `/faq` work on refresh.
2. In **Project → Settings → Environment Variables**, add the six `VITE_FIREBASE_*` values from `.env.example`.
3. Redeploy. Vite inlines `VITE_*` variables at build time, so you must rebuild after changing them.

## Firebase setup

1. Create a project at console.firebase.google.com and add a **Web app**. Copy its config into `.env.local` (for local dev) and into Vercel.
2. **Authentication → Sign-in method:** enable **Google** and **Email/Password**.
3. **Authentication → Settings → Authorized domains:** add your Vercel domain (e.g. `shrimpion.vercel.app`) and any custom domain.
4. **Firestore Database:** create it in production mode, then paste `firestore.rules` into the Rules tab (or run `firebase deploy --only firestore:rules`).

The Firebase web API key is meant to be public; access is controlled by `firestore.rules` and the authorized domains.

## Project layout

| Path | What it holds |
|---|---|
| `src/game/content/` | 6 categories × 8 topics × 6 levels of facts |
| `src/game/plan.js` | Seeded daily and unlimited dive plans |
| `src/game/tests.js` | The 7 test strategies, all built from one fact format |
| `src/scene/` | The pixel-art ocean canvas and the camera that rises through depths |
| `src/art/` | Hand-placed sprites (shrimp faces right) and the renderer |
| `src/dive/` | The ascent state machine: learn → test → result → ascend |
| `src/firebase/` | Auth, profiles, friends, presence and leaderboards |
| `src/pages/` | Home, Unlimited, Archive, My Shrimpion, Friends, 7 Seas, FAQ, Urchin Party |

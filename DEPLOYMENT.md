# NunciaYa – Getting Live Securely

This guide covers **first steps** to get the app online and **where files and folders** live.

---

## Where Files and Folders Go

**You do not need to move anything.** The project is already laid out correctly for Firebase.

| What | Location | Deployed to |
|------|----------|-------------|
| **Website (HTML, JS, CSS, pages)** | Project root: `index.html`, `app.js`, `config.js`, `style.css`, `pages/`, `_header.html`, `_footer.html`, etc. | **Firebase Hosting** (served from root with some folders ignored) |
| **Cloud Functions** | `functions/` folder | **Firebase Cloud Functions** |
| **Firebase config** | `firebase.json`, `.firebaserc` at root | Used by Firebase CLI only (not uploaded to Hosting) |
| **Security rules** | `firestore.rules`, `storage.rules` at root | **Firestore** and **Storage** (deployed with `firebase deploy`) |

**Ignored when deploying Hosting** (so they stay only on your machine):  
`node_modules/`, `functions/`, `package.json`, `*.md`, `.git`, and other dev-only files (see `firebase.json` → `hosting.ignore`).

---

## First Steps to Get Live Securely

Do these in order.

### 1. Install Firebase CLI and log in

```bash
npm install -g firebase-tools
firebase login
```

Use the Google account that owns the **nunciaya-web** Firebase project.

---

### 2. Set Cloud Functions environment (Algolia sync)

Your Functions use **environment variables** for the Algolia admin key (never put this in `config.js`).

**Option A – Firebase config (recommended for production):**

```bash
firebase functions:config:set algolia.app_id="YOUR_ALGOLIA_APP_ID" algolia.api_key="YOUR_ALGOLIA_ADMIN_API_KEY"
```

Then in `functions/index.js` you’d read `functions.config().algolia.app_id` and `functions.config().algolia.api_key` instead of `process.env`. Your code currently uses `process.env.ALGOLIA_APP_ID` and `process.env.ALGOLIA_API_KEY`, so use **Option B** if you don’t want to change code.

**Option B – `.env` file (for Firebase Functions):**

1. In the **`functions/`** folder, create a file named **`.env`** (or `.env.nunciaya-web` if you use that name).
2. Add (use your real Algolia values):

   ```
   ALGOLIA_APP_ID=14I0SKPECJ
   ALGOLIA_API_KEY=your_algolia_admin_api_key_here
   ```

3. **Do not commit `.env`** – it’s in `.gitignore`. For **production**, set the same variables in Google Cloud so deployed Functions can read them: [Google Cloud Console](https://console.cloud.google.com) → **Cloud Functions** → select your function → **Edit** → **Runtime, build, connections and security** → **Environment variables** → add `ALGOLIA_APP_ID` and `ALGOLIA_API_KEY`.

---

### 3. Deploy Firestore and Storage rules first

Rules protect your data. Deploy them before opening the app to the world:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

(Storage deploy includes `storage.rules`.)

---

### 4. Deploy the website (Hosting)

```bash
firebase deploy --only hosting
```

After this, the site will be live at:

- **https://nunciaya-web.web.app**  
- **https://nunciaya-web.firebaseapp.com**

(Exact URLs are shown in the CLI output.)

---

### 5. Deploy Cloud Functions (Algolia sync)

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

If `ALGOLIA_APP_ID` and `ALGOLIA_API_KEY` are not set, listings will still save to Firestore, but search indexing will be skipped until the env is set.

---

### 6. Run the Algolia backfill (so search has all listings, including titles)

The backfill copies every listing from Firestore into Algolia (with titles and clean data). Use it after deploying Functions, or when search is missing listings/titles.

1. **Deploy Functions first** (if you haven’t already):
   ```bash
   firebase deploy --only functions
   ```

2. **Trigger the backfill** with `curl`. The endpoint requires the Firebase ID token of an admin
   (a user with a document in `admins/{uid}`). While signed in on the site as that admin, get the
   token from the browser console with `await firebase.auth().currentUser.getIdToken()`, then run:
   ```bash
   curl -H "Authorization: Bearer <ID_TOKEN>" https://us-central1-nunciaya-web.cloudfunctions.net/backfillDatabaseToAlgolia
   ```
   `configureAlgoliaIndex` uses the same header. Without it both endpoints return 401/403.
   - The page may take 10–30 seconds (or more with many listings), then show: **"Backfill started. Check logs for progress."**
   - That means the job ran. Algolia’s index is now updated from Firestore.

3. **Optional:** Check Firebase **Functions** → **Logs** for “Successfully backfilled X objects” or any errors.

**Note:** The backfill **replaces** the current Algolia index with data from Firestore. Run it only when you want to re-sync everything (e.g. after fixing titles or adding the function).

---

### 7. One-time: allow your domain in Firebase (if you add a custom domain)

Later, if you use a custom domain (e.g. `www.nunciaya.com`):

1. **Firebase Console** → **Hosting** → **Add custom domain**.
2. **Authentication** → **Settings** → **Authorized domains** – add your domain so login works.

---

## Security Checklist

- [ ] **Firestore rules** – Deployed; only authenticated users can create/update/delete listings; users can only access their own `users/{userId}` data.
- [ ] **Storage rules** – Deployed; listing images are readable by all, writable only when signed in; user folders are private per UID.
- [ ] **config.js** – Contains only **client-safe** keys (Firebase config + Algolia **search-only** key). Do not put the Algolia **admin** API key here.
- [ ] **Algolia admin key** – Only in Functions env (e.g. `.env` or Firebase env vars), never in repo or front-end.
- [ ] **.env / .env.\*** – In `.gitignore`; never commit.
- [ ] **Firebase Console** – Restrict who has access; use 2FA on the Google account that owns the project.

---

## Deploy Everything at Once (after first-time setup)

```bash
firebase deploy
```

This deploys Hosting, Firestore rules, Storage rules, and Functions together.

---

## Quick Reference: What Lives Where

```
NunciaYa/
├── index.html, post-ad.html, listing-search.html, ...   ← Hosting (public site)
├── app.js, config.js, style.css                        ← Hosting
├── pages/                                               ← Hosting
├── _header.html, _footer.html                          ← Hosting
├── firebase.json                                        ← Firebase CLI (hosting + rules + functions)
├── .firebaserc                                          ← Firebase CLI (project id)
├── firestore.rules                                      ← Firestore security
├── storage.rules                                        ← Storage security
├── functions/                                           ← Cloud Functions only (not in Hosting)
│   ├── index.js
│   ├── package.json
│   └── .env                                             ← Local only; never commit
├── package.json, node_modules/                          ← Local dev only (serve, etc.)
└── DEPLOYMENT.md                                        ← This file (not deployed)
```

You’re ready to go live: keep files where they are, set Algolia env for Functions, deploy rules first, then Hosting, then Functions.

---

## Taking the site offline

When you want the live site to show an “offline” message instead of the full app:

1. **Open `firebase.json`.** In the `"hosting"` section, add a `"rewrites"` block so it looks like this (use this only when you want the site offline):

   ```json
   "hosting": {
     "public": ".",
     "rewrites": [
       { "source": "**", "destination": "/offline.html" }
     ],
     "ignore": [ ... rest unchanged ... ]
   }
   ```

2. **Deploy:**  
   `firebase deploy --only hosting`  
   All URLs will then show the message from `offline.html` (e.g. “NunciaYa is temporarily offline”).

3. **To bring the site back online:** Remove the `"rewrites"` block (or set it to `[]`) in `firebase.json`, then run `firebase deploy --only hosting` again.

---

## Admin dashboard

An **admin dashboard** is available at **`/admin.html`** (e.g. `https://nunciaya-web.web.app/admin.html`). It shows:

- Total listings and total users  
- New listings in the last 7 and 30 days  
- Counts by status (active, pending, sold) and by category  
- A table of recent listings with links to detail pages  

**Access:** Only users whose UID is in the Firestore **`admins`** collection can see the dashboard. Others see “Access denied”.

**How to add an admin**

1. Sign in to the app with the account you want to make admin.  
2. Open the browser console (F12) and run: `firebase.auth().currentUser.uid` (or get the UID from Firebase Console → Authentication).  
3. In **Firebase Console** → **Firestore** → **Start collection** (or add to existing):  
   - Collection ID: **`admins`**  
   - Document ID: the **UID** from step 2  
   - Add any field (e.g. `role` = `admin`) so the document exists.  
4. Open **`/admin.html`** again; the dashboard should load.  

Deploy the **Firestore rules** and the **Cloud Function** `getAdminStats` so the dashboard works in production:

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
```

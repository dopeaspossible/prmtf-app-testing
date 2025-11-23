# Firebase Setup Guide

This guide will help you set up Firebase Firestore for cross-device synchronization of orders and templates.

## Why Firebase?

- ✅ **FREE** tier with generous limits (50K reads/day, 20K writes/day)
- ✅ **Real-time sync** across all devices
- ✅ **No backend code needed** - works directly from frontend
- ✅ **Automatic backups** in the cloud
- ✅ **Works offline** with local caching

## Step-by-Step Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `casecraft-ai` (or any name you prefer)
4. Click **Continue**
5. **Disable Google Analytics** (optional, to keep it simple) or enable if you want
6. Click **Create project**
7. Wait for project creation (30 seconds)

### 2. Enable Firestore Database

1. In your Firebase project, click **"Firestore Database"** in the left menu
2. Click **"Create database"**
3. Select **"Start in test mode"** (for now - we'll secure it later)
4. Choose a location (pick the closest to you, e.g., `europe-west` or `us-central`)
5. Click **"Enable"**
6. Wait for database creation (30 seconds)

### 3. Get Firebase Configuration

1. In Firebase Console, click the **gear icon** ⚙️ next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** `</>` to add a web app
5. Register app:
   - App nickname: `CaseCraft Web` (or any name)
   - **Don't check** "Also set up Firebase Hosting"
   - Click **"Register app"**
6. Copy the `firebaseConfig` object that appears (looks like this):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 4. Add Configuration to Your App

#### Option A: Environment Variables (Recommended for GitHub)

1. Go to your GitHub repository: `https://github.com/dopeaspossible/prmtf-app-testing`
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets (click "New repository secret" for each):

   - Name: `VITE_FIREBASE_API_KEY` → Value: `AIzaSy...` (from apiKey)
   - Name: `VITE_FIREBASE_AUTH_DOMAIN` → Value: `your-project.firebaseapp.com`
   - Name: `VITE_FIREBASE_PROJECT_ID` → Value: `your-project-id`
   - Name: `VITE_FIREBASE_STORAGE_BUCKET` → Value: `your-project.appspot.com`
   - Name: `VITE_FIREBASE_MESSAGING_SENDER_ID` → Value: `123456789`
   - Name: `VITE_FIREBASE_APP_ID` → Value: `1:123456789:web:abcdef`

4. Also add them to **Environment variables** (not just Secrets):
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **"Variables"** tab
   - Add the same variables there (for GitHub Pages build)

#### Option B: Local Development (.env.local file)

1. Create a file `.env.local` in your project root:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

2. **Important:** Add `.env.local` to `.gitignore` (already there) so you don't commit secrets

### 5. Secure Firestore Rules (Important!)

1. In Firebase Console, go to **Firestore Database** → **Rules**
2. Replace the rules with this (allows read/write for now, but only for your app):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to templates and orders
    match /templates/{document=**} {
      allow read, write: if true;
    }
    match /orders/{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **"Publish"**

**Note:** These rules allow anyone with your config to read/write. For production, you should add authentication, but for now this works for your use case.

### 6. Test the Setup

1. Run your app locally: `npm run dev`
2. Log in as admin
3. Create a template or order
4. Check Firebase Console → Firestore Database
5. You should see `templates` and `orders` collections appear!

### 7. Deploy to GitHub Pages

1. Push your code (Firebase config is already set up via environment variables)
2. GitHub Actions will build with the secrets you added
3. Your deployed site will sync with Firebase automatically!

## How It Works

- **On app load:** Loads data from Firebase (with localStorage fallback)
- **On data change:** Saves to both Firebase AND localStorage
- **Real-time sync:** Changes on one device appear on others automatically
- **Offline support:** Works offline, syncs when back online

## Troubleshooting

### "Firebase not configured" warning
- Check that all environment variables are set correctly
- Make sure variable names start with `VITE_`
- Restart dev server after adding `.env.local`

### Data not syncing
- Check browser console for errors
- Verify Firestore rules allow read/write
- Check Firebase Console → Firestore Database to see if data is being saved

### Build fails on GitHub
- Verify all secrets are added in GitHub repository settings
- Check that variable names match exactly (case-sensitive)

## Free Tier Limits

Firebase Free (Spark) plan includes:
- **50,000 reads/day**
- **20,000 writes/day**
- **20,000 deletes/day**
- **1 GB storage**

This is plenty for most use cases! If you exceed limits, Firebase will notify you.

## Next Steps

Once set up, your orders and templates will automatically sync across:
- ✅ Different browsers on same PC
- ✅ Different PCs
- ✅ Mobile devices
- ✅ GitHub Pages deployment

No more manual export/import needed! 🎉








# GitHub Secrets Setup - Quick Guide

## Add Firebase Secrets to GitHub

1. **Go to your repository settings:**
   - https://github.com/dopeaspossible/prmtf-app-testing/settings/secrets/actions

2. **Click "New repository secret"** for each of these 6 values:

### Secret 1:
- **Name:** `VITE_FIREBASE_API_KEY`
- **Value:** `AIzaSyCfDEM9sU9SiQbHxEHklmY-rfc5AA0WDsY`
- Click **"Add secret"**

### Secret 2:
- **Name:** `VITE_FIREBASE_AUTH_DOMAIN`
- **Value:** `prmtf-app-testing.firebaseapp.com`
- Click **"Add secret"**

### Secret 3:
- **Name:** `VITE_FIREBASE_PROJECT_ID`
- **Value:** `prmtf-app-testing`
- Click **"Add secret"**

### Secret 4:
- **Name:** `VITE_FIREBASE_STORAGE_BUCKET`
- **Value:** `prmtf-app-testing.firebasestorage.app`
- Click **"Add secret"**

### Secret 5:
- **Name:** `VITE_FIREBASE_MESSAGING_SENDER_ID`
- **Value:** `807153105898`
- Click **"Add secret"**

### Secret 6:
- **Name:** `VITE_FIREBASE_APP_ID`
- **Value:** `1:807153105898:web:e09e763c5bfd8b6c119093`
- Click **"Add secret"**

## After Adding Secrets

Once all 6 secrets are added:
1. Go to **Actions** tab
2. The workflow will automatically rebuild with Firebase config
3. Your deployed site will sync with Firebase!

## Verify It Works

1. Test locally: `npm run dev`
2. Log in as admin
3. Create a template or order
4. Check Firebase Console → Firestore Database
5. You should see `templates` and `orders` collections!








# Firebase Quick Setup - Step by Step

## Step 1: Create Firebase Account & Project

1. **Go to Firebase Console**
   - Open: https://console.firebase.google.com/
   - Sign in with your Google account (or create one)

2. **Create a New Project**
   - Click **"Add project"** or **"Create a project"** button
   - Project name: `casecraft-ai` (or any name you like)
   - Click **Continue**
   - **Google Analytics**: You can disable this (toggle OFF) or leave it on
   - Click **Create project**
   - Wait ~30 seconds for project creation

3. **You should see**: "Your new project is ready" → Click **Continue**

## Step 2: Enable Firestore Database

1. In the left sidebar, click **"Firestore Database"**
2. Click **"Create database"** button
3. **Security rules**: Select **"Start in test mode"** (we'll secure it later)
4. **Location**: Choose closest to you:
   - `europe-west` (for Europe)
   - `us-central` (for USA)
   - Or any location close to you
5. Click **"Enable"**
6. Wait ~30 seconds for database creation

## Step 3: Get Your Firebase Configuration

1. Click the **gear icon** ⚙️ next to "Project Overview" (top left)
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** `</>` (it says "Add app" or has a web icon)
5. **Register app**:
   - App nickname: `CaseCraft Web` (or any name)
   - **DO NOT check** "Also set up Firebase Hosting"
   - Click **"Register app"**
6. **Copy the config** - You'll see something like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

**IMPORTANT**: Copy all 6 values (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)

## Step 4: Set Firestore Security Rules

1. Go back to **Firestore Database** in left sidebar
2. Click **"Rules"** tab
3. Replace the rules with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /templates/{document=**} {
      allow read, write: if true;
    }
    match /orders/{document=**} {
      allow read, write: if true;
    }
  }
}
```

4. Click **"Publish"**

## Step 5: Share Your Config Values

Once you have the 6 values from Step 3, share them with me and I'll:
- Add them to GitHub secrets
- Create your .env.local file
- Test the connection

**Format to share:**
```
apiKey: AIzaSy...
authDomain: your-project.firebaseapp.com
projectId: your-project-id
storageBucket: your-project-id.appspot.com
messagingSenderId: 123456789012
appId: 1:123456789012:web:abcdef...
```




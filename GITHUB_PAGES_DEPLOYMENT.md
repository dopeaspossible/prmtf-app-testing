# GitHub Pages Deployment Guide

This guide will help you deploy your CaseCraft AI app to GitHub Pages.

## Quick Setup Steps

### 1. Enable GitHub Pages

1. Go to your GitHub repository: `https://github.com/dopeaspossible/prmtf-app-testing`
2. Click **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**, select:
   - **Deploy from a branch**: `gh-pages` branch, `/ (root)` folder
   - OR **GitHub Actions** (recommended - we'll use this)

### 2. Add Your API Key as a Secret

1. In your repository, go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `VITE_API_KEY`
4. Value: Your Google Gemini API key
5. Click **Add secret**

### 3. Enable GitHub Actions

The workflow file (`.github/workflows/deploy.yml`) is already created. You just need to:

1. Make sure the workflow file is committed and pushed
2. Go to **Actions** tab in your repository
3. The workflow should appear and run automatically on push to `main`

### 4. Access Your Site

After the first deployment completes:
- Your site will be available at: `https://dopeaspossible.github.io/prmtf-app-testing/`
- Or if you set up a custom domain, use that instead

## How It Works

- **GitHub Actions** automatically builds your app when you push to `main`
- The built files are deployed to GitHub Pages
- The `404.html` file handles SPA routing (all routes redirect to index.html)

## Custom Domain (Optional)

If you want to use a custom domain:

1. In repository **Settings** → **Pages**
2. Under **Custom domain**, enter your domain
3. Follow GitHub's instructions to configure DNS

## Troubleshooting

### Build Fails
- Check the **Actions** tab for error logs
- Make sure `VITE_API_KEY` secret is set correctly
- Verify the workflow file is in `.github/workflows/deploy.yml`

### Site Not Loading
- Wait a few minutes after deployment (GitHub Pages can take 1-2 minutes to update)
- Check the **Actions** tab to ensure deployment succeeded
- Clear your browser cache

### API Key Not Working
- Verify the secret name is exactly `VITE_API_KEY` (case-sensitive)
- Re-run the workflow after adding/updating the secret

## Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
npm run build
# Then use GitHub CLI or upload dist folder to gh-pages branch
```

But the GitHub Actions workflow is much easier and automatic!


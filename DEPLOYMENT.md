# Cloudflare Pages Deployment Guide

This guide will help you deploy your CaseCraft AI app to Cloudflare Pages.

## Prerequisites

- A Cloudflare account
- Your Google Gemini API key
- Git repository (GitHub, GitLab, or Bitbucket) - recommended for automatic deployments

## What You Need to Provide

1. **Subdomain name**: What subdomain do you want to use? (e.g., `casecraft`, `app`, `designer`)
2. **Domain**: What domain is this subdomain under? (e.g., `yourdomain.com`, or you can use `pages.dev` for a free subdomain)
3. **Google Gemini API Key**: Your API key for the Gemini service

## Deployment Steps

### Option 1: Deploy via Cloudflare Dashboard (Recommended)

1. **Push your code to a Git repository** (GitHub, GitLab, or Bitbucket)
   - If you haven't already, initialize git and push to your repository:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git remote add origin <your-repo-url>
     git push -u origin main
     ```

2. **Go to Cloudflare Dashboard**
   - Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to **Pages** in the sidebar
   - Click **Create a project**

3. **Connect your Git repository**
   - Select your Git provider (GitHub, GitLab, or Bitbucket)
   - Authorize Cloudflare to access your repositories
   - Select the repository containing this project

4. **Configure Build Settings**
   - **Project name**: Choose a name (e.g., `casecraft-ai`)
   - **Production branch**: `main` or `master` (depending on your default branch)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (leave as default)

5. **Add Environment Variables**
   - Click **Add environment variable**
   - Add the following:
     - **Variable name**: `VITE_API_KEY`
     - **Value**: Your Google Gemini API key
   - Make sure to add it for **Production**, **Preview**, and **Branch** environments

6. **Deploy**
   - Click **Save and Deploy**
   - Cloudflare will build and deploy your app
   - Wait for the build to complete (usually 2-5 minutes)

7. **Configure Custom Domain (Optional)**
   - After deployment, go to your project settings
   - Click **Custom domains**
   - Add your subdomain (e.g., `casecraft.yourdomain.com`)
   - Follow Cloudflare's DNS instructions to add the required CNAME record

### Option 2: Deploy via Wrangler CLI

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Create a Cloudflare Pages project**
   ```bash
   wrangler pages project create casecraft-ai
   ```

4. **Deploy**
   ```bash
   npm run build
   wrangler pages deploy dist --project-name=casecraft-ai
   ```

5. **Set Environment Variables**
   ```bash
   wrangler pages secret put VITE_API_KEY --project-name=casecraft-ai
   ```
   Enter your API key when prompted.

## Important Notes

### Security Warning ⚠️
**The API key is currently exposed in the client-side code.** This means anyone can view your API key in the browser's developer tools. For production, consider:

1. **Using Cloudflare Workers** to proxy API requests and keep the key server-side
2. **Implementing rate limiting** on your API key
3. **Using API key restrictions** in Google Cloud Console to limit usage

### Environment Variables
- The app uses `VITE_API_KEY` (must be prefixed with `VITE_` for Vite to expose it to the client)
- Set this in Cloudflare Pages → Your Project → Settings → Environment Variables

### Build Configuration
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Node version**: Cloudflare Pages uses Node.js 18.x by default (should work fine)

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure TypeScript compiles without errors: `npm run build` locally first
- Check Cloudflare Pages build logs for specific errors

### API Key Not Working
- Verify the environment variable is named `VITE_API_KEY` (not `API_KEY`)
- Check that it's set for the correct environment (Production/Preview)
- Rebuild the project after adding environment variables

### Routing Issues
- The `public/_redirects` file ensures all routes redirect to `index.html` for SPA routing
- If you have routing issues, verify this file exists in your `public` folder

## Post-Deployment

1. **Test the app** at your Cloudflare Pages URL
2. **Verify API functionality** by testing the AI pattern generation
3. **Set up a custom domain** if desired
4. **Monitor usage** in Cloudflare Dashboard

## Support

If you encounter issues:
- Check Cloudflare Pages build logs
- Verify environment variables are set correctly
- Test the build locally: `npm run build && npm run preview`


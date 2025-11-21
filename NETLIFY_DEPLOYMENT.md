# Netlify Deployment Guide (FREE - Works with Private Repos!)

Netlify offers free hosting for static sites and works with both public and private GitHub repositories.

## Quick Setup (5 minutes)

### Option 1: Deploy via Netlify Dashboard (Easiest)

1. **Sign up/Login to Netlify**
   - Go to https://app.netlify.com
   - Sign up with your GitHub account (free)

2. **Add New Site**
   - Click "Add new site" → "Import an existing project"
   - Choose "GitHub" and authorize Netlify
   - Select your repository: `dopeaspossible/prmtf-app-testing`

3. **Configure Build Settings**
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - Click "Deploy site"

4. **Add Environment Variable (Optional)**
   - After first deployment, go to **Site settings** → **Environment variables**
   - Add: `VITE_API_KEY` = (your API key, if you want AI features)
   - Click "Save" and trigger a new deployment

5. **Your Site is Live!**
   - Netlify will give you a URL like: `https://random-name-123.netlify.app`
   - You can customize it in **Site settings** → **Change site name**

### Option 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
npm run build
netlify deploy --prod
```

## Custom Domain (Free!)

1. Go to **Site settings** → **Domain management**
2. Click "Add custom domain"
3. Follow Netlify's instructions to configure DNS

## Features

- ✅ **FREE** for static sites
- ✅ Works with **private repositories**
- ✅ **Automatic deployments** on git push
- ✅ **HTTPS** by default
- ✅ **Custom domains** supported
- ✅ **CDN** included
- ✅ **100 GB bandwidth/month** free tier

## Troubleshooting

### Build Fails
- Check build logs in Netlify dashboard
- Make sure `netlify.toml` is in your repo root
- Verify Node version (Netlify uses Node 18 by default)

### Site Not Loading
- Wait 1-2 minutes after deployment
- Check deployment logs in Netlify dashboard
- Clear browser cache

## That's it!

Netlify is much simpler than Cloudflare Pages and works great with private repos. Your site will be live in minutes!


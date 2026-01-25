# Deployment Guide

This guide covers deploying Charlotte Monitor to Cloudflare Pages with GitHub Actions CI/CD.

## Overview

- **Hosting**: Cloudflare Pages (free tier)
- **API Proxy**: Cloudflare Pages Functions (edge runtime)
- **Domain & SSL**: Cloudflare (free, includes HTTPS)
- **Authentication**: Cloudflare Access (free for up to 50 users)
- **CI/CD**: GitHub Actions

---

## Cloudflare Pages Deployment (Recommended)

### Step 1: Create Cloudflare Pages Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** > **Create**
3. Select **Pages** > **Direct Upload** (we deploy via GitHub Actions)
4. Name your project (e.g., `charlotte-monitor`)
5. Upload a placeholder (you can just upload an empty `index.html`)
6. Note the project name for GitHub configuration

### Step 2: Create Cloudflare API Token

1. Go to **My Profile** > **API Tokens** > **Create Token**
2. Use the **Edit Cloudflare Workers** template
3. Under **Account Resources**, select your account
4. Under **Zone Resources**, select **All zones** (or specific zone)
5. Create and save the token

### Step 3: Configure GitHub Repository

Add these secrets in **Settings > Secrets and variables > Actions > Secrets**:

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | The API token from Step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (from dashboard URL) |

Add this variable in **Settings > Secrets and variables > Actions > Variables**:

| Variable | Value |
|----------|-------|
| `CLOUDFLARE_PAGES_PROJECT` | Your Pages project name from Step 1 |

### Step 4: Set Pages Environment Variables

In Cloudflare dashboard, go to **Workers & Pages > Your Project > Settings > Environment variables**:

| Variable | Value |
|----------|-------|
| `OPENSKY_CLIENT_ID` | Your OpenSky client ID |
| `OPENSKY_CLIENT_SECRET` | Your OpenSky client secret |
| `FINNHUB_API_KEY` | Finnhub stock data API key |
| `AI_PROVIDER` | `openai` or `anthropic` |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) |
| `ANTHROPIC_API_KEY` | Anthropic API key (if using Anthropic) |
| `DUKE_OUTAGE_URL` | Duke Energy outage API URL |
| `DUKE_OUTAGE_AUTH` | Duke Energy Basic auth header |
| `TRANSIT_LAND_API_KEY` | Transit.land API key for CATS |
| `HERE_API_KEY` | HERE Maps API key for traffic |

### Step 5: Deploy

Push to `master` branch to trigger a production deploy, or open a PR for a preview deploy.

The GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) will:
1. Build the Vite app
2. Deploy to Cloudflare Pages using Wrangler
3. Pages Functions in `/functions` are automatically deployed

### Step 6: Connect Custom Domain (Optional)

1. In Cloudflare Pages dashboard, go to **Custom domains**
2. Add your domain (must be on Cloudflare DNS)
3. Cloudflare automatically configures DNS and SSL

---

## Cloudflare Access (Authentication)

See the existing Cloudflare Access section below for securing your deployment.

---

## Legacy: Netlify Deployment

> **Note**: The project has migrated to Cloudflare Pages. The Netlify configuration files remain for reference but are no longer actively used.

---

## Step 1: Buy Domain on Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Create account if needed
3. **Domain Registration** → **Register Domain**
4. Search for your desired domain and purchase
   - `.com` ~$10/year
   - `.xyz` ~$2/year (cheap option)
   - `.dev` ~$12/year
5. Domain is automatically added to your Cloudflare account with DNS ready

---

## Step 2: Deploy to Netlify

### Option A: Via GitHub (Recommended)

1. Push your repo to GitHub
2. Go to [Netlify](https://app.netlify.com)
3. **Add new site** → **Import an existing project**
4. Connect to GitHub and select your repo
5. Build settings (should auto-detect):
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click **Deploy**

### Option B: Via Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### Set Environment Variables

In Netlify dashboard → **Site settings** → **Environment variables**, add:

| Variable | Value |
|----------|-------|
| `OPENSKY_CLIENT_ID` | Your OpenSky client ID |
| `OPENSKY_CLIENT_SECRET` | Your OpenSky client secret |

Trigger a redeploy after adding these.

---

## Step 3: Connect Domain to Netlify

### In Netlify:

1. **Site settings** → **Domain management** → **Add custom domain**
2. Enter your Cloudflare domain (e.g., `charlotte-monitor.xyz`)
3. Netlify will show you the target: `your-site-name.netlify.app`

### In Cloudflare:

1. Go to your domain → **DNS** → **Records**
2. Add a CNAME record:
   - **Type**: `CNAME`
   - **Name**: `@` (for root domain) or subdomain like `monitor`
   - **Target**: `your-site-name.netlify.app`
   - **Proxy status**: **Proxied** (orange cloud ON)
3. If using root domain, also add:
   - **Type**: `CNAME`
   - **Name**: `www`
   - **Target**: `your-site-name.netlify.app`
   - **Proxy status**: **Proxied**

### SSL/HTTPS (Automatic)

Cloudflare automatically provisions SSL. Verify settings:

1. **SSL/TLS** → **Overview** → Set to **Full** (not Full Strict)
2. **Edge Certificates** → **Always Use HTTPS**: ON

---

## Step 4: Set Up Cloudflare Access

### Create Zero Trust Account

1. Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com)
2. Choose the free plan (up to 50 users)
3. Pick a team name (e.g., `your-name-team`)

### Create Access Application

1. **Access** → **Applications** → **Add an application**
2. Select **Self-hosted**
3. Configure:
   - **Application name**: Charlotte Monitor
   - **Session Duration**: 24 hours (or 7 days for convenience)
   - **Application domain**: `charlotte-monitor.xyz` (your domain)
   - **Path**: Leave empty (protects entire site)

### Create Access Policy

1. **Add a policy**:
   - **Policy name**: Allowed Users
   - **Action**: Allow
   - **Session duration**: Same as above

2. **Configure rules** (choose what works for you):

   **Option A: Specific emails**
   - Selector: `Emails`
   - Value: `you@gmail.com, friend@gmail.com`

   **Option B: One-time PIN (email verification)**
   - Selector: `Emails`
   - Value: List of allowed emails
   - Users receive a PIN via email to log in

   **Option C: GitHub OAuth**
   - Selector: `GitHub organization` or `GitHub username`
   - Requires setting up GitHub as identity provider first

   **Option D: Google OAuth**
   - Selector: `Emails` with Google as identity provider
   - Requires setting up Google as identity provider first

3. **Save** the application

### (Optional) Set Up Identity Provider

For GitHub/Google login instead of email PIN:

1. **Settings** → **Authentication** → **Login methods**
2. **Add new** → Select GitHub or Google
3. Follow the OAuth app setup instructions
4. Update your Access policy to use this provider

---

## Verification Checklist

- [ ] Domain purchased on Cloudflare
- [ ] Netlify site deployed
- [ ] Environment variables set (`OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET`)
- [ ] DNS CNAME record pointing to Netlify
- [ ] SSL/TLS set to "Full"
- [ ] Cloudflare Access application created
- [ ] Access policy configured with allowed users
- [ ] Test: Visit your domain, should see Cloudflare login first

---

## Troubleshooting

### "Too many redirects" error
- Set Cloudflare SSL/TLS to **Full** (not "Flexible")

### 404 on page refresh
- Verify `netlify.toml` has the SPA redirect rule
- Check that `dist` folder is being published

### API calls failing in production
- Check Netlify function logs: **Site** → **Functions** → Click function → **Logs**
- Verify environment variables are set correctly

### Access login not appearing
- Ensure Cloudflare proxy is enabled (orange cloud) on DNS record
- Check that Access application domain matches exactly

---

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your credentials
cp .env.example .env.local
# Edit .env.local with your API keys

# Start Vite dev server (no API functions)
npm run dev

# Start with Cloudflare Pages Functions (recommended for full testing)
npm run dev:pages
# Open http://localhost:8788
```

When using `npm run dev:pages`, set environment variables in a `.dev.vars` file at the project root:

```bash
# .dev.vars (Wrangler local development)
OPENSKY_CLIENT_ID=your-client-id
OPENSKY_CLIENT_SECRET=your-client-secret
FINNHUB_API_KEY=your-finnhub-key
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
# ... other API keys
```

---

## Cost Summary

| Service | Cost |
|---------|------|
| Netlify hosting | Free |
| Netlify functions | Free (125k requests/month) |
| Cloudflare DNS/SSL | Free |
| Cloudflare Access | Free (up to 50 users) |
| Domain | ~$2-12/year depending on TLD |

**Total: ~$2-12/year** (just the domain)

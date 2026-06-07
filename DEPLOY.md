# Mentulis — Deploy to GitHub + Vercel

## Step 1: Create a GitHub repository

1. Go to https://github.com/new
2. Name it `mentulis` (or whatever you like)
3. Set it to **Private** (your API key is in .gitignore but keep it private anyway)
4. Do NOT initialize with README (you already have files)
5. Click **Create repository**
6. Copy the repo URL — it will look like:
   `https://github.com/YOUR_USERNAME/mentulis.git`

## Step 2: Push from your computer

Open a terminal (Command Prompt or PowerShell) and run these commands one by one:

```bash
cd "C:\Users\shehe\OneDrive\Desktop\MENTULIS"

git init
git branch -m main
git add .
git commit -m "Initial commit — Mentulis mental health app"
git remote add origin https://github.com/YOUR_USERNAME/mentulis.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

> **If git asks for credentials:** use your GitHub username and a Personal Access Token
> (not your password). Create one at: https://github.com/settings/tokens → Generate new token → check "repo"

## Step 3: Deploy on Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository** → select your `mentulis` repo
3. Leave all settings as default (Vercel auto-detects the setup)
4. Before clicking Deploy, go to **Environment Variables** and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: (paste your key from `claude api key.txt`)
5. Click **Deploy**

Your app will be live at `https://mentulis.vercel.app` (or similar).

## Files protected by .gitignore (will NOT be uploaded)

- `claude api key.txt` — your Anthropic API key
- `Google Cloud/` — your OAuth credentials
- `node_modules/`
- `.env` files

## After deploying

- Every time you push to GitHub, Vercel auto-redeploys
- The voice/chat feature needs the `ANTHROPIC_API_KEY` env variable to work
- Your Google Sign-In needs `https://mentulis.vercel.app` added to authorized origins
  in Google Cloud Console → APIs → Credentials → your OAuth client

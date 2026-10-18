# ScoreLogic Production Deployment Guide (Render.com)

This application is fully production-configured and ready for zero-configuration, one-click deployment on **[Render.com](https://render.com)**.

---

## Step 1: Push Code to GitHub

1. Create a new repository on your GitHub account (e.g. `scorelogic` or `over-under`).
2. Run the following commands in your terminal to push this project:

```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

---

## Step 2: Deploy on Render.com (One-Click Blueprint)

1. Log in to **[Render.com](https://dashboard.render.com/)**.
2. Click **New +** in the top right and select **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect the [`render.yaml`](file:///c:/Users/oluwa/.gemini/antigravity-ide/scratch/over-under/render.yaml) file in your project.
5. It will configure:
   - **Web Service**: Node.js fullstack service running both the Express API and built React frontend on port 3000.
   - **Database**: Free managed PostgreSQL database (`scorelogic-db`) with automatic connection string wiring.
6. When prompted for environment variables, fill in your API keys:
   - `API_FOOTBALL_KEY`: Your API-Sports / RapidAPI Football API key.
   - `GROQ_API_KEY`: Your Groq Cloud API key for AI match insights and bet builders.
7. Click **Apply**. Render will install dependencies, build the frontend, and launch your live application!

---

## Alternative: Manual Web Service Setup on Render

If you prefer to configure the Web Service manually on Render:

1. Click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the following fields:
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `API_FOOTBALL_KEY` = `<your_api_football_key>`
   - `GROQ_API_KEY` = `<your_groq_api_key>`
   - `CRON_TZ` = `Africa/Lagos`
   - *(Optional)* `DATABASE_URL` = `<your_postgres_connection_string>` (falls back to local SQLite if omitted)
5. Click **Create Web Service**.

---

## Production Verification Checklist

- [x] **No hardcoded `localhost:3000` URLs**: All frontend API calls use dynamic `API_BASE_URL`.
- [x] **Single-Port Production Serving**: The Express backend serves the Vite production bundle from `frontend/dist` with SPA client routing.
- [x] **Express 5 Compatibility**: Routes and wildcards configured for Express 5.
- [x] **Database Flexibility**: Supports both managed PostgreSQL and local SQLite.
- [x] **Security**: `.gitignore` configured to keep `.env` secrets and database binaries out of version control.

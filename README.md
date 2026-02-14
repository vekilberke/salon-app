# Salon Management App - Production Release

This requires a Vercel deployment with a Postgres database (Neon recommended).

## 🚀 Do This Now (5-Minute Deploy)

1.  **Fork/Clone** this repository.
2.  **Create a Neon Postgres Project**. Copy the connection string.
3.  **Deploy to Vercel**: Import your repo.
4.  **Set Environment Variables** in Vercel (Project Settings > Environment Variables):
    *   `DATABASE_URL`: Your Neon connection string (e.g., `postgres://...`)
    *   `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32` or just a long random string.
    *   `NEXTAUTH_URL`: Your Vercel URL (e.g., `https://your-salon-app.vercel.app`). **Must include https://**.
    *   `ADMIN_USERNAME`: `admin` (or your choice).
    *   `ADMIN_PASSWORD`: `Kuafor2026Sistem` (or your strong password).
5.  **Run Database Setup**:
    *   Go to Vercel Dashboard > Deployments > Redeploy (if needed after setting env vars).
    *   Or run locally if connected to prod DB: `npx prisma db push`
6.  **Login**:
    *   Go to `/admin`
    *   User: **admin**
    *   Password: **Kuafor2026Sistem** (or what you set in env)

---

## 🛠️ Production Environment Variables

These variables are **required** for the application to function correctly in production.

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon Postgres Connection String. Use the "Pooled" string if using serverless, or "Direct" for migrations. **Direct is recommended for general stability.** | `postgres://user:pass@ep-xyz.aws.neon.tech/neondb?sslmode=require` |
| `NEXTAUTH_SECRET` | Secret key for encrypting sessions. **MUST be 32+ characters.** | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | The canonical URL of your deployment. **MUST include https://**. | `https://salon-app-production.vercel.app` |
| `ADMIN_USERNAME` | Username for the initial admin account. | `admin` |
| `ADMIN_PASSWORD` | Password for the initial admin account. **REQUIRED.** | `Kuafor2026Sistem` |

> **⚠️ Security Note:** Never commit your `.env` file to GitHub. It is ignored by default.

---

## ✅ Vercel + Neon Deployment Checklist

1.  [ ] **Create Neon Project**:
    *   Go to Neon Console. Create a project.
    *   Copy the connection string.
2.  [ ] **Import to Vercel**:
    *   Import your GitHub repository.
    *   Keep default Build Command (`npm run build`) and Output Directory (`.next`).
3.  [ ] **Configure Environment**:
    *   Add all variables listed above in the "Environment Variables" section.
    *   Mark `DATABASE_URL`, `NEXTAUTH_SECRET`, and `ADMIN_PASSWORD` as "Sensitive".
4.  [ ] **Deploy**:
    *   Click "Deploy". Wait for the green checkmark.
5.  [ ] **Initialize Database**:
    *   This project uses `prisma db push` for schema synchronization (simpler for this scale than migrations).
    *   In your local terminal (connected to your Vercel/Neon DB via `.env.production` or temporary env var):
        ```bash
        npx prisma db push
        ```
    *   *Alternatively*, you can add a "Build Command" override in Vercel to `npx prisma db push && next build` (use with caution on large DBs).
6.  [ ] **Verify**:
    *   Visit `/api/settings`. It should return a JSON object (or 401 if protected).
    *   Visit `/admin`. Login with your `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

---

## 🔐 Admin Bootstrap Behavior

The application creates the first admin user **automatically** (idempotent bootstrap).

*   **When**: Runs inside the authentication flow (server-side) on the first login attempt.
*   **Logic**:
    1.  Checks if *any* admin user exists.
    2.  If 0 users: Hashes `ADMIN_PASSWORD` and creates `ADMIN_USERNAME`.
    3.  If >0 users: Does nothing.
*   **Safety**:
    *   It will **NEVER** overwrite an existing admin password.
    *   To reset access: You must manually delete the row in the `AdminUser` table via SQL or Prisma Studio, then try logging in again with the env credentials.

---

## 🚨 Troubleshooting

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| **"URL must start with protocol file:"** | Prisma is configured for SQLite but using Postgres URL. | Verify `prisma/schema.prisma` has `provider = "postgresql"`. Run `npx prisma generate` and redeploy. |
| **`/api/settings` returns 500** | Database connection failure. | Check `DATABASE_URL` in Vercel settings. confirm "Direct" vs "Pooled" compatibility. |
| **`/admin` "Wrong password" (empty DB)** | Bootstrap didn't run or env var missing. | Check `ADMIN_PASSWORD` is set in Vercel. user table might be empty. Redeploy or restart function. |
| **Entry screen infinite loading** | API error or missing data. | Open browser console/network tab. Ensure at least one `Employee` exists (add via Admin panel). |
| **Deploy fails during build** | Type errors or missing secret. | Run `npm run build` locally to debug. Ensure `NEXT_PUBLIC_...` vars are set if any (none currently required). |

---

## 🛡️ Security Hardening

*   **Rotate Neon Password**: If you suspect a leak, regenerate the password in Neon and update `DATABASE_URL` in Vercel.
*   **No Secrets in Repo**: Ensure `.env` is in `.gitignore` (it is by default).
*   **HTTPS**: Vercel serves via HTTPS automatically. Ensure `NEXTAUTH_URL` reflects this.
*   **Rate Limiting**: The app implements simple rate limiting on PIN entry and Admin Login. Note that in serverless (Vercel), in-memory limits reset on function cold starts. For strict limiting, use a Redis adapter (updgrade required).

---

## 💻 Local Development

1.  **Install**:
    ```bash
    npm install
    ```
2.  **Environment**:
    Create `.env` with local variables (can use a local Postgres or Neon dev branch).
3.  **Database**:
    ```bash
    npx prisma db push
    ```
4.  **Run**:
    ```bash
    npm run dev
    ```
